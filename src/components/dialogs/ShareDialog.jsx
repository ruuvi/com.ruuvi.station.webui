import React, { useState } from "react";
import {
    Button,
    Input,
    List,
    ListItem,
    ListIcon,
    Progress,
    Box,
} from "@chakra-ui/react"
import { useTranslation } from 'react-i18next';
import { MdClear } from "react-icons/md";
import NetworkApi from "../../NetworkApi";
import notify from "../../utils/notify";
import RDialog from "./RDialog";
import { addNewlines, addVariablesInString } from "../../TextHelper";

function ShareDialog(props) {
    const { t } = useTranslation();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [userInvited, setUserInvited] = useState(false);

    const share = () => {
        setLoading(true)
        new NetworkApi().share(props.sensor.sensor, email, resp => {
            switch (resp.result) {
                case "success":
                    if (!resp.data.invited) {
                        var sensor = props.sensor;
                        sensor.sharedTo.push(email);
                        props.updateSensor(sensor)
                        notify.success(t("successfully_shared"))
                    } else {
                        setUserInvited(true)
                    }
                    setEmail("")
                    break
                case "error":
                    notify.error(t(`UserApiError.${resp.code}`))
                    break;
                default:
            }
            setLoading(false)
        })
    }

    const unshare = (unshareEmail) => {
        if (loading) return;
        var confirmMessage = addVariablesInString(t("share_sensor_unshare_confirm"), [unshareEmail])
        if (window.confirm(confirmMessage)) {
            setLoading(true)
            new NetworkApi().unshare(props.sensor.sensor, unshareEmail, resp => {
                switch (resp.result) {
                    case "success":
                        var sensor = props.sensor;
                        sensor.sharedTo = sensor.sharedTo.filter(x => x !== unshareEmail)
                        notify.success(t(`successfully_unshared`))
                        props.updateSensor(sensor)
                        break
                    case "error":
                        notify.error(t(`UserApiError.${resp.code}`))
                        break;
                    default:
                }
                setLoading(false)
            })
        }
    }

    const isInvalidValid = () => {
        return loading || props.sensor.sharedTo.length >= props.sensor.subscription.maxSharesPerSensor || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }

    const keyDown = (e) => {
        if (e.key === 'Enter') {
            if (isInvalidValid()) return
            share();
        }
    }

    if (!props.sensor || !props.sensor.canShare) return <></>
    return (
        <>
            <RDialog title={t("share_sensor_title")} isOpen={props.open} onClose={props.onClose}>
                {addNewlines(t("share_sensor_description"), "\\n")}
                <Box h="15px" />
                <div style={{ fontFamily: "Montserrat", fontWeight: 800 }}>{t("share_sensor_add_friend")}</div>
                <Input autoFocus placeholder={t("email")} type="email" value={email} onChange={e => setEmail(e.target.value)} mt="10px" onKeyDown={keyDown} />
                <div style={{ textAlign: "right" }}>
                    <Button disabled={isInvalidValid()} onClick={share} mt="17px">{t("share")}</Button>
                </div>
                {props.sensor.sharedTo.length > 0 && <>
                    <div style={{ fontWeight: "bold", marginTop: 8, marginBottom: 8 }}>{addVariablesInString(t("share_sensor_already_shared"), [props.sensor.sharedTo.length, props.sensor.subscription.maxSharesPerSensor])}</div>
                    <List spacing={3}>
                        {props.sensor.sharedTo.map(x => {
                            return <ListItem key={x}>
                                <ListIcon as={MdClear} color="gray" style={{ cursor: "pointer" }} onClick={() => unshare(x)} />
                                {x}
                            </ListItem>
                        })}
                    </List>
                </>
                }
                {loading && <Progress isIndeterminate={true} color="#e6f6f2" />}
            </RDialog>
            <RDialog title={t('share_pending')} isOpen={userInvited} onClose={() => setUserInvited(false)}>
                {t('share_pending_message')}
                <div style={{ textAlign: "right" }}>
                    <Button onClick={() => setUserInvited(false)}>{t('ok')}</Button>
                </div>
            </RDialog>
        </>
    )
}

export default ShareDialog;
