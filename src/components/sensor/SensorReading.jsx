import React from "react";
import {
    IconButton,
    Stat,
    Dialog,
    Portal,
    useDisclosure,
} from "@chakra-ui/react"
import { useColorMode } from "../ui/color-mode"
import { ruuviTheme } from "../../themes";
import BigValue from "../common/BigValue";
import { MdInfo, MdClose } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { getDisplayValue } from "../../UnitHelper";
import i18next from "i18next";
import FormattedText from "../common/FormattedText";

const height = 120

const middle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    height: height - 10,
}

const labelStyle = {
    fontFamily: "mulish",
    fontSize: 14,
    fontWeight: 600,
    fontStyle: "italic",
    marginTop: -5,
    textAlign: "center"
}

const infoLabel = {
    position: "absolute",
    bottom: 8,
}

const borderRadius = 10

export default function SensorReading(props) {
    const { open, onOpen, onClose } = useDisclosure()
    let mode = useColorMode().colorMode;
    const { t } = useTranslation();
    const { colorMode } = useColorMode()
    let width = 400

    let infoButtonText = props.infoLabel ? t(props.infoLabel) : null;
    if (!infoButtonText && i18next.exists(`${props.sensorType}_info`)) {
        infoButtonText = t(`${props.sensorType}_info`);
    }

    let val = props.value;
    val = getDisplayValue(props.label, val)
    return (
        <>
            <Stat.Root className="sensorValueBox" style={{ width, maxWidth: "100%", height: height, backgroundColor: props.alertTriggered ? ruuviTheme.colors.errorBackground : undefined, border: props.selected ? props.alertTriggered ? "2px solid " + ruuviTheme.colors.error : "2px solid " + ruuviTheme.newColors.sensorValueBoxActiveBorder[mode] : "2px solid rgba(0,0,0,0)", borderRadius: borderRadius, cursor: "pointer" }} onClick={props.onClick}>
                {infoButtonText &&
                    <IconButton aria-label="info" style={{ position: "absolute", right: 0, margin: -8 }} variant="ghost" onClick={e => { e.stopPropagation(); onOpen() }}>
                        <MdInfo className="buttonSideIcon" size="16" />
                    </IconButton>
                }
                <div style={middle}>
                    <BigValue
                        value={val}
                        unit={props.unit}
                    />
                    <span style={labelStyle}>{typeof props.label === "object" ? props.label : t(props.label)}</span>
                    {props.info && <span style={{ ...labelStyle, ...infoLabel }}>({t(props.info)})</span>}
                </div>
            </Stat.Root >
            <Dialog.Root open={open} onOpenChange={(e) => { if (!e.open) onClose() }} placement="center" size="xl">
                <Portal>
                    <Dialog.Backdrop />
                    <Dialog.Positioner>
                        <Dialog.Content marginTop="auto"
                            borderRadius={borderRadius}
                            bg={ruuviTheme.colors.toast.info[colorMode]}
                        >
                            <Dialog.Header>{typeof props.label === "object" ? props.label : t(props.label)}</Dialog.Header>
                            <Dialog.CloseTrigger asChild>
                                <IconButton rounded="full" aria-label="close" style={{ background: "transparent", margin: 15 }} className="navButton" variant="nav"><MdClose /></IconButton>
                            </Dialog.CloseTrigger>
                            <Dialog.Body pb={6}>
                                <FormattedText text={infoButtonText} />
                            </Dialog.Body>
                        </Dialog.Content>
                    </Dialog.Positioner>
                </Portal>
            </Dialog.Root>
        </>
    )
}