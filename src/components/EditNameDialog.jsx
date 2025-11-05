import React, { Component } from "react";
import {
    Button,
    Input,
    Progress,
} from "@chakra-ui/react"
import { withTranslation } from 'react-i18next';
import NetworkApi from "../NetworkApi";
import pjson from "../../package.json";
import notify from "../utils/notify";
import RDialog from "./RDialog";
import { getSetting } from "../UnitHelper";

class EditNameDialog extends Component {
    constructor(props) {
        super(props)
        this.state = { name: "", loading: false }
        if (props.sensor) this.state.name = props.sensor.name
    }
    componentDidUpdate(prevProps) {
        if (this.props.sensor && (!prevProps.sensor || prevProps.sensor.name !== this.props.sensor.name)) {
            this.setState({ ...this.state, name: this.props.sensor.name })
        }
    }
    update() {
        this.setState({ ...this.state, loading: true })
        let name = this.state.name || this.getDefaultName()
        new NetworkApi().update(this.props.sensor.sensor, name, resp => {
            var newState = this.state;
            switch (resp.result) {
                case "success":
                    var sensor = this.props.sensor;
                    sensor.name = name;
                    notify.success(this.props.t("successfully_saved"))
                    this.props.updateSensor(sensor)
                    break
                case "error":
                    notify.error(this.props.t(`UserApiError.${resp.code}`))
                    break;
                default:
            }
            newState.loading = false;
            this.setState(newState)
            this.props.onClose()
        })
    }
    updateName(name) {
        var limit = pjson.settings.sensorNameMaxLength
        this.setState({ ...this.state, name: name.substring(0, limit) })
    }
    keyDown = (e) => {
        if (e.key === 'Enter') {
            if (this.state.loading) return
            this.update();
        }
    }
    showOrderInfo() {
        let order = getSetting("SENSOR_ORDER", null)
        if (order) {
            order = JSON.parse(order)
            if (order) {
                return false
            }
        }
        return true
    }
    getDefaultName() {
        if (!this.props.sensor) return ""
        let device = "RuuviTag"
        if (this.props.sensor.measurements && this.props.sensor.measurements.length > 0) {
            if (this.props.sensor.measurements[0].parsed?.dataFormat === "e1") {
                device = "Ruuvi Air"
            }
        }
        let splitMac = this.props.sensor.sensor.split(":")
        return device + " " + splitMac[4] + splitMac[5]
    }
    render() {
        if (!this.props.sensor) return <></>
        var { t } = this.props;
        return (
            <RDialog title={t("sensor_name")} isOpen={this.props.open} onClose={this.props.onClose}>
                {this.showOrderInfo() &&
                    <p style={{ marginBottom: "8px" }}>
                        {t("rename_sensor_message")}
                    </p>
                }
                <Input autoFocus placeholder={this.getDefaultName()} value={this.state.name} onChange={e => this.updateName(e.target.value)} onKeyDown={this.keyDown.bind(this)} />
                <div style={{ textAlign: "right" }}>
                    <Button disabled={this.state.loading} onClick={this.update.bind(this)} mt="17px">{t("update")}</Button>
                </div>
                {this.state.loading && <Progress isIndeterminate={true} color="#e6f6f2" mt={4} />}
            </RDialog>
        )
    }
}

export default withTranslation()(EditNameDialog);