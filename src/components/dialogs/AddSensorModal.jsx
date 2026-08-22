import { Box, Button, Link, PinInput } from "@chakra-ui/react";
import { ProgressBar } from "../ui/progress";
import React, { useEffect, useMemo, useState } from "react";
import { withTranslation } from 'react-i18next';
import NetworkApi from "../../NetworkApi";
import logger from "../../utils/logger";
import notify from "../../utils/notify";
import RDialog from "./RDialog";
import { pinFieldProps } from "../ui/pin-field";
import { addNewlines } from "../../TextHelper";

const MAC_LENGTH = 12

// Hex only, upper case, never longer than a MAC address.
const sanitizeMac = (code) => (code || "")
    .toUpperCase()
    .replace(/[^0-9A-F]/g, "")
    .slice(0, MAC_LENGTH)

function Content(props) {
    return <div style={{ marginBottom: 8, marginTop: 2, fontFamily: "mulish", fontSize: "15px" }}>{props.children}</div>
}

// The fields only depend on their index, so they are built once instead of on every render.
const pinFields = (() => {
    const elements = []
    for (let i = 0; i < MAC_LENGTH; i += 1) {
        if (i !== 0 && i % 2 === 0) {
            elements.push(<span key={`mac-separator-${i}`}>:</span>)
        }
        elements.push(<PinInput.Input
            key={`mac-digit-${i}`}
            index={i}
            {...pinFieldProps}
            inputMode="text"
            autoComplete="off"
        />)
    }
    return elements
})()

// Owns the MAC state so typing re-renders only the field row and the add button,
// not the dialog chrome around them.
function MacAddressForm({ t, open }) {
    const [macAddress, setMacAddress] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const macChars = useMemo(
        () => Array.from({ length: MAC_LENGTH }, (_, i) => macAddress[i] || ""),
        [macAddress]
    )
    useEffect(() => {
        if (open) {
            setMacAddress("")
            setIsLoading(false)
        }
    }, [open])
    const addSensorClick = async () => {
        setIsLoading(true)
        function addColonsToMacAddress(mac) {
            const macGroups = mac.match(/.{1,2}/g);
            return macGroups.join(':');
        }
        let addr = addColonsToMacAddress(macAddress)
        let splitMac = addr.split(":")
        let name = "Ruuvi " + splitMac[4] + splitMac[5]
        try {
            let res = await new NetworkApi().claim(addr, name)
            if (res.result === "success") {
                notify.success(t("sensor_added_successfully"))
                setTimeout(() => {
                    window.location.href = "/" + addr
                    window.location.reload();
                }, 1000)
                return
            } else if (res.result === "error") {
                notify.error(t(`UserApiError.${res.code}`))
            }
        } catch (e) {
            logger.error("add sensor failed", e)
            notify.error(t("something_went_wrong"))
        }
        setIsLoading(false)
    }
    return (
        <>
            <PinInput.Root
                variant="subtle"
                type="alphanumeric"
                count={MAC_LENGTH}
                value={macChars}
                autoFocus={false}
                sanitizeValue={sanitizeMac}
                onValueChange={e => setMacAddress(sanitizeMac(e.value.join("")))}
            >
                <PinInput.Control display="inline-flex" alignItems="center" gap={0}>
                    {pinFields}
                </PinInput.Control>
                <PinInput.HiddenInput />
            </PinInput.Root>
            <Box height={12} pt={4} pb={12}>
                {isLoading ? (
                    <ProgressBar />
                ) : (
                    <Button disabled={macAddress.length !== MAC_LENGTH} onClick={addSensorClick}>{t("add")}</Button>
                )}
            </Box>
        </>
    )
}

function AddSensorModal(props) {
    var { t } = props;
    function addRuuviLink(text) {
        let link = "ruuvi.com/support"
        if (text.indexOf("ruuvi.com/fi/tuki") !== -1) link = "ruuvi.com/fi/tuki"
        var splitted = text.split(link)
        if (splitted.length === 1) return text;
        var out = [<span key="text-0">{addNewlines(splitted[0])}</span>]
        for (var i = 1; i < splitted.length; i++) {
            out.push(<Link key={`link-${i}`} display="inline-block" href={"https://" + link} target="_blank" rel="noreferrer" color="primary">{link}</Link>)
        }
        return out;
    }
    return (
        <RDialog title={t("add_new_sensor")} isOpen={props.open} onClose={props.onClose} size="2xl">
            <Content>{addRuuviLink(t("add_sensor_dialog_text"))}</Content>
            <MacAddressForm t={t} open={props.open} />
        </RDialog>
    )
}

export default withTranslation()(AddSensorModal);
