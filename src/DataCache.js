import * as localForage from "localforage";
import pjson from "./../package.json"

const DB_VERSION = 1;

function getKey(sensor, mode) {
    return `cache_${sensor}_${mode}`
}

var cache = {
    init: async () => {
        let version = await localForage.getItem("cacheVersion")
        // eslint-disable-next-line eqeqeq
        if (version != DB_VERSION) localForage.clear();
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
            console.log(e);
        }
        return null;
    },
    removeData: async (sensor) => {
        let toRemove = [getKey(sensor, "sparse"), getKey(sensor, "mixed"), getKey(sensor, "dense")]
        toRemove.forEach(x => {
            try {
                localForage.removeItem(x)
            } catch {
                console.log("failed to remove cache for key", x)
            }
        })
    },
    setData: async (sensor, mode, data) => {
        try {
            function compare(a, b) {
                if (a.timestamp > b.timestamp) {
                    return -1;
                }
                if (a.timestamp < b.timestamp) {
                    return 1;
                }
                return 0;
            }
            if (!data) return
            let oldData = await cache.getData(sensor, mode, 0)
            data = [...data, ...(oldData || [])]
            data.sort(compare)
            // remove duplicates
            data = data.filter(function (item, pos, ary) {
                return !pos || item.timestamp !== ary[pos - 1].timestamp;
            });

            // limit the data cache
            data = data.filter(x => x.timestamp > (new Date().getTime() / 1000) - 60 * 60 * 24 * pjson.settings.dataCacheLengthInDays);

            localForage.setItem(getKey(sensor, mode), data);
        } catch (e) {
            console.log(e);
        }
    }
}

export default cache