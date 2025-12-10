import React from "react";
import {
    IconButton,
    Stat,
    useColorMode,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    useDisclosure,
    Button
} from "@chakra-ui/react"
import { ruuviTheme } from "../themes";
import BigValue from "./BigValue";
import { MdInfo, MdClose } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { addNewlines } from "../TextHelper";
import { getDisplayValue } from "../UnitHelper";
import i18next from "i18next";
import FormattedText from "./FormattedText";

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
    const { isOpen, onOpen, onClose } = useDisclosure()
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
            <Stat className="sensorValueBox" style={{ width, maxWidth: "100%", height: height, backgroundColor: props.alertTriggered ? ruuviTheme.colors.errorBackground : undefined, border: props.selected ? props.alertTriggered ? "2px solid " + ruuviTheme.colors.error : "2px solid " + ruuviTheme.newColors.sensorValueBoxActiveBorder[mode] : "2px solid rgba(0,0,0,0)", borderRadius: borderRadius, cursor: "pointer" }} onClick={props.onClick}>
                {infoButtonText &&
                    <IconButton style={{ position: "absolute", right: 0, margin: -8 }} variant="ghost" onClick={e => { e.stopPropagation(); onOpen() }}>
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
            </Stat >
            <Modal isOpen={isOpen} onClose={onClose} isCentered={true} size="xl">
                <ModalOverlay />
                <ModalContent marginTop="auto" 
                    borderRadius={borderRadius}
                    bg={ruuviTheme.colors.toast.info[colorMode]}
                >
                    <ModalHeader>{typeof props.label === "object" ? props.label : t(props.label)}</ModalHeader>
                    <ModalCloseButton style={{ margin: 15 }}>
                        <IconButton isRound={true} style={{background: "transparent"}} className="navButton" variant="nav"><MdClose /></IconButton>
                    </ModalCloseButton>
                    <ModalBody>
                        <FormattedText text={infoButtonText} />
                    </ModalBody>
                </ModalContent>
            </Modal>
        </>
    )
}