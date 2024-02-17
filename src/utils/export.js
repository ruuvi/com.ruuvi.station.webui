import { getUnitHelper } from "../UnitHelper";
import * as XLSX from 'xlsx';

function processData(data, t) {
    const sensorHeaders = ["temperature", "humidity", "pressure", "rssi", "accelerationX", "accelerationY", "accelerationZ", "battery", "movementCounter", "measurementSequenceNumber", "txPower"]
    var csvHeader = [t('date')];
    let uHelp = {};
    sensorHeaders.forEach(x => {
        uHelp[x] = getUnitHelper(x, true)
        let header = t(uHelp[x].exportLabel || uHelp[x].label)
        if (x === "rssi") header = "RSSI";
        if (header === "Tx Power") header = "TX Power";
        if (uHelp[x].unit) header += ` (${t(uHelp[x].unit)})`
        csvHeader.push(header)
    })
    data = data.measurements.map(x => {
        let row = [toISOString(new Date(x.timestamp * 1000))]
        sensorHeaders.forEach(s => {
            let val = s === "humidity" ?
                uHelp[s].value(x.parsed[s], x.parsed.temperature) :
                uHelp[s].value(x.parsed[s]);
            if (isNaN(val)) val = "";
            row.push(val)
        });
        return row;
    })

    // filter duplicates
    data = data.filter(function (item, pos, ary) {
        return !pos || item[0] !== ary[pos - 1][0];
    });
    
    return {csvHeader, data}
}

export function exportCSV(dataIn, sensorName, t) {
    let {csvHeader, data} = processData(dataIn, t)
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

export function exportXLSX(dataIn, sensorName, t) {
    let {csvHeader, data} = processData(dataIn, t)
   
    data = [csvHeader].concat(data)

    var now = toISOString(new Date(), true);
    var exportedFilename = `${sensorName}_${now}.xlsx`


    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, sensorName);

    // Save the workbook as an Excel file
    XLSX.writeFile(wb, exportedFilename);
}

function toISOString(date, forFilename) {
    var pad = function (num) {
        var norm = Math.floor(Math.abs(num));
        return (norm < 10 ? '0' : '') + norm;
    };

    if (forFilename) {
        let tzo = -date.getTimezoneOffset()
        let dif = tzo >= 0 ? '+' : '-'
        return date.getFullYear() +
            pad(date.getMonth() + 1) +
            pad(date.getDate()) +
            'T' + pad(date.getHours()) +
            pad(date.getMinutes()) +
            pad(date.getSeconds()) +
            dif + pad(Math.floor(Math.abs(tzo) / 60)) +
            pad(Math.abs(tzo) % 60);
    }
    return date.getFullYear() +
        '-' + pad(date.getMonth() + 1) +
        '-' + pad(date.getDate()) +
        ' ' + pad(date.getHours()) +
        ':' + pad(date.getMinutes()) +
        ':' + pad(date.getSeconds());
}