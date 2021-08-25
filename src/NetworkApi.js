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
                console.log("RESPONSE", response)
                if (response.data && response.data.sensors.length > 0) {
                    for (var i = 0; i < response.data.sensors.length; i++) {
                        if (!response.data.sensors[i].name) {
                            let splitMac = response.data.sensors[i].sensor.split(":")
                            response.data.sensors[i].name = "Ruuvi " + splitMac[4] + splitMac[5]
                        }
                    }
                }
                success(response)
            })
            .catch(error => fail ? fail(error) : {});
    };
    get(mac, from, settings, success, fail) {
        if (!this.options) if (fail) return fail("Not signed in"); else return
        var q = "?sensor=" + encodeURIComponent(mac)
        q += "&mode=" + encodeURIComponent(settings.mode || "mixed")
        q += "&since=" + from
        q += "&until=" + parseInt(new Date().getTime() / 1000)
        q += "&limit=" + (settings.limit || 100000)
        if (settings.sort) q += "&sort=" + settings.sort
        fetch(this.url + "/get" + q, this.options).then(function (response) {
            return response.json();
        })
            .then(response => {
                // do parsing here?
                success(response)
            })
            .catch(error => fail ? fail(error) : {});
    };
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
    getSettings(success) {
        fetch(this.url + "/settings", this.options).then(function (response) {
            return response.json();
        })
            .then(response => success(response))
    }
    getAlerts(success) {
        fetch(this.url + "/alerts", this.options).then(function (response) {
            return response.json();
        })
            .then(response => success(response))
    }
}

export default NetworkApi;
