const BACK_ROUTE_KEY = "back_route";

class SessionStore {
    static setBackRoute(v) {
        localStorage.setItem(BACK_ROUTE_KEY, v)
    }
    static getBackRoute() {
        return localStorage.getItem(BACK_ROUTE_KEY) || "/"
    }
}

export default SessionStore