import React, { Component } from "react";
import NetworkApi from "../NetworkApi";
import SensorCard from "../components/SensorCard";
import Sensor from "./Sensor";
import { Spinner, Box, Link, useMediaQuery, Button, Tooltip, Flex } from "@chakra-ui/react"
import { useTranslation, withTranslation } from 'react-i18next';
import DurationPicker from "../components/DurationPicker";
import Store from "../Store";
import SessionStore from "../SessionStore";
import notify from "../utils/notify";
import SettingsModal from "../components/SettingsModal";
import { withColorMode } from "../utils/withColorMode";
import { MdEqualizer, MdImage } from "react-icons/md";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import SensorTypePicker from "../components/SensorTypePicker";
import MyAccountModal from "../components/MyAccountModal";
import DashboardViewType from "../components/DashboardViewType";

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
    const [isMobile] = useMediaQuery("(max-width: 1023px)")
    return <Tooltip label={t(props.label)} hasArrow isDisabled={isMobile}>
        <Button variant="imageToggle" onClick={() => props.showGraphClick()}>
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
            from: 24 * 3,
            showGraph: store.getDashboardShowGraph(),
            showBig: true,
            graphType: store.getDashboardGraphType()
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
    async fetchData(initialSensors) {
        clearTimeout(this.alertUpdateLoop);
        this.alertUpdateLoop = setTimeout(() => {
            this.fetchData()
        }, 60 * 1000);
        let resp = await new NetworkApi().getAllSensorsAsync();
        if (resp.result === "success") {
            let sensors = this.state.sensors;
            if (initialSensors) sensors = initialSensors
            sensors.forEach((x, i) => {
                let newSensor = resp.data.sensors.find(y => y.sensor === x.sensor)
                if (newSensor) {
                    sensors[i] = { ...x, ...newSensor }
                }
            })
            this.setState({ ...this.state, sensors: sensors, loading: false })
        }
    }
    updateFrom(v) {
        this.setState({ ...this.state, from: v })
        new Store().setDashboardFrom(v)
    }
    async componentDidMount() {
        var api = new NetworkApi();
        api.user(uresp => {
            if (uresp.result === "success") {
                this.fetchData(uresp.data.sensors)
            } else if (uresp.result === "error") {
                notify.error(this.props.t(`UserApiError.${uresp.code}`))
            }
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
    showModal(name) {
        return this.props.searchParams[0].has(name);
    }
    closeModal() {
        this.props.navigate({
            search: "",
        }, { replace: true });
    }
    showGraphClick() {
        let showGraph = !this.state.showGraph
        this.setState({ ...this.state, showGraph: showGraph })
        new Store().setDashboardShowGraph(showGraph)
    }
    setDashboardViewType(type) {
        console.log("setDashboardViewType", type)
        let showGraph = type === "graph"
        this.setState({ ...this.state, showGraph: showGraph })
        new Store().setDashboardShowGraph(showGraph)
    }
    setGraphType(type) {
        this.setState({ ...this.state, graphType: type })
        new Store().setDashboardGraphType(type)
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
                            {this.getCurrentSensor() ? (
                                <Sensor key={this.getCurrentSensor().sensor} sensor={this.getCurrentSensor()}
                                    close={() => this.props.navigate('/')}
                                    next={() => this.nextIndex(1)}
                                    prev={() => this.nextIndex(-1)}
                                    remove={() => this.removeSensor()}
                                    updateSensor={(sensor) => this.updateSensor(sensor)}
                                />
                            ) : (
                                <Box paddingLeft={{ base: "10px", lg: "50px" }} paddingRight={{ base: "10px", lg: "50px" }}>
                                    <div style={{ paddingTop: 26 }}>
                                        <Flex flexFlow={"row wrap"} justifyContent={"flex-end"} gap={2}>
                                            <DashboardViewType value={this.state.showGraph ? "graph" : "image"} onChange={this.setDashboardViewType.bind(this)} />
                                            <SensorTypePicker value={this.state.graphType} onChange={type => this.setGraphType(type)} />
                                            <DurationPicker value={this.state.from} onChange={v => this.updateFrom(v)} dashboard />
                                        </Flex>
                                    </div>
                                    <DashboardGrid showGraph={this.state.showGraph}>
                                        {size => {
                                            return <>
                                                {this.state.sensors.map(x => {
                                                    return <span key={x.sensor + this.state.from} style={{ width: 1000, maxWidth: "100%" }}>
                                                        <a href={"#/" + x.sensor}>
                                                            <SensorCard sensor={x} size={size} dataFrom={this.state.from} showImage={!this.state.showGraph} showGraph={this.state.showGraph} graphType={this.state.graphType} />
                                                        </a></span>
                                                })}
                                            </>
                                        }}
                                    </DashboardGrid>
                                </Box>
                            )}
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
                        </Box>
                    </Box>
                </Box>
                <SettingsModal open={this.showModal("settings")} onClose={() => this.closeModal()} updateUI={() => this.forceUpdate()} />
                {this.showModal("myaccount") && 
                    <MyAccountModal open={this.showModal("myaccount")} onClose={() => this.closeModal()} updateApp={() => this.props.reloadTags()} />
                }
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