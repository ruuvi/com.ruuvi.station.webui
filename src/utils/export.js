import { getDisplayValue, getUnitHelper, round, DEFAULT_VISIBLE_SENSOR_TYPES } from "../UnitHelper";
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
import { ORDERED_VISIBILITY_CODES, visibilityFromCloudToWeb } from "./cloudTranslator";

function processData(data, t) {
    // Determine available sensor types based on data format
    const availableSensorTypes = ["temperature", "humidity", "pressure", "rssi", "accelerationX", "accelerationY", "accelerationZ", "battery", "movementCounter", "measurementSequenceNumber"]

    if (data.measurements.length > 0 && data.measurements[0].parsed !== null) {
        if (data.measurements[0].parsed.dataFormat === "e0") {
            availableSensorTypes.push("co2", "voc", "nox", "pm10", "pm25", "pm40", "pm100", "illuminance", "soundLevelAvg", "soundLevelPeak", "aqi")
        } else if (data.measurements[0].parsed.dataFormat === "e1") {
            availableSensorTypes.push("co2", "voc", "nox", "pm10", "pm25", "pm40", "pm100", "aqi")
            let opts = ["illuminance", "soundLevelAvg", "soundLevelPeak", "soundLevelInstant"]
            opts.forEach(x => {
                if (data.measurements[0].parsed[x] !== undefined) {
                    availableSensorTypes.push(x)
                }
            })
            // Remove types not available in e1 format
            const toRemove = ["accelerationX", "accelerationY", "accelerationZ", "battery", "movementCounter"]
            toRemove.forEach(type => {
                const idx = availableSensorTypes.indexOf(type)
                if (idx !== -1) availableSensorTypes.splice(idx, 1)
            })
        }
    }

    // Build column definitions using the ordered visibility codes
    const columnDefs = []
    const addedColumns = new Set()
    const addedSensorTypes = new Set()

    // Process visibility codes in order
    ORDERED_VISIBILITY_CODES.forEach(cloudCode => {
        const mapping = visibilityFromCloudToWeb(cloudCode)
        if (!mapping) return

        const [sensorType, unitKey] = mapping

        // Skip if sensor doesn't have this type
        if (!availableSensorTypes.includes(sensorType)) return

        // Create unique key for this column
        const columnKey = `${sensorType}_${unitKey}`
        if (addedColumns.has(columnKey)) return
        addedColumns.add(columnKey)

        // Track that we've seen this sensor type
        const baseHelper = getUnitHelper(sensorType, true)
        if (!baseHelper.units || baseHelper.units.length === 0) {
            // For single-unit types, mark the sensor type as fully processed
            addedSensorTypes.add(sensorType)
        }

        // Get the helper for this specific unit variant
        const helper = getUnitHelper(sensorType, true, unitKey)
        columnDefs.push({
            sensorType,
            unitKey: unitKey || null,
            helper
        })
    })

    // Add any remaining sensor types not covered by visibility codes
    availableSensorTypes.forEach(sensorType => {
        // Skip if this sensor type was already fully processed
        if (addedSensorTypes.has(sensorType)) return

        const baseHelper = getUnitHelper(sensorType, true)

        // Check if we need to add this type
        if (baseHelper.units && baseHelper.units.length > 0) {
            // For types with multiple units, check each variant
            baseHelper.units.forEach(unitDef => {
                const columnKey = `${sensorType}_${unitDef.cloudStoreKey}`
                if (!addedColumns.has(columnKey)) {
                    addedColumns.add(columnKey)
                    const helper = getUnitHelper(sensorType, true, unitDef.cloudStoreKey)
                    columnDefs.push({
                        sensorType,
                        unitKey: unitDef.cloudStoreKey,
                        helper
                    })
                }
            })
        } else {
            // Single unit type
            const columnKey = `${sensorType}_null`
            if (!addedColumns.has(columnKey)) {
                addedColumns.add(columnKey)
                columnDefs.push({
                    sensorType,
                    unitKey: null,
                    helper: baseHelper
                })
            }
        }
    })

    // Create CSV header
    var csvHeader = [t('date')]
    columnDefs.forEach(colDef => {
        let header = t(colDef.helper.exportLabel || colDef.helper.shortLabel || colDef.helper.label)
        if (colDef.sensorType === "rssi") header = "RSSI"
        if (header === "Tx Power") header = "TX Power"
        if (!colDef.helper.noUnitInExport && colDef.helper.unit) {
            header += ` (${t(colDef.helper.unit)})`
        }
        csvHeader.push(header)
    })

    // Map data rows
    data = data.measurements.map(x => {
        let row = [toISOString(new Date(x.timestamp * 1000))]
        columnDefs.forEach(colDef => {
            const sensorType = colDef.sensorType
            const helper = colDef.helper
            const rawValue = x.parsed[sensorType]
            let val

            // Calculate value based on type
            if (colDef.unitKey !== null && helper.valueWithUnit) {
                // Use valueWithUnit for types with multiple units
                if (sensorType === "humidity") {
                    val = helper.valueWithUnit(rawValue, colDef.unitKey, x.parsed.temperature)
                } else {
                    val = helper.valueWithUnit(rawValue, colDef.unitKey)
                }
            } else {
                // Use regular value function
                if (sensorType === "humidity") {
                    val = helper.value(rawValue, x.parsed.temperature)
                } else {
                    val = helper.value(rawValue)
                }
            }

            if (isNaN(val)) val = ""
            else if (sensorType === "aqi") val = round(val, 1)

            row.push(val)
        })
        return row
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
    if (unitObj && unitObj.cloudStoreKey) {
        uHelpV = getUnitHelper(sensorType, true, unitObj.cloudStoreKey)
        unit = t(uHelpV.label || uHelpV.shortLabel) + " (" + uHelpV.unit + ")"
    } else if (!unit) {
        unit = uHelpV.unit
    }

    var csvHeader = [t('date')];
    for (let i = 0; i < data.length; i++) {
        let unitDisplay;
        if (unitObj && unitObj.cloudStoreKey) {
            unitDisplay = unit;
        } else if (!unit || unit === "") {
            unitDisplay = t(uHelpV.exportLabel || uHelpV.label);
        } else {
            unitDisplay = t(unit);
        }
        csvHeader.push(data[i].name + " (" + unitDisplay + ")");
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

    const measurementMaps = data.map(sensorData => {
        const map = new Map()
        for (const measurement of sensorData.measurements) {
            map.set(measurement.timestamp, measurement)
        }
        return map
    })

    let rows = []
    for (let i = 0; i < timestampsWithData.length; i++) {
        let row = [toISOString(new Date(timestampsWithData[i] * 1000))]
        const timestamp = timestampsWithData[i]

        for (let j = 0; j < data.length; j++) {
            let val = ""
            const measurement = measurementMaps[j].get(timestamp)

            if (measurement) {
                switch (sensorType) {
                    case "temperature":
                        val = unitHelper.value(measurement.parsed[sensorType], undefined, settings)
                        break
                    case "humidity":
                        val = unitHelper.value(measurement.parsed[sensorType], measurement.parsed.temperature, settings)
                        break
                    default:
                        val = unitHelper.value(measurement.parsed[sensorType], settings)
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
