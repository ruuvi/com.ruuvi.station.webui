import React, { Component } from "react";
import {
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Button,
    MenuDivider,
} from "@chakra-ui/react"
import { MdArrowDropDown } from "react-icons/md"
import NetworkApi from "../NetworkApi";
import withRouter from "../utils/withRouter"
import { withTranslation } from 'react-i18next';
import { useNavigate } from "react-router-dom";
import { getSetting } from "../UnitHelper";


class SensorMenu extends Component {
    constructor(props) {
        super(props)
        this.state = { sensors: [] }
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
            if (order) {
                return order.map(x => this.state.sensors.find(y => y.sensor === x))
            }
        }
        return this.state.sensors
    }
    render() {
        const { t } = this.props;
        return (
            <>
                <Menu autoSelect={false} strategy="fixed" placement="bottom-end">
                    <MenuButton as={Button} variant="topbar" rightIcon={<MdArrowDropDown size={26} className="buttonSideIcon" style={{ marginLeft: -10, marignRight: -10 }} />} style={{ backgroundColor: "transparent", fontFamily: "mulish", fontSize: 15, fontWeight: 800, paddingRight: 0, paddingLeft: 4 }}>
                        {t("sensors")}
                    </MenuButton>
                    <MenuList mt="2" zIndex={10}>
                        <MenuItem className="ddlItem" style={{ borderTopLeftRadius: 6, borderTopRightRadius: 6, fontWeight: 800 }} onClick={() => this.props.addSensor()}>{t('add_new_sensor')}</MenuItem>
                        <MenuDivider />
                        {this.getSensors().map((x, i) => {
                            if (!x) return null
                            let divider = <></>
                            let borderStyle = {};
                            if (i === this.state.sensors.length - 1) borderStyle = { borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }
                            else divider = <MenuDivider />
                            return <div key={x.sensor + "div"}>
                                <MenuItem key={x.sensor} className={(this.getCurrentSensor() === x.sensor ? "menuActive" : undefined) + " ddlItem"} style={{ ...borderStyle }} onClick={() => this.props.navigate('/' + x.sensor)}>{x.name || x.sensor}</MenuItem>
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