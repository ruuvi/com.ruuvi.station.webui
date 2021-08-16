import { round } from "../UnitHelper";
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
            if (d.offsetTemperature !== 0) {
                d.measurements[i].parsed.temperature += d.offsetTemperature
                d.measurements[i].parsed.temperature = round(d.measurements[i].parsed.temperature, 2)

            }
            if (d.offsetHumidity !== 0) {
                d.measurements[i].parsed.humidity += d.offsetHumidity
                d.measurements[i].parsed.humidity = round(d.measurements[i].parsed.humidity, 2)
            }
            if (d.offsetPressure !== 0) {
                d.measurements[i].parsed.pressure += d.offsetPressure
                d.measurements[i].parsed.pressure = round(d.measurements[i].parsed.pressure, 2)
            }
        }
    }
    var settings = localStorage.getItem("settings");
    if (settings) {
        settings = JSON.parse(settings)
        if (settings.UNIT_TEMPERATURE && settings.UNIT_TEMPERATURE === "F") {
            d.measurements.forEach(x => {
                x.parsed.temperature = round(((x.parsed.temperature * 1.8) + 32), 2);
            })
        }
        else if (settings.UNIT_TEMPERATURE && settings.UNIT_TEMPERATURE === "K") {
            d.measurements.forEach(x => {
                x.parsed.temperature = round((x.parsed.temperature + 273.15), 2);
            })
        }
    }
    return d;
}

export default parse