import { round } from "../UnitHelper";
import decoder from "./decode";

function parse(d) {
    d.measurements.forEach(x => {
        x.parsed = decoder(x.data)
        if (x.parsed) x.parsed.rssi = x.rssi;
    })
    d.measurements = d.measurements.filter(x => x.parsed !== null) || []
    if (d.measurements.length === 0) return d;
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
    d.latestTimestamp = d.measurements[0].timestamp;
    if (d.offsetTemperature !== 0 || d.offsetHumidity !== 0 || d.offsetPressure !== 0) {
        for (var i = 0; i < d.measurements.length; i++) {
            if (d.offsetTemperature !== 0 && d.measurements[i].parsed.temperature !== undefined) {
                d.measurements[i].parsed.temperature += d.offsetTemperature
                d.measurements[i].parsed.temperature = round(d.measurements[i].parsed.temperature, 2)
            }
            if (d.offsetHumidity !== 0 && d.measurements[i].parsed.humidity !== undefined) {
                d.measurements[i].parsed.humidity += d.offsetHumidity
                d.measurements[i].parsed.humidity = round(d.measurements[i].parsed.humidity, 2)
            }
            if (d.offsetPressure !== 0 && d.measurements[i].parsed.pressure !== undefined) {
                d.measurements[i].parsed.pressure += d.offsetPressure
                d.measurements[i].parsed.pressure = round(d.measurements[i].parsed.pressure, 2)
            }
        }
    }
    return d;
}

export default parse