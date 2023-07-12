import React, { Component } from "react";
import NetworkApi from "../NetworkApi";
import SensorCard from "../components/SensorCard";
import Sensor from "./Sensor";
import { Spinner, Box, Link, useMediaQuery, Flex, Input, InputGroup, InputRightElement, Show } from "@chakra-ui/react"
import { withTranslation } from 'react-i18next';
import DurationPicker from "../components/DurationPicker";
import Store from "../Store";
import SessionStore from "../SessionStore";
import notify from "../utils/notify";
import SettingsModal from "../components/SettingsModal";
import { withColorMode } from "../utils/withColorMode";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import SensorTypePicker from "../components/SensorTypePicker";
import MyAccountModal from "../components/MyAccountModal";
import DashboardViewType from "../components/DashboardViewType";
import { SearchIcon, CloseIcon } from "@chakra-ui/icons";
import AddSensorModal from "../components/AddSensorModal";
import ShareDialog from "../components/ShareDialog";

const infoText = {
    fontFamily: "mulish",
    fontSize: 16,
}

function DashboardGrid(props) {
    const [isLargeDisplay] = useMediaQuery("(min-width: 1600px)", { ssr: false })
    const [isMediumDisplay] = useMediaQuery("(min-width: 1024px)", { ssr: false })
    //const isMobileDisplay = !isLargeDisplay && !isMediumDisplay
    let size = ""
    if (isLargeDisplay) size = "large"
    else if (isMediumDisplay) size = "medium"
    else size = "mobile"
    if (props.currSize !== size) props.onSizeChange(size)
    //this.state.showBig ? "550px" : "400px"
    return <Box style={{ marginBottom: 30, marginTop: size === "mobile" ? 10 : 30 }} justifyItems="start" display="grid" gap={size === "mobile" ? "10px" : "20px"} gridTemplateColumns={`repeat(auto-fit, minmax(${isLargeDisplay ? "500px" : isMediumDisplay ? "400px" : props.showGraph ? "300px" : "360px"}, max-content))`}>
        {props.children(size)}
    </Box>
}

class Dashboard extends Component {
    constructor(props) {
        super(props)
        let store = new Store();
        this.state = {
            loading: true,
            sensors: [],
            from: 24 * 3,
            cardType: store.getDashboardCardType(),
            showBig: true,
            graphType: store.getDashboardGraphType(),
            search: "",
            currSize: '',
            showShare: null
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
        let sensors = this.getSensors()
        var indexOfCurrent = sensors.findIndex(x => x.sensor === current)
        if (indexOfCurrent === -1) return;
        if (direction === 1 && indexOfCurrent === sensors.length - 1) setNext = sensors[0].sensor
        else if (direction === -1 && indexOfCurrent === 0) setNext = sensors[sensors.length - 1].sensor
        else setNext = sensors[indexOfCurrent + direction].sensor
        this.props.navigate('/' + setNext)
    }
    removeSensor() {
        var current = this.getCurrentSensor().sensor;
        this.setState({ ...this.state, sensors: this.state.sensors.filter(x => x.sensor !== current) })
        this.props.navigate('/')
        this.props.reloadTags();
    }
    updateSensor(sensor) {
        var idx = this.state.sensors.findIndex(x => x.sensor === sensor.sensor)
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
    setDashboardViewType(type) {
        this.setState({ ...this.state, cardType: type })
        new Store().setDashboardCardType(type)
    }
    setGraphType(type) {
        this.setState({ ...this.state, graphType: type })
        new Store().setDashboardGraphType(type)
    }
    getSensors() {
        if (this.state.search === "") return this.state.sensors
        let sensors = [];
        for (let i = 0; i < this.state.sensors.length; i++) {
            let x = this.state.sensors[i]
            let searchTerm = this.state.search.toLowerCase()
            if (x.name.toLowerCase().indexOf(searchTerm) !== -1) {
                sensors.push(x)
            }
        }
        return sensors
    }
    shouldDurationBeDisabled() {
        if (this.state.currSize === 'mobile' && this.state.cardType === 'image_view') return true
        return this.state.cardType === "simple_view"
    }
    render() {
        var { t } = this.props;
        if (this.props.params.id) SessionStore.setBackRoute(`/${this.props.params.id}`)
        else SessionStore.setBackRoute("/")
        const dropdowns = <>
            <DashboardViewType value={this.state.cardType} onChange={this.setDashboardViewType.bind(this)} />
            <SensorTypePicker value={this.state.graphType} onChange={type => this.setGraphType(type)} />
            <DurationPicker value={this.state.from} onChange={v => this.updateFrom(v)} dashboard disabled={this.shouldDurationBeDisabled()} />
        </>
        const search = width => {
            return <InputGroup width={width}>
                <InputRightElement className="buttonSideIcon" style={{ cursor: this.state.search ? "pointer" : undefined }} onClick={() => this.setState({ ...this.state, search: "" })}>
                    {this.state.search ? <CloseIcon /> : <SearchIcon />}
                </InputRightElement>
                <Input placeholder={t("sensor_search_placeholder")}
                    className="searchInput"
                    borderRadius={5}
                    value={this.state.search}
                    onChange={e => this.setState({ ...this.state, search: e.target.value })}
                />
            </InputGroup>
        }
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
                                    {this.state.sensors.length !== 0 &&
                                        <div style={{ paddingTop: 26 }}>
                                            <Flex flexFlow={"row wrap"} justifyContent={"flex-end"} gap={2}>
                                                <Show breakpoint='(max-width: 799px)'>
                                                    {search(undefined)}
                                                </Show>
                                                <Show breakpoint='(min-width: 800px)'>
                                                    {search("300px")}
                                                </Show>
                                                {dropdowns}
                                            </Flex>
                                        </div>
                                    }
                                    <DashboardGrid showGraph={this.state.showGraph} currSize={this.state.currSize} onSizeChange={s => this.setState({ ...this.state, currSize: s })}>
                                        {size => {
                                            let sensorsInSearch = this.getSensors()
                                            return <>
                                                {this.state.sensors.map(x => {
                                                    let hide = sensorsInSearch.find(y => y.sensor === x.sensor) === undefined
                                                    return <span key={x.sensor + this.state.from} style={{ width: 640, maxWidth: "100%", display: hide ? "none" : undefined }}>
                                                        <a href={"#/" + x.sensor}>
                                                            <SensorCard sensor={x} size={size} dataFrom={this.state.from} cardType={this.state.cardType} graphType={this.state.graphType} share={() => this.setState({ ...this.state, showShareFor: x })} />
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
                <AddSensorModal open={this.showModal("addsensor")} onClose={() => this.closeModal()} updateApp={() => this.props.reloadTags()} />
                <ShareDialog open={this.state.showShareFor} onClose={() => this.setState({ ...this.state, showShareFor: null })} sensor={this.state.showShareFor} updateSensor={(s) => this.updateSensor(s)} />
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