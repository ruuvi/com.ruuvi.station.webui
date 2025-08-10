export const visibilityCodes = [
    ["TEMPERATURE_C", "temperature", "C"],
    ["TEMPERATURE_F", "temperature", "F"],
    ["TEMPERATURE_K", "temperature", "K"],
    ["HUMIDITY_0", "humidity", "0"],
    ["HUMIDITY_1", "humidity", "1"],
    ["HUMIDITY_2", "humidity", "2"],
    ["PRESSURE_0", "pressure", "0"],
    ["PRESSURE_1", "pressure", "1"],
    ["PRESSURE_2", "pressure", "2"],
    ["PRESSURE_3", "pressure", "3"],
    ["AQI_INDEX", "aqi", "index"],
    ["LUMINOSITY_LX", "illuminance", "lx"],
    ["SOUNDAVG_DBA", "soundLevelAvg", "dBA"],
    ["CO2_PPM", "co2", "ppm"],
    ["VOC_INDEX", "voc", "index"],
    ["TVOC_ETHANOL_MGM3", "voc", "ethanol_mgm3"],
    ["TVOC_ISOBUTYLENE_MGM3", "voc", "isobutylene_mgm3"],
    ["TVOC_MOLHAVE_MGM3", "voc", "molhave_mgm3"],
    ["NOX_INDEX", "nox", "index"],
    ["PM10_MGM3", "pm10", "mg/m3"],
    ["PM25_MGM3", "pm25", "mg/m3"],
    ["PM40_MGM3", "pm40", "mg/m3"],
    ["PM100_MGM3", "pm100", "mg/m3"],
    ["SOUNDPEAK_DBA", "soundPeak", "dBA"],
    ["BATTERY_VOLT", "battery", "volt"],
    ["ACCELERATION_GY", "accelerationY", "g"],
    ["ACCELERATION_GX", "accelerationX", "g"],
    ["ACCELERATION_GZ", "accelerationZ", "g"],
    ["MOVEMENT_COUNT", "movementCounter", "count"],
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