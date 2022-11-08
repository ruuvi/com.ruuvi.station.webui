import React, { Component } from "react";
import NetworkApi from "../NetworkApi";
import SensorCard from "../components/SensorCard";
import Sensor from "./Sensor";
import { Spinner, Box, Link, useMediaQuery, Button, Tooltip } from "@chakra-ui/react"
import { useTranslation, withTranslation } from 'react-i18next';
import DurationPicker from "../components/DurationPicker";
import Store from "../Store";
import SessionStore from "../SessionStore";
import notify from "../utils/notify";
import SettingsModal from "../components/SettingsModal";
import { withColorMode } from "../utils/withColorMode";
import { MdEqualizer, MdImage } from "react-icons/md";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";

const infoText = {
    fontFamily: "mulish",
    fontSize: 16,
}

function DashboardGrid(props) {
    const [isLargeDisplay] = useMediaQuery("(min-width: 1600px)")
    const [isMediumDisplay] = useMediaQuery("(min-width: 1024px)")
    //const isMobileDisplay = !isLargeDisplay && !isMediumDisplay
    let size = ""
    if (isLargeDisplay) size = "large"
    else if (isMediumDisplay) size = "medium"
    else size = "mobile"
    //this.state.showBig ? "550px" : "400px"
    return <Box style={{ marginBottom: 30, marginTop: 30 }} justifyItems="start" display="grid" gap={size === "mobile" ? "10px" : "20px"} gridTemplateColumns={`repeat(auto-fit, minmax(${isLargeDisplay ? "500px" : isMediumDisplay ? "400px" : props.showGraph ? "300px" : "360px"}, max-content))`}>
        {props.children(size)}
    </Box>
}

function GraphToggle(props) {
    var { t } = useTranslation();
    const [showTooltip, setShowTooltip] = React.useState(false);
    return <Tooltip label={t(props.label)} hasArrow isOpen={showTooltip}>
        <Button variant="imageToggle" mr={2} onClick={() => props.showGraphClick() || setTimeout(() => setShowTooltip(false), 4000)} onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
            {props.showGraph ? <MdImage size="23px" /> : <MdEqualizer size="23px" />}
        </Button>
    </Tooltip>
}

class Dashboard extends Component {
    constructor(props) {
        super(props)
        let store = new Store();
        this.state = {
            loading: true,
            sensors: [],
            alerts: [],
            from: 24 * 3,
            showGraph: store.getDashboardShowGraph(),
            showBig: true,
        }
        var from = store.getDashboardFrom();
        if (from) {
            // apply new dashboard history length limit to old stored value
            if (from > 24 * 7) from = 24 * 7;
            this.state.from = from;
        }
    }
    getCurrentSensor() {
        let id = this.props.params.id;
        return this.state.sensors.find(x => x.sensor === id);
    }
    componentDidUpdate() {
        document.title = "Ruuvi Station"
    }
    componentWillUnmount() {
        clearTimeout(this.alertUpdateLoop);
    }
    loadAlerts() {
        clearTimeout(this.alertUpdateLoop);
        this.alertUpdateLoop = setTimeout(() => {
            this.loadAlerts()
        }, 60 * 1000);
        // dont load alerts if sensor view is open
        if (this.getCurrentSensor()) return
        new NetworkApi().getAlerts(null, data => {
            if (data.result === "success") {
                this.setState({ ...this.state, alerts: data.data.sensors })
            }
        })
    }
    updateFrom(v) {
        this.setState({ ...this.state, from: v })
        new Store().setDashboardFrom(v)
    }
    componentDidMount() {
        var api = new NetworkApi();
        api.sensors(resp => {
            if (resp.result === "success") {
                var d = resp.data.sensors;
                api.user(uresp => {
                    if (resp.result === "success") {
                        for (var i = 0; i < d.length; i++) {
                            let mac = d[i].sensor;
                            var uSensor = uresp.data.sensors.find(x => x.sensor === mac)
                            if (uSensor) d[i] = { ...d[i], ...uSensor }
                        }
                        this.setState({ ...this.state, sensors: d, loading: false })
                        this.loadAlerts();
                    } else if (resp.result === "error") {
                        notify.error(this.props.t(`UserApiError.${resp.code}`))
                    }
                })
            } else if (resp.result === "error") {
                notify.error(this.props.t(`UserApiError.${resp.code}`))
            }
        }, (e) => {
            notify.error(this.props.t(`something_went_wrong`))
        })
    }
    nextIndex(direction) {
        var current = this.getCurrentSensor().sensor;
        var setNext = current;
        var indexOfCurrent = this.state.sensors.findIndex(x => x.sensor === current)
        if (indexOfCurrent === -1) return;
        if (direction === 1 && indexOfCurrent === this.state.sensors.length - 1) setNext = this.state.sensors[0].sensor
        else if (direction === -1 && indexOfCurrent === 0) setNext = this.state.sensors[this.state.sensors.length - 1].sensor
        else setNext = this.state.sensors[indexOfCurrent + direction].sensor
        this.props.navigate('/' + setNext)
    }
    removeSensor() {
        var current = this.getCurrentSensor().sensor;
        this.setState({ ...this.state, sensors: this.state.sensors.filter(x => x.sensor !== current) })
        this.props.navigate('/')
        this.props.reloadTags();
    }
    updateSensor(sensor) {
        var idx = this.state.sensors.findIndex(x => x.sensor.sensor === sensor.sensor)
        if (idx > -1) {
            var sensors = this.state.sensors;
            sensors[idx] = sensor
            this.setState({ ...this.state, sensors: sensors })
        }
    }
    addRuuviLink(text) {
        var splitted = text.split("ruuvi.com")
        if (splitted.length === 1) return text;
        var out = [<span>{splitted[0]}</span>]
        for (var i = 1; i < splitted.length; i++) {
            out.push(<Link href="https://ruuvi.com" isExternal color="primary">ruuvi.com</Link>)
            out.push(<span>{splitted[i]}</span>);
        }
        return out;
    }
    showSettings() {
        return this.props.searchParams[0].has("settings");
    }
    closeSettings() {
        this.props.navigate({
            search: "",
        }, { replace: true });
    }
    showGraphClick() {
        let showGraph = !this.state.showGraph
        this.setState({ ...this.state, showGraph: showGraph })
        new Store().setDashboardShowGraph(showGraph)
    }
    render() {
        var { t } = this.props;
        if (this.props.params.id) SessionStore.setBackRoute(`/${this.props.params.id}`)
        else SessionStore.setBackRoute("/")
        return (
            <>
                <Box>
                    <Box backgroundSize="cover" backgroundPosition="top" >
                        <Box backgroundSize="cover" backgroundPosition="top" >
                            {this.state.loading &&
                                <center>
                                    <Spinner size="xl" />
                                </center>
                            }
                            {!this.state.loading && !this.state.sensors.length &&
                                <center style={{ margin: 32, ...infoText }}>
                                    {t("dashboard_no_sensors").split("\\n").map((x, i) => <div key={i}>{this.addRuuviLink(x)}<br /></div>)}
                                </center>
                            }
                            {this.getCurrentSensor() ? (
                                <Sensor sensor={this.getCurrentSensor()}
                                    close={() => this.props.navigate('/')}
                                    next={() => this.nextIndex(1)}
                                    prev={() => this.nextIndex(-1)}
                                    remove={() => this.removeSensor()}
                                    setAlerts={alerts => this.setState({ ...this.state, alerts: alerts })}
                                    updateSensor={(sensor) => this.updateSensor(sensor)}
                                />
                            ) : (
                                <Box paddingLeft={{ base: "10px", lg: "50px" }} paddingRight={{ base: "10px", lg: "50px" }}>
                                    <div style={{ paddingLeft: 16, paddingTop: 26 }}>
                                        {/*
                                        <div style={{ fontFamily: "montserrat", fontSize: 48, fontWeight: 800, lineHeight: 1 }}>
                                            Hello Friend,
                                        </div>
                                        <div style={{ fontFamily: "mulish", fontSize: 16, fontWeight: 600, fontStyle: "italic", color: "#51b5a5", marginBottom: 20 }} >
                                            Randomized welcome message here.
                                        </div>
                                        */}
                                        <div style={{ textAlign: "end" }} >
                                            <GraphToggle label={this.state.showGraph ? "button_card_image_tooltip" : "button_card_graph_tooltip"} showGraph={this.state.showGraph} showGraphClick={this.showGraphClick.bind(this)} />
                                            <DurationPicker value={this.state.from} onChange={v => this.updateFrom(v)} dashboard />
                                        </div>
                                    </div>
                                    <DashboardGrid showGraph={this.state.showGraph}>
                                        {size => {
                                            return <>
                                                {this.state.sensors.map(x => {
                                                    return <span key={x.sensor + this.state.from} style={{ width: 1000, maxWidth: "100%" }}>
                                                        <a href={"#/" + x.sensor}>
                                                            <SensorCard sensor={x} size={size} alerts={this.state.alerts.find(y => y.sensor === x.sensor)} dataFrom={this.state.from} showImage={!this.state.showGraph} showGraph={this.state.showGraph} />
                                                        </a></span>
                                                })}
                                            </>
                                        }}
                                    </DashboardGrid>
                                </Box>
                            )}
                        </Box>
                    </Box>
                </Box>
                <SettingsModal open={this.showSettings()} onClose={() => this.closeSettings()} updateUI={() => this.forceUpdate()} />
            </>
        )
    }
}

export default withTranslation()(withColorMode((props) => (
    <Dashboard
        {...props}
        params={useParams()}
        location={useLocation()}
        navigate={useNavigate()}
        searchParams={useSearchParams()}
    />
)));