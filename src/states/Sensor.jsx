import React, { useEffect, useRef, useState } from "react";
import logger from "../utils/logger";
import NetworkApi from '../NetworkApi'
import {
    Box,
    Spinner,
    Flex,
} from "@chakra-ui/react"
import 'uplot/dist/uPlot.min.css';
import Graph from "../components/Graph";
import parse from "../decoder/parser";
import { withTranslation } from 'react-i18next';
import { getUnitHelper, getUnitSettingFor } from "../UnitHelper";
import { exportCSV, exportPDF, exportXLSX } from "../utils/export";
import withRouter from "../utils/withRouter"
import Store from "../Store";
import EditNameDialog from "../components/EditNameDialog";
import { uppercaseFirst } from "../TextHelper";
import OffsetDialog from "../components/OffsetDialog";
import DurationPicker from "../components/DurationPicker";
import notify from "../utils/notify"
import pjson from '../../package.json';
import uploadBackgroundImage from "../BackgroundUploader";
import ScreenSizeWrapper from "../components/ScreenSizeWrapper";
import { isAlerting } from "../utils/alertHelper";
import RemoveSensorDialog from "../components/RemoveSensorDialog";
import ExportMenu from "../components/ExportMenu";
import UpgradePlanButton from "../components/UpgradePlanButton";
import ZoomInfo from "../components/ZoomInfo";
import SensorTypeVisibilityDialog from "../components/SensorTypeVisibilityDialog";
import NotesDialog from "../components/NotesDialog";
import SensorHeader from "../components/SensorHeader";
import SensorReadingGrid from "../components/SensorReadingGrid";
import SensorSettings from "../components/SensorSettings";
import {
    getAlert,
    getLatestReading,
    getSensorMainFields,
    isSharedSensor,
    sensorHasData,
} from "../utils/sensorHelper";

const graphLoadingOverlay = {
    position: "absolute",
    width: "100%",
    height: "450px",
    zIndex: 1,
}

const graph = {
    position: "relative",
    zIndex: 0,
    paddingLeft: 10,
    float: "left",
    width: "100%",
    height: "450px"
}

let alertDebouncer = {}

function Sensor(props) {
    const { t, sensor, router } = props;

    const getInitialGraphKey = () => {
        const queryParams = new URLSearchParams(router.location.search);
        const graphKeyFromUrl = queryParams.get('key');
        const graphUnitKeyFromUrl = queryParams.get('unit');

        let initialGraphKey = "temperature";
        let initialGraphUnitKey = null;
        const keys = getSensorMainFields(sensor);
        if (keys.length > 0) {
            const first = keys[0];
            if (Array.isArray(first)) {
                initialGraphKey = first[0];
                initialGraphUnitKey = first[1];
            } else {
                initialGraphKey = first;
            }
        }

        let graphUnitKey = graphUnitKeyFromUrl || initialGraphUnitKey;
        if (!graphUnitKey) {
            graphUnitKey = getUnitSettingFor(graphKeyFromUrl || initialGraphKey);
        }

        return {
            graphKey: graphKeyFromUrl || initialGraphKey,
            graphUnitKey: graphUnitKeyFromUrl || graphUnitKey,
        };
    };

    const initial = getInitialGraphKey();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [graphKey, setGraphKeyState] = useState(initial.graphKey);
    const [graphUnitKey, setGraphUnitKey] = useState(initial.graphUnitKey);
    const [from, setFrom] = useState(Store.getGraphFrom() || 24);
    const [to, setTo] = useState(null);
    const [editName, setEditName] = useState(false);
    const [offsetDialog, setOffsetDialog] = useState(null);
    const [loadingImage, setLoadingImage] = useState(false);
    const [updateGraphKey, setUpdateGraphKey] = useState(0);
    const [graphPDFMode, setGraphPDFMode] = useState(false);
    const [sensorVisibilityDialog, setSensorVisibilityDialog] = useState(false);
    const [notesDialog, setNotesDialog] = useState(false);
    const [showRemoveSensor, setShowRemoveSensor] = useState(false);

    // Refs for values accessed inside async functions to avoid stale closures
    const dataRef = useRef(null);
    dataRef.current = data;
    const fromRef = useRef(from);
    fromRef.current = from;
    const toRef = useRef(to);
    toRef.current = to;
    const propsRef = useRef(props);
    propsRef.current = props;

    const isLoadingRef = useRef(false);
    const chartRef = useRef(null);
    const latestDataUpdateRef = useRef(null);
    const loadDataRef = useRef(null);

    function isAlertTriggered(type) {
        if (type === "movementCounter") type = "movement";
        if (type === "rssi") type = "signal";
        const alert = getAlert(sensor, type);
        if (!alert) return false;
        return isAlerting(sensor, type);
    }

    function getGraphData() {
        if (!dataRef.current?.measurements?.length) return [];
        return dataRef.current.measurements;
    }

    function getSelectedUnit(currentGraphKey, currentGraphUnitKey) {
        const gKey = currentGraphKey ?? graphKey;
        const gUnitKey = currentGraphUnitKey ?? graphUnitKey;
        if (gKey === "measurementSequenceNumber") return "";
        const uh = getUnitHelper(gKey);
        if (gUnitKey && uh?.units) {
            const uDef = uh.units.find(u => u.cloudStoreKey === gUnitKey);
            if (uDef) {
                const translatedUnit = t(uDef.translationKey);
                return translatedUnit ? `(${translatedUnit})` : "";
            }
        }
        const unit = uh.unit;
        if (!unit || unit === "") return "";
        return <>({unit})</>
    }

    function getFrom() {
        let since = new Date().getTime() - from * 60 * 60 * 1000;
        if (typeof from === "object") since = from.getTime();
        return since;
    }

    function getTo() {
        if (to !== null) return to.getTime();
        return new Date().getTime();
    }

    async function loadData(showLoading, _clearLast) {
        const currentSensor = propsRef.current.sensor;
        if (currentSensor.subscription.maxHistoryDays === 0) {
            isLoadingRef.current = false;
            return;
        }
        if (isLoadingRef.current) return;

        clearTimeout(latestDataUpdateRef.current);
        latestDataUpdateRef.current = setTimeout(() => loadDataRef.current(), 60 * 1000);

        if (showLoading !== undefined) setLoading(true);
        if (showLoading) {
            dataRef.current = null;
            setData(null);
        }

        try {
            const dataMode = "mixed";
            const thisFrom = fromRef.current;

            async function load(until, initialLoad) {
                isLoadingRef.current = true;

                let since = parseInt((new Date().getTime() / 1000) - 60 * 60 * fromRef.current);
                if (typeof fromRef.current === "object") {
                    since = fromRef.current.getTime() / 1000;
                }

                if (!until) {
                    if (toRef.current) until = Math.floor(toRef.current.getTime() / 1000);
                    else until = Math.floor(new Date().getTime() / 1000);
                }

                if (!initialLoad && dataRef.current?.measurements?.length) {
                    since = dataRef.current.measurements[0].timestamp + 1;
                }

                if (until <= since) {
                    isLoadingRef.current = false;
                    return;
                }

                const resp = await new NetworkApi().getAsync(
                    currentSensor.sensor, since, until,
                    { mode: dataMode, limit: pjson.settings.dataFetchPaginationSize }
                );
                isLoadingRef.current = false;

                // stop fetching if time range has changed
                if (fromRef.current !== thisFrom) return;

                if (resp.result === "success") {
                    if (currentSensor.sensor !== resp.data.sensor) return;
                    const returnedDataLength = resp.data.measurements.length;

                    Object.keys(currentSensor).filter(x => x.startsWith("offset")).forEach(x => {
                        resp.data[x] = currentSensor[x];
                    });

                    let d = parse(resp.data);
                    let stateData = dataRef.current;

                    if (!stateData && !d.nextUp && d.measurements.length === 0) {
                        dataRef.current = d;
                        setData(d);
                        setLoading(false);
                        return;
                    }

                    // guard from original (preserves existing behavior)
                    if (!d.measurements && d.measurements[d.measurements.length - 1].timestamp < since) return;

                    let newData;
                    if (!stateData) {
                        newData = d;
                    } else if (initialLoad && stateData.measurements.length) {
                        newData = { ...stateData, measurements: [...stateData.measurements, ...d.measurements] };
                    } else {
                        newData = { ...stateData, measurements: [...d.measurements, ...stateData.measurements] };
                    }

                    dataRef.current = newData;
                    setData(newData);
                    setLoading(false);

                    if (initialLoad && (d.nextUp || d.fromCache || returnedDataLength >= pjson.settings.dataFetchPaginationSize)) {
                        load(d.nextUp || d.measurements[d.measurements.length - 1].timestamp, initialLoad);
                    }
                } else if (resp.result === "error") {
                    notify.error(propsRef.current.t(`UserApiError.${resp.code}`));
                    setLoading(false);
                }
            }

            load(null, dataRef.current === null || showLoading);
        } catch (e) {
            notify.error(propsRef.current.t("internet_connection_problem"));
            logger.error("err", e);
            setLoading(false);
        }
    }
    loadDataRef.current = loadData;

    // componentDidMount — intentionally only runs on mount
    useEffect(() => {
        const queryParams = new URLSearchParams(router.location.search);
        const paramValue = queryParams.get('scrollTo');
        if (paramValue) {
            setTimeout(() => {
                const targetElement = document.getElementById(paramValue);
                if (targetElement) {
                    window.scrollTo({ top: targetElement.offsetTop, behavior: 'smooth' });
                }
            }, 100);
        } else {
            window.scrollTo(0, 0);
        }

        if (sensor) loadDataRef.current(true);

        return () => {
            clearTimeout(latestDataUpdateRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // componentDidUpdate: sensor change detection
    useEffect(() => {
        isLoadingRef.current = false;
        loadDataRef.current(true, true);
    }, [sensor.sensor]);

    // document title
    useEffect(() => {
        document.title = "Ruuvi Sensor: " + sensor.name;
    }, [sensor.name]);

    function setGraphKey(key) {
        let newGraphKey = key;
        let unitKey = null;
        if (Array.isArray(key)) {
            newGraphKey = key[0];
            unitKey = key[1];
        }
        const params = new URLSearchParams(router.location.search);
        if (newGraphKey) params.set("key", newGraphKey);
        else params.delete("key");

        if (!unitKey) unitKey = getUnitSettingFor(newGraphKey);
        if (unitKey) params.set("unit", unitKey);
        else params.delete("unit");

        router.navigate({ search: params.toString() }, { replace: true });

        const currentKeyHasNoData = !dataRef.current?.measurements?.some(
            m => m.parsed && m.parsed[graphKey] !== undefined
        );

        setGraphKeyState(newGraphKey);
        setGraphUnitKey(unitKey);
        if (currentKeyHasNoData) setUpdateGraphKey(prev => prev + 1);
    }

    function updateFrom(v) {
        isLoadingRef.current = false;
        dataRef.current = null;

        if (typeof v === "object") {
            if (v.from !== undefined) { fromRef.current = v.from; setFrom(v.from); }
            if (v.to !== undefined) { toRef.current = v.to; setTo(v.to); }
        } else {
            fromRef.current = v;
            toRef.current = null;
            setFrom(v);
            setTo(null);
        }
        setData(null);
        Store.setGraphFrom(v);
        loadDataRef.current(false);
    }

    function updateAlert(alert, prevEnabled) {
        let prev = null;
        if (alertDebouncer[alert.sensor + alert.type]) {
            prev = JSON.parse(JSON.stringify(alertDebouncer[alert.sensor + alert.type]));
        }
        const ts = new Date().getTime();
        alertDebouncer[alert.sensor + alert.type] = { alert, prevEnabled, timestamp: ts };
        let executeAfter = 0;
        if (prev && prev.timestamp + 1000 > new Date().getTime()) executeAfter = 1000;

        setTimeout(() => {
            if (alertDebouncer[alert.sensor + alert.type].timestamp !== ts) {
                logger.log("newer alert debouncer, skipping");
                return;
            }
            var offToOn = alert.enabled;
            const updatedSensor = JSON.parse(JSON.stringify(propsRef.current.sensor));
            const alertIdx = updatedSensor.alerts.findIndex(x => x.sensor === alert.sensor && x.type === alert.type);
            if (alertIdx !== -1) {
                offToOn = !prevEnabled && alert.enabled;
                updatedSensor.alerts[alertIdx] = alert;
            } else {
                updatedSensor.alerts.push(alert);
            }
            propsRef.current.updateSensor(updatedSensor);
            setUpdateGraphKey(prev => prev + 1);
            new NetworkApi().setAlert({ ...alert, sensor: propsRef.current.sensor.sensor }, resp => {
                switch (resp.result) {
                    case "success":
                        notify.success(propsRef.current.t(offToOn ? "alert_enabled" : "successfully_saved"));
                        break;
                    case "error":
                        notify.error(propsRef.current.t(`UserApiError.${resp.code}`));
                        break;
                    default:
                }
            });
        }, executeAfter);
    }

    function exportCSVHandler() {
        exportCSV(dataRef.current, sensor.name, t);
    }

    function exportPDFHandler() {
        setGraphPDFMode(true);
        const fromTime = getFrom();
        const toTime = to || new Date().getTime();
        exportPDF(sensor, dataRef.current, getGraphData(), graphKey, fromTime, toTime, chartRef.current, t, () => {
            setGraphPDFMode(false);
        });
    }

    function exportXLSXHandler() {
        exportXLSX(dataRef.current, sensor.name, t);
    }

    const lastReading = getLatestReading(sensor) || {};
    const shared = isSharedSensor(sensor);
    const sensorSubscription = sensor?.subscription;
    const freeMode = sensor?.subscription.maxHistoryDays === 0;
    const noHistoryStrKey = freeMode ? "no_data_free_mode" : "no_data_in_range";
    const noHistoryStr = t(noHistoryStrKey).split("\n").map(x => <div key={x}>{x}</div>);

    const tnpGetAlert = (x) => {
        const dataKey = x === "movement" ? "movementCounter" : x === "signal" ? "rssi" : x;
        if (lastReading[dataKey] === undefined) return null;
        return getAlert(sensor, x);
    };

    const graphCtrl = () => (
        <>
            <ZoomInfo />
            <ExportMenu buttonText={uppercaseFirst(t("export"))} enablePDF={sensorSubscription.pdfExportAllowed} onClick={val => {
                switch (val) {
                    case "XLSX": exportXLSXHandler(); break;
                    case "PDF": exportPDFHandler(); break;
                    default: exportCSVHandler();
                }
            }} />
            <DurationPicker value={from} showMaxHours={sensor.subscription.maxHistoryDays * 24} onChange={v => updateFrom(v)} />
        </>
    );

    const graphTitle = (mobile) => {
        const uh = getUnitHelper(graphKey);
        let mainLabel = uh ? t(uh.label) : "";
        let unitPart = getSelectedUnit();

        if (graphUnitKey && uh?.units) {
            const uDef = uh.units.find(u => u.cloudStoreKey === graphUnitKey);
            if (uDef) {
                const uhWithUnit = getUnitHelper(graphKey, false, graphUnitKey);
                if (uhWithUnit && uhWithUnit.label) mainLabel = t(uhWithUnit.label);
                unitPart = uhWithUnit.unit ? <>({uhWithUnit.unit})</> : "";
            }
        }

        return <div style={{ marginLeft: 30 }}>
            <span className="graphLengthText" style={{ fontSize: mobile ? "20px" : "24px" }}>{mainLabel}</span>
            {!mobile && <br />}
            <span className="graphInfo" style={{ marginLeft: mobile ? 6 : undefined }}>{unitPart}</span>
        </div>;
    };

    const mainSensorFields = getSensorMainFields(sensor);

    return (
        <Box>
            <Box minHeight={1500}>
                <Box overflow="hidden" pt={{ base: "5px", md: "35px" }} backgroundPosition="center" paddingLeft={{ base: "10px", md: "20px", lg: "50px" }} paddingRight={{ base: "10px", md: "20px", lg: "50px" }}>
                    <SensorHeader
                        sensor={sensor}
                        t={t}
                        prev={props.prev}
                        next={props.next}
                        lastUpdateTime={lastReading.timestamp}
                        isAlertTriggered={isAlertTriggered}
                        loadingImage={loadingImage}
                        fileUploadChange={f => {
                            setLoadingImage(true);
                            uploadBackgroundImage(sensor, f, t, _res => {
                                setLoadingImage(false);
                            });
                        }}
                    />
                    <div>
                        <SensorReadingGrid
                            fields={mainSensorFields}
                            latestReading={lastReading}
                            graphKey={graphKey}
                            graphUnitKey={graphUnitKey}
                            isAlertTriggered={isAlertTriggered}
                            onFieldClick={setGraphKey}
                        />

                        {sensor.subscription.maxHistoryDays !== 0 &&
                            <>
                                <ScreenSizeWrapper>
                                    <div style={{ marginTop: 30 }} id="history">
                                        <table width="100%">
                                            <tbody>
                                                <tr>
                                                    <td>{graphTitle()}</td>
                                                    <td>
                                                        <Flex justify="end" gap={"6px"}>
                                                            {graphCtrl()}
                                                        </Flex>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </ScreenSizeWrapper>
                                <ScreenSizeWrapper isMobile>
                                    <div style={{ marginTop: 30, marginBottom: -10 }} id="history">
                                        {graphTitle(true)}
                                        <table width="100%" style={{ marginTop: "10px" }}>
                                            <tbody>
                                                <tr>
                                                    <td>
                                                        <Flex justify="end" flexWrap="wrap" gap={"6px"}>
                                                            {graphCtrl(true)}
                                                        </Flex>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </ScreenSizeWrapper>
                            </>}
                        <Box height={520}>
                            <> {!loading && (!data || !data?.measurements?.length) ? (
                                <>
                                    <center style={{ paddingTop: 240, height: 450 }} className="nodatatext">{noHistoryStr}
                                        {freeMode && !shared && sensorHasData(sensor) && <>
                                            <Box mt={2} />
                                            <UpgradePlanButton />
                                        </>}
                                    </center>
                                </>
                            ) : (
                                <Box ml={-5} mr={-5}>
                                    {loading &&
                                        <div style={graphLoadingOverlay}>
                                            <div style={{ fontFamily: "montserrat", fontSize: 16, fontWeight: "bold", height: "100%", textAlign: "center" }}><div style={{ position: "relative", top: "45%" }}><Spinner size="xl" /></div></div>
                                        </div>
                                    }
                                    <div style={graph}>
                                        {data?.measurements?.length &&
                                            <Graph
                                                overrideColorMode={graphPDFMode ? "light" : null}
                                                width={graphPDFMode ? 1017 : null}
                                                key={"sensor_graph" + updateGraphKey}
                                                unit={getSelectedUnit()}
                                                setRef={(ref) => { chartRef.current = ref; }}
                                                alert={tnpGetAlert(graphKey)}
                                                dataKey={graphKey}
                                                unitKey={graphUnitKey}
                                                dataName={(() => {
                                                    const uh = getUnitHelper(graphKey);
                                                    if (graphUnitKey && uh?.units) {
                                                        const uDef = uh.units.find(u => u.cloudStoreKey === graphUnitKey);
                                                        if (uDef) {
                                                            const translatedUnit = t(uDef.translationKey);
                                                            const unit = translatedUnit || uDef.translationKey;
                                                            return unit ? `${t(uh.label)} (${unit})` : t(uh.label);
                                                        }
                                                    }
                                                    return t(uh.label);
                                                })()}
                                                data={getGraphData()}
                                                loading={loading}
                                                height={450} cursor={true}
                                                from={getFrom()}
                                                to={getTo()}
                                            />
                                        }
                                    </div>
                                </Box>
                            )}
                            </>
                        </Box>
                    </div>
                </Box>
                <SensorSettings
                    sensor={sensor}
                    t={t}
                    latestReading={lastReading}
                    mainSensorFields={mainSensorFields}
                    isShared={shared}
                    updateAlert={updateAlert}
                    setGraphKey={setGraphKey}
                    onEditName={() => setEditName(true)}
                    onEditNotes={() => setNotesDialog(true)}
                    onEditVisibility={() => setSensorVisibilityDialog(true)}
                    onOffsetClick={setOffsetDialog}
                    onRemoveClick={() => setShowRemoveSensor(true)}
                />
                <EditNameDialog open={editName} onClose={() => setEditName(false)} sensor={sensor} updateSensor={props.updateSensor} />
                <OffsetDialog open={offsetDialog} onClose={() => setOffsetDialog(null)} sensor={sensor} offsets={{ "Humidity": sensor.offsetHumidity, "Pressure": sensor.offsetPressure, "Temperature": sensor.offsetTemperature }} lastReading={lastReading} updateSensor={props.updateSensor} />
                <RemoveSensorDialog open={showRemoveSensor} onClose={() => setShowRemoveSensor(false)} sensor={sensor} updateSensor={props.updateSensor} t={t} remove={() => props.remove()} />
                <SensorTypeVisibilityDialog
                    sensor={sensor}
                    open={sensorVisibilityDialog}
                    onClose={() => setSensorVisibilityDialog(false)}
                    updateSensor={props.updateSensor}
                />
                <NotesDialog
                    open={notesDialog}
                    onClose={() => setNotesDialog(false)}
                    sensor={sensor}
                    updateSensor={props.updateSensor}
                />
            </Box>
        </Box>
    );
}

export default withRouter(withTranslation()(Sensor));
