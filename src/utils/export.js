import { getDisplayValue, getUnitHelper, round } from "../UnitHelper";
import * as XLSX from 'xlsx';
import { calculateAverage } from "./dataMath";
import montserratFont from "./fonts/Montserrat";
import oswaldFont from "./fonts/Oswald";
import mulishFont from "./fonts/Mulish";
import jsPDF from "jspdf";
import ruuviLogo from '../img/pdf/ruuvi-logo.png'
import checkOK from '../img/pdf/check-02.png'
import checkNOK from '../img/pdf/check-01.png'
import { hasAlertBeenHit } from "./alertHelper";
import { getTimestamp } from "../TimeHelper";

function processData(data, t) {
    const sensorHeaders = ["temperature", "humidity", "pressure", "rssi", "accelerationX", "accelerationY", "accelerationZ", "battery", "movementCounter", "measurementSequenceNumber", "txPower"]
    if (data.measurements.length > 0 && data.measurements[0].parsed !== null) {
        if (data.measurements[0].parsed.dataFormat === "e0") {
            sensorHeaders.push("co2", "voc", "nox", "pm10", "pm25", "pm40", "pm100", "illuminance", "soundLevelAvg", "soundLevelPeak", "aqi")
        } else if (data.measurements[0].parsed.dataFormat === "e1") {
            sensorHeaders.push("co2", "voc", "nox", "pm10", "pm25", "pm40", "pm100", "aqi")
            let opts = ["illuminance", "soundLevelAvg", "soundLevelPeak", "soundLevelInstant"]
            opts.forEach(x => {
                if (data.measurements[0].parsed[x] !== undefined) {
                    sensorHeaders.push(x)
                }
            })
        }
    }
    var csvHeader = [t('date')];
    let uHelp = {};
    sensorHeaders.forEach(x => {
        uHelp[x] = getUnitHelper(x, true)
        let header = t(uHelp[x].exportLabel || uHelp[x].label)
        if (x === "rssi") header = "RSSI";
        if (header === "Tx Power") header = "TX Power";
        if (!uHelp[x].noUnitInExport && uHelp[x].unit) header += ` (${t(uHelp[x].unit)})`
        csvHeader.push(header)
    })
    data = data.measurements.map(x => {
        let row = [toISOString(new Date(x.timestamp * 1000))]
        sensorHeaders.forEach(s => {
            let uh = uHelp[s]
            let val = s === "humidity" ?
                uh.value(x.parsed[s], x.parsed.temperature) :
                uh.value(x.parsed[s]);
            if (isNaN(val)) val = "";
            else {
                if (s === "aqi") val = round(val, 1)
            }
            row.push(val)
        });
        return row;
    })

    // filter duplicates
    data = data.filter(function (item, pos, ary) {
        return !pos || item[0] !== ary[pos - 1][0];
    });

    return { csvHeader, data }
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

function getFilename(sensorName, extension) {
    var now = toISOString(new Date(), true);
    return `${sensorName}_${now}.${extension}`
}

function processMultiSensorReportData(data, t, sensorType) {
    let unit = undefined
    let unitObj = undefined

    if (typeof sensorType === "object") {
        if (sensorType.unit) {
            unit = sensorType.unit.translationKey
            unitObj = sensorType.unit
        }
        sensorType = sensorType.sensorType
    }
    
    let uHelpV = getUnitHelper(sensorType)
    if (!unit) unit = uHelpV.unit

    var csvHeader = [t('date')];
    for (let i = 0; i < data.length; i++) {
        csvHeader.push(data[i].name + " (" + unit + ")");
    }

    let timestampsWithData = []
    for (let i = 0; i < data.length; i++) {
        let d = data[i].measurements
        for (let j = 0; j < d.length; j++) {
            if (d[j].parsed) {
                timestampsWithData.push(d[j].timestamp)
            }
        }
    }

    timestampsWithData.sort((a, b) => b - a)
    timestampsWithData = timestampsWithData.filter(function (item, pos, ary) {
        return !pos || item !== ary[pos - 1];
    });

    const unitHelper = getUnitHelper(sensorType);
    let settings = undefined
    if (unitObj) {
        if (sensorType === "temperature") {
            settings = { UNIT_TEMPERATURE: unitObj.cloudStoreKey }
        }
        if (sensorType === "humidity") {
            settings = { UNIT_HUMIDITY: unitObj.cloudStoreKey }
        }
        if (sensorType === "pressure") {
            settings = { UNIT_PRESSURE: unitObj.cloudStoreKey }
        }
    }

    let rows = []
    for (let i = 0; i < timestampsWithData.length; i++) {
        let row = [toISOString(new Date(timestampsWithData[i] * 1000))]
        for (let j = 0; j < data.length; j++) {
            let d = data[j].measurements
            let val = ""
            for (let k = 0; k < d.length; k++) {
                if (d[k].timestamp === timestampsWithData[i]) {
                    switch (sensorType) {
                        case "temperature":
                            val = unitHelper.value(d[k].parsed[sensorType], undefined, settings)
                            break
                        case "humidity":
                            val = unitHelper.value(d[k].parsed[sensorType], d[k].parsed.temperature, settings)
                            break
                        default:
                            val = unitHelper.value(d[k].parsed[sensorType], settings)
                            break
                    }
                    break
                }
            }
            row.push(val)
        }
        rows.push(row)
    }
    return { csvHeader, rows }
}

export function exportMuliSensorCSV(datain, t, sensorType) {
    let { csvHeader, rows } = processMultiSensorReportData(datain, t, sensorType)
    var csv = csvHeader.toString() + "\n"
    for (var i = rows.length - 1; i >= 0; i--) {
        csv += rows[i].toString() + "\n"
    }

    let exportedFilename = getFilename("ruuvi_report", "csv")

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

export function exportCSV(dataIn, sensorName, t) {
    let { csvHeader, data } = processData(dataIn, t)
    var csv = csvHeader.toString() + "\n"
    for (var i = data.length - 1; i >= 0; i--) {
        csv += data[i].toString() + "\n"
    }

    let exportedFilename = getFilename(sensorName, "csv")

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


export function exportMuliSensorXLSX(datain, t, sensorType) {
    let { csvHeader, rows } = processMultiSensorReportData(datain, t, sensorType)

    rows.reverse()

    rows = [csvHeader].concat(rows)

    let exportedFilename = getFilename("ruuvi_report", "xlsx")

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);

    XLSX.utils.book_append_sheet(wb, ws, "Ruuvi");

    XLSX.writeFile(wb, exportedFilename);
}

export function exportXLSX(dataIn, sensorName, t) {
    let { csvHeader, data } = processData(dataIn, t)

    data.reverse()

    data = [csvHeader].concat(data)

    let exportedFilename = getFilename(sensorName, "xlsx")

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, sensorName);

    // Save the workbook as an Excel file
    XLSX.writeFile(wb, exportedFilename);
}

export function exportPDF(sensor, data, graphData, type, from, to, chartRef, t, done) {
    let ezdata = [];
    for (let i = 0; i < graphData.length; i++) {
        if (graphData[i].parsed === null) continue
        ezdata.push({ timestamp: graphData[i].timestamp, value: graphData[i].parsed[type] })
    }

    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < ezdata.length; i++) {
        const value = ezdata[i].value;
        if (value < min) min = value;
        if (value > max) max = value;
    }
    let avg = calculateAverage(ezdata)

    min = getDisplayValue(type, getUnitHelper(type).value(min))
    max = getDisplayValue(type, getUnitHelper(type).value(max))
    avg = getDisplayValue(type, getUnitHelper(type).value(avg))


    const padding = 10
    const width = 210
    const height = 297

    montserratFont()
    oswaldFont()
    mulishFont()

    setTimeout(() => generatePDF(), 500);
    const generatePDF = () => {
        const doc = new jsPDF();

        const logodownsize = 70
        doc.addImage(ruuviLogo, "png", padding, padding - 3, 1500 / logodownsize, 399 / logodownsize)
        doc.setTextColor("#1b4847")
        doc.setFontSize(8)
        doc.setFont("mulish", "regular")
        let text_ruuvi_measurments_report = t("ruuvi_measurements_report")
        doc.text(text_ruuvi_measurments_report, width - padding - doc.getTextWidth(text_ruuvi_measurments_report), padding)

        //let text_page_number = "Page 1/1"
        //doc.text(text_page_number, width - padding - doc.getTextWidth(text_page_number), padding + 5)

        doc.setDrawColor("#cdcdcd")
        let linePos = 18
        let lineBottomPadding = 3
        doc.line(padding, linePos, width - padding, linePos)

        doc.setFontSize(24)
        doc.setFont('montserrat', "extrabold");
        doc.text(sensor.name, padding, linePos + lineBottomPadding + doc.getTextDimensions(sensor.name).h);

        doc.setFontSize(8)
        doc.setFont("mulish", "bold")

        const dateToit = (ts) => {
            var d = new Date(ts);
            return d.getDate() + "." + (d.getMonth() + 1) + "." + (d.getFullYear())
        }
        let text_date = t("dates") + `: ${dateToit(from)} - ${dateToit(to)}`
        doc.text(text_date, width - doc.getTextWidth(text_date) - padding, linePos + lineBottomPadding + doc.getTextDimensions(text_date).h + 1.2)

        //doc.text("Note:", padding, linePos + 20)

        doc.setFontSize(10)
        let text_graph_top_info = t(getUnitHelper(type).label) + ` (${getUnitHelper(type).unit})`
        doc.text(text_graph_top_info, padding, linePos + 31)

        let bottom_info_value_y_pos = linePos + 35 + 75 + 15
        let bottom_info_y_label_pos = bottom_info_value_y_pos + 5
        let box_corner_radius = 2

        let boxes = 5
        let divs = (width - padding * 2) / boxes
        let boxPos = []
        for (let i = 0; i < boxes; i++) {
            boxPos.push(padding + divs * i + 1 - divs / 2 + (boxes % 2 ? divs / 2 : 0))
        }

        doc.setDrawColor("#9cbfb8")

        const drawInfoBox = (value, label, pos, bottom_info_value_y_pos, bottom_info_y_label_pos, box_corner_radius, limitHit) => {
            doc.setFontSize(20);
            doc.setFont('oswald', "bold");

            if (value) {
                var valueDim = doc.getTextDimensions(value.toString())
                doc.text(value.toString(), pos - valueDim.w / 2, bottom_info_value_y_pos);
            }

            doc.setFontSize(9);
            doc.setFont("mulish", "regular")
            doc.text(label, pos - doc.getTextWidth(label) / 2, bottom_info_y_label_pos);

            if (valueDim && valueDim.w !== 0) {
                doc.setFont('oswald', "regular");
                doc.text(getUnitHelper(type).unit, pos + valueDim.w / 2 + 0.2, bottom_info_value_y_pos - valueDim.h / 2 + 0.60)
            }

            if (limitHit !== undefined) {
                // alert box
                let checkmarkSize = 8;
                let alertImage = limitHit ? checkNOK : checkOK
                doc.addImage(alertImage, "png", pos - checkmarkSize / 2, bottom_info_value_y_pos - checkmarkSize + 1, checkmarkSize, checkmarkSize)
            }

            let boxWidth = 18;

            doc.setLineWidth(0.4);
            doc.roundedRect(pos - boxWidth, bottom_info_value_y_pos - 10, boxWidth * 2, 19, box_corner_radius, box_corner_radius);
        }

        let boxidx = 1;
        drawInfoBox(min.toString(), t("graph_stat_min"), boxPos[boxidx++], bottom_info_value_y_pos, bottom_info_y_label_pos, box_corner_radius);
        drawInfoBox(max.toString(), t("graph_stat_max"), boxPos[boxidx++], bottom_info_value_y_pos, bottom_info_y_label_pos, box_corner_radius);
        drawInfoBox(avg.toString(), t("graph_stat_avg"), boxPos[boxidx++], bottom_info_value_y_pos, bottom_info_y_label_pos, box_corner_radius);
        let alertsHit = hasAlertBeenHit(sensor.alerts, data.measurements, type)
        drawInfoBox("", t(alertsHit ? "limits_hit" : "no_limits_hit"), boxPos[boxidx++], bottom_info_value_y_pos, bottom_info_y_label_pos, box_corner_radius, alertsHit);

        let text_timestamp = getTimestamp(new Date())
        let ts_size = doc.getTextDimensions(text_timestamp)

        let text_ruuvicom = t('ruuvi.com')
        doc.text(text_ruuvicom, width / 2 - doc.getTextWidth(text_ruuvicom) / 2, height - padding - ts_size.h)

        doc.setTextColor("#bbbbbb")
        doc.setFontSize(6)
        doc.text(text_timestamp, width / 2 - doc.getTextWidth(text_timestamp) / 2, height - padding)

        const canvas = chartRef.current.querySelector('canvas');
        const pngDataUrl = canvas.toDataURL('image/png');
        const img = new Image();

        img.onload = () => {
            doc.addImage(img, 'PNG', padding - 1, linePos + 35, width - padding * 2, 75);
            doc.save(getFilename(sensor.name, "pdf"));
            done()
        };

        img.src = pngDataUrl;
    }
}
