import pjson from '../package.json';
import cache from './DataCache';
import parse from './decoder/parser';
import { logout } from './utils/loginUtils';
import logger from './utils/logger';

let GET_ALL_SENSORS_CACHE = { ts: 0, data: null };

// api docs: https://docs.ruuvi.com/communication/ruuvi-network/backends/serverless/user-api

export function sortSensors(sensors) {
    for (var i = 0; i < sensors.length; i++) {
        if (!sensors[i].name) {
            let splitMac = sensors[i].sensor.split(":")
            sensors[i].name = "Ruuvi " + splitMac[4] + splitMac[5]
        }
        sensors[i].name = sensors[i].name.substring(0, pjson.settings.sensorNameMaxLength);
    }
    // order sensors by name
    sensors.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "accent" }));
    return sensors
}

class NetworkApi {
    constructor() {
        this.url = this.isStaging() ? "https://testnet.ruuvi.com" : "https://network.ruuvi.com"
    }
    // Built per request instead of in the constructor so a sign-in or
    // sign-out during the session is always picked up.
    authOptions() {
        const user = this.getUser();
        return user ? { headers: new Headers({ "Authorization": "Bearer " + user.accessToken }) } : {};
    }
    // Shared request pipeline: auth header, 401 -> logout, JSON parsing.
    // The backend reports errors as JSON bodies with non-2xx statuses, so
    // by default those are parsed and returned like any other response;
    // `strict` restores the old behavior of throwing the Response instead.
    async request(path, { method = 'GET', body, signal, timeout, strict, auth = true } = {}) {
        const options = { ...(auth ? this.authOptions() : {}), method };
        if (body !== undefined) options.body = JSON.stringify(body);
        const response = timeout !== undefined
            ? await this.fetchWithTimeout(this.url + path, options, timeout, signal)
            : await fetch(this.url + path, options);
        if (auth && response.status === 401) {
            logout()
            throw new Error("Unauthorized")
        }
        if (strict && !response.ok) throw response;
        return response.json();
    }
    // Bridges a request promise to the older (success, fail) callback style.
    callback(promise, success, fail) {
        promise.then(success).catch(error => {
            if (fail) fail(error);
            else logger.error("Request failed", error);
        });
    }
    getUserKey() {
        return this.isStaging() ? "staging_user" : "user"
    }
    getUser() {
        var user = localStorage.getItem(this.getUserKey());
        return user ? JSON.parse(user) : null;
    }
    setUser(user) {
        localStorage.setItem(this.getUserKey(), JSON.stringify(user))
    }
    removeToken() {
        localStorage.removeItem(this.getUserKey())
        let domain = ".ruuvi.com"
        document.cookie = `station_status=signedIn;domain=${domain};Max-Age=-99999999`
    }
    isStaging() {
        return localStorage.getItem("env") === "staging"
    }
    setEnv(env) {
        cache.clear()
        localStorage.removeItem("sensors")
        localStorage.removeItem("settings")
        localStorage.setItem("env", env)
    }
    register(email, success, fail) {
        this.callback(this.request("/register", { method: 'POST', body: { email }, strict: true, auth: false }), success, fail);
    }
    verify(token, success, fail) {
        this.callback(this.request("/verify?token=" + token, { auth: false }), success, fail);
    }
    user(success, fail) {
        if (!this.getUser()) return fail ? fail("Not signed in") : undefined;
        const promise = this.request("/user").then(response => {
            if (response.data && response.data.sensors.length > 0) {
                let email = response.data.email
                let userObj = this.getUser()
                if (userObj && userObj.email !== email) {
                    logger.log("email changed")
                    userObj.email = email
                    this.setUser(userObj)
                }
                response.data.sensors = sortSensors(response.data.sensors)
            }
            return response
        });
        this.callback(promise, success, fail);
    }
    async fetchWithTimeout(resource, options = {}, timeout = 30000, signal) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        if (signal) {
            signal.addEventListener('abort', () => controller.abort(), { once: true });
        }
        const response = await fetch(resource, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    }
    async getAsync(mac, since, until, settings, signal) {
        const mode = settings?.mode || "mixed";
        const limit = settings?.limit || 100000;
        const paginationSize = pjson.settings.dataFetchPaginationSize;

        const closestCache = await cache.getClosestSegment(mac, mode, since, until);

        // Cache fully covers the request
        if (closestCache && closestCache.until === until) {
            const { data } = closestCache;
            const originalLength = data.measurements.length;
            data.measurements = data.measurements.filter(x => x.timestamp >= since);
            // Some cached measurements fell outside the request -> mark incomplete
            if (originalLength > data.measurements.length) {
                data.fromCache = false;
            }
            return { result: "success", data };
        }

        // Partial hit: continue fetching from where the cache ends
        if (closestCache) {
            since = closestCache.until;
        }

        let query = `?sensor=${encodeURIComponent(mac)}&mode=${encodeURIComponent(mode)}`;
        query += `&since=${since || 0}`;
        query += `&until=${until || Math.floor(Date.now() / 1000)}`;
        query += `&limit=${limit}`;
        if (settings?.sort) {
            query += `&sort=${settings.sort}`;
        }

        let respData;
        try {
            respData = await this.request(`/get${query}`, { timeout: 30000, signal });
        } catch (error) {
            logger.error("Error fetching data from API", error);
            return { result: "error", message: "Failed to fetch data", error };
        }

        // Cache in the background (don't await — avoids Safari IndexedDB
        // hangs blocking the return of already-fetched data)
        if (respData.result === "success") {
            cache.saveSegment(mac, mode, until, respData.data).catch(() => {});
        }

        // If fetched data is smaller than the pagination size, indicate that fetching should stop
        if (closestCache && respData.data.measurements.length < paginationSize) {
            respData.data.nextUp = since;
        }

        return respData;
    }
    async getAllSensorsAsync(noCache) {
        const now = Date.now();
        const cacheTTL = 65_000;
        if (!noCache && GET_ALL_SENSORS_CACHE.data && (now - GET_ALL_SENSORS_CACHE.ts) < cacheTTL) {
            return GET_ALL_SENSORS_CACHE.data;
        }

        let q = "?sharedToMe=true";
        q += "&measurements=true";
        q += "&alerts=true";
        q += "&sharedToOthers=true";
        q += "&settings=true";
        const respData = await this.request("/sensors-dense" + q);
        respData.data?.sensors.forEach(x => {
            parse(x);
        });
        if (respData.data && respData.data.sensors.length > 0) {
            respData.data.sensors = sortSensors(respData.data.sensors);
        }
        GET_ALL_SENSORS_CACHE = { ts: now, data: respData };
        return respData;
    }
    share(mac, email, success) {
        this.callback(this.request("/share", { method: 'POST', body: { sensor: mac, user: email } }), success);
    }
    async shareAsync(mac, email) {
        return this.request("/share", { method: 'POST', body: { sensor: mac, user: email } });
    }
    unshare(mac, email, success) {
        this.callback(this.request("/unshare", { method: 'POST', body: { sensor: mac, user: email } }), success);
    }
    update(mac, name, success) {
        this.callback(this.request("/update", { method: 'POST', body: { sensor: mac, name }, strict: true }), success);
    }
    updateSensorData(mac, data, success) {
        this.callback(this.request("/update", { method: 'POST', body: { ...data, sensor: mac } }), success);
    }
    async claim(sensor, name) {
        return this.request("/claim", { method: 'POST', body: { sensor, name } });
    }
    unclaim(mac, deleteData, success) {
        const promise = this.request("/unclaim", { method: 'POST', body: { sensor: mac, deleteData }, strict: true })
            .then(response => {
                cache.removeData(mac)
                return response
            });
        this.callback(promise, success);
    }
    getSettings(success) {
        this.callback(this.request("/settings"), success);
    }
    setSetting(name, value, success, error) {
        this.callback(this.request("/settings", { method: 'POST', body: { name, value }, strict: true }), success, error);
    }
    getAlerts(mac, success) {
        this.callback(this.request("/alerts" + (mac ? "?sensor=" + mac : "")), success);
    }
    setAlert(data, success) {
        this.callback(this.request("/alerts", { method: 'POST', body: data }), success);
    }
    async updateSensorSetting(sensorId, type, value) {
        try {
            const body = { sensor: sensorId, type, value, timestamp: Math.floor(Date.now() / 1000) };
            return await this.request("/sensor-settings", { method: 'POST', body, strict: true });
        } catch (e) {
            logger.error("Error updating sensor setting:", e);
            throw e;
        }
    }
    prepareUpload(sensor, type, success, error) {
        this.callback(this.request("/upload", { method: 'POST', body: { sensor, type }, strict: true }), success, error);
    }
    // Uploads to the presigned URL from prepareUpload; not a Ruuvi API endpoint.
    async uploadImage(url, type, file, success, error) {
        function dataURItoBlob(dataURI) {
            var byteString = dataURI.split(',')[0].indexOf('base64') >= 0 ?
                atob(dataURI.split(',')[1]) : unescape(dataURI.split(',')[1]);

            var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
            var ia = new Uint8Array(byteString.length);
            for (var i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            return new Blob([ia], { type: mimeString });
        }
        try {
            const blob = dataURItoBlob(file);
            const response = await fetch(url, {
                headers: new Headers({ "Content-Type": blob.type || type }),
                method: 'PUT',
                body: blob,
            });
            if (!response.ok) throw response;
            success();
        } catch (e) {
            if (error) error(e);
            else logger.error("Image upload failed", e);
        }
    }
    async getSubscription() {
        return this.request("/subscription");
    }
    async claimSubscription(code) {
        return this.request("/subscription", { method: 'POST', body: { code } });
    }
    async requestDelete(email) {
        return this.request("/request-delete", { method: 'POST', body: { email } });
    }
    async getBanners() {
        let url = "https://raw.githubusercontent.com/ruuvi/station.localization/master/web_banners.json"
        const resp = await fetch(url, { cache: "no-store" })
        return await resp.json()
    }
}

export default NetworkApi;
