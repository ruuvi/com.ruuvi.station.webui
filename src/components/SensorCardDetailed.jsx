import React from "react";
import { Box, Flex, Heading, Spinner } from "@chakra-ui/react";
import { Link } from "react-router-dom";
import Graph from "./Graph";
import BigValue from "./BigValue";
import SmallStats from "./SensorCardStats";
import "uplot/dist/uPlot.min.css";
import {
    getDisplayValue,
    getUnitHelper,
    localeNumber,
} from "../UnitHelper";
import bglayer from "../img/bg-layer.png";

const SensorCardDetailed = ({
    sensor,
    size,
    showImage,
    showGraph,
    alertIcon,
    moreMenu,
    altFileUpload,
    latestReading,
    mainStat,
    mainFieldConfig,
    mainStatUnitKey,
    height,
    graphHeight,
    data,
    hasDataForTypes,
    measurements,
    loading,
    loadingHistory,
    errorFetchingData,
    renderNoData,
    noHistoryStr,
    infoRow,
    smallDataFields,
    smallDataMinHeight,
    getAlertState,
    getAlertForGraph,
    dataFrom,
    t,
}) => {
    const isSmallCard = size === "mobile" && !showGraph;

    let minHeight = showGraph ? size === "medium" ? 370 : 420 : 220;

    return (
        <Box>
            {altFileUpload}
            <Box
                className="content sensorCard"
                borderRadius="lg"
                overflow="hidden"
                marginBottom={size === "mobile" ? "10px" : "20px"}
            >
                <Flex>
                    {showImage && (
                        <Box
                            key={`image-${sensor.sensor}-${showImage}`}
                            width="25%"
                            className="imageBackgroundColor"
                            position="relative"
                            backgroundImage={sensor.picture}
                            backgroundSize="cover"
                            backgroundPosition="center"
                            display="flex"
                            flexDirection="column"
                        >
                            <Box
                                className="imageBackgroundOverlay"
                                backgroundImage={bglayer}
                                backgroundSize="cover"
                                backgroundPosition="center"
                                width="100%"
                                flex={1}
                            >
                                <div style={{ height: "100%" }} />
                            </Box>
                        </Box>
                    )}

                    <Box flex={1} display="flex" flexDirection="column" minH={minHeight}>
                        <Box flex={1} p={4} display="flex" flexDirection="column">
                            <Box>
                                <Flex>
                                    <Flex grow={1} width="calc(100% - 40px)">
                                        <Link to={`/${sensor.sensor}`} style={{ width: "100%" }}>
                                            <Heading
                                                size="xs"
                                                style={{
                                                    fontFamily: "montserrat",
                                                    fontSize: 16,
                                                    fontWeight: "bold",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    display: "-webkit-box",
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: "vertical",
                                                    lineHeight: "1.2em",
                                                    maxHeight: "2.4em",
                                                    marginRight: 2,
                                                    wordBreak: "break-word",
                                                    overflowWrap: "break-word",
                                                }}
                                            >
                                                {sensor.name}
                                            </Heading>
                                        </Link>
                                    </Flex>

                                    <Flex width="15px" mt={0.5}>
                                        {alertIcon}
                                    </Flex>
                                    <Flex width="24px" height="20px">
                                        {moreMenu}
                                    </Flex>
                                </Flex>

                                {latestReading && (
                                    <Box>
                                        {(() => {
                                            const unitHelper = getUnitHelper(mainStat);
                                            let showValue;
                                            let unit = unitHelper.unit;

                                            if (
                                                Array.isArray(mainFieldConfig) &&
                                                mainFieldConfig[1] &&
                                                unitHelper.valueWithUnit
                                            ) {
                                                const unitKey = mainFieldConfig[1];
                                                showValue = localeNumber(
                                                    unitHelper.valueWithUnit(
                                                        latestReading[mainStat],
                                                        unitKey,
                                                        latestReading.temperature,
                                                    ),
                                                    unitHelper.decimals,
                                                );

                                                const unitDef = unitHelper.units?.find(
                                                    (u) => u.cloudStoreKey === unitKey,
                                                );
                                                unit = unitDef?.translationKey || unit;

                                                const helperWithUnit = getUnitHelper(
                                                    mainStat,
                                                    false,
                                                    unitKey,
                                                );
                                                if (helperWithUnit) {
                                                    showValue = localeNumber(
                                                        helperWithUnit.valueWithUnit(
                                                            latestReading[mainStat],
                                                            unitKey,
                                                            latestReading.temperature,
                                                        ),
                                                        helperWithUnit.decimals,
                                                    );
                                                    unit = helperWithUnit.unit || unit;
                                                }
                                            } else {
                                                showValue = localeNumber(
                                                    unitHelper.value(
                                                        latestReading[mainStat],
                                                        mainStat === "humidity"
                                                            ? latestReading.temperature
                                                            : undefined,
                                                    ),
                                                    unitHelper.decimals,
                                                );
                                            }

                                            return (
                                                <BigValue
                                                    value={getDisplayValue(mainStat, showValue)}
                                                    unit={t(unit)}
                                                    alertActive={getAlertState(mainStat) > 0}
                                                    label={t(getUnitHelper(mainStat).label)}
                                                />
                                            );
                                        })()}
                                    </Box>
                                )}
                            </Box>

                            {loading ? (
                                <center
                                    style={{
                                        position: "relative",
                                        marginTop: isSmallCard ? 0 : height / 3,
                                        transform: "translateY(-50%)",
                                    }}
                                >
                                    <Spinner size="xl" />
                                </center>
                            ) : (
                                <Flex direction="column" flex={1} justifyContent="space-between">
                                    <Link to={`/${sensor.sensor}`}>
                                        {latestReading ? (
                                            <Flex direction="column" flex={1} justifyContent="space-between">
                                                <Box
                                                    flexGrow={1}
                                                    display="flex"
                                                    flexDir="column"
                                                    justifyContent="space-between"
                                                >
                                                    <div>
                                                        {data &&
                                                            hasDataForTypes.includes(mainStat) &&
                                                            data.measurements.length ? (
                                                            <>
                                                                {showGraph && (
                                                                    <div
                                                                        key={`graph-${sensor.sensor}-${showGraph}-${showImage}-${mainStatUnitKey || ""}`}
                                                                        style={{
                                                                            paddingTop: 10,
                                                                            marginRight: -15,
                                                                            marginBottom: -10,
                                                                        }}
                                                                    >
                                                                        <Graph
                                                                            title=""
                                                                            key={`${sensor.sensor}${showGraph}${showImage}${mainStatUnitKey || ""}`}
                                                                            alert={getAlertForGraph(mainStat)}
                                                                            unit={(() => {
                                                                                const unitHelper = getUnitHelper(mainStat);
                                                                                if (mainStatUnitKey && unitHelper?.units) {
                                                                                    const unitDef = unitHelper.units.find(
                                                                                        (u) => u.cloudStoreKey === mainStatUnitKey,
                                                                                    );
                                                                                    if (unitDef) {
                                                                                        return t(unitDef.translationKey);
                                                                                    }
                                                                                }
                                                                                return unitHelper.unit;
                                                                            })()}
                                                                            unitKey={mainStatUnitKey}
                                                                            dataKey={mainStat}
                                                                            dataName={(() => {
                                                                                const unitHelper = getUnitHelper(mainStat);
                                                                                const baseLabel = t(unitHelper.label);
                                                                                if (mainStatUnitKey && unitHelper?.units) {
                                                                                    const unitDef = unitHelper.units.find(
                                                                                        (u) => u.cloudStoreKey === mainStatUnitKey,
                                                                                    );
                                                                                    if (unitDef) {
                                                                                        const unitText = t(unitDef.translationKey);
                                                                                        return `${baseLabel} (${unitText || unitDef.translationKey})`;
                                                                                    }
                                                                                }
                                                                                return baseLabel;
                                                                            })()}
                                                                            data={measurements}
                                                                            height={graphHeight}
                                                                            legend={false}
                                                                            cardView
                                                                            from={
                                                                                new Date().getTime() -
                                                                                60 * 60 * 1000 * dataFrom
                                                                            }
                                                                        />
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <>
                                                                {showGraph && (
                                                                    <>
                                                                        {loadingHistory ? (
                                                                            <center
                                                                                style={{
                                                                                    fontFamily: "montserrat",
                                                                                    fontSize: 16,
                                                                                    fontWeight: "bold",
                                                                                    height: graphHeight,
                                                                                }}
                                                                            >
                                                                                <div
                                                                                    style={{
                                                                                        position: "relative",
                                                                                        top: "50%",
                                                                                        transform: "translateY(-50%)",
                                                                                    }}
                                                                                >
                                                                                    <Spinner size="xl" />
                                                                                </div>
                                                                            </center>
                                                                        ) : (
                                                                            <Box>
                                                                                {renderNoData(
                                                                                    errorFetchingData
                                                                                        ? t("network_error")
                                                                                        : noHistoryStr,
                                                                                    { simpleView: false, showGraph }
                                                                                )}
                                                                            </Box>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>

                                                    <div
                                                        style={{
                                                            maxWidth:
                                                                size === "mobile" && !showGraph
                                                                    ? "300px"
                                                                    : undefined,
                                                            minHeight: `${smallDataMinHeight}px`,
                                                        }}
                                                    >
                                                        <SmallStats
                                                            fields={smallDataFields}
                                                            latestReading={latestReading}
                                                            getAlertState={getAlertState}
                                                            options={{ pt: 2 }}
                                                            t={t}
                                                        />
                                                    </div>
                                                </Box>
                                            </Flex>
                                        ) : (
                                            <Box pt={4} pb={4} mt={height/4}>
                                                {renderNoData(
                                                    t("no_data").split("\n").map((line) => (
                                                        <div key={line}>{line}</div>
                                                    )),
                                                    { simpleView: false, showGraph }
                                                )}
                                            </Box>
                                        )}
                                    </Link>
                                </Flex>
                            )}
                        </Box>
                        {latestReading && (
                            <Box pr={4} pl={4} pb={2}>
                                {infoRow}
                            </Box>
                        )}
                    </Box>
                </Flex>
            </Box>
        </Box>
    );
};

export default SensorCardDetailed;
