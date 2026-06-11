import NetworkApi from "../NetworkApi";
import { DEFAULT_VISIBLE_SENSOR_TYPES, getUnitHelper } from "../UnitHelper";
import { parseDisplayOrderToWebTypes } from "../components/hooks/useSensorFields";

export function getLatestReading(sensor) {
    const lastParsedReading = sensor.measurements.length === 1 ? sensor.measurements[0] : null;
    if (!lastParsedReading) return null;
    return { ...lastParsedReading.parsed, timestamp: lastParsedReading.timestamp };
}

export function sensorHasData(sensor) {
    return getLatestReading(sensor) !== null;
}

export function getSensorMainFields(sensor) {
    const readings = getLatestReading(sensor);
    if (!readings) return [];

    const settings = sensor.settings;
    let visibleTypes = DEFAULT_VISIBLE_SENSOR_TYPES;
    if (settings?.defaultDisplayOrder !== "true" && settings?.displayOrder && settings.displayOrder.length > 0) {
        visibleTypes = parseDisplayOrderToWebTypes(settings.displayOrder);
    }

    const allReadingKeys = Object.keys(readings);
    return visibleTypes.filter(type => {
        const name = Array.isArray(type) ? type[0] : type;
        return allReadingKeys.includes(name) && getUnitHelper(name).graphable;
    });
}

export function getAlert(sensor, type) {
    if (!sensor) return null;
    if (type === "rssi") type = "signal";
    return sensor.alerts.find(x => x.type === type) || null;
}

export function isSharedSensor(sensor) {
    const user = new NetworkApi().getUser().email;
    return user !== sensor.owner;
}
