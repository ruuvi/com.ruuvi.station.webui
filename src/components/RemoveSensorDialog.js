import React, { useState } from "react";
import {
    Button,
    Box,
    Flex,
    Switch,
} from "@chakra-ui/react"
import RDialog from "./RDialog";
import NetworkApi from "../NetworkApi";
import notify from "../utils/notify";

function RemoveSensorDialog(props) {
    const [deleteData, setdeleteData] = useState(false)
    let user = new NetworkApi().getUser().email
    let owner = props.sensor.owner
    const isSharedSensor = user !== owner;
    const remove = () => {
        var mac = props.sensor.sensor
        if (window.confirm(props.t("remove_sensor_confirmation_dialog"))) {
            new NetworkApi().unclaim(mac, deleteData, resp => {
                if (resp.result === "success") {
                    props.remove()
                    props.onClose()
                } else {
                    notify.error(`UserApiError.${this.props.t(resp.code)}`)
                }
            }, fail => {
                notify.error(this.props.t("something_went_wrong"))
                console.log(fail)
            })
        }
    }
    return (
        <RDialog title={props.t("remove_sensor")} isOpen={props.open} onClose={() => props.onClose()}>
            {isSharedSensor ? (
                <Box mb="4">{props.t("remove_shared_sensor")}</Box>
            ) : (
                <Box mb="4">{props.t("remove_sensor_description")}</Box>
            )}
            {!isSharedSensor &&
                <Box>
                    <Flex justify="space-between">
                        <span style={{ fontWeight: 800 }}>{props.t("remove_cloud_history_switch")}</span>
                        <Switch checked={deleteData} onChange={e => setdeleteData(e.target.checked)} colorScheme="buttonIconScheme" />
                    </Flex>
                </Box>
            }
            {deleteData && <Box mt="3">{props.t("remove_cloud_history_description")}</Box>}
            <div style={{ textAlign: "center" }}>
                <Button onClick={remove} mt={100}>{props.t("remove")}</Button>
            </div>
        </RDialog>
    )
}

export default RemoveSensorDialog;