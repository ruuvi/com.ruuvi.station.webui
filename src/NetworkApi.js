import pjson from '../package.json';
import cache from './DataCache';
import parse from './decoder/parser';
import { logout } from './utils/loginUtils';

let GET_ALL_SENSORS_CACHE;

// api docs: https://docs.ruuvi.com/communication/ruuvi-network/backends/serverless/user-api

function sortSensors(sensors) {
    for (var i = 0; i < sensors.length; i++) {
        if (!sensors[i].name) {
            let splitMac = sensors[i].sensor.split(":")
            sensors[i].name = "Ruuvi " + splitMac[4] + splitMac[5]
        }
        sensors[i].name = sensors[i].name.substring(0, pjson.settings.sensorNameMaxLength);
    }
    // order sensors by name
    sensors.sort(function (a, b) {
        var textA = a.name.toUpperCase();
        var textB = b.name.toUpperCase();
        return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
    });
    return sensors
}

function checkStatusCode(response) {
    let status = response?.status
    if (status === 401) {
        logout()
        return false
    }
    return true
}

class NetworkApi {
    constructor() {
        this.url = "https://network.ruuvi.com"
        if (this.isStaging()) {
            this.url = "https://testnet.ruuvi.com"
        }
        var user = localStorage.getItem(this.getUserKey());
        if (user) {
            user = JSON.parse(user)
            this.options = { headers: new Headers({ "Authorization": "Bearer " + user.accessToken }) }
        }
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
        fetch(this.url + "/register", {
            method: 'POST',
            body: JSON.stringify({ email: email }),
        })
            .then(function (response) {
                if (response.status === 200) {
                    return response.json();
                }
                throw (response)
            })
            .then(response => {
                success(response);
            })
            .catch(error => fail ? fail(error) : {});
    };
    verify(token, success, fail) {
        fetch(this.url + "/verify?token=" + token).then(function (response) {
            return response.json();
        })
            .then(response => success(response))
            .catch(error => fail ? fail(error) : {});
    };
    user(success, fail) {
        if (!this.options) return fail("Not signed in")
        fetch(this.url + "/user", this.options).then(function (response) {
            if (!checkStatusCode(response)) return
            return response.json();
        })
            .then(response => {
                if (response.data && response.data.sensors.length > 0) {
                    let email = response.data.email
                    let userObj = this.getUser()
                    if (userObj && userObj.email !== email) {
                        console.log("email changed")
                        userObj.email = email
                        this.setUser(userObj)
                    }
                    response.data.sensors = sortSensors(response.data.sensors)
                }
                success(response)
            })
            .catch(error => fail ? fail(error) : {});
    };
    sensors(success, fail) {
        if (!this.options) return fail("Not signed in")
        fetch(this.url + "/sensors", this.options).then(function (response) {
            checkStatusCode(response)
            return response.json();
        })
            .then(response => {
                if (response.data) {
                    response.data.sensors = response.data.sensors.concat(response.data.sharedToMe)
                    if (response.data.sensors.length > 0) {
                        response.data.sensors = sortSensors(response.data.sensors)
                    }
                }
                success(response)
            })
            .catch(error => fail ? fail(error) : {});
    };
    async getLastestDataAsync(mac) {
        let data = await this.getAsync(mac, null, null, { limit: 1 })
        if (data.result === "success") {
            if (data.data.measurements.length > 1) {
                data.data.measurements = [data.data.measurements.reduce((prev, curr) => {
                    return prev.timestamp > curr.timestamp ? prev : curr;
                })]
                //data.data.measurements = [Math.max.apply(Math, data.data.measurements.map(function(o) { return o.timestamp; }))]
            }
            data.data = parse(data.data);
        }
        return data;
    }
    async fetchWithTimeout(resource, options = {}, timeout = 30000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        const response = await fetch(resource, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    }
    async getAsync(mac, since, until, settings) {
        const mode = settings?.mode || "mixed";
        const limit = settings?.limit || 100000;
        const paginationSize = pjson.settings.dataFetchPaginationSize;
    
        // Helper function to save cache data if the measurements array is large enough
        const saveCacheData = async (data) => {
            if (data.measurements.length < 100) return;
    
            try {
                const cacheData = await DataCache.getData(mac, mode) || {};
                cacheData[until] = data;
                await DataCache.setData(mac, mode, cacheData);
            } catch (error) {
                console.error("Error saving data to cache", error);
            }
        };
    
        // Helper function to get the closest cached data within the time range
        const getClosestCacheData = async () => {
            try {
                const cacheData = await DataCache.getData(mac, mode) || {};
                const timestamps = Object.keys(cacheData)
                    .map(Number)
                    .filter(ts => !isNaN(ts) && ts <= until && ts > since)  // Ensure valid timestamps
                    .sort((a, b) => b - a);  // Sort timestamps in descending order
    
                // Loop through the timestamps in reverse to get the closest valid cache
                for (let ts of timestamps) {
                    if (cacheData[ts]) {
                        cacheData[ts].fromCache = true;
                        return { until: ts, data: cacheData[ts] };
                    }
                }
            } catch (error) {
                console.error("Error getting cache data", error);
            }
            return null;
        };
    
        // Attempt to retrieve the closest cached data
        let closestCache = await getClosestCacheData();
    
        // If cache is found and fully covers the request, return it
        if (closestCache && closestCache.until === until) {
            const { data } = closestCache;
            const originalLength = data.measurements.length;
    
            // Filter measurements to include only those after `since`
            data.measurements = data.measurements.filter(x => x.timestamp >= since);
    
            // If some measurements were filtered out, mark cache as incomplete
            if (originalLength > data.measurements.length) {
                data.fromCache = false;
            }
    
            return { result: "success", data };
        }
    
        // If cache is found but not complete, update `since` to continue fetching from API
        if (closestCache) {
            since = closestCache.until;
        }
    
        // Build query string for API call
        let query = `?sensor=${encodeURIComponent(mac)}&mode=${encodeURIComponent(mode)}`;
        query += `&since=${since || 0}`;  // Ensure default value if `since` is undefined
        query += `&until=${until || Math.floor(Date.now() / 1000)}`;  // Use current timestamp if `until` is undefined
        query += `&limit=${limit}`;
        
        if (settings?.sort) {
            query += `&sort=${settings.sort}`;
        }
    
        // Make API call and handle potential errors
        let respData;
        try {
            const response = await this.fetchWithTimeout(`${this.url}/get${query}`, this.options);
            checkStatusCode(response);  // Assuming this is a custom function to check status code
            respData = await response.json();
        } catch (error) {
            console.error("Error fetching data from API", error);
            return { result: "error", message: "Failed to fetch data", error };
        }
    
        // Cache data if the response is successful
        if (respData.result === "success") {
            await saveCacheData(respData.data);
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
        if (!GET_ALL_SENSORS_CACHE) {
            GET_ALL_SENSORS_CACHE = { ts: 0, data: null };
        }
        if (!noCache && GET_ALL_SENSORS_CACHE.data && (now - GET_ALL_SENSORS_CACHE.ts) < cacheTTL) {
            return GET_ALL_SENSORS_CACHE.data;
        }

        let q = "?sharedToMe=true";
        q += "&measurements=true";
        q += "&alerts=true";
        q += "&sharedToOthers=true";
        q += "&settings=true";
        const resp = await fetch(this.url + "/sensors-dense" + q, this.options);
        checkStatusCode(resp);
        const respData = await resp.json();
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
        fetch(this.url + "/share", {
            ...this.options,
            method: 'POST',
            body: JSON.stringify({ sensor: mac, user: email }),
        }).then(function (response) {
            checkStatusCode(response)
            return response.json();
        }).then(response => {
            success(response);
        })
    }
    async shareAsync(mac, email) {
        const response = await fetch(this.url + "/share", {
            ...this.options,
            method: 'POST',
            body: JSON.stringify({ sensor: mac, user: email }),
        });
        checkStatusCode(response);
        const data = await response.json();
        return data
    }
    unshare(mac, email, success) {
        fetch(this.url + "/unshare", {
            ...this.options,
            method: 'POST',
            body: JSON.stringify({ sensor: mac, user: email }),
        }).then(function (response) {
            checkStatusCode(response)
            return response.json();
        }).then(response => {
            success(response);
        })
    }
    update(mac, name, success) {
        fetch(this.url + "/update", {
            ...this.options,
            method: 'POST',
            body: JSON.stringify({ sensor: mac, name: name }),
        })
            .then(function (response) {
                checkStatusCode(response)
                if (response.status === 200) {
                    return response.json();
                }
                throw (response)
            })
            .then(response => {
                success(response);
            })
    }
    updateSensorData(mac, data, success) {
        fetch(this.url + "/update", {
            ...this.options,
            method: 'POST',
            body: JSON.stringify({ ...data, sensor: mac }),
        })
            .then(function (response) {
                checkStatusCode(response)
                //if (response.status === 200) {
                return response.json();
                //}
                //throw (response)
            })
            .then(response => {
                success(response);
            })
    }
    async claim(sensor, name) {
        let res = await fetch(this.url + "/claim", {
            ...this.options,
            method: 'POST',
            body: JSON.stringify({ sensor, name }),
        })
        checkStatusCode(res)
        return await res.json()
    }
    unclaim(mac, deleteData, success) {
        fetch(this.url + "/unclaim", {
            ...this.options,
            method: 'POST',
            body: JSON.stringify({ sensor: mac, deleteData: deleteData }),
        })
            .then(function (response) {
                checkStatusCode(response)
                if (response.status === 200) {
                    DataCache.removeData(mac)
                    return response.json();
                }
                throw (response)
            })
            .then(response => {
                success(response);
            })
    }
    getSettings(success) {
        fetch(this.url + "/settings", this.options).then(function (response) {
            checkStatusCode(response)
            return response.json();
        })
            .then(response => success(response))
    }
    setSetting(name, value, success, error) {
        fetch(this.url + "/settings", {
            ...this.options,
            method: 'POST',
            body: JSON.stringify({ name, value }),
        })
            .then(function (response) {
                checkStatusCode(response)
                if (response.status === 200) {
                    return response.json()
                }
                throw (response)
            })
            .then(response => {
                success(response);
            }).catch(e => {
                error(e);
            });
    }
    getAlerts(mac, success) {
        let url = this.url + "/alerts";
        if (mac) url += "?sensor=" + mac
        fetch(url, this.options).then(function (response) {
            checkStatusCode(response)
            return response.json();
        })
            .then(response => success(response))
    }
    setAlert(data, success) {
        fetch(this.url + "/alerts", {
            ...this.options,
            method: 'POST',
            body: JSON.stringify(data)
        }).then(function (response) {
            checkStatusCode(response)
            return response.json();
        })
            .then(response => success(response))
    }
    async updateSensorSetting(sensorId, type, value) {
        try {
            const response = await fetch(this.url + "/sensor-settings", {
                ...this.options,
                method: 'POST',
                body: JSON.stringify({ sensor: sensorId, type, value, timestamp: Math.floor(Date.now() / 1000) }),
            });
            
            checkStatusCode(response);
            
            if (response.status === 200) {
                return await response.json();
            }
            throw response;
        } catch (e) {
            console.error("Error updating sensor setting:", e);
            throw e;
        }
    }
    resetImage(sensor, success, error) {
        fetch(this.url + "/upload", {
            ...this.options,
            method: 'POST',
            body: JSON.stringify({ action: "reset", sensor }),
        })
            .then(function (response) {
                checkStatusCode(response)
                if (response.status === 200) {
                    return response.json()
                }
                throw (response)
            })
            .then(response => {
                success(response);
            }).catch(e => {
                error(e);
            });
    }
    prepareUpload(sensor, type, success, error) {
        fetch(this.url + "/upload", {
            ...this.options,
            method: 'POST',
            body: JSON.stringify({ sensor, type }),
        })
            .then(function (response) {
                checkStatusCode(response)
                if (response.status === 200) {
                    return response.json()
                }
                throw (response)
            })
            .then(response => {
                success(response);
            }).catch(e => {
                error(e);
            });
    }
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
        fetch(url, {
            ...{ headers: new Headers({ "Content-Type": "multipart/form-data" }) },
            method: 'PUT',
            body: dataURItoBlob(file),
        })
            .then(function (response) {
                checkStatusCode(response)
                if (response.status === 200) {
                    return
                }
                throw (response)
            })
            .then(response => {
                success(response);
            }).catch(e => {
                error(e);
            });
    }
    async getSubscription() {
        const resp = await fetch(this.url + "/subscription", this.options)
        checkStatusCode(resp)
        const respData = await resp.json()
        return respData;
    }
    async claimSubscription(code) {
        const resp = await fetch(this.url + "/subscription", {
            ...this.options,
            method: 'POST',
            body: JSON.stringify({ code })
        })
        const respData = await resp.json()
        return respData;
    }
    async requestDelete(email) {
        const resp = await fetch(this.url + "/request-delete", {
            ...this.options,
            method: 'POST',
            body: JSON.stringify({ email })
        })
        const respData = await resp.json()
        return respData;
    }
    async getBanners() {
        let url = window.location.href.indexOf("devstation") !== -1
            ? "https://raw.githubusercontent.com/ruuvi/station.localization/dev/web_banners.json"
            : "https://raw.githubusercontent.com/ruuvi/station.localization/master/web_banners.json"
        const resp = await fetch(url, { cache: "no-store" })
        return await resp.json()
    }
}

export default NetworkApi;
