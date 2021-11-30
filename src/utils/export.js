import { getUnitHelper } from "../UnitHelper";

export function exportCSV(data, sensorName) {
    var csvHeader = ['Timestamp', `Temperature (${getUnitHelper("temperature").unit})`, `Humidity (${getUnitHelper("humidity").unit})`, `Pressure (${getUnitHelper("pressure").unit})`, 'RSSI', 'Acceleration X', 'Acceleration Y', 'Acceleration Z', 'Voltage', 'Movement counter', 'Measurement sequence number']
    var data = data.measurements.map(x => [toISOString(new Date(x.timestamp * 1000)), x.parsed.temperature, x.parsed.humidity, x.parsed.pressure, x.parsed.rssi, x.parsed.accelerationX, x.parsed.accelerationY, x.parsed.accelerationZ, x.parsed.battery, x.parsed.movementCounter, x.parsed.measurementSequenceNumber])

    var csv = csvHeader.toString() + "\n"
    data.forEach(row => {
        csv += row.toString() + "\n"
    });

    var now = toISOString(new Date(), true);
    var exportedFilename = `${sensorName}_${now}.csv`

    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    if (navigator.msSaveBlob) { // IE 10+
        navigator.msSaveBlob(blob, exportedFilename)
    } else {
        var link = document.createElement('a')
        if (link.download !== undefined) { // feature detection
            // Browsers that support HTML5 download attribute
            var url = URL.createObjectURL(blob)
            link.setAttribute('href', url)
            link.setAttribute('download', exportedFilename)
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        }
    }
}

function toISOString(date, forFilename) {
    var tzo = -date.getTimezoneOffset(),
        dif = tzo >= 0 ? '+' : '-',
        pad = function (num) {
            var norm = Math.floor(Math.abs(num));
            return (norm < 10 ? '0' : '') + norm;
        };

    if (forFilename) {
        return date.getFullYear() +
            pad(date.getMonth() + 1) +
            pad(date.getDate()) +
            '-' + pad(date.getHours()) +
            pad(date.getMinutes())
    }
    return date.getFullYear() +
        '-' + pad(date.getMonth() + 1) +
        '-' + pad(date.getDate()) +
        'T' + pad(date.getHours()) +
        ':' + pad(date.getMinutes()) +
        ':' + pad(date.getSeconds()) +
        dif + pad(tzo / 60) +
        '' + pad(tzo % 60);
}