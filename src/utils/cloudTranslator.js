// Ordered list of visibility codes for consistent display order across the app
export const ORDERED_VISIBILITY_CODES = [
    "AQI_INDEX",
    "CO2_PPM",
    "PM10_MGM3",              // PM1
    "PM25_MGM3",              // PM2.5
    "PM40_MGM3",              // PM4
    "PM100_MGM3",             // PM10
    "VOC_INDEX",
    "NOX_INDEX",
    "TEMPERATURE_C",
    "TEMPERATURE_F",
    "TEMPERATURE_K",
    "HUMIDITY_0",             // Relative humidity
    "HUMIDITY_1",             // Absolute humidity
    "HUMIDITY_2",             // Dew point
    "PRESSURE_1",             // hPa
    "PRESSURE_0",             // Pa
    "PRESSURE_2",             // mmHg
    "PRESSURE_3",             // inHg
    "MOVEMENT_COUNT",
    "SOUNDINSTANT_DBA",
    "SOUNDAVG_DBA",
    "SOUNDPEAK_DBA",
    "LUMINOSITY_LX",
    "BATTERY_VOLT",
    "ACCELERATION_GX",
    "ACCELERATION_GY",
    "ACCELERATION_GZ",
    "SIGNAL_DBM",
];

export const visibilityCodes = [
    ["AQI_INDEX", "aqi", "index"],
    ["CO2_PPM", "co2", "ppm"],
    ["PM10_MGM3", "pm10", "mg/m3"],
    ["PM25_MGM3", "pm25", "mg/m3"],
    ["PM40_MGM3", "pm40", "mg/m3"],
    ["PM100_MGM3", "pm100", "mg/m3"],
    ["VOC_INDEX", "voc", "index"],
    ["TVOC_ETHANOL_MGM3", "voc", "ethanol_mgm3"],
    ["TVOC_ISOBUTYLENE_MGM3", "voc", "isobutylene_mgm3"],
    ["TVOC_MOLHAVE_MGM3", "voc", "molhave_mgm3"],
    ["NOX_INDEX", "nox", "index"],
    ["TEMPERATURE_C", "temperature", "C"],
    ["TEMPERATURE_F", "temperature", "F"],
    ["TEMPERATURE_K", "temperature", "K"],
    ["HUMIDITY_0", "humidity", "0"],
    ["HUMIDITY_1", "humidity", "1"],
    ["HUMIDITY_2", "humidity", "2"],
    ["PRESSURE_1", "pressure", "1"],
    ["PRESSURE_0", "pressure", "0"],
    ["PRESSURE_2", "pressure", "2"],
    ["PRESSURE_3", "pressure", "3"],
    ["MOVEMENT_COUNT", "movementCounter", ""],
    ["SOUNDINSTANT_DBA", "soundLevelInstant", "dBA"],
    ["SOUNDAVG_DBA", "soundLevelAvg", "dBA"],
    ["SOUNDPEAK_DBA", "soundLevelPeak", "dBA"],
    ["LUMINOSITY_LX", "illuminance", "lx"],
    ["BATTERY_VOLT", "battery", "volt"],
    ["ACCELERATION_GX", "accelerationX", "g"],
    ["ACCELERATION_GY", "accelerationY", "g"],
    ["ACCELERATION_GZ", "accelerationZ", "g"],
    ["SIGNAL_DBM", "rssi", "dBm"],
];

export function visibilityFromCloudToWeb(code) {
    const found = visibilityCodes.find(([cloudCode]) => cloudCode === code);
    if (found) {
        return [found[1], found[2]]; // return [type, unit]
    }
    //console.warn(`Unknown visibility code: ${code}`);
    return null;
}

export function visibilityFromWebToCloud(unit, type) {
    const found = visibilityCodes.find(([, webType, webUnit]) => 
        webType === type && webUnit === unit
    );
    if (found) {
        return found[0]; // return cloud code
    }
    //console.warn(`Unknown visibility unit: ${unit} for type: ${type}`);
    return null;
}