const GRAPH_FROM_KEY = "graph_from";
const DASHBOARD_FROM_KEY = "dashboard_from";
const SENSOR_OPEN_ACCORDIONS = "sensor_open_accordions";
const DASHBOARD_SHOW_GRAPH_KEY = "dashboard_show_graph";
const DASHBOARD_GRAPH_TYPE_KEY = "dashboard_graph_type";

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
    setDashboardShowGraph(v) {
        localStorage.setItem(DASHBOARD_SHOW_GRAPH_KEY, v)
    }
    getDashboardShowGraph() {
        return localStorage.getItem(DASHBOARD_SHOW_GRAPH_KEY) === "true"
    }
    setDashboardGraphType(v) {
        localStorage.setItem(DASHBOARD_GRAPH_TYPE_KEY, v)
    }
    getDashboardGraphType() {
        return localStorage.getItem(DASHBOARD_GRAPH_TYPE_KEY) || "temperature"
    }
}

export default Store