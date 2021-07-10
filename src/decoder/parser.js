import decoder from "./decode";

function parse(d) {
    d.measurements.forEach(x => {
        x.parsed = decoder(x.data)
        if (x.parsed) x.parsed.rssi = x.rssi;
    })
    d.measurements = d.measurements.filter(x => x.parsed !== null) || []
    function compare(a, b) {
        if (a.timestamp > b.timestamp) {
            return -1;
        }
        if (a.timestamp < b.timestamp) {
            return 1;
        }
        return 0;
    }
    d.measurements.sort(compare);
    if (d.offsetTemperature !== 0 || d.offsetHumidity !== 0 || d.offsetPressure !== 0) {
        for (var i = 0; i < d.measurements.length; i++) {
            if (d.offsetTemperature !== 0) d.measurements[i].parsed.temperature += d.offsetTemperature
            if (d.offsetHumidity !== 0) d.measurements[i].parsed.humidity += d.offsetHumidity
            if (d.offsetPressure !== 0) d.measurements[i].parsed.pressure += d.offsetPressure
        }
    }
    return d;
}

export default parse