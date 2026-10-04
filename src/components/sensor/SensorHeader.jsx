import React from "react";
import {
    Box,
    Avatar,
    Spinner,
} from "@chakra-ui/react"
import DurationText from "../common/DurationText";
import NavClose from "../common/NavClose";
import NavPrevNext from "../common/NavPrevNext";
import useIsLargeDisplay from "../hooks/useIsLargeDisplay";
import { getDefaultSensorPicture } from "../../utils/sensorPicture";

function SensorAvatar({ sensor, picture, ...props }) {
    return (
        <Avatar.Root {...props} shape="full" overflow="hidden">
            <Avatar.Fallback boxSize="100%">
                <img
                    src={getDefaultSensorPicture(sensor)}
                    alt=""
                    style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
                />
            </Avatar.Fallback>
            <Avatar.Image src={picture || sensor.picture} alt={sensor.name} />
        </Avatar.Root>
    );
}

function SensorHeader(props) {
    const isLargeDisplay = useIsLargeDisplay();
    if (isLargeDisplay) {
        return <div style={{ display: "flex", justifyContent: "space-between" }}>
            <input type="file" accept="image/*" style={{ display: "none" }} id="avatarUpload" onChange={props.fileUploadChange} />
            <label htmlFor="avatarUpload">
                <Box position="relative" display="inline-flex" cursor="pointer">
                    <SensorAvatar sensor={props.sensor} picture={props.picture} style={{ cursor: "pointer" }} size="xl" />
                    {props.loadingImage && (
                        <Box position="absolute" inset={0} display="flex" alignItems="center" justifyContent="center" backgroundColor="blackAlpha.400" borderRadius="full">
                            <Spinner size="xl" color="white" />
                        </Box>
                    )}
                </Box>
            </label>
            <span style={{ width: "calc(100% - 250px - 18px)", marginLeft: 18 }}>
                <div className="pageTitle" style={{ textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden", }}>
                    {props.sensor.name}
                </div>
                <div style={{ fontFamily: "mulish", fontSize: 18, fontWeight: 600, fontStyle: "italic" }} className="subtitle">
                    <DurationText from={props.lastUpdateTime} t={props.t} isAlerting={props.isAlertTriggered("offline")} />
                </div>
            </span>
            <span style={{ minWidth: 135, justifyContent: "flex-end" }}>
                <NavPrevNext prev={props.prev} next={props.next} />
                <NavClose />
            </span>
        </div>
    } else {
        return <center>
            <Box m={2}>
                <table width="100%" border="0" cellSpacing="0" cellPadding="0">
                    <tbody>
                        <tr>
                            <td width="33%" style={{ verticalAlign: "top" }}>
                                <NavClose />
                            </td>
                            <td width="33%" align="center">
                                <input type="file" accept="image/*" style={{ display: "none" }} id="avatarUpload" onChange={props.fileUploadChange} />
                                <label htmlFor="avatarUpload">
                                    <Box position="relative" display="inline-flex" cursor="pointer">
                                        <SensorAvatar sensor={props.sensor} picture={props.picture} mt="3" bg="primary" size="lg" />
                                        {props.loadingImage && (
                                            <Box position="absolute" inset={0} mt="3" display="flex" alignItems="center" justifyContent="center" backgroundColor="blackAlpha.400" borderRadius="full">
                                                <Spinner size="xl" color="white" />
                                            </Box>
                                        )}
                                    </Box>
                                </label>
                            </td>
                            <td width="33%" align="right" style={{ verticalAlign: "top" }}>
                                <span style={{ width: "100%", textAlign: "right", height: "100%" }}>
                                    <NavPrevNext prev={props.prev} next={props.next} />
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div style={{ width: "65%", marginTop: "5px" }}>
                    <div className="mobilePageTitle">
                        {props.sensor.name}
                    </div>
                    <div style={{ fontFamily: "mulish", fontSize: 16, fontWeight: 600, fontStyle: "italic" }} className="subtitle">
                        <DurationText from={props.lastUpdateTime} t={props.t} isAlerting={props.isAlertTriggered("offline")} />
                    </div>
                </div>
            </Box>
        </center>
    }
}

export default SensorHeader;
