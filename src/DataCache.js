import * as localForage from "localforage";

function getKey(sensor, mode) {
    return `cache_${sensor}_${mode}`
}

var cache = {
    getData: async (sensor, mode, from) => {
        try {
            var data = await localForage.getItem(getKey(sensor, mode))
            if (!data) return null;
            if (from) data = data.filter(x => x.timestamp > from)
            return data
        } catch (e) {
            console.log(e);
        }
        return null;
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
            data.sort(compare);

            // store max 1 month of data in cache
            data = data.filter(x => x.timestamp > (new Date().getTime() / 1000) - 60 * 60 * 24 * 32);

            localForage.setItem(getKey(sensor, mode), data);
        } catch (e) {
            console.log(e);
        }
    }
}

export default cache