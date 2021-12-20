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
    List,
    ListItem,
    ListIcon,
    Progress,
} from "@chakra-ui/react"
import { withTranslation } from 'react-i18next';
import { MdClear } from "react-icons/md";
import NetworkApi from "../NetworkApi";

const maxSharesPerSensor = 10;

class ShareDialog extends Component {
    constructor(props) {
        super(props)
        this.state = { email: "", loading: false, successfullInvite: false }
    }
    share() {
        this.setState({ ...this.state, loading: true })
        new NetworkApi().share(this.props.sensor.sensor, this.state.email, resp => {
            var newState = this.state;
            switch (resp.result) {
                case "success":
                    newState.successfullInvite = true;
                    if (!resp.data.invited) {
                        var sensor = this.props.sensor;
                        sensor.sharedTo.push(this.state.email);
                        this.props.updateSensor(sensor)
                    }
                    newState.email = "";
                    break
                case "error":
                    alert(this.props.t(`UserApiError.${resp.code}`))
                    break;
                default:
            }
            newState.loading = false;
            this.setState(newState)
        })
    }
    unshare(email) {
        if (this.state.loading) return;
        var confirmMessage = this.props.t("share_sensor_unshare_confirm").replace("{%@^%1$s}", email)
        if (window.confirm(confirmMessage)) {
            this.setState({ ...this.state, loading: true, successfullInvite: false })
            new NetworkApi().unshare(this.props.sensor.sensor, email, resp => {
                var newState = this.state;
                switch (resp.result) {
                    case "success":
                        var sensor = this.props.sensor;
                        sensor.sharedTo = sensor.sharedTo.filter(x => x !== email)
                        this.props.updateSensor(sensor)
                        break
                    case "error":
                        alert(this.props.t(`UserApiError.${resp.code}`))
                        break;
                    default:
                }
                newState.loading = false;
                this.setState(newState)
            })
        }
    }
    emailHandler(evt) {
        this.setState({ ...this.state, email: evt.target.value, successfullInvite: false });
    }
    render() {
        if (!this.props.sensor || !this.props.sensor.canShare) return <></>
        var { t } = this.props;
        return (
            <>
                <Modal isOpen={this.props.open} onClose={this.props.onClose} size="xl" isCentered>
                    <ModalOverlay />
                    <ModalContent>
                        <ModalHeader>{t("share_sensor_title")}</ModalHeader>
                        <ModalCloseButton />
                        <ModalBody mb="3">
                            {t("share_sensor_description").split("\\n").map((x, i) => <div key={i}>{x}<br /></div>)}
                            <br />
                            <div style={{ fontWeight: "bold" }}>{t("share_sensor_add_friend")}</div>
                            <Input placeholder={t("email")} type="email" value={this.state.email} onChange={this.emailHandler.bind(this)} />
                            <div style={{ textAlign: "right" }}>
                                <Button backgroundColor={this.state.successfullInvite ? "green.300" : undefined} disabled={this.state.loading || this.props.sensor.sharedTo.length >= maxSharesPerSensor || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.state.email)} onClick={this.share.bind(this)} mt="2">{this.state.successfullInvite ? t("successfully_shared") : t("share")}</Button>
                            </div>
                            {this.props.sensor.sharedTo.length > 0 && <>
                                <div style={{ fontWeight: "bold" }}>{t("share_sensor_already_shared")} {this.props.sensor.sharedTo.length}/{maxSharesPerSensor}</div>
                                <List spacing={3}>
                                    {this.props.sensor.sharedTo.map(x => {
                                        return <ListItem key={x}>
                                            <ListIcon as={MdClear} color="gray" style={{ cursor: "pointer" }} onClick={() => this.unshare(x)} />
                                            {x}
                                        </ListItem>
                                    })}
                                </List>
                            </>
                            }
                            {this.state.loading && <Progress isIndeterminate={true} color="#e6f6f2" />}
                        </ModalBody>
                    </ModalContent>
                </Modal>
            </>
        )
    }
}

export default withTranslation()(ShareDialog);