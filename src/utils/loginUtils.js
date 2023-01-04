export function goToLoginPage() {
    if (window.location.href.indexOf("loginmethod=legacy") !== -1) {
        // lets keep the old way too in case it's needed
        return
    }
    if (window.location.href.indexOf("devstation") !== -1) {
        window.location.href = "https://ruuvi.com/devstation"
        return
    }
    else if (window.location.href.indexOf("localhost") !== -1) {
        // is localhost, not navigating anywhere
        return
    }
    window.location.href = "https://ruuvi.com/station"
}