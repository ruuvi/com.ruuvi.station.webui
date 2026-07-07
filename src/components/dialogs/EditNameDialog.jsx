import React, { useEffect, useState } from "react";
import {
    Button,
    Input,
    Progress,
} from "@chakra-ui/react"
import { useTranslation } from 'react-i18next';
import NetworkApi from "../../NetworkApi";
import pjson from "../../../package.json";
import notify from "../../utils/notify";
import RDialog from "./RDialog";
import { getSetting } from "../../UnitHelper";

function EditNameDialog(props) {
    const { t } = useTranslation();
    const [name, setName] = useState(props.sensor ? props.sensor.name : "");
    const [loading, setLoading] = useState(false);

    const sensorName = props.sensor ? props.sensor.name : undefined;
    useEffect(() => {
        if (sensorName !== undefined) setName(sensorName)
    }, [sensorName]);

    const getDefaultName = () => {
        if (!props.sensor) return ""
        let device = "RuuviTag"
        if (props.sensor.measurements && props.sensor.measurements.length > 0) {
            if (props.sensor.measurements[0].parsed?.dataFormat === "e1") {
                device = "Ruuvi Air"
            }
        }
        let splitMac = props.sensor.sensor.split(":")
        return device + " " + splitMac[4] + splitMac[5]
    }

    const update = () => {
        setLoading(true)
        let newName = name || getDefaultName()
        new NetworkApi().update(props.sensor.sensor, newName, resp => {
            switch (resp.result) {
                case "success":
                    var sensor = props.sensor;
                    sensor.name = newName;
                    notify.success(t("successfully_saved"))
                    props.updateSensor(sensor)
                    break
                case "error":
                    notify.error(t(`UserApiError.${resp.code}`))
                    break;
                default:
            }
            setLoading(false)
            props.onClose()
        })
    }

    const updateName = (newName) => {
        var limit = pjson.settings.sensorNameMaxLength
        setName(newName.substring(0, limit))
    }

    const keyDown = (e) => {
        if (e.key === 'Enter') {
            if (loading) return
            update();
        }
    }

    const showOrderInfo = () => {
        let order = getSetting("SENSOR_ORDER", null)
        if (order) {
            order = JSON.parse(order)
            if (order) {
                return false
            }
        }
        return true
    }

    if (!props.sensor) return <></>
    return (
        <RDialog title={t("sensor_name")} isOpen={props.open} onClose={props.onClose}>
            {showOrderInfo() &&
                <p style={{ marginBottom: "8px" }}>
                    {t("rename_sensor_message")}
                </p>
            }
            <Input autoFocus placeholder={getDefaultName()} value={name} onChange={e => updateName(e.target.value)} onKeyDown={keyDown} />
            <div style={{ textAlign: "right" }}>
                <Button disabled={loading} onClick={update} mt="17px">{t("update")}</Button>
            </div>
            {loading && <Progress isIndeterminate={true} color="#e6f6f2" mt={4} />}
        </RDialog>
    )
}

export default EditNameDialog;
