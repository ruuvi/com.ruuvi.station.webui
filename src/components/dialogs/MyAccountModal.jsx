import { Box, Button, PinInput, PinInputField, Progress, useColorModeValue } from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import { withTranslation } from 'react-i18next';
import NetworkApi from "../../NetworkApi";
import notify from "../../utils/notify";
import RDialog from "./RDialog";
import { ruuviTheme } from "../../themes";
import ConfirmationDialog from "./ConfirmationDialog";
import { addLink } from "../../TextHelper";
import { logout } from "../../utils/loginUtils";

function MyAccountModal(props) {
    var { t, i18n } = props;
    const _lng = i18n.language || "en";
    const sessionCardBg = useColorModeValue("rgba(198, 227, 224, 0.5)", "rgba(53, 173, 159, 0.15)");
    const sessionTextColor = useColorModeValue("#1b484780", "#ffffff80");
    const sessionCurrentColor = useColorModeValue("#1f9385", "#44c9b9");
    const [subscriptions, setSubscriptions] = useState([])
    const [activationCode, setActivationCode] = useState("")
    const [isProcessingCode, setIsProcessingCode] = useState(false)
    const [showDeleteAccount, setShowDeleteAccount] = useState(false)
    const [showActivationConfirmation, setShowActivationConfirmation] = useState(false)
    const [sessionsExpanded, setSessionsExpanded] = useState(false)
    const [sessions, setSessions] = useState(null)
    const [sessionsLoading, setSessionsLoading] = useState(false)
    const [showSignOutAll, setShowSignOutAll] = useState(false)
    const [deletingSessionId, setDeletingSessionId] = useState(null)
    const [signingOutAll, setSigningOutAll] = useState(false)

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
        setShowActivationConfirmation(false)
        //if (!window.confirm(t("plan_activation_confirmation"))) return
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
    const _cloudLink = () => {
        return <a href="https://cloud.ruuvi.com" target={"_blank"} style={{ textDecoration: "underline" }} rel="noreferrer">cloud.ruuvi.com ⇗</a>
    }
    const handleCodePaste = e => {
        e.preventDefault();
        
        const plainText = e.clipboardData.getData('text/plain');
        if (plainText) {
            updateValidationCode(plainText);
            return;
        }
        
        if (e.clipboardData.items.length > 0) {
            e.clipboardData.items[0].getAsString(code => {
                updateValidationCode(code);
            });
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
    const loadSessions = async () => {
        setSessionsLoading(true)
        try {
            let resp = await new NetworkApi().getSessions()
            if (resp.result === "success") {
                setSessions(resp.data.sessions)
            } else if (resp.result === "error") {
                notify.error(t(`UserApiError.${resp.code}`))
            } else {
                notify.error(t("something_went_wrong"))
            }
        } catch (e) {
            notify.error(t("something_went_wrong"))
        } finally {
            setSessionsLoading(false)
        }
    }
    const toggleSessions = () => {
        if (!sessionsExpanded && sessions === null) {
            loadSessions()
        }
        setSessionsExpanded(x => !x)
    }
    const deleteSession = async (id) => {
        setDeletingSessionId(id)
        try {
            let resp = await new NetworkApi().deleteSession(id)
            if (resp.result === "success") {
                setSessions(s => s.filter(x => x.id !== id))
            } else if (resp.result === "error") {
                notify.error(t(`UserApiError.${resp.code}`))
            } else {
                notify.error(t("something_went_wrong"))
            }
        } catch (e) {
            notify.error(t("something_went_wrong"))
        } finally {
            setDeletingSessionId(null)
        }
    }
    const signOutAll = async () => {
        setShowSignOutAll(false)
        setSigningOutAll(true)
        try {
            let resp = await new NetworkApi().deleteAllSessions()
            if (resp.result === "success") {
                logout()
            } else if (resp.result === "error") {
                notify.error(t(`UserApiError.${resp.code}`))
                setSigningOutAll(false)
            } else {
                notify.error(t("something_went_wrong"))
                setSigningOutAll(false)
            }
        } catch (e) {
            notify.error(t("something_went_wrong"))
            setSigningOutAll(false)
        }
    }
    return (
        <RDialog title={t("my_ruuvi_account")} isOpen={props.open} onClose={props.onClose}>
            <Title>{t("signed_in_user")}</Title>
            <Content>{userEmail.toLowerCase()}</Content>
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
                        {subscriptions[0].subscriptionName !== "Free" && (
                            <>
                                <Title>{t("plan_expiry_date")}</Title>
                                {subscriptions[0].endTime ? (
                                    <Content>{dateToText(new Date(subscriptions[0].endTime * 1000))}</Content>
                                ) : (
                                    <Content>{t("no_expiry_date")}</Content>
                                )}
                            </>
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
                                <Button disabled={activationCode.length !== 8} onClick={() => setShowActivationConfirmation(true)}>{t("activate")}</Button>
                            )}
                        </Box>
                    </>
                )}
            </Box>
            <Box mt={4} />
            <Box>
                <Button variant='link' onClick={toggleSessions} style={{ fontFamily: "mulish", fontSize: "16px", fontWeight: 800 }}>
                    {t("sessions")} {sessionsExpanded ? "▲" : "▼"}
                </Button>
                {sessionsExpanded && (
                    <Box mt={2}>
                        {sessionsLoading ? (
                            <Progress isIndeterminate />
                        ) : sessions && sessions.length > 0 ? (
                            <>
                                {sessions.map(session => (
                                    <Box key={session.id} mb={3} p={3} borderRadius={4} bg={sessionCardBg}>
                                        <Box style={{ fontFamily: "mulish", fontSize: "13px", color: sessionTextColor }}>
                                            {t("sessions_created")}: {dateToText(new Date(session.createdAt * 1000))}
                                        </Box>
                                        <Box style={{ fontFamily: "mulish", fontSize: "13px", color: sessionTextColor }}>
                                            {t("sessions_last_accessed")}: {dateToText(new Date(session.lastAccessed * 1000))}
                                        </Box>
                                        <Box mt={1}>
                                            {session.current && (
                                                <Box style={{ fontFamily: "mulish", fontSize: "13px", fontWeight: 700, color: sessionCurrentColor }}>
                                                    {t("sessions_current")}
                                                </Box>
                                            )}
                                            {!session.current && (
                                                <Button size="xs" variant="link" color={sessionCurrentColor} isLoading={deletingSessionId === session.id} isDisabled={deletingSessionId !== null || signingOutAll} onClick={() => deleteSession(session.id)}>
                                                    {t("sessions_delete")}
                                                </Button>
                                            )}
                                        </Box>
                                    </Box>
                                ))}
                                <Box mt={2}>
                                    <Button size="sm" variant="link" color={sessionCurrentColor} isLoading={signingOutAll} isDisabled={deletingSessionId !== null || signingOutAll} onClick={() => setShowSignOutAll(true)}>
                                        {t("sessions_sign_out_all")}
                                    </Button>
                                </Box>
                            </>
                        ) : null}
                    </Box>
                )}
            </Box>
            <Box mt={8}></Box>
            <Button variant='link' onClick={async () => {
                setShowDeleteAccount(true)
            }}>{t("delete_account")}</Button>

            <ConfirmationDialog open={showDeleteAccount} title="delete_account" loading={true} description='account_delete_description' onClose={(yes) => yes ? deleteAccount() : setShowDeleteAccount(false)} />
            <ConfirmationDialog open={showActivationConfirmation} description="plan_activation_confirmation" onClose={(yes) => yes ? activate() : setShowActivationConfirmation(false)} />
            <ConfirmationDialog open={showSignOutAll} description="sessions_sign_out_all_confirmation" onClose={(yes) => yes ? signOutAll() : setShowSignOutAll(false)} />
        </RDialog>
    )
}

export default withTranslation()(MyAccountModal);