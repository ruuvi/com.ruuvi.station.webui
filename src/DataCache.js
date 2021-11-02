import pjson from '../package.json';

function getKey(sensor, mode) {
    return `cache_${sensor}_${mode}`
}

var cache = {
    getData: (sensor, mode) => {
        var data = localStorage.getItem(getKey(sensor, mode))
        console.log("DATA",getKey(sensor, mode))
        if (!data) return null;
        return JSON.parse(data)
    },
    setData: (sensor, mode, data) => {
        console.log("SET DATA")
        console.log(getKey(sensor, mode), JSON.stringify(data))
        localStorage.setItem(getKey(sensor, mode), JSON.stringify(data));
    }
}

export default cache