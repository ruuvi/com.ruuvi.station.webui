import React, { Fragment, useCallback, useMemo, useState } from "react";
import { Box, Flex, useColorMode } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import NetworkApi from "../NetworkApi";
import uploadBackgroundImage from "../BackgroundUploader";
import DurationText from "./DurationText";
import UpgradePlanButton from "./UpgradePlanButton";
import RemoveSensorDialog from "./RemoveSensorDialog";
import notify from "../utils/notify";
import { isBatteryLow } from "../utils/battery";
import lowBattery from "../img/low_battery.svg";
import { getAlertIcon, isAlerting } from "../utils/alertHelper";
import useSensorData from "./hooks/useSensorData";
import useSensorFields from "./hooks/useSensorFields";
import SensorCardMenu from "./SensorCardMenu";
import SensorCardSimple from "./SensorCardSimple";
import SensorCardDetailed from "./SensorCardDetailed";
import { DEFAULT_VISIBLE_SENSOR_TYPES } from "../UnitHelper";

const lastUpdatedText = {
    fontFamily: "mulish",
    fontWeight: 600,
    fontSize: 12,
    opacity: 0.5,
};

const SensorCard = ({
    sensor,
    settingsVersion,
    cardType,
    size,
    columnCount = 1,
    dataFrom,
    graphType,
    visibleSensorTypes,
    move,
    share,
    rename,
    remove,
    isPreview = false,
    adaptiveLayout = true
}) => {
    const { t } = useTranslation();
    const [showRemoveDialog, setShowRemoveDialog] = useState(false);

    const showGraph =
        cardType === "graph_view" || cardType === "image_graph_view";
    const showImage = cardType === "image_view" || cardType === "image_graph_view";
    const simpleView = cardType === "simple_view";

    const {
        data,
        latestReading,
        measurements,
        loading,
        loadingHistory,
        errorFetchingData,
        hasDataForTypes,
    } = useSensorData(sensor, dataFrom, { fetchHistory: showGraph });

    const {
        sensorMainFields,
        mainStat,
        mainFieldConfig,
        mainStatUnitKey,
        smallDataFields,
    } = useSensorFields(sensor, latestReading, visibleSensorTypes, graphType, settingsVersion);

    const userEmail = useMemo(() => new NetworkApi().getUser().email, []);
    const isSharedSensor = userEmail !== sensor.owner;

    const height = showGraph ? (size === "medium" ? 300 : 350) : 180;
    const graphHeight = height - 150;

    const smallDataRowHeight = 42;
    const smallDataMinRows = 2;
    const smallDataMinHeight =
        columnCount === 1 || simpleView
            ? 0
            : smallDataRowHeight * smallDataMinRows;

    const { colorMode } = useColorMode();
    const alertIcon = useMemo(() => getAlertIcon(sensor), [sensor], colorMode);

    const freeMode = sensor?.subscription?.maxHistoryDays === 0;
    const sensorHasData =
        sensor.measurements.length === 1 && sensor.measurements[0] !== null;

    const noHistoryStr = useMemo(() => {
        const key = freeMode ? "no_data_free_mode" : "no_data_in_range";
        return t(key)
            .split("\n")
            .map((line) => <div key={line}>{line}</div>);
    }, [freeMode, t]);

    const getAlert = useCallback(
        (type) => {
            if (!sensor) return null;
            if (type === "rssi") type = "signal";
            const alerts = sensor.alerts || [];
            return alerts.find((alert) => alert.type === type) || null;
        },
        [sensor],
    );

    const getAlertState = useCallback(
        (type) => {
            let normalized = Array.isArray(type) ? type[0] : type;
            if (!normalized) return -1;

            if (normalized === "movementCounter") normalized = "movement";
            if (normalized === "rssi") normalized = "signal";

            const alert = getAlert(normalized.toLowerCase());
            if (!alert || !alert.enabled) return -1;
            return isAlerting(sensor, normalized) ? 1 : 0;
        },
        [getAlert, sensor],
    );

    const getAlertForGraph = useCallback(
        (type) => {
            if (!latestReading) return null;
            const dataKey =
                type === "movement"
                    ? "movementCounter"
                    : type === "signal"
                        ? "rssi"
                        : type;
            if (latestReading[dataKey] === undefined) return null;
            return getAlert(type);
        },
        [getAlert, latestReading],
    );

    const stats = useMemo(() => {
        if (sensorMainFields && sensorMainFields.length) {
            const mainIdx = sensorMainFields.findIndex(
                (field) => (Array.isArray(field) ? field[0] : field) === mainStat,
            );
            if (mainIdx > 0) {
                return [
                    sensorMainFields[mainIdx],
                    ...sensorMainFields.slice(0, mainIdx),
                    ...sensorMainFields.slice(mainIdx + 1),
                ];
            }
            return [...sensorMainFields];
        }
        return [...DEFAULT_VISIBLE_SENSOR_TYPES];
    }, [mainStat, sensorMainFields]);

    const renderNoData = useCallback(
        (content, { simpleView: simpleOverride, showGraph: showGraphOverride } = {}) => {
            const effectiveSimpleView =
                typeof simpleOverride === "boolean" ? simpleOverride : simpleView;
            const effectiveShowGraph =
                typeof showGraphOverride === "boolean" ? showGraphOverride : showGraph;

            return (
                <div
                    style={{
                        height: effectiveShowGraph ? graphHeight : undefined,
                    }}
                    className="nodatatext"
                >
                    <div
                        style={{
                            position: "relative",
                            marginTop: effectiveSimpleView ? "4%" : undefined,
                            top:
                                effectiveSimpleView || !effectiveShowGraph
                                    ? undefined
                                    : size === "medium"
                                        ? "44%"
                                        : "50%",
                            transform:
                                effectiveSimpleView || !effectiveShowGraph
                                    ? undefined
                                    : "translateY(-50%)",
                        }}
                    >
                        {content}
                        {freeMode && !isSharedSensor && sensorHasData && (
                            <>
                                <Box mt={2} />
                                <UpgradePlanButton />
                            </>
                        )}
                    </div>
                </div>
            );
        },
        [freeMode, graphHeight, isSharedSensor, sensorHasData, showGraph, simpleView, size],
    );

    let offlineAlertOn = getAlertState("offline") > 0;

    const infoRow = (
        <div
            className="dashboardUpdatedAt"
            style={{ ...lastUpdatedText, width: "100%", opacity: offlineAlertOn ? 1 : 0.5 }}
        >
            <Flex justifyContent="space-between">
                <span>
                    <DurationText
                        from={latestReading ? latestReading.timestamp : " - "}
                        t={t}
                        isAlerting={offlineAlertOn}
                    />
                </span>
                <Flex>
                    {latestReading &&
                        isBatteryLow(latestReading.battery, latestReading.temperature) && (
                            <Fragment>
                                {t("low_battery")}
                                <img
                                    src={lowBattery}
                                    alt={t("low_battery")}
                                    style={{
                                        display: "inline",
                                        alignSelf: "center",
                                        marginLeft: 8,
                                        height: "10px",
                                    }}
                                />
                            </Fragment>
                        )}
                </Flex>
            </Flex>
        </div>
    );

    const uploadLabelId = `fileinputlabel${sensor.sensor}`;
    const uploadInputId = `altup${sensor.sensor}`;

    const moreMenu = (
        <SensorCardMenu
            disabled={isPreview}
            move={move}
            simpleView={simpleView}
            sensor={sensor}
            share={share}
            uploadBg={() => document.getElementById(uploadLabelId)?.click()}
            rename={rename}
            remove={() => setShowRemoveDialog(true)}
        />
    );

    const altFileUpload = (
        <label htmlFor={uploadInputId} id={uploadLabelId}>
            <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                id={uploadInputId}
                onChange={(event) => {
                    uploadBackgroundImage(sensor, event, t, () => { });
                    event.target.value = "";
                }}
            />
        </label>
    );

    const removeSensorDialog = (
        <RemoveSensorDialog
            open={showRemoveDialog}
            sensor={sensor}
            t={t}
            onClose={() => setShowRemoveDialog(false)}
            remove={() => {
                setShowRemoveDialog(false);
                notify.success(t("sensor_removed"));
                remove();
            }}
        />
    );

    const cardShadow = { borderRadius: "8px", height: adaptiveLayout ? undefined : "100%" };
    if (isPreview) {
        cardShadow.boxShadow = "0px 0px 10px #00000030";
    } else {
        cardShadow.boxShadow = "0 2px 2px rgba(0,0,0,0.1), 0 1px 5px rgba(0,0,0,0.02)";
    }

    if (simpleView) {
        return (
            <Box style={cardShadow}>
                <SensorCardSimple
                    sensor={sensor}
                    size={size}
                    adaptiveLayout={adaptiveLayout}
                    latestReading={latestReading}
                    stats={stats}
                    alertIcon={alertIcon}
                    moreMenu={moreMenu}
                    altFileUpload={altFileUpload}
                    infoRow={infoRow}
                    renderNoData={renderNoData}
                    smallDataMinHeight={smallDataMinHeight}
                    getAlertState={getAlertState}
                    t={t}
                />
                {removeSensorDialog}
            </Box>
        );
    }

    return (
        <Box style={cardShadow}>
            <SensorCardDetailed
                sensor={sensor}
                settingsVersion={settingsVersion}
                size={size}
                adaptiveLayout={adaptiveLayout}
                showImage={showImage}
                showGraph={showGraph}
                alertIcon={alertIcon}
                moreMenu={moreMenu}
                altFileUpload={altFileUpload}
                latestReading={latestReading}
                mainStat={mainStat}
                mainFieldConfig={mainFieldConfig}
                mainStatUnitKey={mainStatUnitKey}
                height={height}
                graphHeight={graphHeight}
                data={data}
                hasDataForTypes={hasDataForTypes}
                measurements={measurements}
                loading={loading}
                loadingHistory={loadingHistory}
                errorFetchingData={errorFetchingData}
                renderNoData={renderNoData}
                noHistoryStr={noHistoryStr}
                infoRow={infoRow}
                smallDataFields={smallDataFields}
                smallDataMinHeight={smallDataMinHeight}
                getAlertState={getAlertState}
                getAlertForGraph={getAlertForGraph}
                dataFrom={dataFrom}
                t={t}
            />
            {removeSensorDialog}
        </Box>
    );
};

export default SensorCard;