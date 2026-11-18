import storage from "./utils/storage";
const BACK_ROUTE_KEY = "back_route";

class SessionStore {
    static setBackRoute(v) {
        storage.setItem(BACK_ROUTE_KEY, v)
    }
    static getBackRoute() {
        return storage.getItem(BACK_ROUTE_KEY) || "/"
    }
}

export default SessionStore