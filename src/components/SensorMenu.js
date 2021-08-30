import React, { Component } from "react";
import {
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Button,
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
    render() {
        const { t } = this.props;
        return (
            <Menu>
                <MenuButton as={Button} rightIcon={<MdArrowDropDown size={20} color="#77cdc2" style={{ margin: -4 }} />} style={{ backgroundColor: "transparent", fontFamily: "mulish", fontSize: 16, fontWeight: "bold" }}>
                    {t("sensors")}
                </MenuButton>
                <MenuList>
                    {this.state.sensors.map(x => {
                        return <MenuItem key={x.sensor} style={{ fontFamily: "mulish", fontSize: 16, fontWeight: "bold" }} onClick={() => this.props.history.push('/' + x.sensor)}>{x.name || x.sensor}</MenuItem>
                    })}
                </MenuList>
            </Menu>
        )
    }
}

export default withRouter(withTranslation()(SensorMenu));