import storage from "./storage";
import cache from "../DataCache"
import NetworkApi from "../NetworkApi"
import { isDemoRoute } from "./env"

export function goToLoginPage() {
    if (window.location.href.indexOf("loginmethod=legacy") !== -1) {
        // lets keep the old way too in case it's needed
        return false
    }
    if (window.location.href.indexOf("devstation") !== -1) {
        window.location.href = "https://ruuvi.com/devstation"
        return true
    }
    else if (window.location.href.indexOf("localhost") !== -1) {
        // is localhost, not navigating anywhere
        return false
    }
    window.location.href = "https://ruuvi.com/station"
    return true
}

export function logout(updateCb) {
    if (isDemoRoute()) {
        window.location.assign("/")
        return
    }
    new NetworkApi().removeToken()
    storage.clear();
    cache.clear();
    if (!goToLoginPage()) {
        window.location.replace("/")
        if (updateCb) updateCb()
    }
}
