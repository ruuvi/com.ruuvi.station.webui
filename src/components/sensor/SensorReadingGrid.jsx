import React from "react";
import { Box } from "@chakra-ui/react"
import SensorReading from "./SensorReading";
import { getUnitHelper, localeNumber, getUnitSettingFor } from "../../UnitHelper";
import { isBatteryLow } from "../../utils/battery";
import useIsLargeDisplay from "../hooks/useIsLargeDisplay";

function SensorReadingGrid(props) {
    const { fields, latestReading, graphKey, graphUnitKey, isAlertTriggered, onFieldClick, readOnly = false } = props;
    const isLargeDisplay = useIsLargeDisplay();
    const columns = readOnly
        ? `repeat(auto-fit, minmax(min(100%, ${isLargeDisplay ? "200px" : "140px"}), 1fr))`
        : `repeat(auto-fit, minmax(${isLargeDisplay ? "220px" : "45%"}, max-content))`;
    return <Box style={{ marginBottom: 30, marginTop: 30 }} justifyItems={readOnly ? "stretch" : "start"} display="grid" gap="10px" gridTemplateColumns={columns}>
        {latestReading && fields.map(field => {
            let sensorType = field;
            let unitKey = null;
            if (Array.isArray(field)) {
                sensorType = field[0];
                unitKey = field[1];
            }
            const unitHelper = getUnitHelper(sensorType);
            if (!unitHelper) return null;
            const rawValue = latestReading[sensorType];
            if (rawValue === undefined) return null;
            let unitDisplay = unitHelper.unit;
            let label = unitHelper.shortLabel || unitHelper.label;
            let infoLabel = unitHelper.infoLabel;
            let showValue;
            if (unitKey && unitHelper.valueWithUnit) {
                const uDef = unitHelper.units?.find(u => u.cloudStoreKey === unitKey);
                if (uDef?.translationKey) unitDisplay = uDef.translationKey;
                if (uDef?.infoLabel) infoLabel = uDef.infoLabel;
                const uhWithUnit = getUnitHelper(sensorType, false, unitKey);
                if (uhWithUnit) {
                    showValue = localeNumber(uhWithUnit.valueWithUnit(rawValue, unitKey, latestReading["temperature"]), uhWithUnit.decimals);
                    unitDisplay = uhWithUnit.unit;
                    label = uhWithUnit.shortLabel || unitHelper.shortLabel || uhWithUnit.label;
                } else {
                    showValue = localeNumber(unitHelper.valueWithUnit(rawValue, unitKey, latestReading["temperature"]), unitHelper.decimals);
                }
            } else {
                showValue = localeNumber(
                    unitHelper.value(rawValue, sensorType === "humidity" ? latestReading["temperature"] : undefined),
                    unitHelper.decimals
                );
            }
            const selected = graphKey === sensorType && (
                (graphUnitKey || null) === (unitKey || null) ||
                (!unitKey && graphUnitKey === getUnitSettingFor(sensorType))
            );

            return (
                <SensorReading
                    key={sensorType + (unitKey || "")}
                    value={showValue || "-"}
                    info={sensorType !== "battery" ? undefined :
                        isBatteryLow(rawValue, latestReading.temperature) ? "replace_battery" : "battery_ok"
                    }
                    alertTriggered={isAlertTriggered(sensorType)}
                    label={label}
                    infoLabel={infoLabel}
                    sensorType={sensorType}
                    unit={unitDisplay}
                    selected={!readOnly && selected}
                    onClick={readOnly ? undefined : () => onFieldClick([sensorType, unitKey])}
                />
            );
        })}
    </Box>
}

export default SensorReadingGrid;
