import React, { Component, useState } from "react";
import NetworkApi from "../NetworkApi";
import {
    Heading,
    Box,
    SimpleGrid,
    GridItem,
    Flex,
    IconButton,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    MenuDivider,
    Spinner,
    Portal,
} from "@chakra-ui/react";
import "uplot/dist/uPlot.min.css";
import Graph from "./Graph";
import parse from "../decoder/parser";
import { useTranslation, withTranslation } from "react-i18next";
import { getDisplayValue, getUnitHelper, localeNumber } from "../UnitHelper";
import DurationText from "./DurationText";
import BigValue from "./BigValue";
import { withColorMode } from "../utils/withColorMode";
import bglayer from "../img/bg-layer.png";
import { MdMoreVert } from "react-icons/md";
import uploadBackgroundImage from "../BackgroundUploader";
import { isBatteryLow } from "../utils/battery";
import lowBattery from "../img/low_battery.svg";
import { Link, useNavigate } from "react-router-dom";
import { getAlertIcon, isAlerting } from "../utils/alertHelper";
import { ruuviTheme } from "../themes";
import { ArrowDownIcon, ArrowUpIcon } from "@chakra-ui/icons";
import UpgradePlanButton from "./UpgradePlanButton";
import RemoveSensorDialog from "./RemoveSensorDialog";
import notify from "../utils/notify";

const smallSensorValue = {
    fontFamily: "montserrat",
    fontSize: 16,
    fontWeight: 600,
};

const smallSensorValueUnit = {
    fontFamily: "mulish",
    fontWeight: 600,
    fontSize: 12,
    marginLeft: 6,
    opacity: 0.8,
};

const lastUpdatedText = {
    fontFamily: "mulish",
    fontWeight: 600,
    fontSize: 12,
};

function MoreMenu(props) {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    const handleButtonClick = () => setIsOpen(!isOpen);

    const menuItems = [
        { key: 'history', label: 'history_view', action: 'navigate' },
        { key: 'settings', label: 'settings_and_alerts', action: 'navigate' },
        { key: 'change_background', label: 'change_background', action: 'uploadBg' },
        { key: 'rename', label: 'rename', action: 'rename' },
        { key: 'share', label: 'share', action: 'share', condition: props.sensor.canShare },
        { key: 'moveUp', label: 'move_up', action: 'move', icon: <ArrowUpIcon mr={2} />, params: 1 },
        { key: 'moveDown', label: 'move_down', action: 'move', icon: <ArrowDownIcon mr={2} />, params: -1 },
        { key: 'remove', label: 'remove', action: 'remove' }
    ];

    const handleAction = (e, item) => {
        e.preventDefault();
        switch (item.action) {
            case 'navigate':
                navigate(`/${props.sensor.sensor}?scrollTo=${item.key}`);
                break;
            case 'uploadBg':
                props.uploadBg();
                break;
            case 'rename':
                props.rename();
                break;
            case 'share':
                props.share();
                break;
            case 'move':
                props.move(item.params);
                break;
            case 'remove':
                props.remove();
                break;
        }
    };

    return (
        <Menu
            autoSelect={false}
            isOpen={isOpen}
            onOpen={handleButtonClick}
            onClose={handleButtonClick}
        >
            <MenuButton
                as={IconButton}
                onClick={(e) => e.preventDefault() || handleButtonClick()}
                icon={<MdMoreVert size={23} />}
                variant="topbar"
                style={{
                    zIndex: 2,
                    backgroundColor: "transparent",
                    transition: "color 0.2s ease-in-out"
                }}
                _hover={{
                    color: "primary"
                }}
                top={-4}
                right={props.simpleView ? 0 : -4}
                height={55}
                mt={props.mt}
            />

            <Portal>
                <MenuList mt="2" zIndex="popover">
                    {menuItems.map((item, index) => (
                        item.condition !== false && (
                            <React.Fragment key={item.key}>
                                {index > 0 && <MenuDivider />}
                                <MenuItem className="ddlItem" onClick={(e) => handleAction(e, item)}>
                                    {item.icon}{t(item.label)}
                                </MenuItem>
                            </React.Fragment>
                        )
                    ))}
                </MenuList>
            </Portal>
        </Menu>
    );
}

class SensorCard extends Component {
    constructor(props) {
        super(props);
        this.state = {
            data: null,
            lastParsedReading: null,
            loading: false,
            loadingHistory: true,
            loadingImage: false,
            showRemoveDialog: false,
            errorFetchingData: false,
            hasDataForTypes: [],
        };
        this.abortController = new AbortController();
    }

    componentDidMount() {
        this.loadData();
    }

    componentWillUnmount() {
        clearTimeout(this.fetchDataLoop);
        this.abortController.abort();
    }

    componentDidUpdate(prevProps) {
        if (prevProps.dataFrom !== this.props.dataFrom) {
            this.abortController.abort();
            this.abortController = new AbortController();

            this.setState({ ...this.state, loading: true, loadingHistory: true });
            this.loadData();
        }
    }

    /**
     * Load data from the network, sets up a repeat fetch loop.
     */
    async loadData() {
        clearTimeout(this.fetchDataLoop);

        this.fetchDataLoop = setTimeout(() => {
            this.loadData();
        }, 60 * 1000 * (this.props.dataFrom > 1 ? 5 : 1));

        let graphDataMode = this.props.dataFrom <= 12 ? "mixed" : "sparse";
        try {
            this.loadGraphData(graphDataMode);
        } catch (e) {
            console.log("err", e);
            this.setState({ data: null, loading: false, loadingHistory: false });
        }
    }

    /**
     * Loads graph data from the network according to the chosen mode.
     * @param {string} graphDataMode 
     */
    async loadGraphData(graphDataMode) {
        // If subscription is limited to 0 days, don't load
        if (this.props.sensor.subscription.maxHistoryDays === 0) {
            this.setState({
                ...this.state,
                loading: false,
                loadingHistory: false,
            });
            return;
        }

        // Fetch data for the graph
        const networkApi = new NetworkApi();
        const nowTs = Math.floor(new Date().getTime() / 1000);
        const rangeStart = nowTs - 60 * 60 * this.props.dataFrom;
        try {
            const graphData = await networkApi.getAsync(
                this.props.sensor.sensor,
                parseInt(rangeStart),
                null,
                { mode: graphDataMode },
                this.abortController.signal
            );

            if (graphData.result === "success") {
                // Merge offsets from sensor
                Object.keys(this.props.sensor)
                    .filter((x) => x.startsWith("offset"))
                    .forEach((x) => {
                        graphData.data[x] = this.props.sensor[x];
                    });

                // Parse the returned data
                let d = parse(graphData.data);
                let hasDataForTypes = [];
                if (d.measurements.length) {
                    hasDataForTypes = Object.keys(d.measurements[0].parsed);
                }
                this.setState({
                    ...this.state,
                    data: d,
                    loading: false,
                    loadingHistory: false,
                    table: d.table,
                    resolvedMode: d.resolvedMode,
                    errorFetchingData: false,
                    hasDataForTypes: hasDataForTypes,
                });
            }
            else if (graphData.result === "error") {
                console.log(graphData.error);
                this.setState({
                    ...this.state,
                    loading: false,
                    loadingHistory: false,
                    errorFetchingData: true,
                });
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.log("Error fetching graph data:", error);
                this.setState({
                    ...this.state,
                    loading: false,
                    loadingHistory: false,
                    errorFetchingData: true,
                });
            }
        }
    }

    getLatestReading() {
        const latest =
            this.props.sensor.measurements.length === 1
                ? this.props.sensor.measurements[0]
                : null;
        if (!latest) return null;
        return { ...latest.parsed, timestamp: latest.timestamp };
    }

    getTimeSinceLastUpdate() {
        if (!this.state.data || !this.state.data.measurements.length) return " - ";
        let now = new Date().getTime() / 1000;
        let lastUpdate = this.state.data.measurements[0].timestamp;
        return Math.floor((now - lastUpdate) / 60);
    }

    /**
     * Gets alert object by type, or null if none.
     * @param {string} type 
     */
    getAlert(type) {
        if (!this.props.sensor) return null;
        if (type === "rssi") type = "signal";
        let idx = this.props.sensor.alerts.findIndex((x) => x.type === type);
        if (idx !== -1) {
            return this.props.sensor.alerts[idx];
        }
        return null;
    }

    /**
     * Returns alert state code (-1=disabled, 0=enabled/not alerting, 1=alerting)
     * @param {string} type 
     */
    getAlertState(type) {
        if (type === "movementCounter") type = "movement";
        if (type === "rssi") type = "signal";
        let alert = this.getAlert(type.toLocaleLowerCase());
        if (!alert || !alert.enabled) return -1;
        if (isAlerting(this.props.sensor, type)) return 1;
        return 0;
    }

    getMeasurements() {
        let measurements = JSON.parse(JSON.stringify(this.state.data.measurements));
        if (measurements && this.props.sensor.measurements.length) {
            measurements = [this.props.sensor.measurements[0], ...measurements];
        }
        return measurements;
    }

    getSmallDataFields() {
        let arr = ["humidity", "pressure", "movementCounter"];
        let latest = this.getLatestReading();
        if (!latest) return arr;

        /*
        let noShow = ["mac", "timestamp", "dataFormat", "txPower", this.props.graphType || "temperature"];
        return Object.keys(latest).filter((x) => !arr.includes(x) && !noShow.includes(x));
        */

        if (latest.dataFormat === 6) arr = ["pm1p0", "co2", "voc"];
        if (latest.dataFormat === "e0") arr = ["pm1p0", "co2", "voc", "illuminance", "nox", "aqi"];
        if ((this.props.graphType || "temperature") !== "temperature") {
            arr.push("temperature");
        }
        return arr;
    }

    render() {
        const { t } = this.props;

        let showGraph =
            this.props.cardType === "graph_view" ||
            this.props.cardType === "image_graph_view";
        let showImage =
            this.props.cardType === "image_view" ||
            this.props.cardType === "image_graph_view";
        let simpleView = this.props.cardType === "simple_view";

        let height = showGraph
            ? this.props.size === "medium"
                ? 300
                : 350
            : 180;
        let graphHeight = height - 150;
        let imageWidth = "25%";
        let imageButtonSize = 80;

        if (this.props.size === "mobile") imageButtonSize = 60;

        let isSmallCard = this.props.size === "mobile" && !showGraph;
        let mainStat = this.props.graphType || "temperature";
        let latestReading = this.getLatestReading();
        let alertIcon = getAlertIcon(this.props.sensor);

        const sensorHasData = () => {
            let lastParsedReading =
                this.props.sensor.measurements.length === 1
                    ? this.props.sensor.measurements[0]
                    : null;
            return lastParsedReading !== null;
        };

        const isSharedSensor = () => {
            let user = new NetworkApi().getUser().email;
            let owner = this.props.sensor.owner;
            return user !== owner;
        };

        // For main graph alert
        let tnpGetAlert = (x) => {
            let dataKey = x === "movement" ? "movementCounter" : "signal" ? "rssi" : x;
            if (this.getLatestReading()[dataKey] === undefined) return null;
            return this.getAlert(x);
        };

        // Info row for last updated and battery
        let infoRow = (
            <div
                className="dashboardUpdatedAt"
                style={{ ...lastUpdatedText, width: "100%", marginTop: -4 }}
            >
                <Flex justifyContent={"space-between"}>
                    <span>
                        <DurationText
                            from={latestReading ? latestReading.timestamp : " - "}
                            t={this.props.t}
                            isAlerting={this.getAlertState("offline") > 0}
                        />
                    </span>
                    <Flex>
                        {latestReading && (
                            <>
                                {isBatteryLow(latestReading.battery, latestReading.temperature) && (
                                    <>
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
                                    </>
                                )}
                            </>
                        )}
                    </Flex>
                </Flex>
            </div>
        );

        const moreDropdonw = (
            <MoreMenu
                move={this.props.move}
                simpleView
                sensor={this.props.sensor}
                share={() => this.props.share()}
                uploadBg={() => {
                    document.getElementById("fileinputlabel" + this.props.sensor.sensor).click();
                }}
                rename={this.props.rename}
                remove={() => this.setState({ ...this.state, showRemoveDialog: true })}
            />
        );

        const altFileUplaod = (
            <label
                htmlFor={"altup" + this.props.sensor.sensor}
                id={"fileinputlabel" + this.props.sensor.sensor}
            >
                <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    id={"altup" + this.props.sensor.sensor}
                    onChange={(f) => {
                        this.setState({ ...this.state, loadingImage: true });
                        uploadBackgroundImage(this.props.sensor, f, t, (res) => {
                            this.setState({ ...this.state, loadingImage: false });
                        });
                    }}
                />
            </label>
        );

        let noHistoryStrKey = "no_data_in_range";
        let freeMode = this.props.sensor?.subscription.maxHistoryDays === 0;
        if (freeMode) noHistoryStrKey = "no_data_free_mode";
        let noHistoryStr = t(noHistoryStrKey)
            .split("\n")
            .map((x) => <div key={x}>{x}</div>);

        const removeSensorDialog = (
            <RemoveSensorDialog
                open={this.state.showRemoveDialog}
                sensor={this.props.sensor}
                t={t}
                onClose={() => this.setState({ ...this.state, showRemoveDialog: false })}
                remove={() => {
                    this.setState({ ...this.state, showRemoveDialog: false });
                    notify.success(t(`sensor_removed`));
                    this.props.remove();
                }}
            />
        );

        const noData = (str) => (
            <div
                style={{
                    height: showGraph ? graphHeight : undefined
                }}
                className="nodatatext"
            >
                <div
                    style={{
                        position: "relative",
                        top: simpleView || !showGraph
                            ? undefined
                            : this.props.size === "medium"
                                ? "44%"
                                : "50%",
                        transform: simpleView || !showGraph ? undefined : "translateY(-50%)",
                    }}
                >
                    {str}
                    {freeMode && !isSharedSensor() && sensorHasData() && (
                        <>
                            <Box mt={2} />
                            <UpgradePlanButton />
                        </>
                    )}
                </div>
            </div>
        );

        if (simpleView) {
            let stats = [mainStat];
            if (mainStat !== "humidity") stats.push("humidity");
            if (mainStat !== "pressure") stats.push("pressure");
            if (mainStat !== "temperature") stats.push("temperature");
            if (!stats.includes("movementCounter")) stats.push("movementCounter");

            return (
                <Box
                    className="content sensorCard"
                    borderRadius="lg"
                    marginBottom={this.props.size === "mobile" ? "10px" : "20px"}
                >
                    {altFileUplaod}
                    <Box
                        overflow="hidden"
                        padding={4}
                    >
                        {/* Header */}
                        <Flex>
                            <Flex grow={1} width="calc(100% - 40px)">
                                <Heading
                                    size="xs"
                                    style={{
                                        lineHeight: 1,
                                        fontFamily: "montserrat",
                                        fontSize: 16,
                                        fontWeight: "bold",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        marginRight: 2,
                                    }}
                                >
                                    {this.props.sensor.name}
                                </Heading>
                            </Flex>
                            <Flex width="15px" mt="0.5">
                                {alertIcon}
                            </Flex>
                            <Flex width="24px" height={"20px"}>
                                {moreDropdonw}
                            </Flex>
                        </Flex>

                        {/* Stats */}
                        {latestReading ? (
                            <>
                                <SimpleGrid
                                    pt={3}
                                    columns={2}
                                    style={{
                                        width: "100%",
                                        overflow: "hidden",
                                        whiteSpace: "nowrap",
                                        opacity: 0.8,
                                    }}
                                >
                                    {stats.map((x) => {
                                        let value = latestReading[x];
                                        if (value === undefined) return null;
                                        return (
                                            <GridItem
                                                key={Math.random()}
                                                style={{
                                                    color:
                                                        this.getAlertState(x) > 0
                                                            ? ruuviTheme.colors.sensorCardValueAlertState
                                                            : undefined,
                                                }}
                                            >
                                                <span style={smallSensorValue}>
                                                    {value == null
                                                        ? "-"
                                                        : getDisplayValue(
                                                            x,
                                                            localeNumber(
                                                                getUnitHelper(x).value(
                                                                    value,
                                                                    latestReading["temperature"]
                                                                ),
                                                                getUnitHelper(x).decimals
                                                            )
                                                        )}
                                                </span>
                                                <span style={smallSensorValueUnit}>
                                                    {x === "movementCounter"
                                                        ? t(getUnitHelper(x).unit.toLocaleLowerCase())
                                                        : getUnitHelper(x).unit}
                                                </span>
                                            </GridItem>
                                        );
                                    })}
                                </SimpleGrid>
                            </>
                        ) : (
                            noData(
                                t("no_data")
                                    .split("\n")
                                    .map((x) => <div key={x}>{x}</div>)
                            )
                        )}
                    </Box>
                    {latestReading && <Box pr={4} pl={4} pb={2}>
                        {infoRow}
                    </Box>}
                    {removeSensorDialog}
                </Box>
            );
        }

        /**
         * Default (detailed) card rendering
         */
        return (
            <Box>
                {altFileUplaod}
                <Box
                    className="content sensorCard"
                    borderRadius="lg"
                    overflow="hidden"
                    marginBottom={this.props.size === "mobile" ? "10px" : "20px"}
                >
                    <Flex>
                        {/* Image section */}
                        {showImage && (
                            <Box
                                width={imageWidth}
                                className="imageBackgroundColor"
                                position="relative"
                                backgroundImage={this.props.sensor.picture}
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

                        {/* Info & Graph section */}
                        <Box flex={1} display="flex" flexDirection="column">
                            <Box flex={1} p={4} display="flex" flexDirection="column">
                                <Box>
                                    <Flex>
                                        {/* Sensor Heading */}
                                        <Flex grow={1} width="calc(100% - 40px)">
                                            <Link
                                                to={`/${this.props.sensor.sensor}`}
                                                style={{ width: "100%" }}
                                            >
                                                {isSmallCard ? (
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
                                                        }}
                                                    >
                                                        {this.props.sensor.name}
                                                    </Heading>
                                                ) : (
                                                    <Heading
                                                        size="xs"
                                                        style={{
                                                            lineHeight: 1.1,
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
                                                        }}
                                                    >
                                                        {this.props.sensor.name}
                                                    </Heading>
                                                )}
                                            </Link>
                                        </Flex>

                                        <Flex width="15px" mt={0.5}>
                                            {alertIcon}
                                        </Flex>
                                        <Flex width="24px" height={"20px"}>
                                            {moreDropdonw}
                                        </Flex>
                                    </Flex>

                                    {/* Large main temperature or chosen stat */}
                                    {latestReading && (
                                        <Box>
                                            <BigValue
                                                value={getDisplayValue(
                                                    mainStat,
                                                    localeNumber(
                                                        getUnitHelper(mainStat).value(
                                                            latestReading[mainStat],
                                                            mainStat === "humidity"
                                                                ? latestReading.temperature
                                                                : undefined
                                                        ),
                                                        getUnitHelper(mainStat).decimals
                                                    )
                                                )}
                                                unit={getUnitHelper(mainStat).unit}
                                                alertActive={this.getAlertState(mainStat) > 0}
                                            />
                                        </Box>
                                    )}
                                </Box>

                                {/* Loading spinner or Graph */}
                                {this.state.loading ? (
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
                                        <Link to={`/${this.props.sensor.sensor}`} style={{}}>
                                            {latestReading ? (
                                                <Flex direction="column" flex={1} justifyContent="space-between">
                                                    <Box flexGrow={1} display="flex" flexDir="column" justifyContent="space-between">
                                                        <div>
                                                            {this.state.data &&
                                                                this.state.hasDataForTypes.includes(mainStat) &&
                                                                this.state.data.measurements.length ? (
                                                                <>
                                                                    {showGraph && (
                                                                        <div
                                                                            style={{
                                                                                paddingTop: 10,
                                                                                marginRight: -15,
                                                                                marginBottom: -10,
                                                                            }}
                                                                        >

                                                                            <Graph
                                                                                title=""
                                                                                key={
                                                                                    this.props.sensor.sensor +
                                                                                    this.props.cardType
                                                                                }
                                                                                alert={tnpGetAlert(mainStat)}
                                                                                unit={getUnitHelper(mainStat).unit}
                                                                                dataKey={mainStat}
                                                                                data={this.getMeasurements()}
                                                                                height={graphHeight}
                                                                                legend={false}
                                                                                cardView={true}
                                                                                from={
                                                                                    new Date().getTime() -
                                                                                    60 * 60 * 1000 * this.props.dataFrom
                                                                                }
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    {/* No measurements */}
                                                                    {showGraph && (
                                                                        <>
                                                                            {this.state.loadingHistory ? (
                                                                                <center
                                                                                    style={{
                                                                                        fontFamily: "montserrat",
                                                                                        fontSize: 16,
                                                                                        fontWeight: "bold",
                                                                                        height: graphHeight - 10,
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
                                                                                showGraph && (
                                                                                    <Box>
                                                                                        {noData(
                                                                                            this.state.errorFetchingData
                                                                                                ? t("network_error")
                                                                                                : noHistoryStr
                                                                                        )}
                                                                                    </Box>
                                                                                )
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>

                                                        {/* Small data fields */}
                                                        <div
                                                            style={{
                                                                maxWidth:
                                                                    this.props.size === "mobile" && !this.props.showGraph
                                                                        ? "300px"
                                                                        : undefined,
                                                            }}
                                                        >
                                                            <SimpleGrid
                                                                pt={2}
                                                                columns={2}
                                                                style={{
                                                                    width: "100%",
                                                                    overflow: "hidden",
                                                                    whiteSpace: "nowrap",
                                                                }}
                                                            >
                                                                {this.getSmallDataFields().map((x) => {
                                                                    let value = latestReading[x];
                                                                    if (value === undefined || typeof (value) === "object") return null;
                                                                    return (
                                                                        <GridItem
                                                                            key={x}
                                                                            alignSelf="flex-end"
                                                                            lineHeight="1.3"
                                                                            style={{
                                                                                color:
                                                                                    this.getAlertState(x) > 0
                                                                                        ? ruuviTheme.colors.sensorCardValueAlertState
                                                                                        : undefined,
                                                                            }}
                                                                        >
                                                                            <span style={smallSensorValue}>
                                                                                {value == null
                                                                                    ? "-"
                                                                                    : getDisplayValue(
                                                                                        x,
                                                                                        localeNumber(
                                                                                            getUnitHelper(x).value(
                                                                                                latestReading[x],
                                                                                                x === "humidity"
                                                                                                    ? latestReading.temperature
                                                                                                    : undefined
                                                                                            ),
                                                                                            getUnitHelper(x).decimals
                                                                                        )
                                                                                    )}
                                                                            </span>
                                                                            <span style={smallSensorValueUnit}>
                                                                                {x === "movementCounter"
                                                                                    ? t(
                                                                                        getUnitHelper(x).unit.toLocaleLowerCase()
                                                                                    )
                                                                                    : getUnitHelper(x).unit}
                                                                            </span>
                                                                        </GridItem>
                                                                    );
                                                                })}
                                                            </SimpleGrid>
                                                        </div>
                                                    </Box>
                                                </Flex>
                                            ) : (
                                                <>
                                                    {/* No data available fallback */}
                                                    <Box pt={4} pb={4}>
                                                        {noData(
                                                            t("no_data")
                                                                .split("\n")
                                                                .map((x) => <div key={x}>{x}</div>)
                                                        )}
                                                    </Box>
                                                </>
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

                {removeSensorDialog}
            </Box>
        );
    }
}

export default withTranslation()(withColorMode(SensorCard));