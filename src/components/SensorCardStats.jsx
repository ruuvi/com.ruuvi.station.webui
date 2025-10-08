import React from "react";
import { Box, GridItem, SimpleGrid, useColorMode } from "@chakra-ui/react";
import i18next from "i18next";
import { getUnitHelper, localeNumber } from "../UnitHelper";
import { ruuviTheme } from "../themes";

const smallSensorValue = {
    fontFamily: "mulish",
    fontSize: 16,
    fontWeight: 800,
};

const smallSensorValueUnit = {
    fontFamily: "mulish",
    fontWeight: 600,
    fontSize: 12,
    marginLeft: 6,
};

const smallSensorLabel = {
    fontFamily: "mulish",
    fontSize: 12,
    opacity: 0.7,
    marginTop: -1,
    marginBottom: 4,
};

export const truncateUnit = (text, maxLength = 15) => {
    if (typeof text !== "string") return text;
    const translated = i18next.t(text);
    if (translated && translated.length > maxLength) {
        return `${translated.substring(0, maxLength)}...`;
    }
    return translated;
};

const SmallStats = ({
    fields,
    latestReading,
    options = {},
    getAlertState,
    t,
}) => {
    if (!latestReading || !fields || !fields.length) return null;

    const { minHeight, opacity = 1, pt = 2, simpleView = false } = options;

    const { colorMode } = useColorMode();

    return (
        <Box minH={minHeight ? `${minHeight}px` : undefined}>
            <SimpleGrid
                pt={pt}
                columns={2}
                style={{
                    width: "100%",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    minHeight: minHeight ? `${minHeight}px` : undefined,
                    opacity,
                }}
            >
                {fields.map((conf) => {
                    const [sensorType, unitKey] = Array.isArray(conf)
                        ? conf
                        : [conf, null];
                    const value = latestReading[sensorType];
                    if (value === undefined || typeof value === "object") return null;

                    const unitHelper = getUnitHelper(sensorType);
                    if (!unitHelper) return null;

                    let showValue = null;
                    let unitLabel = unitHelper.unit;
                    let label = unitHelper.shortLabel || unitHelper.label;

                    if (unitKey && unitHelper.valueWithUnit) {
                        showValue = localeNumber(
                            unitHelper.valueWithUnit(
                                value,
                                unitKey,
                                latestReading.temperature,
                            ),
                            unitHelper.decimals,
                        );

                        const unitDef = unitHelper.units?.find(
                            (u) => u.cloudStoreKey === unitKey,
                        );

                        if (unitDef?.translationKey) {
                            unitLabel = unitDef.translationKey;
                        }

                        const helperWithUnit = getUnitHelper(sensorType, false, unitKey);
                        if (helperWithUnit) {
                            showValue = localeNumber(
                                helperWithUnit.valueWithUnit(
                                    value,
                                    unitKey,
                                    latestReading.temperature,
                                ),
                                helperWithUnit.decimals,
                            );
                            unitLabel = helperWithUnit.unit || unitLabel;
                            label = helperWithUnit.shortLabel || label;
                        }
                    } else {
                        showValue = localeNumber(
                            unitHelper.value(
                                value,
                                sensorType === "humidity"
                                    ? latestReading.temperature
                                    : undefined,
                            ),
                            unitHelper.decimals,
                        );
                    }

                    return (
                        <GridItem
                            key={`${sensorType}${unitKey || ""}`}
                            style={{ alignSelf: "flex-start" }}
                            lineHeight="1.3"
                        >
                            <span
                                style={{
                                    ...smallSensorValue,
                                    color:
                                        getAlertState(sensorType) > 0
                                            ? (colorMode === "light" ? ruuviTheme.colors.sensorCardValueAlertStateLightTheme : ruuviTheme.colors.sensorCardValueAlertState)
                                            : undefined,
                                }}
                            >
                                {showValue == null ? "-" : showValue}
                            </span>
                            <span style={smallSensorValueUnit}>
                                {truncateUnit(unitLabel || "")}
                            </span>
                            {!simpleView && (
                                <div style={smallSensorLabel}>
                                    {typeof label === "object" ? label : t(label)}
                                </div>
                            )}
                        </GridItem>
                    );
                })}
            </SimpleGrid>
        </Box>
    );
};

export default SmallStats;