const GRAPH_FROM_KEY = "graph_from";
const DASHBOARD_FROM_KEY = "dashboard_from";
const SENSOR_OPEN_ACCORDIONS = "sensor_open_accordions";
const DASHBOARD_CARD_TYPE_KEY = "dashboard_card_type";
const BANNER = "banner_seen_";
const GRAPH_DRAW_DOTS = "graph_draw_dots";
const PER_SENSOR_VISIBLE_TYPES = "per_sensor_visible_types";

class Store {
    setGraphFrom(v) {
        localStorage.setItem(GRAPH_FROM_KEY, v)
    }
    getGraphFrom() {
        return parseInt(localStorage.getItem(GRAPH_FROM_KEY))
    }
    setDashboardFrom(v) {
        localStorage.setItem(DASHBOARD_FROM_KEY, v)
    }
    getDashboardFrom() {
        return parseInt(localStorage.getItem(DASHBOARD_FROM_KEY))
    }
    setOpenAccordions(v) {
        localStorage.setItem(SENSOR_OPEN_ACCORDIONS, JSON.stringify(v))
    }
    getOpenAccordions() {
        var cache = localStorage.getItem(SENSOR_OPEN_ACCORDIONS);
        return cache ? JSON.parse(cache) : cache;
    }
    setDashboardCardType(v) {
        localStorage.setItem(DASHBOARD_CARD_TYPE_KEY, v)
    }
    getDashboardCardType() {
        return localStorage.getItem(DASHBOARD_CARD_TYPE_KEY) || "image_view"
    }
    setHasSeenBanner(key, v) {
        localStorage.setItem(BANNER + key, v)
    }
    getHasSeenBanner(key) {
        let res = localStorage.getItem(BANNER + key);
        if (res === null) return false;
        return JSON.parse(res);
    }
    setGraphDrawDots(v) {
        localStorage.setItem(GRAPH_DRAW_DOTS, v)
    }
    getGraphDrawDots() {
        return localStorage.getItem(GRAPH_DRAW_DOTS) === "true"
    }
}

export default Store