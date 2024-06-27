import React, { Component } from "react";
import {
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Button,
    MenuDivider,
} from "@chakra-ui/react"
import { MdArrowDropDown, MdOpenInNew } from "react-icons/md"
import NetworkApi from "../NetworkApi";
import withRouter from "../utils/withRouter"
import { withTranslation } from 'react-i18next';
import { useNavigate } from "react-router-dom";
import { getSetting } from "../UnitHelper";
import i18next from "i18next";


class SensorMenu extends Component {
    constructor(props) {
        super(props)
        this.state = { sensors: [], sensorsOpen: true, isMenuOpen: false }
    }
    componentDidMount() {
        new NetworkApi().user(resp => {
            if (resp.result === "success") {
                var d = resp.data.sensors;
                this.setState({ ...this.state, sensors: d })
            } else if (resp.result === "error") {
                console.log("sensor menu error", resp.error)
            }
        });
    }
    getCurrentSensor() {
        var path = this.props.router.location.pathname
        return path.substring(path.indexOf("/") + 1, path.length)
    }
    getSensors() {
        let order = getSetting("SENSOR_ORDER", null)
        if (order) {
            order = JSON.parse(order)
            if (order && order.length > 0) {
                return order.map(x => this.state.sensors.find(y => y.sensor === x))
            }
        }
        return this.state.sensors
    }
    toggleSensorList = e => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        this.setState({...this.state, sensorsOpen: !this.state.sensorsOpen})
    }
    sensorClicked(sensor) {
        this.toggleMenu()
        this.props.navigate('/' + sensor)
    }
    toggleMenu = () => {
        this.setState(prevState => ({ ...prevState, isMenuOpen: !prevState.isMenuOpen }));
    }
    closeMenu = () => {
        this.setState({ isMenuOpen: false });
    }
    render() {
        const { t } = this.props;
        const extraStyle = {}
        if (this.props.small) {
            extraStyle.paddingLeft = 4
            extraStyle.paddingRight = 0
        }
        return (
            <>
                <Menu autoSelect={false} closeOnSelect={false} strategy="fixed" placement="bottom-end" isOpen={this.state.isMenuOpen} onClose={this.closeMenu}>
                    <MenuButton as={Button} variant="topbar" 
                    rightIcon={<MdArrowDropDown size={26} className="buttonSideIcon" style={{ marginLeft: -10, marignRight: -10 }} />} 
                    onClick={this.toggleMenu}
                    style={extraStyle}>
                        {t("my_sensors")}
                    </MenuButton>
                    <MenuList mt="2" zIndex={10}>
                        <MenuItem className="ddlItem" style={{ borderTopLeftRadius: 6, borderTopRightRadius: 6}} onClick={() => window.open(`https://${i18next.language === "fi" ? "ruuvi.com/fi/tuotteet" : "ruuvi.com/products"}`, "_blank")}>
                        {t('buy_sensors')}  <MdOpenInNew style={{ marginLeft: 8 }} />
                        </MenuItem>
                        <MenuDivider />
                        <MenuItem className="ddlItem" onClick={() => this.props.addSensor()}>{t('add_new_sensor')}</MenuItem>
                        <MenuDivider />
                        <MenuItem className="ddlItem"  onClick={this.toggleSensorList} display={"flex"} justifyContent={"space-between"} style={this.state.sensorsOpen ? undefined : { borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }}>
                            <span>
                                {t('all_my_sensors')}
                            </span>
                            <MdArrowDropDown size={26} className="buttonSideIcon" style={{ marginLeft: -10, marignRight: -10 }} />
                        </MenuItem>
                        <MenuDivider />
                        {this.getSensors().map((x, i) => {
                            if (!this.state.sensorsOpen) return null
                            if (!x) return null
                            let divider = <></>
                            let borderStyle = {};
                            if (i === this.state.sensors.length - 1) borderStyle = { borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }
                            else divider = <MenuDivider />
                            return <div key={x.sensor + "div"}>
                                <MenuItem key={x.sensor} className={`ddlSubItem ${this.getCurrentSensor() === x.sensor ? "selectedSensorInMenu" : ""}`} style={{ ...borderStyle }} onClick={() => this.sensorClicked(x.sensor)}>{x.name || x.sensor}</MenuItem>
                                {divider}
                            </div>
                        })}
                    </MenuList>
                </Menu>
            </>
        )
    }
}

export default withRouter(withTranslation()((props) => (
    <SensorMenu
        {...props}
        navigate={useNavigate()}
    />
)));