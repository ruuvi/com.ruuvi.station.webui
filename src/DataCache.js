import * as localForage from "localforage";
import pjson from '../package.json';

function getKey(sensor, mode) {
    return `cache_${sensor}_${mode}`
}

var cache = {
    getData: async (sensor, mode) => {
        try {
            var data = localForage.getItem(getKey(sensor, mode))
            if (!data) return null;
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
            localForage.setItem(getKey(sensor, mode), data);
        } catch (e) {
            console.log(e);
        }
    }
}

export default cache