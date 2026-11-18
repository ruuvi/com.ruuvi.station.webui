import { isDemoRoute } from "./env";

const DEMO_PREFIX = "ruuvi-demo:";

// Demo preferences and simulated edits survive reloads in this tab without
// reading, replacing, or clearing the signed-in application's local storage.
const storage = {
    getItem(key) {
        return isDemoRoute() ? sessionStorage.getItem(DEMO_PREFIX + key) : localStorage.getItem(key);
    },
    setItem(key, value) {
        if (isDemoRoute()) sessionStorage.setItem(DEMO_PREFIX + key, value);
        else localStorage.setItem(key, value);
    },
    removeItem(key) {
        if (isDemoRoute()) sessionStorage.removeItem(DEMO_PREFIX + key);
        else localStorage.removeItem(key);
    },
    clear() {
        if (!isDemoRoute()) return localStorage.clear();
        for (let index = sessionStorage.length - 1; index >= 0; index--) {
            const key = sessionStorage.key(index);
            if (key.startsWith(DEMO_PREFIX)) sessionStorage.removeItem(key);
        }
    },
};

export default storage;
