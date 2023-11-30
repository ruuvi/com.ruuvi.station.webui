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

        const mode = settings?.mode || "mixed";
        let cacheGapLimit = mode === "sparse" ? 60 * 30 : 60 * 2;

        if (until < (Date.now() / 1000 - 24 * 60 * 60)) {
            cacheGapLimit = 2 * 60 * 30;
        }

        const minAmountForCachedDatapointFromCache = 10;
        let useCache = false;
        let cachedData;
        let saveCache = false;

        if (!settings || settings.limit !== 1) {
            saveCache = true;
            cachedData = await DataCache.getData(mac, mode);

            if (cachedData && cachedData.length) {
                const newest = cachedData[0].timestamp;
                const oldest = cachedData[cachedData.length - 1].timestamp;

                if (until && (since >= oldest || since <= oldest) && until <= newest) {
                    const dataToBe = cachedData.filter(
                        (x) => x.timestamp <= until && x.timestamp >= since
                    );

                    if (dataToBe.length > 1) {
                        let validUntil = dataToBe.length;

                        for (let i = 1; i < dataToBe.length; i++) {
                            if (dataToBe[i - 1].timestamp - dataToBe[i].timestamp > cacheGapLimit) {
                                validUntil = i;
                                break;
                            }
                        }

                        if (validUntil > minAmountForCachedDatapointFromCache) {
                            const d = await this.getLastestDataAsync(mac);

                            if (d.result === "success") {
                                d.data.measurements = dataToBe.splice(0, validUntil);
                                d.data.fromCache = true;
                                return d;
                            }
                        }
                    }
                }

                if (until < newest || until > oldest - cacheGapLimit) {
                    // Do not use cache
                } else {
                    cachedData = cachedData.filter((x) => x.timestamp >= since);

                    if (cachedData[cachedData.length - 1].timestamp - since < cacheGapLimit) {
                        since = newest;
                        useCache = true;
                    }
                }
            }
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
        const respData = await resp.json();

        if (cachedData && respData.result === "success" && useCache) {
            respData.data.measurements.push(...cachedData);

            if (saveCache) {
                DataCache.setData(mac, mode, respData.data.measurements);
            }
        } else if (respData.result === "success") {
            if (saveCache) {
                DataCache.setData(mac, mode, respData.data.measurements);
            }
        }

        return respData;
    }

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
    async claim(sensor, name) {
        let res = await fetch(this.url + "/claim", {
            ...this.options,
            method: 'POST',
            body: JSON.stringify({ sensor, name }),
        })
        return await res.json()
    }
    unclaim(mac, deleteData, success) {
        fetch(this.url + "/unclaim", {
            ...this.options,
            method: 'POST',
            body: JSON.stringify({ sensor: mac, deleteData: deleteData }),
        })
            .then(function (response) {
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
    async getBanners() {
        let url = window.location.href.indexOf("devstation") !== -1
            ? "https://raw.githubusercontent.com/ruuvi/station.localization/dev/web_banners.json"
            : "https://raw.githubusercontent.com/ruuvi/station.localization/master/web_banners.json"
        const resp = await fetch(url, { cache: "no-store" })
        return await resp.json()
    }
}

export default NetworkApi;
