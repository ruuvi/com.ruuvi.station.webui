import { Box, Button, Input, Progress } from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { withTranslation } from 'react-i18next';
import cache from "../DataCache";
import NetworkApi from "../NetworkApi";
import { goToLoginPage } from "../utils/loginUtils";
import notify from "../utils/notify";
import RDialog from "./RDialog";

function MyAccountModal(props) {
    var { t } = props;
    const [subscriptions, setSubscriptions] = useState([])
    const [activationCode, setActivationCode] = useState("")
    useEffect(() => {
        async function getSubs() {
            let resp = await new NetworkApi().getSubscription()
            if (resp.result === "success") {
                if (resp.data.subscriptions.length === 0) return setSubscriptions([{ subscriptionName: "none", endTime: 0 }])
                return setSubscriptions(resp.data.subscriptions)
            } else if (resp.result === "error") {
                return notify.error(t(`UserApiError.${resp.code}`))
            }
            notify.error(t("something_went_wrong"))
        }
        getSubs()
    }, [t])
    const activate = async () => {
        let resp = await new NetworkApi().claimSubscription(activationCode)
        if (resp.result === "success") {
            notify.success(t("subscription_activated"))
            setSubscriptions(resp.data.subscriptions)
        } else if (resp.result === "error") {
            notify.error(t(`UserApiError.${resp.code}`))
        } else {
            notify.error(t("something_went_wrong"))
        }
        setActivationCode("")
    }
    let user = new NetworkApi().getUser()
    let userEmail = user ? user.email : "-"
    return (
        <RDialog title={t("my_ruuvi_account")} isOpen={props.open} onClose={props.onClose}>
            <b>{userEmail}</b>
            <Box minHeight="250px">
                {subscriptions.length < 1 ? (
                    <Progress isIndeterminate />
                ) : (
                    <>
                        {t("current_plan")} <b>{subscriptions[0].subscriptionName}</b>
                        <br />
                        {t("expires")} <b>{new Date(subscriptions[0].endTime * 1000).toISOString()}</b>
                        <br />
                        <br />
                        {t("activation_code")}:
                        <Input placeholder="4F23-F45T-F3..." value={activationCode} onChange={e => setActivationCode(e.target.value)} />
                        <Button style={{ marginTop: 4, float: "right" }} disabled={activationCode.length === 0} onClick={activate}>{t("activate")}</Button>
                    </>
                )}
            </Box>
            <center>
                <Button onClick={() => {
                     new NetworkApi().removeToken()
                     localStorage.clear();
                     cache.clear();
                     window.location.replace("/#/")
                     goToLoginPage();
                }}>{t("sign_out")}</Button>
                <Button ml="2" onClick={async () => {
                    if (window.confirm(t("are_you_sure"))) {
                        let resp = await new NetworkApi().requestDelete(userEmail)
                        if (resp && resp.result === "success") {
                            return notify.success("account_delete_confirmation_description")
                        } else if (resp.result === "error") {
                            return notify.error(t(`UserApiError.${resp.code}`))
                        }
                        notify.error(t("something_went_wrong"))
                    }
                }}>{t("delete_account")}</Button>
            </center>
        </RDialog>
    )
}

export default withTranslation()(MyAccountModal);