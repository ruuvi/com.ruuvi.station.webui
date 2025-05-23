import React, { Component } from "react";
import {
    Button,
    Input,
    List,
    ListItem,
    ListIcon,
    Progress,
    Box,
} from "@chakra-ui/react"
import { withTranslation } from 'react-i18next';
import { MdClear } from "react-icons/md";
import NetworkApi from "../NetworkApi";
import notify from "../utils/notify";
import RDialog from "./RDialog";
import { addNewlines, addVariablesInString } from "../TextHelper";
import pjson from '../../package.json';

class ShareDialog extends Component {
    constructor(props) {
        super(props)
        this.state = { email: "", loading: false, userInvited: false }
    }
    share() {
        this.setState({ ...this.state, loading: true })
        new NetworkApi().share(this.props.sensor.sensor, this.state.email, resp => {
            var newState = this.state;
            switch (resp.result) {
                case "success":
                    if (!resp.data.invited) {
                        var sensor = this.props.sensor;
                        sensor.sharedTo.push(this.state.email);
                        this.props.updateSensor(sensor)
                        notify.success(this.props.t("successfully_shared"))
                    } else {
                        newState.userInvited = true
                    }
                    newState.email = "";
                    break
                case "error":
                    notify.error(this.props.t(`UserApiError.${resp.code}`))
                    break;
                default:
            }
            newState.loading = false;
            this.setState(newState)
        })
    }
    unshare(email) {
        if (this.state.loading) return;
        var confirmMessage = addVariablesInString(this.props.t("share_sensor_unshare_confirm"), [email])
        if (window.confirm(confirmMessage)) {
            this.setState({ ...this.state, loading: true })
            new NetworkApi().unshare(this.props.sensor.sensor, email, resp => {
                var newState = this.state;
                switch (resp.result) {
                    case "success":
                        var sensor = this.props.sensor;
                        sensor.sharedTo = sensor.sharedTo.filter(x => x !== email)
                        notify.success(this.props.t(`successfully_unshared`))
                        this.props.updateSensor(sensor)
                        break
                    case "error":
                        notify.error(this.props.t(`UserApiError.${resp.code}`))
                        break;
                    default:
                }
                newState.loading = false;
                this.setState(newState)
            })
        }
    }
    emailHandler(evt) {
        this.setState({ ...this.state, email: evt.target.value });
    }
    isInvalidValid = () => {
        return this.state.loading || this.props.sensor.sharedTo.length >= this.props.sensor.subscription.maxSharesPerSensor || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.state.email)
    }
    keyDown = (e) => {
        if (e.key === 'Enter') {
            if (this.isInvalidValid()) return
            this.share();
        }
    }
    render() {
        if (!this.props.sensor || !this.props.sensor.canShare) return <></>
        var { t } = this.props;
        return (
            <>
                <RDialog title={t("share_sensor_title")} isOpen={this.props.open} onClose={this.props.onClose}>
                    {addNewlines(t("share_sensor_description"), "\\n")}
                    <Box h="15px" />
                    <div style={{ fontFamily: "Montserrat", fontWeight: 800 }}>{t("share_sensor_add_friend")}</div>
                    <Input autoFocus placeholder={t("email")} type="email" value={this.state.email} onChange={this.emailHandler.bind(this)} mt="10px" onKeyDown={this.keyDown.bind(this)} />
                    <div style={{ textAlign: "right" }}>
                        <Button disabled={this.isInvalidValid()} onClick={this.share.bind(this)} mt="17px">{t("share")}</Button>
                    </div>
                    {this.props.sensor.sharedTo.length > 0 && <>
                        <div style={{ fontWeight: "bold", marginTop: 8, marginBottom: 8 }}>{addVariablesInString(t("share_sensor_already_shared"), [this.props.sensor.sharedTo.length, this.props.sensor.subscription.maxSharesPerSensor])}</div>
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
                </RDialog>
                <RDialog title={t('share_pending')} isOpen={this.state.userInvited} onClose={() => this.setState({ ...this.state, userInvited: false })}>
                    {t('share_pending_message')}
                    <div style={{ textAlign: "right" }}>
                        <Button onClick={() => this.setState({ ...this.state, userInvited: false })}>{t('ok')}</Button>
                    </div>
                </RDialog>
            </>
        )
    }
}

export default withTranslation()(ShareDialog);