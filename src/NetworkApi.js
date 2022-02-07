import pjson from '../package.json';
import DataCache from './DataCache';
import parse from './decoder/parser';

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
            this.url = "https://1bdtypmdv4.execute-api.eu-central-1.amazonaws.com/"
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
            if (data.data.measurements.length > 1) data.data.measurements = [data.data.measurements[0]];
            data.data = parse(data.data);
        }
        return data;
    }
    async getAsync(mac, since, until, settings) {
        if (!this.options) return null;
        var mode = settings.mode || "mixed";
        var cachedData = await DataCache.getData(mac, mode, since)
        var useCache = false;
        if (!until && cachedData && cachedData.length) {
            let newest = cachedData[0].timestamp;
            let oldest = cachedData[cachedData.length - 1].timestamp;
            if (since > newest || since < oldest - 60 * 15) {
                //console.log("Will not use cache")
            } else {
                since = newest
                useCache = true
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
            DataCache.setData(mac, mode, respData.data.measurements)
        } else if (respData.result === "success") {
            DataCache.setData(mac, mode, respData.data.measurements)
        }
        return respData;
    };
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
    getAlerts(success) {
        fetch(this.url + "/alerts", this.options).then(function (response) {
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
}

export default NetworkApi;
