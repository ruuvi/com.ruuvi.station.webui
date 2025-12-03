import { useMemo } from "react";
import {
    DEFAULT_VISIBLE_SENSOR_TYPES,
    getUnitHelper,
    getSensorTypeOnly,
    getUnitOnly,
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

    // Parse graphType to extract sensor type and unit key for humidity variants
    const parsedGraphType = useMemo(() => {
        if (graphType === null) return { sensorType: null, unitKey: null };
        const sensorType = getSensorTypeOnly(graphType);
        // Only extract unitKey if there's actually an underscore in the graphType
        const hasUnitSuffix = graphType.includes("_");
        const unitKey = hasUnitSuffix ? getUnitOnly(graphType) : null;
        return { sensorType, unitKey };
    }, [graphType]);

    const mainStat = useMemo(() => {
        if (graphType === null) {
            if (sensorMainFields && sensorMainFields.length > 0) {
                const firstField = sensorMainFields[0];
                return Array.isArray(firstField) ? firstField[0] : firstField;
            }
            return "temperature";
        }
        // Use the sensor type only (e.g., "humidity" from "humidity_0")
        return parsedGraphType.sensorType || "temperature";
    }, [graphType, sensorMainFields, parsedGraphType.sensorType]);

    const mainFieldConfig = useMemo(
        () =>
            sensorMainFields.find((field) =>
                Array.isArray(field) ? field[0] === mainStat : field === mainStat,
            ),
        [mainStat, sensorMainFields],
    );

    const mainStatUnitKey = useMemo(() => {
        // If graphType specifies a unit key (e.g., humidity_0 -> "0"), use it
        if (parsedGraphType.unitKey !== null) {
            return parsedGraphType.unitKey;
        }
        // Otherwise, use the unit key from the field config
        return Array.isArray(mainFieldConfig) ? mainFieldConfig[1] : null;
    }, [mainFieldConfig, parsedGraphType.unitKey]);

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
