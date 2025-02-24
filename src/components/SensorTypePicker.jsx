import {
    Menu,
    MenuList,
    MenuItem,
    MenuButton,
    Button,
    MenuDivider,
    Box,
} from "@chakra-ui/react"
import { MdArrowDropDown } from "react-icons/md"
import { useTranslation } from 'react-i18next';
import { allUnits, getUnitHelper, getUnitSettingFor } from "../UnitHelper";

const types = ["temperature", "humidity", "pressure", "movementCounter", "battery", "accelerationX", "accelerationY", "accelerationZ", "rssi", "measurementSequenceNumber"]

export default function SensorTypePicker(props) {
    const { t } = useTranslation();

    let style = {
        variant: "shareSensorSelect",
        style: { fontFamily: "mulish", fontSize: 15, fontWeight: 800, width: "250px", textAlign: "left" }
    }
    if (!props.altStyle) {
        style = {
            variant: "ddl",
            className: "durationPicker",
        }
    }


    let opts = Object.keys(allUnits).map(x => allUnits[x].graphable ? { "sensorType": x, unit: null } : null).filter(x => x !== null)
    if (props.sensors) {
        let sensorTypes = []
        for (let i = 0; i < props.sensors.length; i++) {
            let sensor = props.sensors[i];
            if (sensor.measurements?.length === 1 && sensor.measurements[0].parsed) {
                let parsedKeys = Object.keys(sensor.measurements[0].parsed)
                for (let j = 0; j < parsedKeys.length; j++) {
                    let key = parsedKeys[j]
                    if (!sensorTypes.includes(key)) {
                        sensorTypes.push(key)
                    }
                }
            }
        }
        if (!sensorTypes.length) sensorTypes = types
        opts = opts.filter(x => sensorTypes.includes(x.sensorType))
    } else {
        opts = opts.filter(x => types.includes(x.sensorType))
    }
    if (props.allUnits) {
        for (let i = 0; i < opts.length; i++) {
            let unitOpts = allUnits[opts[i]?.sensorType]?.units
            let setting = getUnitSettingFor(opts[i]?.sensorType)
            if (unitOpts) {
                let mainUnit = i
                for (let j = 0; j < unitOpts.length; j++) {
                    if (setting === unitOpts[j].cloudStoreKey) {
                        opts[mainUnit] = { "sensorType": opts[mainUnit].sensorType, "unit": unitOpts[j] }
                        continue;
                    }
                    opts.splice(i + 1, 0, { "sensorType": opts[i].sensorType, "unit": unitOpts[j] });
                    i++;
                }
            }
        }
    }

    if (props.value === null) {
        if (props.allUnits) {
            props.onChange(opts[0])
        } else {
            props.onChange(opts[0].sensorType)
        }
    }

    const getLabelForOption = (value) => {
        let label = ""
        let sensorType = value?.sensorType || value
        let unit = value?.unit
        if (sensorType === null) return ""
        if (props.allUnits) {
            if (sensorType === "humidity" && unit?.cloudStoreKey === "0") {
                label = t(getUnitHelper(sensorType).label) + " (" + t("humidity_relative_name") +")"
            }
            else if (sensorType === "humidity" && unit?.cloudStoreKey === "1") {
                label = t(getUnitHelper(sensorType).label) + " (" + t("humidity_absolute_name") +")"
            }
            else if (sensorType === "humidity" && unit?.cloudStoreKey === "2") {
                label = t(getUnitHelper(sensorType).label) + " (" +t(unit.translationKey) + " (" + t(getUnitHelper("temperature").unit) + "))"
            }
            else {
                label = t(getUnitHelper(sensorType).label) + (unit ? ` (${t(unit.translationKey)})` : "")
            }
        } else label = t(getUnitHelper(sensorType).label) || t(sensorType);

        let valueTextMaxLength = props.allUnits ? 30 : 15
        if (label.length > valueTextMaxLength) label = label.substring(0, valueTextMaxLength) + "..."
        return label
    }

    return (
        <Menu autoSelect={false} strategy="fixed" placement="bottom-end">
            <MenuButton as={Button}
                rightIcon={<MdArrowDropDown size={26} className="buttonSideIcon" style={{ marginLeft: -10, marginRight: -8 }} />}
                {...style}
                borderRadius='4px'>
                <Box pl={1} className={props.altStyle ? "" : "ddlItemAlt"}>
                    {getLabelForOption(props.value)}
                </Box>
            </MenuButton>
            <MenuList maxHeight="600px" overflowY="auto" zIndex={100}>
                {opts.map((op, i) => {
                    let { sensorType, unit } = op;
                    let x = sensorType
                    let divider = <></>
                    let borderStyle = {};
                    if (i === 0) borderStyle = { borderTopLeftRadius: 6, borderTopRightRadius: 6 }
                    if (i === opts.length - 1) borderStyle = { borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }
                    else divider = <MenuDivider />
                    return <div key={x + JSON.stringify(unit) + "s"}>
                        <MenuItem className={props.value === op ? "menuActive ddlItemAlt" : "ddlItemAlt"}
                            style={{ ...borderStyle }} onClick={() => props.onChange(props.allUnits ? op : x)}>
                            {getLabelForOption(op)}
                        </MenuItem>
                        {divider}
                    </div>
                })}
            </MenuList>
        </Menu>
    )
}