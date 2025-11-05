import React, { useEffect, useState } from "react";
import { durationToText, secondsToUserDateString } from '../TimeHelper';
import { ruuviTheme } from "../themes";
import { useColorMode } from "@chakra-ui/react";

const DurationText = ({ from, isAlerting, t }) => {
    const [to, setTo] = useState(Math.floor(Date.now() / 1000));

    const { colorMode } = useColorMode();

    // Update `to` every second. Also refresh immediately when `from` changes so UI updates without delay.
    useEffect(() => {
        setTo(Math.floor(Date.now() / 1000));
        const id = setInterval(() => setTo(Math.floor(Date.now() / 1000)), 1000);
        return () => clearInterval(id);
    }, [from]);

    const seconds = Math.floor((to || 0) - (from || 0));

    let alertColor = colorMode === "light" ? ruuviTheme.colors.sensorCardValueAlertStateLightTheme : ruuviTheme.colors.sensorCardValueAlertState;

    const showDateCutoff = 10 * 24 * 60 * 60; // 10 days in seconds
    let content;
    if (seconds > showDateCutoff) {
        content = secondsToUserDateString(from);
    } else {
        content = durationToText(seconds, t) + ' ' + t("ago");
    }
    return (
        <span style={{ color: isAlerting ? alertColor: undefined }}>
            {content}
        </span>
    );
};

export default DurationText;