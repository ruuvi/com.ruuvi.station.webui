import { getUnitHelper } from "../UnitHelper";

export function exportCSV(data, sensorName, t) {
    const sensorHeaders = ["temperature", "humidity", "pressure", "rssi", "accelerationX", "accelerationY", "accelerationZ", "battery", "movementCounter", "measurementSequenceNumber", "txPower"]
    var csvHeader = [t('timestamp')];
    let uHelp = {};
    sensorHeaders.forEach(x => {
        uHelp[x] = getUnitHelper(x, true)
        let header = t(uHelp[x].exportLabel || uHelp[x].label)
        if (x === "rssi") header = "RSSI";
        if (["temperature", "humidity", "pressure"].indexOf(x) !== -1) {
            header += ` (${uHelp[x].unit})`
        }
        csvHeader.push(header)
    })
    data = data.measurements.map(x => {
        let row = [toISOString(new Date(x.timestamp * 1000))]
        sensorHeaders.forEach(s => {
            let val = s === "humidity" ?
                uHelp[s].value(x.parsed[s], x.parsed.temperature) :
                uHelp[s].value(x.parsed[s]);
            if (isNaN(val)) val = "-";
            row.push(val)
        });
        return row;
    })

    // filter duplicates
    data = data.filter(function (item, pos, ary) {
        return !pos || item[0] !== ary[pos - 1][0];
    });

    var csv = csvHeader.toString() + "\n"
    for (var i = data.length - 1; i >= 0; i--) {
        csv += data[i].toString() + "\n"
    }

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