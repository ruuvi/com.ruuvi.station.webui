import { useMemo } from "react";
import {
    DEFAULT_VISIBLE_SENSOR_TYPES,
    getUnitHelper,
} from "../../UnitHelper";
import { visibilityFromCloudToWeb } from "../../utils/cloudTranslator";

export const parseDisplayOrderToWebTypes = (displayOrder) => {
    try {
        const webTypes = [];
        const cloudTypes = JSON.parse(displayOrder);
        for (const cloudType of cloudTypes) {
            const webType = visibilityFromCloudToWeb(cloudType);
            if (webType) {
                webTypes.push(webType);
            }
        }
        return webTypes.length ? webTypes : DEFAULT_VISIBLE_SENSOR_TYPES;
    } catch (error) {
        console.warn("Failed to parse displayOrder, using default", error);
        return DEFAULT_VISIBLE_SENSOR_TYPES;
    }
};

const useSensorFields = (sensor, latestReading, visibleSensorTypes, graphType) => {
    const sensorMainFields = useMemo(() => {
        let arr = ["humidity", "pressure", "movementCounter"];
        if (!latestReading) return arr;
        if (latestReading.dataFormat === 6) arr = ["pm1p0", "co2", "voc"];
        if (latestReading.dataFormat === "e0" || latestReading.dataFormat === "e1") arr = ["aqi", "co2", "pm25", "voc", "nox", "humidity", "pressure", "illuminance", "soundLevelInstant"];
        if ((graphType || "temperature") !== "temperature") {
            arr.push("temperature");
        }
        return arr;

        if (visibleSensorTypes && visibleSensorTypes !== "default") {
            return parseDisplayOrderToWebTypes(
                JSON.stringify(visibleSensorTypes),
            );
        }

        if (!latestReading) return [];

        const settings = sensor.settings;
        let visibleTypes = DEFAULT_VISIBLE_SENSOR_TYPES;

        if (settings?.defaultDisplayOrder === "true" || visibleSensorTypes === "default") {
            visibleTypes = DEFAULT_VISIBLE_SENSOR_TYPES;
        } else if (settings?.displayOrder && settings.displayOrder.length > 0) {
            visibleTypes = parseDisplayOrderToWebTypes(settings.displayOrder);
        }

        const allReadingKeys = Object.keys(latestReading);
        const effectiveVisibleTypes =
            visibleTypes && visibleTypes.length > 0
                ? visibleTypes
                : DEFAULT_VISIBLE_SENSOR_TYPES;

        return effectiveVisibleTypes.filter((type) => {
            const typeName = Array.isArray(type) ? type[0] : type;
            return allReadingKeys.includes(typeName) && getUnitHelper(typeName).graphable;
        });
    }, [latestReading, sensor.settings, visibleSensorTypes]);

    const mainStat = useMemo(() => {
        if (graphType === null) {
            if (sensorMainFields && sensorMainFields.length > 0) {
                const firstField = sensorMainFields[0];
                return Array.isArray(firstField) ? firstField[0] : firstField;
            }
            return "temperature";
        }
        return graphType || "temperature";
    }, [graphType, sensorMainFields]);

    const mainFieldConfig = useMemo(
        () =>
            sensorMainFields.find((field) =>
                Array.isArray(field) ? field[0] === mainStat : field === mainStat,
            ),
        [mainStat, sensorMainFields],
    );

    const mainStatUnitKey = useMemo(
        () => (Array.isArray(mainFieldConfig) ? mainFieldConfig[1] : null),
        [mainFieldConfig],
    );

    const smallDataFields = useMemo(() => {
        if (!sensorMainFields.length || !mainFieldConfig) return sensorMainFields;

        return sensorMainFields.filter((type) => {
            if (Array.isArray(type) && Array.isArray(mainFieldConfig)) {
                return !(type[0] === mainFieldConfig[0] && type[1] === mainFieldConfig[1]);
            }
            if (!Array.isArray(type) && !Array.isArray(mainFieldConfig)) {
                return type !== mainFieldConfig;
            }
            return true;
        });
    }, [mainFieldConfig, sensorMainFields]);

    return {
        sensorMainFields,
        mainStat,
        mainFieldConfig,
        mainStatUnitKey,
        smallDataFields,
    };
};

export default useSensorFields;
