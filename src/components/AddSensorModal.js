import { Box, Button, Link, PinInput, PinInputField, Progress } from "@chakra-ui/react";
import React, { useState } from "react";
import { withTranslation } from 'react-i18next';
import NetworkApi from "../NetworkApi";
import notify from "../utils/notify";
import RDialog from "./RDialog";
import { ruuviTheme } from "../themes";
import { addNewlines } from "../TextHelper";

function AddSensorModal(props) {
    var { t } = props;
    const [macAddess, setMacAddress] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const pRef = {}
    const setMacAddressValidated = (code) => {
        code = code.toUpperCase()
        code = code.replace(/:/g, "")
        code = code.slice(0, 12)
        code = code.replace(/[^0-9A-F]/g, '');
        pRef[code.length + ""]?.focus()
        setMacAddress(code.toUpperCase())
    }
    const Content = (props) => {
        return <div style={{ marginBottom: 8, marginTop: 2, fontFamily: "mulish", fontSize: "15px" }}>{props.children}</div>
    }
    const handleCodePaste = e => {
        if (e.clipboardData.items.length > 0) {
            e.clipboardData.items[0].getAsString(code => {
                setMacAddressValidated(code)
            })
        }
    }
    const addSensorClick = async () => {
        setIsLoading(true)
        function addColonsToMacAddress(mac) {
            const macGroups = mac.match(/.{1,2}/g);
            return macGroups.join(':');
        }
        let addr = addColonsToMacAddress(macAddess)
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
            } else if (res.result === "error") {
                notify.error(t(`UserApiError.${res.code}`))
            }
        } catch (e) {
            console.log(e)
            notify.error(t("something_went_wrong"))
        }
        setIsLoading(false)
    }
    const getPinInput = (i) => {
        return <PinInputField ref={(input) => { pRef[i + ""] = input; }}
            onKeyDown={e => {
                if (e.code === "Backspace") {
                    let idx = e.target.dataset.index
                    pRef[idx - 1 + ""]?.focus()
                }
            }}
            bg={ruuviTheme.colors.pinFieldBgColor}
            _focus={{ backgroundColor: ruuviTheme.colors.pinFieldBgHoverColor }}
            _hover={{ backgroundColor: ruuviTheme.colors.pinFieldBgHoverColor }}
            color={"black"} height={12} style={{ margin: 5, fontWeight: 800, maxWidth: "9%" }}
            onPaste={handleCodePaste} />
    }
    function addRuuviLink(text) {
        let link = "ruuvi.com/support"
        if (text.indexOf("ruuvi.com/fi/tuki") !== -1) link = "ruuvi.com/fi/tuki"
        var splitted = text.split(link)
        if (splitted.length === 1) return text;
        var out = [<span>{addNewlines(splitted[0])}</span>]
        for (var i = 1; i < splitted.length; i++) {
            out.push(<Link display="inline-block" href={"https://" + link} isExternal color="primary">{link}</Link>)
        }
        return out;
    }
    return (
        <RDialog title={t("add_new_sensor")} isOpen={props.open} onClose={props.onClose} size="2xl">
            <Content>{addRuuviLink(t("add_sensor_dialog_text"))}</Content>
            <PinInput variant="filled" type="alphanumeric" value={macAddess} autoFocus={false} manageFocus={false} focusBorderColor="#1f938500" onChange={code => setMacAddressValidated(code)}>
                {Array(2).fill().map((_, i) => {
                    return getPinInput(i)
                })}
                <span>:</span>
                {Array(2).fill().map((_, i) => {
                    return getPinInput(2 + i)
                })}
                <span>:</span>
                {Array(2).fill().map((_, i) => {
                    return getPinInput(4 + i)
                })}
                <span>:</span>
                {Array(2).fill().map((_, i) => {
                    return getPinInput(6 + i)
                })}
                <span>:</span>
                {Array(2).fill().map((_, i) => {
                    return getPinInput(8 + i)
                })}
                <span>:</span>
                {Array(2).fill().map((_, i) => {
                    return getPinInput(10 + i)
                })}
            </PinInput>
            <br />
            <Box height={12} pt={4} pb={12}>
                {isLoading ? (
                    <Progress isIndeterminate />
                ) : (
                    <Button disabled={macAddess.length !== 12} onClick={addSensorClick}>{t("add")}</Button>
                )}
            </Box>
        </RDialog>
    )
}

export default withTranslation()(AddSensorModal);