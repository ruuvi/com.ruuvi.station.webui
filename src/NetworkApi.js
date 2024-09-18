import pjson from '../package.json';
import DataCache from './DataCache';
import parse from './decoder/parser';
import { logout } from './utils/loginUtils';

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
    if (status === 401) logout()
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
            checkStatusCode(response)
            return response.json();
        })
            .then(response => {
                if (response.data && response.data.sensors.length > 0) {
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
    async getAsync(mac, since, until, settings) {
        const mode = settings?.mode || "mixed";

        const saveCacheD = async (data) => {
            if (data.measurements.length < 100) {
                //console.log("not saving tiny cache")
                return
            }
            let d = await DataCache.getData(mac, mode) || {};
            d[until] = data
            DataCache.setData(mac, mode, d);
        }
        const getClosestCacheD = async () => {
            let d = await DataCache.getData(mac, mode) || {};
            let tss = Object.keys(d).map(x => parseInt(x)).filter(x => x <= until && x > since).sort()
            for (let i = tss.length - 1; i >= 0; i--) {
                if (tss[i] <= until && d[tss[i]]) {
                    d[tss[i]].fromCache = true
                    return { until: tss[i], data: d[tss[i]] }
                }
            }
            return null
        }

        let closestCache = await getClosestCacheD()
        if (closestCache && closestCache.until === until) {
            let fromCacheLength = closestCache.data.measurements.length
            closestCache.data.measurements = closestCache.data.measurements.filter(x => x.timestamp >= since)
            if (fromCacheLength > closestCache.data.measurements.length) {
                // pretend this is not from cache to stop fetching data as we have reached the end
                closestCache.data.fromCache = false
            }
            return { result: "success", data: closestCache.data }
        }
        else if (closestCache) {
            since = closestCache.until
        }

        let q = "?sensor=" + encodeURIComponent(mac);
        q += "&mode=" + encodeURIComponent(mode);

        if (since) {
            q += "&since=" + since;
        }

        if (until) {
            q += "&until=" + until;
        } else {
            q += "&until=" + parseInt(Date.now() / 1000);
        }

        q += "&limit=" + (settings?.limit || 100000);

        if (settings?.sort) {
            q += "&sort=" + settings.sort;
        }

        const resp = await fetch(this.url + "/get" + q, this.options);
        checkStatusCode(resp)
        const respData = await resp.json();

        if (respData.result === "success") {
            await saveCacheD(respData.data)
        }

        if (closestCache && respData.data.measurements.length < pjson.settings.dataFetchPaginationSize) respData.data.nextUp = since
        return respData;
    }
    async getAllSensorsAsync() {
        var q = "?sharedToMe=true"
        q += "&measurements=true"
        q += "&alerts=true"
        q += "&sharedToOthers=true"
        const resp = await fetch(this.url + "/sensors-dense" + q, this.options)
        checkStatusCode(resp)
        const respData = await resp.json()
        respData.data?.sensors.forEach(x => {
            parse(x)
        })
        if (respData.data && respData.data.sensors.length > 0) {
            respData.data.sensors = sortSensors(respData.data.sensors)
        }
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
