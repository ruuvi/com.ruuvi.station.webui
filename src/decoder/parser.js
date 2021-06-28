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
    return d;
}

export default parse