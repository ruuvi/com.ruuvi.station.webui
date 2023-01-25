import { Box, Button, PinInput, PinInputField, Progress } from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { withTranslation } from 'react-i18next';
import cache from "../DataCache";
import NetworkApi from "../NetworkApi";
import { goToLoginPage } from "../utils/loginUtils";
import notify from "../utils/notify";
import RDialog from "./RDialog";
import { ruuviTheme } from "../themes";

function MyAccountModal(props) {
    var { t } = props;
    const [subscriptions, setSubscriptions] = useState([])
    const [activationCode, setActivationCode] = useState("")
    const [isProcessingCode, setIsProcessingCode] = useState(false)
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
        setIsProcessingCode(true)
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
        setIsProcessingCode(false)
    }
    const updateValidationCode = (code) => {
        setActivationCode(code.toUpperCase())
    }
    let user = new NetworkApi().getUser()
    let userEmail = user ? user.email : "-"
    const Title = (props) => {
        return <div style={{ marginTop: 4, fontFamily: "mulish", fontSize: "16px", fontWeight: 800, width: "50%" }}>{props.children}</div>
    }
    const Content = (props) => {
        return <div style={{ marginBottom: 8, fontFamily: "mulish", fontSize: "15px" }}>{props.children}</div>
    }
    const dateToText = (date) => {
        return date.toISOString().replace("T", " ").split(".")[0]
    }
    return (
        <RDialog title={t("my_ruuvi_account")} isOpen={props.open} onClose={props.onClose}>
            <Title>User</Title>
            <Content>{userEmail}</Content>
            <Box minHeight="250px">
                {subscriptions.length < 1 ? (
                    <Progress isIndeterminate />
                ) : (
                    <>
                        <Title>{t("current_plan")}</Title>
                        <Content>{subscriptions[0].subscriptionName}</Content>
                        <Title>{t("expires")}</Title>
                        <Content>{dateToText(new Date(subscriptions[0].endTime * 1000))}</Content>
                        <Content>{t("Bacon ipsum dolor amet ground round ham swine frankfurter leberkas tri-tip picanha strip steak pig jowl corned beef fatback flank kielbasa landjaeger. Pancetta short ribs pork burgdoggen bacon flank kielbasa. Prosciutto bacon tenderloin drumstick. Salami ball tip brisket, pork beef kielbasa ground round.")}</Content>
                        <Title>{t("activation_code")}</Title>
                        <PinInput variant="filled" type="alphanumeric" value={activationCode} autoFocus={false} focusBorderColor="#1f938500" onChange={code => updateValidationCode(code)}>
                            {Array(4).fill().map(() => {
                                return <PinInputField bg={ruuviTheme.colors.pinFieldBgColor} _focus={{ backgroundColor: ruuviTheme.colors.pinFieldBgHoverColor }} _hover={{ backgroundColor: ruuviTheme.colors.pinFieldBgHoverColor }} color={"black"} height={12} style={{ margin: 5, fontWeight: 800 }} />
                            })}
                            <span>-</span>
                            {Array(4).fill().map(() => {
                                return <PinInputField bg={ruuviTheme.colors.pinFieldBgColor} _focus={{ backgroundColor: ruuviTheme.colors.pinFieldBgHoverColor }} _hover={{ backgroundColor: ruuviTheme.colors.pinFieldBgHoverColor }} color={"black"} height={12} style={{ margin: 5, fontWeight: 800 }} />
                            })}
                        </PinInput>
                        <br />
                        <Box height={12} pt={4}>
                            {isProcessingCode ? (
                                <Progress isIndeterminate />
                            ) : (
                                <Button disabled={activationCode.length !== 8} onClick={activate}>{t("activate")}</Button>
                            )}
                        </Box>
                    </>
                )}
            </Box>
            <Box mt={16}></Box>
            <Button variant='link' onClick={() => {
                new NetworkApi().removeToken()
                localStorage.clear();
                cache.clear();
                if (!goToLoginPage()) {
                    window.location.replace("/#/")
                    props.updateApp();
                }
            }}>{t("sign_out")}</Button>
            <Box mt={1}></Box>
            <Button variant='link' onClick={async () => {
                if (window.confirm(t("delete_account") + "?")) {
                    let resp = await new NetworkApi().requestDelete(userEmail)
                    if (resp && resp.result === "success") {
                        return notify.success(t("account_delete_confirmation_description"), 10 * 1000)
                    } else if (resp.result === "error") {
                        return notify.error(t(`UserApiError.${resp.code}`))
                    }
                    notify.error(t("something_went_wrong"))
                }
            }}>{t("delete_account")}</Button>
        </RDialog>
    )
}

export default withTranslation()(MyAccountModal);