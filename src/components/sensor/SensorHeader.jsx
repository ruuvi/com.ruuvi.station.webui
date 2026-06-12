import React from "react";
import {
    Box,
    Avatar,
    CircularProgress,
} from "@chakra-ui/react"
import DurationText from "../common/DurationText";
import NavClose from "../common/NavClose";
import NavPrevNext from "../common/NavPrevNext";
import useIsLargeDisplay from "../hooks/useIsLargeDisplay";

function SensorHeader(props) {
    const isLargeDisplay = useIsLargeDisplay();
    if (isLargeDisplay) {
        return <div style={{ display: "flex", justifyContent: "space-between" }}>
            <input type="file" accept="image/*" style={{ display: "none" }} id="avatarUpload" onChange={props.fileUploadChange} />
            <label htmlFor="avatarUpload">
                {props.loadingImage ? <CircularProgress size={"96px"} isIndeterminate={true} color="primary" /> :
                    <Avatar style={{ cursor: "pointer" }} size="xl" name={props.sensor.name} src={props.sensor.picture} />
                }
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
                                    {props.loadingImage ? <CircularProgress mt="3" size={"64px"} isIndeterminate={true} color="primary" /> :
                                        <Avatar mt="3" bg="primary" size="lg" name={props.sensor.name} src={props.sensor.picture} />
                                    }
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
