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

function SensorHeader(props) {
    const isLargeDisplay = useIsLargeDisplay();
    if (isLargeDisplay) {
        return <div style={{ display: "flex", justifyContent: "space-between" }}>
            {props.isPublic ?
                <Avatar.Root style={{ cursor: "default" }} size="xl">
                    <Avatar.Fallback name={props.sensor.name} />
                    <Avatar.Image src={props.sensor.picture} />
                </Avatar.Root>
                :
                <>
                    <input type="file" accept="image/*" style={{ display: "none" }} id="avatarUpload" onChange={props.fileUploadChange} />
                    <label htmlFor="avatarUpload">
                        <Box position="relative" display="inline-flex" cursor="pointer">
                            <Avatar.Root style={{ cursor: "pointer" }} size="xl">
                                <Avatar.Fallback name={props.sensor.name} />
                                <Avatar.Image src={props.picture || props.sensor.picture} />
                            </Avatar.Root>
                            {props.loadingImage && (
                                <Box position="absolute" inset={0} display="flex" alignItems="center" justifyContent="center" backgroundColor="blackAlpha.400" borderRadius="full">
                                    <Spinner size="xl" color="white" />
                                </Box>
                            )}
                        </Box>
                    </label>
                </>
            }
            <span style={{ width: props.isPublic ? "calc(100% - 96px - 18px)" : "calc(100% - 250px - 18px)", marginLeft: 18 }}>
                <div className="pageTitle" style={{ textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden", }}>
                    {props.sensor.name}
                </div>
                <div style={{ fontFamily: "mulish", fontSize: 18, fontWeight: 600, fontStyle: "italic" }} className="subtitle">
                    <DurationText from={props.lastUpdateTime} t={props.t} isAlerting={props.isAlertTriggered("offline")} />
                </div>
            </span>
            {!props.isPublic && <span style={{ minWidth: 135, justifyContent: "flex-end" }}>
                <NavPrevNext prev={props.prev} next={props.next} />
                <NavClose />
            </span>}
        </div>
    } else {
        return <center>
            <Box m={2}>
                <table width="100%" border="0" cellSpacing="0" cellPadding="0">
                    <tbody>
                        <tr>
                            <td width="33%" style={{ verticalAlign: "top" }}>
                                {!props.isPublic && <NavClose />}
                            </td>
                            <td width="33%" align="center">
                                {props.isPublic ?
                                    <Avatar.Root mt="3" bg="primary" size="lg">
                                        <Avatar.Fallback name={props.sensor.name} />
                                        <Avatar.Image src={props.sensor.picture} />
                                    </Avatar.Root>
                                    :
                                    <>
                                        <input type="file" accept="image/*" style={{ display: "none" }} id="avatarUpload" onChange={props.fileUploadChange} />
                                        <label htmlFor="avatarUpload">
                                            <Box position="relative" display="inline-flex" cursor="pointer">
                                                <Avatar.Root mt="3" bg="primary" size="lg">
                                                    <Avatar.Fallback name={props.sensor.name} />
                                                    <Avatar.Image src={props.picture || props.sensor.picture} />
                                                </Avatar.Root>
                                                {props.loadingImage && (
                                                    <Box position="absolute" inset={0} mt="3" display="flex" alignItems="center" justifyContent="center" backgroundColor="blackAlpha.400" borderRadius="full">
                                                        <Spinner size="xl" color="white" />
                                                    </Box>
                                                )}
                                            </Box>
                                        </label>
                                    </>
                                }
                            </td>
                            <td width="33%" align="right" style={{ verticalAlign: "top" }}>
                                {!props.isPublic && <span style={{ width: "100%", textAlign: "right", height: "100%" }}>
                                    <NavPrevNext prev={props.prev} next={props.next} />
                                </span>}
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
