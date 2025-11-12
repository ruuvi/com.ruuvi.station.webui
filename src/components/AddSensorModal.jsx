import { Box, Button, Link, PinInput, PinInputField, Progress } from "@chakra-ui/react";
import React, { useEffect, useRef, useState } from "react";
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
    const inputRefs = useRef({})
    const previousLengthRef = useRef(0)
    const focusField = (index) => {
        const normalizedIndex = Number.isFinite(index) ? index : 0
        const nextIndex = Math.min(Math.max(normalizedIndex, 0), 11)
        const scheduler = typeof window !== "undefined" && typeof window.requestAnimationFrame === "function" ? window.requestAnimationFrame : (cb) => setTimeout(cb, 0)
        scheduler(() => {
            inputRefs.current[nextIndex]?.focus()
        })
    }
    const setMacAddressValidated = (code) => {
        const sanitized = code
            .toUpperCase()
            .replace(/[^0-9A-F]/g, "")
            .slice(0, 12)
        const previousLength = previousLengthRef.current
        setMacAddress(sanitized)
        if (sanitized.length > previousLength) {
            focusField(sanitized.length)
        } else if (sanitized.length === 0) {
            focusField(0)
        }
        previousLengthRef.current = sanitized.length
    }
    const Content = (props) => {
        return <div style={{ marginBottom: 8, marginTop: 2, fontFamily: "mulish", fontSize: "15px" }}>{props.children}</div>
    }
    const handleCodePaste = e => {
        e.preventDefault()
        const pasted = e.clipboardData.getData("Text")
        if (pasted) {
            setMacAddressValidated(pasted)
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
        return <PinInputField
            key={`mac-digit-${i}`}
            ref={(input) => {
                if (input) {
                    inputRefs.current[i] = input
                } else {
                    delete inputRefs.current[i]
                }
            }}
            onKeyDown={e => {
                if (e.key === "Backspace") {
                    const idx = Number(e.target.dataset.index)
                    focusField(idx - 1)
                }
            }}
            bg={ruuviTheme.colors.pinFieldBgColor}
            _focus={{ backgroundColor: ruuviTheme.colors.pinFieldBgHoverColor }}
            _hover={{ backgroundColor: ruuviTheme.colors.pinFieldBgHoverColor }}
            color={"black"} height={12} style={{ margin: 5, fontWeight: 800, maxWidth: "9%" }}
            onPaste={handleCodePaste}
            inputMode="text"
            autoComplete="off"
        />
    }
    const renderPinFields = () => {
        const elements = []
        for (let i = 0; i < 12; i += 1) {
            if (i !== 0 && i % 2 === 0) {
                elements.push(<span key={`mac-separator-${i}`}>:</span>)
            }
            elements.push(getPinInput(i))
        }
        return elements
    }
    useEffect(() => {
        if (props.open) {
            previousLengthRef.current = 0
            setMacAddressValidated("")
        }
    }, [props.open])
    function addRuuviLink(text) {
        let link = "ruuvi.com/support"
        if (text.indexOf("ruuvi.com/fi/tuki") !== -1) link = "ruuvi.com/fi/tuki"
        var splitted = text.split(link)
        if (splitted.length === 1) return text;
        var out = [<span key={Math.random()}>{addNewlines(splitted[0])}</span>]
        for (var i = 1; i < splitted.length; i++) {
            out.push(<Link key={Math.random()} display="inline-block" href={"https://" + link} isExternal color="primary">{link}</Link>)
        }
        return out;
    }
    return (
        <RDialog title={t("add_new_sensor")} isOpen={props.open} onClose={props.onClose} size="2xl">
            <Content>{addRuuviLink(t("add_sensor_dialog_text"))}</Content>
            <PinInput
                variant="filled"
                type="alphanumeric"
                value={macAddess}
                autoFocus={false}
                manageFocus={false}
                focusBorderColor="#1f938500"
                onChange={code => setMacAddressValidated(code)}
                onPaste={handleCodePaste}
            >
                {renderPinFields()}
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