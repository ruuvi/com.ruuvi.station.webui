import * as localForage from "localforage";
import logger from "./utils/logger";
//import pjson from "./../package.json"

const DB_VERSION = 2;

function getKey(sensor, mode) {
    return `cache_${sensor}_${mode}`
}

var cache = {
    init: async () => {
        let version = await localForage.getItem("cacheVersion")
        if (version != DB_VERSION) await localForage.clear(); // eslint-disable-line eqeqeq -- intentional loose comparison (string vs number)
        await localForage.setItem("cacheVersion", DB_VERSION)
    },
    clear: () => {
        localForage.clear();
    },
    getData: async (sensor, mode, from) => {
        try {
            var data = await localForage.getItem(getKey(sensor, mode))
            if (!data) return null;
            if (from) data = data.filter(x => x.timestamp >= from)
            return data
        } catch (e) {
            logger.error(e);
        }
        return null;
    },
    removeData: async (sensor) => {
        let toRemove = [getKey(sensor, "sparse"), getKey(sensor, "mixed"), getKey(sensor, "dense")]
        for (const x of toRemove) {
            try {
                await localForage.removeItem(x)
            } catch {
                logger.warn("failed to remove cache for key", x)
            }
        }
    },
    setData: async (sensor, mode, data) => {
        try {
            // limit the data cache
            //data = data.filter(x => x.timestamp > (new Date().getTime() / 1000) - 60 * 60 * 24 * pjson.settings.dataCacheLengthInDays);
            await localForage.setItem(getKey(sensor, mode), data);
        } catch (e) {
            logger.error(e);
        }
    }
}

export default cache