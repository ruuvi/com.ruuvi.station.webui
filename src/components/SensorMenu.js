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
import { ruuviTheme } from "../themes";

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
                        <MenuButton as={Button} variant="ddl"  rightIcon={<MdArrowDropDown size={26} color="#77cdc2" style={{ marginLeft: -10, marignRight: -10 }} />} style={{ backgroundColor: "transparent", fontFamily: "mulish", fontSize: 15, fontWeight: 800, paddingRight: 0 }}>
                            {t("sensors")}
                        </MenuButton>
                        <MenuList mt="2">
                            {this.state.sensors.map(x => {
                                return <MenuItem key={x.sensor} style={{ fontFamily: "mulish", fontSize: 16, fontWeight: "bold", backgroundColor: this.getCurrentSensor() === x.sensor ? ruuviTheme.colors.primaryLight : undefined }} _hover={{ bg: "#edfbf7" }} onClick={() => this.props.history.push('/' + x.sensor)}>{x.name || x.sensor}</MenuItem>
                            })}
                        </MenuList>
                    </Menu>
                }
            </>
        )
    }
}

export default withRouter(withTranslation()(SensorMenu));