// Facade kept for backwards compatibility — the implementation lives in
// src/units/. New code should import from there directly.

export { getSetting, getUnitSettingFor } from "./units/settings";
export {
    humidityToUserFormat,
    pressureFromUserFormat,
    pressureToUserFormat,
    round,
    temperatureFromUserFormat,
    temperatureToUserFormat
} from "./units/conversions";
export {
    allUnits,
    DEFAULT_VISIBLE_SENSOR_TYPES,
    displayDecimalsFor,
    getMaxDecimals,
    getSensorTypeOnly,
    getUnitFor,
    getUnitHelper,
    getUnitOnly
} from "./units/sensorTypes";
export { getDisplayValue, localeNumber } from "./units/format";
export { alertTypes, getAlertRange } from "./units/alerts";
