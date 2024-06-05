import React, { useState } from "react";
import {
    Button,
    Box,
    Flex,
    Switch,
    Spinner,
} from "@chakra-ui/react"
import RDialog from "./RDialog";
import NetworkApi from "../NetworkApi";
import notify from "../utils/notify";
import { addNewlines } from "../TextHelper";
import ConfirmModal from "./ConfirmModal";

function RemoveSensorDialog(props) {
    const [deleteData, setdeleteData] = useState(false)
    const [loading, setLoading] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)
    let user = new NetworkApi().getUser().email
    let owner = props.sensor.owner
    const isSharedSensor = user !== owner;
    const remove = () => {
        setConfirmOpen(false)
        var mac = props.sensor.sensor
        setLoading(true)
        new NetworkApi().unclaim(mac, deleteData, resp => {
            if (resp.result === "success") {
                props.remove()
                props.onClose()
            } else {
                notify.error(`UserApiError.${this.props.t(resp.code)}`)
            }
            setLoading(false)
        }, fail => {
            notify.error(this.props.t("something_went_wrong"))
            console.log(fail)
            setLoading(false)
        })
    }
    return (
        <RDialog title={`${props.t("remove_sensor")} (${props.sensor.name})`} isOpen={props.open} onClose={() => props.onClose()}>
            {isSharedSensor ? (
                <Box mb="4">{addNewlines(props.t("remove_shared_sensor_description"), '\\n')}</Box>
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
                <Box mt={100} height={"40px"}>
                    {loading ? <Spinner size="xl" /> :
                        <Button onClick={() => setConfirmOpen(true)}>{props.t("remove")}</Button>
                    }
                </Box>
            </div>
            <ConfirmModal isOpen={confirmOpen}
                title={props.t("remove_sensor_confirmation_title")}
                message={props.t("remove_sensor_confirmation_dialog")}
                onClose={() => setConfirmOpen(false)}
                onConfirm={remove}
                loading={loading} />

        </RDialog>
    )
}

export default RemoveSensorDialog;