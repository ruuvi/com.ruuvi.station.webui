import { Box, Button, Input, Progress } from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { withTranslation } from 'react-i18next';
import cache from "../DataCache";
import NetworkApi from "../NetworkApi";
import RDialog from "./RDialog";

function MyAccountModal(props) {
    const [subscription, setSubscriptions] = useState([])
    const [activationCode, setActivationCode] = useState("")
    useEffect(() => {
        async function getSubs() {
            let response = await new NetworkApi().getSubscription()
            console.log(response)
            setSubscriptions(response)
        }
        getSubs()
    }, [])
    const activate = async () => {
        let res = await new NetworkApi().claimSubscription(activationCode)
        alert(JSON.stringify(res))
        setActivationCode("")
    }
    let user = new NetworkApi().getUser()
    let userEmail = user ? user.email : "-"
    var { t } = props;
    return (
        <RDialog title={t("my_ruuvi_account")} isOpen={props.open} onClose={props.onClose}>
            {userEmail}
            <Box minHeight="250px">
                {subscription.length < 1 ? (
                    <Progress isIndeterminate />
                ) : (
                    <>
                        current_plan: {JSON.stringify(subscription)} expires <i>never</i>
                        <br />
                        <br />
                        {t("activate_code")}
                        <Input placeholder="4F23-F45T-F3..." value={activationCode} onChange={e => setActivationCode(e.target.value)} />
                        <Button style={{ marginTop: 4, float: "right" }} disabled={activationCode.length !== 10} onClick={activate}>{t("activate")}</Button>
                    </>
                )}
            </Box>
            <center>
                <Button onClick={() => {
                    new NetworkApi().removeToken()
                    localStorage.clear();
                    cache.clear();
                    window.location.replace("/#/")
                    window.location.reload()
                }}>{t("sign_out")}</Button>
            </center>
        </RDialog>
    )
}

export default withTranslation()(MyAccountModal);