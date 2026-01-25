import React, { Component } from "react";
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
    Button,
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

class Sensor extends Component {
    constructor(props) {
        super(props)
        const queryParams = new URLSearchParams(this.props.router.location.search);
        const graphKeyFromUrl = queryParams.get('key');
        const graphUnitKeyFromUrl = queryParams.get('unit');

        let initialGraphKey = "temperature";
        let initialGraphUnitKey = null;
        let keys = this.getSensorMainFields();
        if (keys.length > 0) {
            let first = keys[0];
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

        this.state = {
            data: null,
            loading: true,
            graphKey: graphKeyFromUrl || initialGraphKey,
            graphUnitKey: graphUnitKeyFromUrl || graphUnitKey,
            from: new Store().getGraphFrom() || 24,
            to: null,
            table: "",
            resolvedMode: "",
            editName: false,
            offsetDialog: null,
            loadingImage: false,
            updateGraphKey: 0,
            graphPDFMode: false,
            sensorVisibilityDialog: false
        }
        this.isLoading = false;
        this.applyAccordionSetting()
        this.chartRef = React.createRef();
    }
    applyAccordionSetting() {
        this.openAccodrions = new Store().getOpenAccordions() || [0];
    }
    componentDidMount() {
        const queryParams = new URLSearchParams(this.props.router.location.search);
        const paramValue = queryParams.get('scrollTo');
        if (paramValue) {
            setTimeout(() => {
                const targetElement = document.getElementById(paramValue);
                if (targetElement) {
                    window.scrollTo({
                        top: targetElement.offsetTop,
                        behavior: 'smooth',
                    });
                }
            }, 100)
        }
        else window.scrollTo(0, 0)
        if (this.props.sensor) {
            this.loadData(true)
        }
    }
    componentWillUnmount() {
        clearTimeout(this.latestDataUpdate);
    }
    componentDidUpdate(prevProps) {
        document.title = "Ruuvi Sensor: " + this.props.sensor.name
        if (this.props.sensor.sensor !== prevProps.sensor.sensor) {
            this.applyAccordionSetting()
            this.isLoading = false;
            this.loadData(true, true)
        }
    }
    getDataMode() {
        return "mixed"
    }
    async loadData(showLoading, clearLast) {
        if (this.props.sensor.subscription.maxHistoryDays === 0) {
            this.isLoading = false;
            return
        }
        if (this.isLoading) return
        clearTimeout(this.latestDataUpdate);
        this.latestDataUpdate = setTimeout(() => {
            this.loadData()
        }, 60 * 1000);
        let newState = { ...this.state, loading: showLoading !== undefined, ...(showLoading ? { data: null } : {}) };
        if (clearLast) {
            newState.lastestDatapoint = null;
        }
        this.setState(newState)
        try {
            let dataMode = this.getDataMode();
            var thisFrom = this.state.from;
            var that = this;
            async function load(until, initialLoad) {
                that.isLoading = true;
                var since = parseInt(((new Date().getTime()) / 1000) - 60 * 60 * that.state.from);
                if (typeof (that.state.from) === "object") {
                    since = that.state.from.getTime() / 1000
                }
                if (!until) {
                    if (that.state.to) until = Math.floor(that.state.to.getTime() / 1000)
                    else until = Math.floor(new Date().getTime() / 1000)
                }
                if (!initialLoad && that.state.data.measurements.length) since = that.state.data.measurements[0].timestamp + 1;
                if (until <= since) {
                    that.isLoading = false;
                    return;
                }
                var resp = await new NetworkApi().getAsync(that.props.sensor.sensor, since, until, { mode: dataMode, limit: pjson.settings.dataFetchPaginationSize });
                that.isLoading = false;
                // stop fetching data if sensor page has changed
                if (that.state.from !== thisFrom) return;
                if (resp.result === "success") {
                    if (that.props.sensor.sensor !== resp.data.sensor) return;
                    let returndDataLength = resp.data.measurements.length
                    Object.keys(that.props.sensor).filter(x => x.startsWith("offset")).forEach(x => {
                        resp.data[x] = that.props.sensor[x]
                    })
                    let d = parse(resp.data);
                    var stateData = that.state.data;
                    // no data
                    if (!stateData && !d.nextUp && d.measurements.length === 0) {
                        that.setState({ ...that.state, data: d, loading: false })
                        return
                    }
                    // looks like timerange has changed, stop
                    if (!d.measurements && d.measurements[d.measurements.length - 1].timestamp < since) return;
                    if (!stateData) stateData = d;
                    else if (initialLoad && stateData.measurements.length) {
                        stateData.measurements = stateData.measurements.concat(d.measurements)
                    }
                    else {
                        // data refresh, add new once to the beginning of the array
                        stateData.measurements = [...d.measurements, ...stateData.measurements]
                    }
                    that.setState({ ...that.state, data: stateData, loading: false, table: d.table, resolvedMode: d.resolvedMode })
                    if (initialLoad && (d.nextUp || d.fromCache || returndDataLength >= pjson.settings.dataFetchPaginationSize)) load(d.nextUp || d.measurements[d.measurements.length - 1].timestamp, initialLoad)
                } else if (resp.result === "error") {
                    notify.error(that.props.t(`UserApiError.${resp.code}`))
                    that.setState({ ...that.state, loading: false })
                }
            }
            load(null, this.state.data === null || showLoading, true)
        } catch (e) {
            notify.error(this.props.t("internet_connection_problem"))
            console.log("err", e)
            this.setState({ ...this.state, loading: false })
        }
    }
    getLatestReadingFromProps() {
        var lastParsedReading = this.props.sensor.measurements.length === 1 ? this.props.sensor.measurements[0] : null
        if (!lastParsedReading) return null;
        return { ...lastParsedReading.parsed, timestamp: lastParsedReading.timestamp };
    }
    getLatestReading(kv) {
        let ms = this.getLatestReadingFromProps()
        if (!ms) return [];
        if (!kv) return ms;
        var objs = Object.keys(ms);
        return objs.map(x => {
            return { key: x, value: ms[x] }
        })
    }
    getTimeSinceLastUpdate() {
        if (!this.state.data || !this.state.data.measurements.length) return " - ";
        var now = new Date().getTime() / 1000
        var lastUpdate = this.state.data.measurements[0].timestamp
        return Math.floor(((now - lastUpdate)))
    }
    updateStateVar(key, value) {
        var state = this.state;
        state[key] = value;
        this.setState(this.state)
    }
    update() {
        new NetworkApi().update(this.props.sensor.sensor, this.state.editName, success => {
            window.location.reload()
        })
    }
    setGraphKey(key) {
        let graphKey = key;
        let unitKey = null;
        if (Array.isArray(key)) {
            graphKey = key[0];
            unitKey = key[1];
        }
        const params = new URLSearchParams(this.props.router.location.search);
        if (graphKey) {
            params.set("key", graphKey);
        } else {
            params.delete("key");
        }
        if (!unitKey) {
            unitKey = getUnitSettingFor(graphKey);
        }
        if (unitKey) {
            params.set("unit", unitKey);
        } else {
            params.delete("unit");
        }
        this.props.router.navigate({ search: params.toString() }, { replace: true });
        this.setState({ ...this.state, graphKey, graphUnitKey: unitKey });
    }
    getAlert(type) {
        if (!this.props.sensor) return null
        if (type === "rssi") type = "signal"
        var idx = this.props.sensor.alerts.findIndex(x => x.type === type)
        if (idx !== -1) {
            return this.props.sensor.alerts[idx]
        }
        return null
    }
    isAlertTriggerd(type) {
        if (type === "movementCounter") type = "movement";
        if (type === "rssi") type = "signal";
        var alert = this.getAlert(type)
        if (!alert) return false
        return isAlerting(this.props.sensor, type)
    }
    isSharedSensor() {
        var user = new NetworkApi().getUser().email
        var owner = this.props.sensor.owner
        return user !== owner;
    }
    remove() {
        this.setState({ ...this.state, removeSensor: true })
    }
    updateFrom(v) {
        this.isLoading = false
        let state = this.state;
        state.data = null
        state.loading = false
        if (typeof (v) === "object") {
            state = { ...state, ...v }
        } else {
            state.from = v
            state.to = null
        }
        this.setState(state, () => this.loadData(false))
        new Store().setGraphFrom(v)
    }
    getFrom() {
        var since = new Date().getTime() - this.state.from * 60 * 60 * 1000;
        if (typeof (this.state.from) === "object") {
            since = this.state.from.getTime()
        }
        return since
    }
    getTo() {
        if (this.state.to !== null) {
            return this.state.to.getTime()
        }
        return new Date().getTime()
    }
    share() {
        this.props.router.navigate(`/shares?sensor=${this.props.sensor.sensor}`)
    }
    editName(state) {
        this.setState({ ...this.state, editName: state })
    }
    updateAlert(alert, prevEnabled) {
        let prev = null;
        if (alertDebouncer[alert.sensor + alert.type]) {
            prev = JSON.parse(JSON.stringify(alertDebouncer[alert.sensor + alert.type]))
        }
        let ts = new Date().getTime()
        alertDebouncer[alert.sensor + alert.type] = {
            alert: alert,
            prevEnabled: prevEnabled,
            timestamp: ts
        }
        let executeAfter = 0
        if (prev && prev.timestamp + 1000 > new Date().getTime()) {
            executeAfter = 1000
        }
        setTimeout(() => {
            if (alertDebouncer[alert.sensor + alert.type].timestamp !== ts) {
                console.log("newer alert debouncer, skipping")
                return
            }
            var offToOn = alert.enabled;
            let sensor = JSON.parse(JSON.stringify(this.props.sensor))
            var alertIdx = sensor.alerts.findIndex(x => x.sensor === alert.sensor && x.type === alert.type)
            if (alertIdx !== -1) {
                offToOn = !prevEnabled && alert.enabled
                sensor.alerts[alertIdx] = alert
            } else {
                sensor.alerts.push(alert)
            }
            this.props.updateSensor(sensor)
            this.setState({ ...this.state, updateGraphKey: this.state.updateGraphKey + 1 })
            new NetworkApi().setAlert({ ...alert, sensor: this.props.sensor.sensor }, resp => {
                switch (resp.result) {
                    case "success":
                        notify.success(this.props.t(offToOn ? "alert_enabled" : "successfully_saved"))
                        break
                    case "error":
                        notify.error(this.props.t(`UserApiError.${resp.code}`))
                        break;
                    default:
                }
            })
        }, executeAfter)
    }
    export() {
        exportCSV(this.state.data, this.props.sensor.name, this.props.t)
    }
    export_PDF() {
        this.setState({ ...this.state, graphPDFMode: true });
        let from = this.getFrom()
        let to = this.state.to || new Date().getTime()
        exportPDF(this.props.sensor, this.state.data, this.getGraphData(), this.state.graphKey, from, to, this.chartRef, this.props.t, () => {
            this.setState({ ...this.state, graphPDFMode: false })
        })
    }
    export_XLSX() {
        exportXLSX(this.state.data, this.props.sensor.name, this.props.t)
    }
    setOpenAccordion(open) {
        new Store().setOpenAccordions(open)
    }
    getGraphData() {
        if (!this.state.data?.measurements?.length) return []
        let data = this.state.data.measurements;
        if (this.getDataMode() === "dense") return data;
        let latestDP = this.state.lastestDatapoint;
        if (latestDP && latestDP.measurements.length) data.unshift(latestDP.measurements[0])
        return data;
    }
    getSelectedUnit() {
        if (this.state.graphKey === "measurementSequenceNumber") return "";
        const uh = getUnitHelper(this.state.graphKey);
        if (this.state.graphUnitKey && uh?.units) {
            const uDef = uh.units.find(u => u.cloudStoreKey === this.state.graphUnitKey);
            if (uDef) {
                const translatedUnit = this.props.t(uDef.translationKey);
                return translatedUnit ? `(${translatedUnit})` : "";
            }
        }
        let unit = uh.unit;
        if (!unit || unit === "") return "";
        return <>({unit})</>
    }
    sensorHasData() {
        return this.getLatestReadingFromProps() !== null
    }
    getSensorMainFields() {
        let mainSensorFields = [];
        let visibleTypes// = new Store().getPerSensorVisibleTypes(this.props.sensor.sensor);
        let readings = this.getLatestReadingFromProps();

        if (readings) {

            let settings = this.props.sensor.settings;
            if (settings?.defaultDisplayOrder === "true") {
                visibleTypes = DEFAULT_VISIBLE_SENSOR_TYPES;
            } else if (settings?.displayOrder && settings.displayOrder.length > 0) {
                try {
                    let webTypes = []
                    let cTypes = JSON.parse(settings.displayOrder);
                    for (const cType of cTypes) {
                        let webType = this.convertToWebSensorType(cType);
                        if (webType) {
                            webTypes.push(webType);
                        }
                    }
                    if (webTypes.length === 0) {
                        webTypes = DEFAULT_VISIBLE_SENSOR_TYPES;
                    }
                    visibleTypes = webTypes;
                } catch (e) {
                    console.warn("Failed to parse displayOrder, using default", e);
                    visibleTypes = DEFAULT_VISIBLE_SENSOR_TYPES;
                }
            }
            const allReadingKeys = Object.keys(readings);

            const effectiveVisibleTypes = visibleTypes && visibleTypes.length > 0
                ? visibleTypes
                : DEFAULT_VISIBLE_SENSOR_TYPES;

            mainSensorFields = effectiveVisibleTypes.filter(type => {
                let name = type;
                if (Array.isArray(type)) {
                    name = type[0];
                }
                return allReadingKeys.includes(name) && getUnitHelper(name).graphable;
            });
        }
        return mainSensorFields;
    }
    convertToWebSensorType(sensorType) {
        return visibilityFromCloudToWeb(sensorType);
    }
    getAlertTypesOrdered(baseTypes, visibleFields) {
        const settings = this.props.sensor?.settings;
        const defaultDisplayOrder = settings?.defaultDisplayOrder ?? "true";
        const hasCustomOrder = settings?.displayOrder && defaultDisplayOrder !== "true";
        if (!hasCustomOrder || !visibleFields?.length) return baseTypes;
        const measurementOrder = visibleFields.map(field => Array.isArray(field) ? field[0] : field);
        const baseOrder = new Map();
        baseTypes.forEach((type, index) => baseOrder.set(type, index));
        const fallbackIndex = Number.MAX_SAFE_INTEGER;
        const typeOrder = new Map();
        baseTypes.forEach(type => {
            const dataKey = getMappedAlertDataType(type);
            let orderIndex = measurementOrder.indexOf(dataKey);
            if (orderIndex === -1 && dataKey === "soundLevelAvg") {
                orderIndex = measurementOrder.findIndex(key => key.startsWith("soundLevel"));
            }
            typeOrder.set(type, orderIndex === -1 ? fallbackIndex : orderIndex);
        });
        return [...baseTypes].sort((a, b) => {
            const aIdx = typeOrder.get(a);
            const bIdx = typeOrder.get(b);
            if (aIdx === bIdx) {
                return baseOrder.get(a) - baseOrder.get(b);
            }
            return aIdx - bIdx;
        });
    }
    render() {
        var { t } = this.props
        let lastReading = this.getLatestReading()
        let sensorSubscription = this.props.sensor?.subscription
        let freeMode = this.props.sensor?.subscription.maxHistoryDays === 0
        let noHistoryStrKey = "no_data_in_range"
        if (this.props.sensor?.subscription.maxHistoryDays === 0) noHistoryStrKey = "no_data_free_mode"
        let noHistoryStr = t(noHistoryStrKey).split("\n").map(x => <div key={x}>{x}</div>)

        let tnpGetAlert = (x) => {
            let dataKey = x === "movement" ? "movementCounter" : "signal" ? "rssi" : x;
            if (this.getLatestReading()[dataKey] === undefined) return null;
            return this.getAlert(x)
        }

        let graphCtrl = () => {
            return <>
                <ZoomInfo />
                <ExportMenu buttonText={uppercaseFirst(t("export"))} enablePDF={sensorSubscription.pdfExportAllowed} onClick={val => {
                    switch (val) {
                        case "XLSX":
                            this.export_XLSX()
                            break
                        case "PDF":
                            this.export_PDF()
                            break
                        default:
                            this.export()
                    }
                }} />
                <DurationPicker value={this.state.from} showMaxHours={this.props.sensor.subscription.maxHistoryDays * 24} onChange={v => this.updateFrom(v)} />
            </>
        }

        let graphTitle = (mobile) => {
            const uh = getUnitHelper(this.state.graphKey);
            let mainLabel = uh ? t(uh.label) : "";
            let unitPart = this.getSelectedUnit();

            if (this.state.graphUnitKey && uh?.units) {
                const uDef = uh.units.find(u => u.cloudStoreKey === this.state.graphUnitKey);
                if (uDef) {
                    const uhWithUnit = getUnitHelper(this.state.graphKey, false, this.state.graphUnitKey);
                    if (uhWithUnit && uhWithUnit.label) {
                        mainLabel = t(uhWithUnit.label);
                    }
                    unitPart = uhWithUnit.unit ? <>({uhWithUnit.unit})</> : "";
                }
            }

            return <div style={{ marginLeft: 30 }}>
                <span className="graphLengthText" style={{ fontSize: mobile ? "20px" : "24px" }}>
                    {mainLabel}
                </span>
                {!mobile && <br />}
                <span className="graphInfo" style={{ marginLeft: mobile ? 6 : undefined }}>
                    {unitPart}
                </span>
            </div>
        }

        let mainSensorFields = this.getSensorMainFields();
        const baseAlertTypes = ["temperature", "humidity", "humidityAbsolute", "dewPoint", "pressure", "signal", "movement", "offline", "battery", "aqi", "co2", "voc", "nox", "pm10", "pm25", "pm40", "pm100", "luminosity", "sound"];
        const orderedAlertTypes = this.getAlertTypesOrdered(baseAlertTypes, mainSensorFields);
        const visibleMeasurementKeys = mainSensorFields.map(field => Array.isArray(field) ? field[0] : field);
        return (
            <Box>
                <Box minHeight={1500}>
                    <Box overflow="hidden" pt={{ base: "5px", md: "35px" }} backgroundPosition="center" paddingLeft={{ base: "10px", md: "20px", lg: "50px" }} paddingRight={{ base: "10px", md: "20px", lg: "50px" }}>
                        <SensorHeader {...this.props} lastUpdateTime={lastReading ? lastReading.timestamp : " - "} editName={() => this.updateStateVar("editName", this.state.editName ? null : this.props.sensor.name)}
                            isAlertTriggerd={this.isAlertTriggerd.bind(this)}
                            loadingImage={this.state.loadingImage}
                            fileUploadChange={f => {
                                this.setState({ ...this.state, loadingImage: true })
                                uploadBackgroundImage(this.props.sensor, f, t, res => {
                                    this.setState({ ...this.state, loadingImage: false })
                                })
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
                                    const latest = this.getLatestReading();
                                    if (!latest) return null;
                                    const unitHelper = getUnitHelper(sensorType);
                                    if (!unitHelper) return null;
                                    let rawValue = latest[sensorType];
                                    if (rawValue === undefined) return null;
                                    let unitDisplay = unitHelper.unit;
                                    let label = unitHelper.shortLabel || unitHelper.label;
                                    let infoLabel = unitHelper.infoLabel;
                                    let showValue;
                                    if (unitKey && unitHelper.valueWithUnit) {
                                        showValue = localeNumber(
                                            unitHelper.valueWithUnit(
                                                rawValue,
                                                unitKey,
                                                latest["temperature"]
                                            ),
                                            unitHelper.decimals
                                        );
                                        const uDef = unitHelper.units?.find(u => u.cloudStoreKey === unitKey);
                                        if (uDef?.translationKey) unitDisplay = uDef.translationKey;
                                        if (uDef?.infoLabel) infoLabel = uDef.infoLabel;
                                        let uhWithUnit = getUnitHelper(sensorType, false, unitKey);
                                        if (uhWithUnit) {
                                            showValue = localeNumber(
                                                uhWithUnit.valueWithUnit(
                                                    rawValue,
                                                    unitKey,
                                                    latest["temperature"]
                                                ),
                                                uhWithUnit.decimals
                                            );
                                            unitDisplay = uhWithUnit.unit;
                                            label = uhWithUnit.shortLabel || unitHelper.shortLabel || uhWithUnit.label;
                                        }
                                    } else {
                                        showValue = localeNumber(
                                            unitHelper.value(
                                                rawValue,
                                                sensorType === "humidity" ? latest["temperature"] : undefined
                                            ),
                                            unitHelper.decimals
                                        );
                                    }
                                    const selected = this.state.graphKey === sensorType && (
                                        (this.state.graphUnitKey || null) === (unitKey || null) ||
                                        (!unitKey && this.state.graphUnitKey === getUnitSettingFor(sensorType))
                                    );
                                    
                                    return (
                                        <SensorReading
                                            key={sensorType + (unitKey || "")}
                                            value={showValue || "-"}
                                            info={sensorType !== "battery" ? undefined :
                                                isBatteryLow(rawValue, latest.temperature) ?
                                                    "replace_battery" : "battery_ok"
                                            }
                                            alertTriggered={this.isAlertTriggerd(sensorType)}
                                            label={label}
                                            infoLabel={infoLabel}
                                            sensorType={sensorType}
                                            unit={unitDisplay}
                                            selected={selected}
                                            onClick={() => this.setGraphKey([sensorType, unitKey])}
                                        />
                                    );
                                })}
                            </SensorValueGrid>

                            {this.props.sensor.subscription.maxHistoryDays !== 0 &&
                                <>
                                    <ScreenSizeWrapper>
                                        <div style={{ marginTop: 30 }} id="history">
                                            <table width="100%">
                                                <tbody>
                                                    <tr>
                                                        <td>
                                                            {graphTitle()}
                                                        </td>
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
                                <> {!this.isLoading && (!this.state.data || !this.state.data?.measurements?.length) ? (
                                    <>
                                        <center style={{ paddingTop: 240, height: 450 }} className="nodatatext">{noHistoryStr}
                                            {freeMode && !this.isSharedSensor() && this.sensorHasData() && <>
                                                <Box mt={2} />
                                                <UpgradePlanButton />
                                            </>}
                                        </center>
                                    </>
                                ) : (
                                    <Box ml={-5} mr={-5}>
                                        {this.isLoading &&
                                            <div style={graphLoadingOverlay}>
                                                <div style={{ fontFamily: "montserrat", fontSize: 16, fontWeight: "bold", height: "100%", textAlign: "center" }}><div style={{ position: "relative", top: "45%" }}><Spinner size="xl" /></div></div>
                                            </div>
                                        }
                                        <div style={graph}>
                                            {this.state.data?.measurements?.length &&
                                                <Graph
                                                    overrideColorMode={this.state.graphPDFMode ? "light" : null}
                                                    width={this.state.graphPDFMode ? 1017 : null}
                                                    key={"sensor_graph" + this.state.updateGraphKey}
                                                    unit={this.getSelectedUnit()}
                                                    setRef={(ref) => (this.chartRef = ref)}
                                                    alert={tnpGetAlert(this.state.graphKey)}
                                                    dataKey={this.state.graphKey}
                                                    unitKey={this.state.graphUnitKey}
                                                    dataName={(() => {
                                                        const uh = getUnitHelper(this.state.graphKey);
                                                        if (this.state.graphUnitKey && uh?.units) {
                                                            const uDef = uh.units.find(u => u.cloudStoreKey === this.state.graphUnitKey);
                                                            if (uDef) {
                                                                const translatedUnit = t(uDef.translationKey);
                                                                const unit = translatedUnit || uDef.translationKey;
                                                                return unit ? `${t(uh.label)} (${unit})` : t(uh.label);
                                                            }
                                                        }
                                                        return t(uh.label);
                                                    })()}
                                                    data={this.getGraphData()}
                                                    height={450} cursor={true}
                                                    from={this.getFrom()}
                                                    to={this.getTo()}
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
                        <Accordion allowMultiple defaultIndex={this.openAccodrions} onChange={v => this.setOpenAccordion(v)}>
                            <AccordionItem>
                                <AccordionButton style={accordionButton} _hover={{}}>
                                    <AccordionText>
                                        {t("general")}
                                    </AccordionText>
                                    <AccordionIcon />
                                </AccordionButton>
                                <hr />
                                <AccordionPanel style={accordionPanel}>
                                    <List>
                                        <ListItem>
                                            <table style={accordionContent}>
                                                <tbody>
                                                    <tr>
                                                        <td style={detailedTitle}>
                                                            {t("sensor_name")}
                                                        </td>
                                                        <td style={detailedText}>
                                                            <EditableText text={this.props.sensor.name} onClick={() => this.editName(true)} />
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
                                                        <td style={detailedTitle}>
                                                            {t("owner")}
                                                        </td>
                                                        <td style={detailedText}>
                                                            {this.props.sensor.owner.toLowerCase()}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </ListItem>
                                        <hr />
                                        {this.props.sensor.canShare ?
                                            <ListItem style={{ cursor: "pointer" }} onClick={() => this.share(true)}>
                                                <table style={accordionContent}>
                                                    <tbody>
                                                        <tr>
                                                            <td style={detailedTitle}>
                                                                {t("share")}
                                                            </td>
                                                            <td style={detailedText}>
                                                                {addVariablesInString(t("shared_to_x"), [this.props.sensor.sharedTo.length, this.props.sensor.subscription.maxSharesPerSensor])}
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
                                                            <td style={detailedTitle}>
                                                                {t("owners_plan")}
                                                            </td>
                                                            <td style={detailedText}>
                                                                {sensorSubscription?.subscriptionName || JSON.stringify(sensorSubscription)}
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </ListItem>
                                        }
                                        {!this.isSharedSensor() && <>
                                            <hr />
                                            <ListItem style={{ cursor: "pointer" }} onClick={() => this.setState({ ...this.state, sensorVisibilityDialog: true })}>
                                                <table style={accordionContent}>
                                                    <tbody>
                                                        <tr>
                                                            <td style={detailedTitle}>
                                                                {t("visible_measurements")}
                                                            </td>
                                                            <td style={detailedText}>
                                                                {(() => {
                                                                    const useDefault = this.props.sensor.settings?.defaultDisplayOrder || "true"
                                                                    if (useDefault === "true") return t("use_default")
                                                                    const visibleFields = this.props.sensor.settings?.displayOrder ? JSON.parse(this.props.sensor.settings.displayOrder) : [];
                                                                    let maxAvailable = 0;
                                                                    const parsed0 = this.props.sensor?.measurements?.[0]?.parsed;
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
                                    </List>
                                </AccordionPanel>
                            </AccordionItem>
                            <AccordionItem>
                                <AccordionButton style={accordionButton} _hover={{}}>
                                    <AccordionText>
                                        {t("alerts")}
                                    </AccordionText>
                                    <AccordionIcon />
                                </AccordionButton>
                                <hr />
                                <AccordionPanel style={accordionPanel}>
                                    <List style={accordionContent}>
                                        {sensorSubscription.subscriptionName === "Free" && <Box pt={6} pb={6} style={detailedSubText}>
                                            {(() => {
                                                let text = t("sensor_alert_free_info")
                                                let parts = text.split(t("cloud_ruuvi_link"))
                                                return <div>{parts[0]}<a style={{ color: "teal" }} target="blank" href={t("cloud_ruuvi_link_url")}>{t("cloud_ruuvi_link")}</a>{parts[1]}</div>
                                            })()}
                                        </Box>}
                                        {orderedAlertTypes.map(x => {
                                            const dataKey = getMappedAlertDataType(x);
                                            let latestValue = this.getLatestReading()[dataKey]
                                            if (latestValue === undefined && x !== "offline") return null;

                                            var alert = this.getAlert(x)
                                            let visibility = visibleMeasurementKeys;
                                            if (!visibility.length) visibility = DEFAULT_VISIBLE_SENSOR_TYPES;
                                            let ignoreVisibleTypes = ["offline"];

                                            // Handle variant-specific visibility checks for humidity and other multi-unit types
                                            if (!ignoreVisibleTypes.includes(x)) {
                                                let isVisible = false;

                                                // Special handling for humidity variants
                                                if (x === "humidity") {
                                                    // Show humidity alert when relative humidity (variant "0") is visible
                                                    isVisible = mainSensorFields.some(field =>
                                                        (Array.isArray(field) && field[0] === "humidity" && field[1] === "0") ||
                                                        (!Array.isArray(field) && field === "humidity")
                                                    );
                                                } else if (x === "humidityAbsolute") {
                                                    // Show humidityAbsolute alert when absolute humidity (variant "1") is visible
                                                    isVisible = mainSensorFields.some(field =>
                                                        Array.isArray(field) && field[0] === "humidity" && field[1] === "1"
                                                    );
                                                } else if (x === "dewPoint") {
                                                    // Show dewPoint alert when dew point (variant "2") is visible
                                                    isVisible = mainSensorFields.some(field =>
                                                        Array.isArray(field) && field[0] === "humidity" && field[1] === "2"
                                                    );
                                                } else {
                                                    // Default visibility check for other alert types
                                                    isVisible = visibility && visibility.includes(dataKey);
                                                }

                                                if (!isVisible) return null;
                                            }

                                            let key = alert ? alert.min + "" + alert.max + "" + alert.enabled.toString() + "" + alert.description + x : x
                                            return <ListItem key={key}>
                                                <AlertItem alerts={this.props.sensor.alerts} alert={alert} sensor={this.props.sensor}
                                                    latestValue={latestValue}
                                                    noUpgradeButton={this.isSharedSensor() || !this.sensorHasData()}
                                                    showOffline={sensorSubscription.offlineAlertAllowed}
                                                    showDelay={sensorSubscription.delayedAlertAllowed}
                                                    detailedTitle={detailedTitle}
                                                    detailedText={detailedText} detailedSubText={detailedSubText}
                                                    type={x} dataKey={dataKey} onChange={(a, prevEnabled) => this.updateAlert(a, prevEnabled)} />
                                            </ListItem>
                                        })}
                                    </List>
                                </AccordionPanel>
                            </AccordionItem>
                            <AccordionItem hidden={this.isSharedSensor()}>
                                <AccordionButton style={accordionButton} _hover={{}}>
                                    <AccordionText>
                                        {t("offset_correction")}
                                    </AccordionText>
                                    <AccordionIcon />
                                </AccordionButton>
                                <hr />
                                <AccordionPanel style={accordionPanel}>
                                    <List>
                                        {["Temperature", "Humidity", "Pressure"].map(x => {
                                            if (this.getLatestReading()[x.toLowerCase()] === undefined) return null;
                                            var uh = getUnitHelper(x.toLocaleLowerCase());
                                            var value = uh.value(this.props.sensor["offset" + x], true);
                                            var unit = uh.unit;
                                            if (x === "Humidity") {
                                                // humidity offset is always %
                                                value = this.props.sensor["offset" + x]
                                                unit = "%"
                                            }
                                            return <ListItem key={x} style={{ cursor: "pointer" }} onClick={() => this.setState({ ...this.state, offsetDialog: x })}>
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
                                            </ListItem>
                                        })}
                                    </List>
                                </AccordionPanel>
                            </AccordionItem>
                            <AccordionItem>
                                <AccordionButton style={accordionButton} _hover={{}}>
                                    <AccordionText>
                                        {uppercaseFirst(t("more_info"))}
                                    </AccordionText>
                                    <AccordionIcon />
                                </AccordionButton>
                                <hr />
                                <AccordionPanel style={accordionPanel}>
                                    <List>
                                        {(() => {
                                            let readings = this.getLatestReadingFromProps();
                                            if (!readings) return null;

                                            const moreInfoFields = ["mac", "dataFormat", "rssi", "measurementSequenceNumber"];

                                            return moreInfoFields.map((order, i) => {
                                                var x = this.getLatestReading(true).find(x => x.key === order);
                                                if (order === "mac") {
                                                    x = { key: "mac", value: this.props.sensor.sensor }
                                                }
                                                if (!x) return null
                                                let uh = getUnitHelper(x.key)
                                                return (
                                                    <ListItem key={x.key}>
                                                        <table style={{ ...accordionContent, cursor: uh.graphable ? "pointer" : "" }} onClick={() => uh.graphable ? this.setGraphKey(x.key) : console.log("Not graphable")}>
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
                                                )
                                            });
                                        })()}

                                    </List>
                                </AccordionPanel>
                            </AccordionItem>

                            <AccordionItem>
                                <AccordionButton style={accordionButton} _hover={{}}>
                                    <AccordionText>
                                        {t("remove")}
                                    </AccordionText>
                                    <AccordionIcon />
                                </AccordionButton>
                                <hr />
                                <AccordionPanel style={accordionPanel}>
                                    <List>
                                        <ListItem style={{ cursor: "pointer" }} onClick={() => this.remove()}>
                                            <table width="100%" style={accordionContent}>
                                                <tbody>
                                                    <tr>
                                                        <td style={detailedTitle}>
                                                            {t("remove_this_sensor")}
                                                        </td>
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
                    <EditNameDialog open={this.state.editName} onClose={() => this.editName(false)} sensor={this.props.sensor} updateSensor={this.props.updateSensor} />
                    <OffsetDialog open={this.state.offsetDialog} onClose={() => this.setState({ ...this.state, offsetDialog: null })} sensor={this.props.sensor} offsets={{ "Humidity": this.props.sensor.offsetHumidity, "Pressure": this.props.sensor.offsetPressure, "Temperature": this.props.sensor.offsetTemperature }} lastReading={this.getLatestReading()} updateSensor={this.props.updateSensor} />
                    <RemoveSensorDialog open={this.state.removeSensor} onClose={() => this.setState({ ...this.state, removeSensor: null })} sensor={this.props.sensor} updateSensor={this.props.updateSensor} t={t} remove={() => this.props.remove()} />
                    <SensorTypeVisibilityDialog
                        sensor={this.props.sensor}
                        open={this.state.sensorVisibilityDialog}
                        onClose={() => this.setState({ ...this.state, sensorVisibilityDialog: false })}
                        updateSensor={this.props.updateSensor}
                    />
                </Box>
            </Box>
        )
    }
}

export default withRouter(withTranslation()(Sensor));