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
import { withRouter } from 'react-router-dom'
import { withTranslation } from 'react-i18next';

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
        var path = this.props.location.pathname
        return path.substring(path.indexOf("/") + 1, path.length)
    }
    render() {
        const { t } = this.props;
        return (
            <>
                {this.state.sensors.length > 0 &&
                    <Menu autoSelect={false} strategy="fixed" placement="bottom-end">
                        <MenuButton as={Button} variant="topbar" rightIcon={<MdArrowDropDown size={26} className="buttonSideIcon" style={{ marginLeft: -10, marignRight: -10 }} />} style={{ backgroundColor: "transparent", fontFamily: "mulish", fontSize: 15, fontWeight: 800, paddingRight: 0, paddingLeft: 8 }}>
                            {t("sensors")}
                        </MenuButton>
                        <MenuList mt="2">
                            {this.state.sensors.map((x, i) => {
                                let divider = <></>
                                let borderStyle = {};
                                if (i === 0) borderStyle = { borderTopLeftRadius: 6, borderTopRightRadius: 6 }
                                if (i === this.state.sensors.length - 1) borderStyle = { borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }
                                else divider = <MenuDivider />
                                return <>
                                    <MenuItem key={x.sensor} className={this.getCurrentSensor() === x.sensor ? "menuActive" : undefined} style={{ fontFamily: "mulish", fontSize: 15, fontWeight: 800, ...borderStyle }} onClick={() => this.props.history.push('/' + x.sensor)}>{x.name || x.sensor}</MenuItem>
                                    {divider}
                                </>
                            })}
                        </MenuList>
                    </Menu>
                }
            </>
        )
    }
}

export default withRouter(withTranslation()(SensorMenu));