import React, { useEffect, useRef, useState } from "react";
import logger from "../utils/logger";
import NetworkApi from '../NetworkApi'
import {
    IconButton,
    Box,
    Avatar,
    List,
    ListItem,
    Accordion,
    AccordionItem,
    AccordionButton,
    AccordionPanel,
    AccordionIcon,
    useMediaQuery,
    CircularProgress,
    Spinner,
    Flex,
} from "@chakra-ui/react"
import 'uplot/dist/uPlot.min.css';
import Graph from "../components/Graph";
import SensorReading from "../components/SensorReading";
import parse from "../decoder/parser";
import { MdChevronRight } from "react-icons/md"
import { withTranslation } from 'react-i18next';
import { DEFAULT_VISIBLE_SENSOR_TYPES, getUnitHelper, localeNumber, getUnitSettingFor } from "../UnitHelper";
import { exportCSV, exportPDF, exportXLSX } from "../utils/export";
import withRouter from "../utils/withRouter"
import DurationText from "../components/DurationText";
import Store from "../Store";
import EditNameDialog from "../components/EditNameDialog";
import { addVariablesInString, uppercaseFirst } from "../TextHelper";
import AlertItem from "../components/AlertItem";
import EditableText from "../components/EditableText";
import OffsetDialog from "../components/OffsetDialog";
import NavClose from "../components/NavClose";
import NavPrevNext from "../components/NavPrevNext";
import DurationPicker from "../components/DurationPicker";
import notify from "../utils/notify"
import pjson from '../../package.json';
import { isBatteryLow } from "../utils/battery";
import uploadBackgroundImage from "../BackgroundUploader";
import ScreenSizeWrapper from "../components/ScreenSizeWrapper";
import { getMappedAlertDataType, isAlerting } from "../utils/alertHelper";
import RemoveSensorDialog from "../components/RemoveSensorDialog";
import ExportMenu from "../components/ExportMenu";
import UpgradePlanButton from "../components/UpgradePlanButton";
import ZoomInfo from "../components/ZoomInfo";
import SensorTypeVisibilityDialog from "../components/SensorTypeVisibilityDialog";
import NotesDialog from "../components/NotesDialog";
import SensorNotesPreview from "../components/SensorNotesPreview";
import { visibilityFromCloudToWeb, visibilityCodes } from "../utils/cloudTranslator";

const collapseText = {
    fontFamily: "montserrat",
    fontSize: "24px",
    fontWeight: 800,
    padding: "10px",
}
const detailedTitle = {
    fontFamily: "mulish",
    fontSize: "16px",
    fontWeight: 800,
    width: "50%",
}
const detailedText = {
    fontFamily: "mulish",
    fontSize: "14px",
    width: "100%",
    textAlign: "right",
    verticalAlign: "middle",
}
const detailedSubText = {
    fontFamily: "mulish",
    fontSize: "14px",
}

const accordionPanel = {
    paddingTop: 0,
    paddingBottom: 0,
}
const accordionContent = {
    minHeight: 72,
    marginLeft: 10,
    width: "calc(100% - 16px)",
}
const accordionButton = {
    paddingRight: 21,
}

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

function AccordionText(props) {
    const [isLargeDisplay] = useMediaQuery("(min-width: 766px)", { ssr: false })
    let tstyle = JSON.parse(JSON.stringify(collapseText));
    if (!isLargeDisplay) tstyle.fontSize = "18px";
    return <Box flex="1" textAlign="left" style={tstyle}>
        {props.children}
    </Box>
}

function SensorHeader(props) {
    const [isLargeDisplay] = useMediaQuery("(min-width: 766px)", { ssr: false })
    if (isLargeDisplay) {
        return <div style={{ display: "flex", justifyContent: "space-between" }}>
            <input type="file" accept="image/*" style={{ display: "none" }} id="avatarUpload" onChange={props.fileUploadChange} />
            <label htmlFor="avatarUpload">
                {props.loadingImage ? <CircularProgress size={"96px"} isIndeterminate={true} color="primary" /> :
                    <Avatar style={{ cursor: "pointer" }} size="xl" name={props.sensor.name} src={props.testImgSrc || props.sensor.picture} />
                }
            </label>
            <span style={{ width: "calc(100% - 250px - 18px)", marginLeft: 18 }}>
                <div className="pageTitle" style={{ textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden", }}>
                    {props.sensor.name}
                </div>
                <div style={{ fontFamily: "mulish", fontSize: 18, fontWeight: 600, fontStyle: "italic" }} className="subtitle">
                    <DurationText from={props.lastUpdateTime} t={props.t} isAlerting={props.isAlertTriggerd("offline")} />
                </div>
            </span>
            <span style={{ minWidth: 135, justifyContent: "flex-end" }}>
                <NavPrevNext prev={props.prev} next={props.next} />
                <NavClose />
            </span>
        </div>
    } else {
        return <center>
            <Box m={2}>
                <table width="100%" border="0" cellSpacing="0" cellPadding="0">
                    <tbody>
                        <tr>
                            <td width="33%" style={{ verticalAlign: "top" }}>
                                <NavClose />
                            </td>
                            <td width="33%" align="center">
                                <input type="file" accept="image/*" style={{ display: "none" }} id="avatarUpload" onChange={props.fileUploadChange} />
                                <label htmlFor="avatarUpload">
                                    {props.loadingImage ? <CircularProgress mt="3" size={"64px"} isIndeterminate={true} color="primary" /> :
                                        <Avatar mt="3" bg="primary" size="lg" name={props.sensor.name} src={props.sensor.picture} />
                                    }
                                </label>
                            </td>
                            <td width="33%" align="right" style={{ verticalAlign: "top" }}>
                                <span style={{ width: "100%", textAlign: "right", height: "100%" }}>
                                    <NavPrevNext prev={props.prev} next={props.next} />
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div style={{ width: "65%", marginTop: "5px" }}>
                    <div className="mobilePageTitle">
                        {props.sensor.name}
                    </div>
                    <div style={{ fontFamily: "mulish", fontSize: 16, fontWeight: 600, fontStyle: "italic" }} className="subtitle">
                        <DurationText from={props.lastUpdateTime} t={props.t} isAlerting={props.isAlertTriggerd("offline")} />
                    </div>
                </div>
            </Box>
        </center>
    }
}

function SensorValueGrid(props) {
    const [isLargeDisplay] = useMediaQuery("(min-width: 766px)", { ssr: false })
    return <Box style={{ marginBottom: 30, marginTop: 30 }} justifyItems="start" display="grid" gap="10px" gridTemplateColumns={`repeat(auto-fit, minmax(${isLargeDisplay ? "220px" : "45%"}, max-content))`}>
        {props.children}
    </Box>
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
        const keys = getSensorMainFieldsFrom(sensor);
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
    const openAccordionsRef = useRef(Store.getOpenAccordions() || [0]);
    const chartRef = useRef(null);
    const latestDataUpdateRef = useRef(null);
    const loadDataRef = useRef(null);

    function getSensorMainFieldsFrom(sensorProp) {
        let mainSensorFields = [];
        let visibleTypes;
        const readings = getLatestReadingFromProps(sensorProp);

        if (readings) {
            const settings = sensorProp.settings;
            if (settings?.defaultDisplayOrder === "true") {
                visibleTypes = DEFAULT_VISIBLE_SENSOR_TYPES;
            } else if (settings?.displayOrder && settings.displayOrder.length > 0) {
                try {
                    let webTypes = [];
                    const cTypes = JSON.parse(settings.displayOrder);
                    for (const cType of cTypes) {
                        const webType = visibilityFromCloudToWeb(cType);
                        if (webType) webTypes.push(webType);
                    }
                    if (webTypes.length === 0) webTypes = DEFAULT_VISIBLE_SENSOR_TYPES;
                    visibleTypes = webTypes;
                } catch (e) {
                    logger.warn("Failed to parse displayOrder, using default", e);
                    visibleTypes = DEFAULT_VISIBLE_SENSOR_TYPES;
                }
            }

            const allReadingKeys = Object.keys(readings);
            const effectiveVisibleTypes = visibleTypes && visibleTypes.length > 0
                ? visibleTypes
                : DEFAULT_VISIBLE_SENSOR_TYPES;

            mainSensorFields = effectiveVisibleTypes.filter(type => {
                const name = Array.isArray(type) ? type[0] : type;
                return allReadingKeys.includes(name) && getUnitHelper(name).graphable;
            });
        }
        return mainSensorFields;
    }

    function getLatestReadingFromProps(sensorProp) {
        const s = sensorProp || sensor;
        const lastParsedReading = s.measurements.length === 1 ? s.measurements[0] : null;
        if (!lastParsedReading) return null;
        return { ...lastParsedReading.parsed, timestamp: lastParsedReading.timestamp };
    }

    function getLatestReading(kv) {
        const ms = getLatestReadingFromProps();
        if (!ms) return [];
        if (!kv) return ms;
        return Object.keys(ms).map(x => ({ key: x, value: ms[x] }));
    }

    function getSensorMainFields() {
        return getSensorMainFieldsFrom(sensor);
    }

    function getVisibleFieldType(field) {
        return Array.isArray(field) ? field[0] : field;
    }

    function getVisibleFieldUnit(field) {
        if (Array.isArray(field)) return field[1] ?? null;
        if (["temperature", "humidity", "pressure", "voc"].includes(field)) {
            return getUnitSettingFor(field);
        }
        return null;
    }

    function getAlert(type) {
        if (!sensor) return null;
        if (type === "rssi") type = "signal";
        const idx = sensor.alerts.findIndex(x => x.type === type);
        if (idx !== -1) return sensor.alerts[idx];
        return null;
    }

    function isAlertTriggerd(type) {
        if (type === "movementCounter") type = "movement";
        if (type === "rssi") type = "signal";
        const alert = getAlert(type);
        if (!alert) return false;
        return isAlerting(sensor, type);
    }

    function isSharedSensor() {
        const user = new NetworkApi().getUser().email;
        return user !== sensor.owner;
    }

    function sensorHasData() {
        return getLatestReadingFromProps() !== null;
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

    function getAlertVisibleFieldIndex(type, visibleFields) {
        if (!visibleFields?.length) return -1;

        const dataKey = getMappedAlertDataType(type);
        let preferredUnit = null;
        let strictUnitMatch = false;
        let fallbackMatcher = null;

        switch (type) {
            case "humidity":
                preferredUnit = "0";
                strictUnitMatch = true;
                break;
            case "humidityAbsolute":
                preferredUnit = "1";
                strictUnitMatch = true;
                break;
            case "dewPoint":
                preferredUnit = "2";
                strictUnitMatch = true;
                break;
            case "temperature":
                preferredUnit = getUnitSettingFor("temperature");
                break;
            case "pressure":
                preferredUnit = getUnitSettingFor("pressure");
                break;
            case "voc":
                preferredUnit = getUnitSettingFor("voc");
                break;
            case "sound":
                fallbackMatcher = (fieldType) => fieldType.startsWith("soundLevel");
                break;
            default:
        }

        let orderIndex = visibleFields.findIndex(field => {
            if (getVisibleFieldType(field) !== dataKey) return false;
            if (preferredUnit === null) return true;
            return getVisibleFieldUnit(field) === preferredUnit;
        });

        if (orderIndex !== -1) return orderIndex;
        if (strictUnitMatch) return -1;

        orderIndex = visibleFields.findIndex(field => getVisibleFieldType(field) === dataKey);
        if (orderIndex !== -1) return orderIndex;

        if (fallbackMatcher) {
            return visibleFields.findIndex(field => fallbackMatcher(getVisibleFieldType(field)));
        }

        return -1;
    }

    function getAlertTypesOrdered(baseTypes, visibleFields) {
        if (!visibleFields?.length) return baseTypes;
        const baseOrder = new Map();
        baseTypes.forEach((type, index) => baseOrder.set(type, index));
        const fallbackIndex = Number.MAX_SAFE_INTEGER;
        const typeOrder = new Map();
        baseTypes.forEach(type => {
            const orderIndex = getAlertVisibleFieldIndex(type, visibleFields);
            typeOrder.set(type, orderIndex === -1 ? fallbackIndex : orderIndex);
        });
        return [...baseTypes].sort((a, b) => {
            const aIdx = typeOrder.get(a);
            const bIdx = typeOrder.get(b);
            if (aIdx === bIdx) return baseOrder.get(a) - baseOrder.get(b);
            return aIdx - bIdx;
        });
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
        openAccordionsRef.current = Store.getOpenAccordions() || [0];
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

    const lastReading = getLatestReading();
    const sensorSubscription = sensor?.subscription;
    const freeMode = sensor?.subscription.maxHistoryDays === 0;
    const noHistoryStrKey = freeMode ? "no_data_free_mode" : "no_data_in_range";
    const noHistoryStr = t(noHistoryStrKey).split("\n").map(x => <div key={x}>{x}</div>);

    const tnpGetAlert = (x) => {
        const dataKey = x === "movement" ? "movementCounter" : x === "signal" ? "rssi" : x;
        if (getLatestReading()[dataKey] === undefined) return null;
        return getAlert(x);
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

    const mainSensorFields = getSensorMainFields();
    const baseAlertTypes = ["temperature", "humidity", "humidityAbsolute", "dewPoint", "pressure", "signal", "movement", "offline", "battery", "aqi", "co2", "voc", "nox", "pm10", "pm25", "pm40", "pm100", "luminosity", "sound"];
    const orderedAlertTypes = getAlertTypesOrdered(baseAlertTypes, mainSensorFields);

    return (
        <Box>
            <Box minHeight={1500}>
                <Box overflow="hidden" pt={{ base: "5px", md: "35px" }} backgroundPosition="center" paddingLeft={{ base: "10px", md: "20px", lg: "50px" }} paddingRight={{ base: "10px", md: "20px", lg: "50px" }}>
                    <SensorHeader {...props} lastUpdateTime={lastReading ? lastReading.timestamp : " - "} editName={() => setEditName(editName ? false : sensor.name)}
                        isAlertTriggerd={isAlertTriggerd}
                        loadingImage={loadingImage}
                        fileUploadChange={f => {
                            setLoadingImage(true);
                            uploadBackgroundImage(sensor, f, t, _res => {
                                setLoadingImage(false);
                            });
                        }}
                    />
                    <div>
                        <SensorValueGrid>
                            {mainSensorFields.map(field => {
                                let sensorType = field;
                                let unitKey = null;
                                if (Array.isArray(field)) {
                                    sensorType = field[0];
                                    unitKey = field[1];
                                }
                                const latest = getLatestReading();
                                if (!latest) return null;
                                const unitHelper = getUnitHelper(sensorType);
                                if (!unitHelper) return null;
                                const rawValue = latest[sensorType];
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
                                        showValue = localeNumber(uhWithUnit.valueWithUnit(rawValue, unitKey, latest["temperature"]), uhWithUnit.decimals);
                                        unitDisplay = uhWithUnit.unit;
                                        label = uhWithUnit.shortLabel || unitHelper.shortLabel || uhWithUnit.label;
                                    } else {
                                        showValue = localeNumber(unitHelper.valueWithUnit(rawValue, unitKey, latest["temperature"]), unitHelper.decimals);
                                    }
                                } else {
                                    showValue = localeNumber(
                                        unitHelper.value(rawValue, sensorType === "humidity" ? latest["temperature"] : undefined),
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
                                            isBatteryLow(rawValue, latest.temperature) ? "replace_battery" : "battery_ok"
                                        }
                                        alertTriggered={isAlertTriggerd(sensorType)}
                                        label={label}
                                        infoLabel={infoLabel}
                                        sensorType={sensorType}
                                        unit={unitDisplay}
                                        selected={selected}
                                        onClick={() => setGraphKey([sensorType, unitKey])}
                                    />
                                );
                            })}
                        </SensorValueGrid>

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
                                        {freeMode && !isSharedSensor() && sensorHasData() && <>
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
                <Box id="settings">
                    <div style={{ height: "20px" }} />
                    <Accordion allowMultiple defaultIndex={openAccordionsRef.current} onChange={v => Store.setOpenAccordions(v)}>
                        <AccordionItem>
                            <AccordionButton style={accordionButton} _hover={{}}>
                                <AccordionText>{t("general")}</AccordionText>
                                <AccordionIcon />
                            </AccordionButton>
                            <hr />
                            <AccordionPanel style={accordionPanel}>
                                <List>
                                    <ListItem>
                                        <table style={accordionContent}>
                                            <tbody>
                                                <tr>
                                                    <td style={detailedTitle}>{t("sensor_name")}</td>
                                                    <td style={detailedText}>
                                                        <EditableText text={sensor.name} onClick={() => setEditName(true)} />
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </ListItem>
                                    <hr />
                                    <ListItem>
                                        <table style={accordionContent}>
                                            <tbody>
                                                <tr>
                                                    <td style={detailedTitle}>{t("owner")}</td>
                                                    <td style={detailedText}>{sensor.owner.toLowerCase()}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </ListItem>
                                    <hr />
                                    {sensor.canShare ?
                                        <ListItem style={{ cursor: "pointer" }} onClick={() => router.navigate(`/shares?sensor=${sensor.sensor}`)}>
                                            <table style={accordionContent}>
                                                <tbody>
                                                    <tr>
                                                        <td style={detailedTitle}>{t("share")}</td>
                                                        <td style={detailedText}>
                                                            {addVariablesInString(t("shared_to_x"), [sensor.sharedTo.length, sensor.subscription.maxSharesPerSensor])}
                                                            <IconButton variant="ghost" icon={<MdChevronRight />} _hover={{}} />
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </ListItem>
                                        :
                                        <ListItem>
                                            <table style={accordionContent}>
                                                <tbody>
                                                    <tr>
                                                        <td style={detailedTitle}>{t("owners_plan")}</td>
                                                        <td style={detailedText}>{sensorSubscription?.subscriptionName || JSON.stringify(sensorSubscription)}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </ListItem>
                                    }
                                    {!isSharedSensor() && <>
                                        <hr />
                                        <ListItem style={{ cursor: "pointer" }} onClick={() => setSensorVisibilityDialog(true)}>
                                            <table style={accordionContent}>
                                                <tbody>
                                                    <tr>
                                                        <td style={detailedTitle}>{t("visible_measurements")}</td>
                                                        <td style={detailedText}>
                                                            {(() => {
                                                                const useDefault = sensor.settings?.defaultDisplayOrder || "true";
                                                                if (useDefault === "true") return t("use_default");
                                                                const visibleFields = sensor.settings?.displayOrder ? JSON.parse(sensor.settings.displayOrder) : [];
                                                                let maxAvailable = 0;
                                                                const parsed0 = sensor?.measurements?.[0]?.parsed;
                                                                if (parsed0) {
                                                                    const presentKeys = Object.keys(parsed0);
                                                                    maxAvailable = visibilityCodes.filter(vc => presentKeys.includes(vc[1])).length;
                                                                }
                                                                return visibleFields.length > 0 ? `${visibleFields.length}/${maxAvailable || visibleFields.length}` : t("no_visible_measurements");
                                                            })()}
                                                            <IconButton variant="ghost" icon={<MdChevronRight />} _hover={{}} />
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </ListItem>
                                    </>}
                                    <hr />
                                    <ListItem>
                                        <table style={accordionContent}>
                                            <tbody>
                                                <tr>
                                                    <td style={detailedTitle}>{t("notes")}</td>
                                                    <td style={detailedText}>
                                                        {!isSharedSensor() && <EditableText text="" onClick={() => setNotesDialog(true)} />}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </ListItem>
                                </List>
                                <SensorNotesPreview text={sensor.settings?.description} t={t} />
                            </AccordionPanel>
                        </AccordionItem>
                        <AccordionItem>
                            <AccordionButton style={accordionButton} _hover={{}}>
                                <AccordionText>{t("alerts")}</AccordionText>
                                <AccordionIcon />
                            </AccordionButton>
                            <hr />
                            <AccordionPanel style={accordionPanel}>
                                <List style={accordionContent}>
                                    {sensorSubscription.subscriptionName === "Free" && <Box pt={6} pb={6} style={detailedSubText}>
                                        {(() => {
                                            const text = t("sensor_alert_free_info");
                                            const parts = text.split(t("cloud_ruuvi_link"));
                                            return <div>{parts[0]}<a style={{ color: "teal" }} target="blank" href={t("cloud_ruuvi_link_url")}>{t("cloud_ruuvi_link")}</a>{parts[1]}</div>;
                                        })()}
                                    </Box>}
                                    {orderedAlertTypes.map(x => {
                                        const dataKey = getMappedAlertDataType(x);
                                        const latestValue = getLatestReading()[dataKey];
                                        if (latestValue === undefined && x !== "offline") return null;

                                        const alert = getAlert(x);
                                        const ignoreVisibleTypes = ["offline"];

                                        if (!ignoreVisibleTypes.includes(x)) {
                                            if (getAlertVisibleFieldIndex(x, mainSensorFields) === -1) return null;
                                        }

                                        const key = alert ? alert.min + "" + alert.max + "" + alert.enabled.toString() + "" + alert.description + x : x;
                                        return <ListItem key={key}>
                                            <AlertItem alerts={sensor.alerts} alert={alert} sensor={sensor}
                                                latestValue={latestValue}
                                                noUpgradeButton={isSharedSensor() || !sensorHasData()}
                                                showOffline={sensorSubscription.offlineAlertAllowed}
                                                showDelay={sensorSubscription.delayedAlertAllowed}
                                                detailedTitle={detailedTitle}
                                                detailedText={detailedText} detailedSubText={detailedSubText}
                                                type={x} dataKey={dataKey} onChange={(a, prevEnabled) => updateAlert(a, prevEnabled)} />
                                        </ListItem>;
                                    })}
                                </List>
                            </AccordionPanel>
                        </AccordionItem>
                        <AccordionItem hidden={isSharedSensor()}>
                            <AccordionButton style={accordionButton} _hover={{}}>
                                <AccordionText>{t("offset_correction")}</AccordionText>
                                <AccordionIcon />
                            </AccordionButton>
                            <hr />
                            <AccordionPanel style={accordionPanel}>
                                <List>
                                    {["Temperature", "Humidity", "Pressure"].map(x => {
                                        if (getLatestReading()[x.toLowerCase()] === undefined) return null;
                                        const uh = getUnitHelper(x.toLocaleLowerCase());
                                        let value = uh.value(sensor["offset" + x], true);
                                        let unit = uh.unit;
                                        if (x === "Humidity") {
                                            value = sensor["offset" + x];
                                            unit = "%";
                                        }
                                        return <ListItem key={x} style={{ cursor: "pointer" }} onClick={() => setOffsetDialog(x)}>
                                            <table style={accordionContent}>
                                                <tbody>
                                                    <tr>
                                                        <td style={detailedTitle}> {t(x.toLocaleLowerCase())}</td>
                                                        <td style={detailedText}>
                                                            {localeNumber(value, uh.decimals)} {unit} <IconButton _hover={{}} variant="ghost" icon={<MdChevronRight />} />
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            {x !== "Pressure" && <hr />}
                                        </ListItem>;
                                    })}
                                </List>
                            </AccordionPanel>
                        </AccordionItem>
                        <AccordionItem>
                            <AccordionButton style={accordionButton} _hover={{}}>
                                <AccordionText>{uppercaseFirst(t("more_info"))}</AccordionText>
                                <AccordionIcon />
                            </AccordionButton>
                            <hr />
                            <AccordionPanel style={accordionPanel}>
                                <List>
                                    {(() => {
                                        const readings = getLatestReadingFromProps();
                                        if (!readings) return null;

                                        const moreInfoFields = ["mac", "dataFormat", "rssi", "measurementSequenceNumber"];

                                        return moreInfoFields.map((order, i) => {
                                            let x = getLatestReading(true).find(x => x.key === order);
                                            if (order === "mac") x = { key: "mac", value: sensor.sensor };
                                            if (!x) return null;
                                            const uh = getUnitHelper(x.key);
                                            return (
                                                <ListItem key={x.key}>
                                                    <table style={{ ...accordionContent, cursor: uh.graphable ? "pointer" : "" }} onClick={() => uh.graphable ? setGraphKey(x.key) : undefined}>
                                                        <tbody>
                                                            <tr>
                                                                <td style={detailedTitle}> {t(uh.label || x.key)}</td>
                                                                <td style={{ ...detailedText, textDecoration: uh.graphable ? "underline" : "" }}>
                                                                    {localeNumber(uh.value(x.value), uh.decimals)} {uh.unit}
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                    {i !== moreInfoFields.length - 1 && <hr />}
                                                </ListItem>
                                            );
                                        });
                                    })()}
                                </List>
                            </AccordionPanel>
                        </AccordionItem>

                        <AccordionItem>
                            <AccordionButton style={accordionButton} _hover={{}}>
                                <AccordionText>{t("remove")}</AccordionText>
                                <AccordionIcon />
                            </AccordionButton>
                            <hr />
                            <AccordionPanel style={accordionPanel}>
                                <List>
                                    <ListItem style={{ cursor: "pointer" }} onClick={() => setShowRemoveSensor(true)}>
                                        <table width="100%" style={accordionContent}>
                                            <tbody>
                                                <tr>
                                                    <td style={detailedTitle}>{t("remove_this_sensor")}</td>
                                                    <td style={detailedText}>
                                                        <IconButton variant="ghost" icon={<MdChevronRight />} _hover={{}} />
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </ListItem>
                                </List>
                            </AccordionPanel>
                        </AccordionItem>
                    </Accordion>
                </Box>
                <EditNameDialog open={editName} onClose={() => setEditName(false)} sensor={sensor} updateSensor={props.updateSensor} />
                <OffsetDialog open={offsetDialog} onClose={() => setOffsetDialog(null)} sensor={sensor} offsets={{ "Humidity": sensor.offsetHumidity, "Pressure": sensor.offsetPressure, "Temperature": sensor.offsetTemperature }} lastReading={getLatestReading()} updateSensor={props.updateSensor} />
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
