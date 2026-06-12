// Conversions between raw sensor values (°C, Pa, RH%, VOC index, …) and the
// unit the user has selected in settings.

import { relativeToAbsolute, relativeToDewpoint } from "../utils/humidity";
import { readSettings } from "./settings";

export function round(number, decimals) {
    var f = Math.pow(10, decimals);
    return Math.round(number * f) / f;
}

// `offset` marks the value as a temperature delta (e.g. a calibration
// offset): deltas scale to °F without the +32, and a °C delta already
// equals a K delta.
export function temperatureToUserFormat(temperature, offset, settings) {
    offset = offset === true;
    if (!settings) settings = readSettings();
    if (settings.UNIT_TEMPERATURE === "F") {
        temperature = (temperature * 1.8) + (offset ? 0 : 32);
    } else if (!offset && settings.UNIT_TEMPERATURE === "K") {
        temperature = temperature + 273.15;
    }
    return round(temperature, 2);
}

export function temperatureFromUserFormat(temperature) {
    const settings = readSettings();
    if (settings.UNIT_TEMPERATURE === "F") {
        temperature = (temperature - 32) / 1.8;
    } else if (settings.UNIT_TEMPERATURE === "K") {
        temperature = temperature - 273.15;
    }
    return round(temperature, 2);
}

// UNIT_HUMIDITY: 0 = Relative (%), 1 = Absolute (g/m³), 2 = Dew point (°)
export function humidityToUserFormat(humidity, temperature, settings) {
    if (!settings) settings = readSettings();
    if (settings.UNIT_HUMIDITY === "1") {
        humidity = relativeToAbsolute(humidity, temperature);
    } else if (settings.UNIT_HUMIDITY === "2") {
        humidity = relativeToDewpoint(humidity, temperature, settings.UNIT_TEMPERATURE);
    }
    return round(humidity, 2);
}

// Pa per selected pressure unit, keyed by UNIT_PRESSURE:
// 0 = Pa, 1 = hPa (default), 2 = mmHg, 3 = inHg
const PASCALS_PER_UNIT = {
    "0": 1,
    "1": 100,
    "2": 133.322368,
    "3": 3386.388666
};

function pascalsPerUnit(settings) {
    return PASCALS_PER_UNIT[settings.UNIT_PRESSURE] ?? PASCALS_PER_UNIT["1"];
}

export function pressureToUserFormat(pressure, settings) {
    if (!settings) settings = readSettings();
    return round(pressure / pascalsPerUnit(settings), 2);
}

export function pressureFromUserFormat(pressure, settings) {
    if (!settings) settings = readSettings();
    return round(pressure * pascalsPerUnit(settings), 2);
}

// VOC index → mg/m³, via ethanol-equivalent ppb. The log curve inverts the
// sensor's index mapping; the per-substance factors are response factors
// relative to ethanol (Mølhave is the TVOC reference mixture).
const VOC_INDEX_LN_OFFSET = 6.24;
const VOC_INDEX_PPB_SCALE = -381.97;
const ETHANOL_PPB_PER_MGM3 = 1.8843;
const ISOBUTYLENE_MGM3_PER_PPB = 2.3;
const MOLHAVE_MGM3_PER_PPB = 4.5;

export function vocToUserFormat(value, unitKey) {
    const ethanolPpb = (Math.log(501 - value) - VOC_INDEX_LN_OFFSET) * VOC_INDEX_PPB_SCALE;
    switch (unitKey) {
        case "ethanol_mgm3":
            return ethanolPpb / ETHANOL_PPB_PER_MGM3;
        case "isobutylene_mgm3":
            return ethanolPpb * ISOBUTYLENE_MGM3_PER_PPB;
        case "molhave_mgm3":
            return ethanolPpb * MOLHAVE_MGM3_PER_PPB;
        default:
            return value; // index
    }
}
