import { Accordion, Box, Button, PinInput } from "@chakra-ui/react";
import { ProgressBar } from "../ui/progress";
import { useColorModeValue } from "../ui/color-mode";
import { ChevronDownIcon } from "../ui/chakra-icons";
import React, { useEffect, useMemo, useState } from "react";
import { withTranslation } from 'react-i18next';
import NetworkApi from "../../NetworkApi";
import notify from "../../utils/notify";
import RDialog from "./RDialog";
import { pinFieldProps } from "../ui/pin-field";
import ConfirmationDialog from "./ConfirmationDialog";
import { addLink } from "../../TextHelper";
import { logout } from "../../utils/loginUtils";

const ACTIVATION_CODE_LENGTH = 8

const sanitizeActivationCode = (code) => (code || "")
    .replace(/-/g, "")
    .slice(0, ACTIVATION_CODE_LENGTH)
    .toUpperCase()

function Title(props) {
    return <div style={{ fontFamily: "mulish", fontSize: "16px", fontWeight: 800 }}>{props.children}</div>
}

function Content(props) {
    return <div style={{ marginBottom: 8, marginTop: 2, fontFamily: "mulish", fontSize: "15px" }}>{props.children}</div>
}

// The fields only depend on their index, so they are built once instead of on every render.
const activationCodeFields = Array.from({ length: ACTIVATION_CODE_LENGTH }, (_, i) => (
    <PinInput.Input
        key={`activation-${i}`}
        index={i}
        {...pinFieldProps}
    />
))

// Owns the activation code state so typing re-renders only this section, not the
// subscription info, the sessions accordion and the confirmation dialogs around it.
function ActivationCodeForm({ t, onActivated }) {
    const [activationCode, setActivationCode] = useState("")
    const [isProcessingCode, setIsProcessingCode] = useState(false)
    const [showActivationConfirmation, setShowActivationConfirmation] = useState(false)
    const activationCodeChars = useMemo(
        () => Array.from({ length: ACTIVATION_CODE_LENGTH }, (_, i) => activationCode[i] || ""),
        [activationCode]
    )
    const activate = async () => {
        setShowActivationConfirmation(false)
        setIsProcessingCode(true)
        let code = activationCode.length === 8 ? activationCode.slice(0, 4) + "-" + activationCode.slice(4) : activationCode;
        let resp = await new NetworkApi().claimSubscription(code)
        if (resp.result === "success") {
            notify.success(resp.data.subscriptions[0].subscriptionName + " " + t("subscription_activated"))
            onActivated(resp.data.subscriptions)
            setTimeout(() => {
                window.location.reload();
            }, 2000)
        } else if (resp.result === "error") {
            notify.error(t(`UserApiError.${resp.code}`))
        } else {
            notify.error(t("something_went_wrong"))
        }
        setActivationCode("")
        setIsProcessingCode(false)
    }
    return (
        <>
            <Title>{t("enter_activation_code")}</Title>
            <Box mt={2} />
            <PinInput.Root
                variant="subtle"
                type="alphanumeric"
                count={ACTIVATION_CODE_LENGTH}
                value={activationCodeChars}
                autoFocus={false}
                sanitizeValue={sanitizeActivationCode}
                onValueChange={e => setActivationCode(sanitizeActivationCode(e.value.join("")))}
            >
                <PinInput.Control display="inline-flex" alignItems="center" gap={0}>
                    {activationCodeFields.slice(0, 4)}
                    <span>-</span>
                    {activationCodeFields.slice(4)}
                </PinInput.Control>
                <PinInput.HiddenInput />
            </PinInput.Root>
            <Box height={12} pt={4}>
                {isProcessingCode ? (
                    <ProgressBar />
                ) : (
                    <Button disabled={activationCode.length !== ACTIVATION_CODE_LENGTH} onClick={() => setShowActivationConfirmation(true)}>{t("activate")}</Button>
                )}
            </Box>
            <ConfirmationDialog open={showActivationConfirmation} description="plan_activation_confirmation" onClose={(yes) => yes ? activate() : setShowActivationConfirmation(false)} />
        </>
    )
}

function MyAccountModal(props) {
    var { t, i18n } = props;
    const _lng = i18n.language || "en";
    const sessionCardBg = useColorModeValue("rgba(198, 227, 224, 0.5)", "rgba(53, 173, 159, 0.15)");
    const sessionTextColor = useColorModeValue("#1b4847", "#ffffff");
    const sessionCurrentColor = useColorModeValue("#1f9385", "#44c9b9");
    const [subscriptions, setSubscriptions] = useState([])
    const [showDeleteAccount, setShowDeleteAccount] = useState(false)
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
    const userEmail = useMemo(() => {
        let user = new NetworkApi().getUser()
        return user ? user.email : "-"
    }, [])
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
        } catch {
            notify.error(t("something_went_wrong"))
        } finally {
            setSessionsLoading(false)
        }
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
        } catch {
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
        } catch {
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
            <Box minHeight="250px" pb={12}>
                {subscriptions.length < 1 ? (
                    <ProgressBar />
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
                        <Box mt="15px" />
                        <ActivationCodeForm t={t} onActivated={setSubscriptions} />
                    </>
                )}
            </Box>
            <Box mx={-6} mb={12} borderBottomRadius="md" overflow="hidden">
                <Accordion.Root collapsible onValueChange={(details) => {
                    if (details.value.includes("sessions") && sessions === null) {
                        loadSessions()
                    }
                }}>
                    <Accordion.Item value="sessions" border="none">
                        <Accordion.ItemTrigger style={{ paddingTop: 12, paddingBottom: 12, paddingLeft: 24, paddingRight: 24 }} _hover={{}}>
                            <Box flex="1" textAlign="left" style={{ fontFamily: "mulish", fontSize: "16px", fontWeight: 800 }}>
                                {t("sessions")}
                            </Box>
                            <Accordion.ItemIndicator><ChevronDownIcon /></Accordion.ItemIndicator>
                        </Accordion.ItemTrigger>
                        <Accordion.ItemContent>
                        <Accordion.ItemBody style={{ paddingTop: 16, paddingBottom: 16, paddingLeft: 24, paddingRight: 24, backgroundColor: "transparent" }}>
                            {sessionsLoading ? (
                                <ProgressBar />
                            ) : sessions && sessions.length > 0 ? (
                                <>
                                    {sessions.map(session => (
                                        <Box key={session.id} mb={3} p={3} borderRadius="lg" bg={sessionCardBg}>
                                            <Box style={{ fontFamily: "mulish", fontSize: "13px", color: sessionTextColor }}>
                                                <b>{t("sessions_created")}:</b> {dateToText(new Date(session.createdAt * 1000))}
                                            </Box>
                                            <Box style={{ fontFamily: "mulish", fontSize: "13px", color: sessionTextColor }}>
                                                <b>{t("sessions_last_accessed")}:</b> {dateToText(new Date(session.lastAccessed * 1000))}
                                            </Box>
                                            <Box mt={1}>
                                                {session.current && (
                                                    <Box style={{ fontFamily: "mulish", fontSize: "13px", fontWeight: 700, color: sessionCurrentColor }}>
                                                        {t("sessions_current")}
                                                    </Box>
                                                )}
                                                {!session.current && (
                                                    <Button size="xs" variant="link" fontWeight="bold" color={sessionCurrentColor} loading={deletingSessionId === session.id} disabled={deletingSessionId !== null || signingOutAll} onClick={() => deleteSession(session.id)}>
                                                        {t("sessions_sign_out")}
                                                    </Button>
                                                )}
                                            </Box>
                                        </Box>
                                    ))}
                                    <Box mt={2}>
                                        <Button size="sm" variant="link" fontWeight="bold" color={sessionCurrentColor} loading={signingOutAll} disabled={deletingSessionId !== null || signingOutAll} onClick={() => setShowSignOutAll(true)}>
                                            {t("sessions_sign_out_all")}
                                        </Button>
                                    </Box>
                                </>
                            ) : null}
                        </Accordion.ItemBody>
                        </Accordion.ItemContent>
                    </Accordion.Item>
                </Accordion.Root>
            </Box>
            <Button variant='link' onClick={async () => {
                setShowDeleteAccount(true)
            }}>{t("delete_account")}</Button>

            <ConfirmationDialog open={showDeleteAccount} title="delete_account" loading={true} description='account_delete_description' onClose={(yes) => yes ? deleteAccount() : setShowDeleteAccount(false)} />
            <ConfirmationDialog open={showSignOutAll} description="sessions_sign_out_all_confirmation" onClose={(yes) => yes ? signOutAll() : setShowSignOutAll(false)} />
        </RDialog>
    )
}

export default withTranslation()(MyAccountModal);
