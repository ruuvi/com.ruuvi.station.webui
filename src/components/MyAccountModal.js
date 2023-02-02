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
    var { t, i18n } = props;
    const lng = i18n.language || "en";
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
        if (!window.confirm(lng === "fi" ? fiConfirm : lng === "sv" ? svConfirm : enConfirm)) return
        setIsProcessingCode(true)
        let code = activationCode.length === 8 ? activationCode.slice(0, 4) + "-" + activationCode.slice(4) : activationCode;
        let resp = await new NetworkApi().claimSubscription(code)
        if (resp.result === "success") {
            notify.success(resp.data.subscriptions[0].subscriptionName + " " + t("subscription_activated"))
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
    return (
        <RDialog title={t("my_ruuvi_account")} isOpen={props.open} onClose={props.onClose}>
            <Title>{t("signed_in_user")}</Title>
            <Content>{userEmail}</Content>
            <Box minHeight="250px">
                {subscriptions.length < 1 ? (
                    <Progress isIndeterminate />
                ) : (
                    <>
                        <Title>{t("current_plan")}</Title>
                        <Content>{subscriptions[0].subscriptionName}</Content>
                        <Title>{t("plan_expiry_date")}</Title>
                        <Content>{dateToText(new Date(subscriptions[0].endTime * 1000))}</Content>
                        <Title>{t("information")}</Title>
                        {lng === "en" &&
                            <Content>
                                <Content>
                                    To purchase Ruuvi Cloud package activation codes, please visit {cloudLink()}
                                </Content>
                                <Content>
                                    Once you have received your code(s) by email, enter them below to activate them.
                                </Content>
                                <Content>
                                    <span style={{ color: "#f15a24" }}>Important!</span> Entering a code for a different type of Ruuvi Cloud plan than the one currently active overrides the currently active plan. For example, if you currently have a Ruuvi Cloud Pro plan in your account, entering the Ruuvi Cloud Basic activation code will replace the Pro plan and your new Basic plan will be activated immediately, losing the remaining part of the old Pro plan. But if you enter the same type of activation code (in this case Pro), the current Pro plan's expiration date will be automatically extended.
                                </Content>
                                <Content>
                                    Most frequently asked questions and more information about available packages and their features can be found at {cloudLink()}
                                </Content>
                            </Content>
                        }
                        {lng === "fi" &&
                            <Content>
                                <Content>
                                    Osta Ruuvi Cloud -paketin aktivointikoodi kotisivuiltamme osoitteesta {cloudLink()}
                                </Content>
                                <Content>
                                    Tarkasta aktivointikoodi(t) saamastasi sähköpostista ja syötä tiedot alla olevaan kenttään.
                                </Content>
                                <Content>
                                    <span style={{ color: "#f15a24" }}>Tärkeää!</span> Eri tyyppisen Ruuvi Cloud -tilauskoodin syöttäminen korvaa ja päättää nykyisen tyyppisen aktiivisen tilauksen. Esimerkiksi Ruuvi Cloud Basic -tilauskoodin syöttäminen tilille jolla on jo aktiivinen Ruuvi Cloud Pro -tilaus päättää  Pro-tilauksen välittömästi ja se korvataan Ruuvi Cloud Basic tilauksella, jolloin Pro-tilauksessa jäljellä oleva käyttöaika päättyy heti.
                                </Content>
                                <Content>
                                    Nykyisen Pro-tilauksen päättymispäivää siirretään aktivointikoodin mukaisesti eteenpäin, mikäli syötät kenttään saman tyyppisen tilauksen aktivointikoodin (tässä tapauksessa Pro).
                                </Content>
                                <Content>
                                    Lisätietoja saatavilla olevista tilauspaketeista ja vastauksia usein kysyttyihin kysymyksiin löydät osoitteesta {cloudLink()}
                                </Content>
                            </Content>
                        }
                        {lng === "sv" &&
                            <Content>
                                <Content>
                                    För att köpa aktiveringskoder för Ruuvi Cloud-paket, besök {cloudLink()}
                                </Content>
                                <Content>
                                    När du har fått din/dina kod(er) via e-post, ange dem nedan för att aktivera dem.
                                </Content>
                                <Content>
                                    <span style={{ color: "#f15a24" }}>Viktigt!</span> Genom att ange en kod för en annan typ av Ruuvi Cloud-plan än den som är aktiv just nu ersätts den aktuella planen. Till exempel, om du just nu har en Ruuvi Cloud Pro-plan i ditt konto, genom att ange en Ruuvi Cloud Basic-aktiveringskod, kommer Pro-planen att ersättas och din nya Basic-plan kommer att aktiveras omedelbart, vilket leder till förlusten av resten av den gamla Pro-planen. Men om du anger samma typ av aktiveringskod (i det här fallet Pro), kommer den aktuella Pro-planens utgångsdatum att automatiskt förlängas.
                                </Content>
                                <Content>
                                    De flesta vanligt förekommande frågorna och mer information om tillgängliga paket och deras funktioner finns på {cloudLink()}
                                </Content>
                            </Content>
                        }
                        <Title>{t("enter_activation_code")}</Title>
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

const enConfirm = `Important!

Make sure you are activating the correct type of subscription!

Entering a code for a different type of Ruuvi Cloud plan than the one currently active overrides the currently active plan immediately and you will lose remaining period of the currently active plan. If your code is for same subscription type your current plan's expiration date will be extended.`

const fiConfirm = `Tärkeää!

Varmista, että olet aktivoimassa oikean tyyppisen tilauksen!

Eri tyyppisen Ruuvi Cloud -tilauskoodin syöttäminen korvaa ja päättää nykyisen tyyppisen aktiivisen tilauksen välittömästi ja menetät aktiivisena olevan tilauksen jäljellä olevan käyttöajan. Mikäli aktivointikoodisi on nykyisen tilaustyypin mukainen koodin aktivointi siirtää nykyisen tilauksen päättymispäivää koodin mukaisesti.`

const svConfirm = `Viktigt!

Se till att du aktiverar rätt typ av prenumeration!

Genom att ange en kod för en annan typ av Ruuvi Cloud-plan än den som för närvarande är aktiv, ersätts den aktuella planen omedelbart och du kommer att förlora den återstående tiden av den aktuella planen. Om din kod är för samma prenumerationstyp, kommer den aktuella planens utgångsdatum att förlängas.`