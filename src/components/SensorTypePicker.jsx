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
import { allUnits, getUnitHelper } from "../UnitHelper";

const types = ["temperature", "humidity", "pressure", "movementCounter", "battery", "accelerationX", "accelerationY", "accelerationZ", "rssi", "measurementSequenceNumber"]

export default function SensorTypePicker(props) {
    const { t } = useTranslation();
    let current = ""
    if (typeof (props.value) === "object") {
        current = t(getUnitHelper(props.value.sensorType).label) + (props.value.unit ? ` (${t(props.value.unit.translationKey)})` : "")
    } else {
        let v = props.value || "temperature";
        current = t(getUnitHelper(v).label) || t(v);
    }
    let valueTextMaxLength = props.allUnits ? 30 : 15
    if (current.length > valueTextMaxLength) current = current.substring(0, valueTextMaxLength) + "..."

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
            if (unitOpts) {
                for (let j = 0; j < unitOpts.length; j++) {
                    opts.splice(i + 1, 0, { "sensorType": opts[i].sensorType, "unit": unitOpts[j] });
                    i++;
                }
            }
        }
    }

    return (
        <Menu autoSelect={false} strategy="fixed" placement="bottom-end">
            <MenuButton as={Button}
                rightIcon={<MdArrowDropDown size={26} className="buttonSideIcon" style={{ marginLeft: -10, marginRight: -8 }} />}
                {...style}
                borderRadius='4px'>
                <Box pl={1} className={props.altStyle ? "" : "ddlItemAlt"}>
                    {current}
                </Box>
            </MenuButton>
            <MenuList maxHeight="600px" overflowY="auto">
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
                            {t(getUnitHelper(x).label || t(x))} {unit ? ` (${t(unit.translationKey)})` : ""}
                        </MenuItem>
                        {divider}
                    </div>
                })}
            </MenuList>
        </Menu>
    )
}