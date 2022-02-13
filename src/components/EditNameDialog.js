import React, { Component } from "react";
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    Button,
    Input,
    Progress,
} from "@chakra-ui/react"
import { withTranslation } from 'react-i18next';
import NetworkApi from "../NetworkApi";
import pjson from "../../package.json";
import notify from "../utils/notify";

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
        new NetworkApi().update(this.props.sensor.sensor, this.state.name, resp => {
            var newState = this.state;
            switch (resp.result) {
                case "success":
                    var sensor = this.props.sensor;
                    sensor.name = this.state.name;
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
    render() {
        if (!this.props.sensor) return <></>
        var { t } = this.props;
        return (
            <>
                <Modal isOpen={this.props.open} onClose={this.props.onClose} size="xl" isCentered>
                    <ModalOverlay />
                    <ModalContent>
                        <ModalHeader>{t("sensor_name")}</ModalHeader>
                        <ModalCloseButton />
                        <ModalBody mb="3">
                            <Input autoFocus placeholder={t("sensor_name")} value={this.state.name} onChange={e => this.updateName(e.target.value)} />
                            <div style={{ textAlign: "right" }}>
                                <Button disabled={this.state.loading || !this.state.name} onClick={this.update.bind(this)} mt="2">{t("update")}</Button>
                            </div>
                            {this.state.loading && <Progress isIndeterminate={true} color="#e6f6f2" />}
                        </ModalBody>
                    </ModalContent>
                </Modal>
            </>
        )
    }
}

export default withTranslation()(EditNameDialog);