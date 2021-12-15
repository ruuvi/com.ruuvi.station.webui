const GRAPH_FROM_KEY = "graph_from";
const DASHBOARD_FROM_KEY = "dashboard_from";

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
}

export default Store