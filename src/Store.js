import storage from "./utils/storage";
import { isDemoRoute } from "./utils/env";
import { normalizeHistoryHours } from "./utils/historyRange";

const GRAPH_FROM_KEY = "graph_from";
const DASHBOARD_FROM_KEY = "dashboard_from";
const SENSOR_OPEN_ACCORDIONS = "sensor_open_accordions";
const DASHBOARD_CARD_TYPE_KEY = "dashboard_card_type";
const BANNER = "banner_seen_";
const GRAPH_DRAW_DOTS = "graph_draw_dots";
const DASHBOARD_DISABLE_ADAPTIVE_LAYOUT_KEY = "dashboard_disable_adaptive_layout";

const Store = {
    setGraphFrom(v) {
        storage.setItem(GRAPH_FROM_KEY, v)
    },
    getGraphFrom() {
        return normalizeHistoryHours(parseInt(storage.getItem(GRAPH_FROM_KEY)))
    },
    setDashboardFrom(v) {
        storage.setItem(DASHBOARD_FROM_KEY, v)
    },
    getDashboardFrom() {
        return parseInt(storage.getItem(DASHBOARD_FROM_KEY))
    },
    setOpenAccordions(v) {
        storage.setItem(SENSOR_OPEN_ACCORDIONS, JSON.stringify(v))
    },
    getOpenAccordions() {
        var cache = storage.getItem(SENSOR_OPEN_ACCORDIONS);
        return cache ? JSON.parse(cache) : cache;
    },
    setDashboardCardType(v) {
        storage.setItem(DASHBOARD_CARD_TYPE_KEY, v)
    },
    getDashboardCardType() {
        return storage.getItem(DASHBOARD_CARD_TYPE_KEY) || (isDemoRoute() ? "graph_view" : "image_view")
    },
    setHasSeenBanner(key, v) {
        storage.setItem(BANNER + key, v)
    },
    getHasSeenBanner(key) {
        let res = storage.getItem(BANNER + key);
        if (res === null) return false;
        return JSON.parse(res);
    },
    setGraphDrawDots(v) {
        storage.setItem(GRAPH_DRAW_DOTS, v)
    },
    getGraphDrawDots() {
        return storage.getItem(GRAPH_DRAW_DOTS) === "true"
    },
    setDashboardDisableAdaptiveLayout(v) {
        storage.setItem(DASHBOARD_DISABLE_ADAPTIVE_LAYOUT_KEY, JSON.stringify(v))
    },
    getDashboardDisableAdaptiveLayout() {
        let res = storage.getItem(DASHBOARD_DISABLE_ADAPTIVE_LAYOUT_KEY);
        if (res === null) return false;
        return JSON.parse(res);
    },
}

export default Store
