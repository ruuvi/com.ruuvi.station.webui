import { Box, Button, PinInput, PinInputField, Progress } from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { withTranslation } from 'react-i18next';
import NetworkApi from "../NetworkApi";
import notify from "../utils/notify";
import RDialog from "./RDialog";
import { ruuviTheme } from "../themes";
import ConfirmationDialog from "./ConfirmationDialog";
import { addLink } from "../TextHelper";

function MyAccountModal(props) {
    var { t, i18n } = props;
    const lng = i18n.language || "en";
    const [subscriptions, setSubscriptions] = useState([])
    const [activationCode, setActivationCode] = useState("")
    const [isProcessingCode, setIsProcessingCode] = useState(false)
    const [showDeleteAccount, setShowDeleteAccount] = useState(false)
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
        if (!window.confirm(t("plan_activation_confirmation"))) return
        setIsProcessingCode(true)
        let code = activationCode.length === 8 ? activationCode.slice(0, 4) + "-" + activationCode.slice(4) : activationCode;
        let resp = await new NetworkApi().claimSubscription(code)
        if (resp.result === "success") {
            notify.success(resp.data.subscriptions[0].subscriptionName + " " + t("subscription_activated"))
            setSubscriptions(resp.data.subscriptions)
            setTimeout(() => {
                window.location.reload();
            }, 2000)
            //props.updateApp()
        } else if (resp.result === "error") {
            notify.error(t(`UserApiError.${resp.code}`))
        } else {
            notify.error(t("something_went_wrong"))
        }
        setActivationCode("")
        setIsProcessingCode(false)
    }
    const updateValidationCode = (code) => {
        code = code.replace("-", "")
        code = code.slice(0, 8)
        setActivationCode(code.toUpperCase())
    }
    let user = new NetworkApi().getUser()
    let userEmail = user ? user.email : "-"
    const Title = (props) => {
        return <div style={{ fontFamily: "mulish", fontSize: "16px", fontWeight: 800 }}>{props.children}</div>
    }
    const Content = (props) => {
        return <div style={{ marginBottom: 8, marginTop: 2, fontFamily: "mulish", fontSize: "15px" }}>{props.children}</div>
    }
    const dateToText = (date) => {
        const month = date.toLocaleString(i18n.language || "en", { month: 'long' });
        switch (i18n.language) {
            case "fi":
                return `${date.getDate()}. ${month} ${date.getFullYear()}`
            default:
                return `${date.getDate()} ${month} ${date.getFullYear()}`
        }
    }
    const cloudLink = () => {
        return <a href="https://cloud.ruuvi.com" target={"_blank"} style={{ textDecoration: "underline" }} rel="noreferrer">cloud.ruuvi.com ⇗</a>
    }
    const handleCodePaste = e => {
        if (e.clipboardData.items.length > 0) {
            e.clipboardData.items[0].getAsString(code => {
                updateValidationCode(code)
            })
        }
    }
    const deleteAccount = async () => {
        let resp = await new NetworkApi().requestDelete(userEmail)
        if (resp && resp.result === "success") {
            return notify.success(t("account_delete_confirmation_description"), 10 * 1000)
        } else if (resp.result === "error") {
            return notify.error(t(`UserApiError.${resp.code}`))
        }
        notify.error(t("something_went_wrong"))
    }
    return (
        <RDialog title={t("my_ruuvi_account")} isOpen={props.open} onClose={props.onClose}>
            <Title>{t("signed_in_user")}</Title>
            <Content>{userEmail}</Content>
            <Content>
                {addLink(t("my_account_change_email"), t("my_account_change_email_link_markup"), t("my_account_change_email_link"))}
            </Content>
            <Box minHeight="250px">
                {subscriptions.length < 1 ? (
                    <Progress isIndeterminate />
                ) : (
                    <>
                        <Title>{t("current_plan")}</Title>
                        <Content>{subscriptions[0].subscriptionName}</Content>
                        <Title>{t("plan_expiry_date")}</Title>
                        {subscriptions[0].endTime ? (
                            <Content>{dateToText(new Date(subscriptions[0].endTime * 1000))}</Content>
                        ) : (
                            <Content>{t("no_expiry_date")}</Content>
                        )}
                        <Title>{t("information")}</Title>
                        <Content>
                            {addLink(t('my_account_information'), t("cloud_ruuvi_link"), t("cloud_ruuvi_link_url"), true, t('my_account_information_hightlighted_text'))}
                        </Content>
                        <Title>{t("enter_activation_code")}</Title>
                        <Box mt={1} />
                        <PinInput variant="filled" type="alphanumeric" value={activationCode} autoFocus={false} focusBorderColor="#1f938500" onChange={code => updateValidationCode(code)}>
                            {Array(4).fill().map(() => {
                                return <PinInputField bg={ruuviTheme.colors.pinFieldBgColor} _focus={{ backgroundColor: ruuviTheme.colors.pinFieldBgHoverColor }} _hover={{ backgroundColor: ruuviTheme.colors.pinFieldBgHoverColor }} color={"black"} height={12} style={{ margin: 5, fontWeight: 800, maxWidth: "9%" }} onPaste={handleCodePaste} />
                            })}
                            <span>-</span>
                            {Array(4).fill().map(() => {
                                return <PinInputField bg={ruuviTheme.colors.pinFieldBgColor} _focus={{ backgroundColor: ruuviTheme.colors.pinFieldBgHoverColor }} _hover={{ backgroundColor: ruuviTheme.colors.pinFieldBgHoverColor }} color={"black"} height={12} style={{ margin: 5, fontWeight: 800, maxWidth: "9%" }} onPaste={handleCodePaste} />
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
            <Button variant='link' onClick={async () => {
                setShowDeleteAccount(true)
            }}>{t("delete_account")}</Button>

            <ConfirmationDialog open={showDeleteAccount} title="delete_account" loading={true} description='account_delete_description' onClose={(yes) => yes ? deleteAccount() : setShowDeleteAccount(false)} />
        </RDialog>
    )
}

export default withTranslation()(MyAccountModal);