import pjson from '../package.json';
import DataCache from './DataCache';
import parse from './decoder/parser';

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

class NetworkApi {
    constructor() {
        this.url = "https://network.ruuvi.com"
        if (this.isStaging()) {
            this.url = "https://j9ul2pfmol.execute-api.eu-central-1.amazonaws.com"
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
        return window.location.href.indexOf("/staging") !== -1
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
        if (!this.options) return null;
        var mode = settings.mode || "mixed";
        const cacheGapLimit = mode === "sparse" ? 60 * 20 : 60 * 2;
        const minAmountForCachedDatapointFromCache = 10;
        var useCache = false;
        var cachedData;
        var saveCache = false;
        if (!settings || settings.limit !== 1) {
            saveCache = true;
            cachedData = await DataCache.getData(mac, mode)
            if (cachedData && cachedData.length) {
                let newest = cachedData[0].timestamp;
                let oldest = cachedData[cachedData.length - 1].timestamp;
                if (until && (since >= oldest || (since <= oldest)) && until <= newest) {
                    let dataToBe = cachedData.filter(x => x.timestamp <= until && x.timestamp >= since)
                    if (dataToBe.length > 1) {
                        // validate that there is no gaps
                        let cacheIsValid = true;
                        let validUntil = -1;
                        for (var i = 1; i < dataToBe.length; i++) {
                            if ((dataToBe[i - 1].timestamp - dataToBe[i].timestamp) > cacheGapLimit) {
                                validUntil = i;
                                //console.log(`gap in cached data at ${dataToBe[i - 1].timestamp} ${(dataToBe[i - 1].timestamp - dataToBe[i].timestamp)}s, ${validUntil} ok datapoints`);
                                cacheIsValid = false;
                                break;
                            }
                        }
                        if (cacheIsValid || validUntil > minAmountForCachedDatapointFromCache) {
                            var d = await this.getLastestDataAsync(mac)
                            if (d.result === "success") {
                                if (validUntil <= minAmountForCachedDatapointFromCache) {
                                    d.data.measurements = dataToBe
                                } else {
                                    d.data.measurements = dataToBe.splice(0, validUntil)
                                }
                                d.data.fromCache = true;
                                return d;
                            }
                        }
                    }
                }
                if (!until) {
                    if (since > newest || since < oldest - 60 * 15) {
                        //console.log("Will not use cache")
                    } else {
                        cachedData = cachedData.filter(x => x.timestamp >= since)
                        if (cachedData[cachedData.length - 1].timestamp - since < cacheGapLimit) {
                            since = newest
                            useCache = true
                        }
                    }
                }
            }
        }
        var q = "?sensor=" + encodeURIComponent(mac)
        q += "&mode=" + encodeURIComponent(mode)
        if (since) q += "&since=" + since
        if (until) q += "&until=" + until
        else q += "&until=" + parseInt(new Date().getTime() / 1000)
        q += "&limit=" + (settings.limit || 100000)
        if (settings.sort) q += "&sort=" + settings.sort
        const resp = await fetch(this.url + "/get" + q, this.options)
        const respData = await resp.json()
        if (cachedData && respData.result === "success" && useCache) {
            respData.data.measurements.push(...cachedData)
            if (saveCache) DataCache.setData(mac, mode, respData.data.measurements)
        } else if (respData.result === "success") {
            if (saveCache) DataCache.setData(mac, mode, respData.data.measurements)
        }
        return respData;
    };
    async getAllSensorsAsync() {
        var q = "?sharedToMe=true"
        q += "&measurements=true"
        q += "&alerts=true"
        q += "&sharedToOthers=true"
        const resp = await fetch(this.url + "/sensors-dense" + q, this.options)
        const respData = await resp.json()
        respData.data?.sensors.forEach(x => {
            parse(x)
        })
        return respData;
    }
    share(mac, email, success) {
        fetch(this.url + "/share", {
            ...this.options,
            method: 'POST',
            body: JSON.stringify({ sensor: mac, user: email }),
        }).then(function (response) {
            return response.json();
        }).then(response => {
            success(response);
        })
    }
    unshare(mac, email, success) {
        fetch(this.url + "/unshare", {
            ...this.options,
            method: 'POST',
            body: JSON.stringify({ sensor: mac, user: email }),
        }).then(function (response) {
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
                //if (response.status === 200) {
                return response.json();
                //}
                //throw (response)
            })
            .then(response => {
                success(response);
            })
    }
    unclaim(mac, success) {
        fetch(this.url + "/unclaim", {
            ...this.options,
            method: 'POST',
            body: JSON.stringify({ sensor: mac }),
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
    }
    getSettings(success) {
        fetch(this.url + "/settings", this.options).then(function (response) {
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
    async getNotification() {
        let url = "notification.json"
        const resp = await fetch(url, { ...this.options, cache: "no-store" })
        return await resp.json()
    }
}

export default NetworkApi;
