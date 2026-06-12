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
import { allUnits, getSensorTypeOnly, getUnitHelper, getUnitOnly, getUnitSettingFor } from "../../UnitHelper";
import { ORDERED_VISIBILITY_CODES, visibilityFromWebToCloud, visibilityFromCloudToWeb } from "../../utils/cloudTranslator";

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


    let opts = Object.keys(allUnits).map(x => allUnits[x].graphable ? x : null).filter(x => x !== null)
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
        opts = opts.filter(x => sensorTypes.includes(getSensorTypeOnly(x)))
    } else {
        opts = opts.filter(x => types.includes(getSensorTypeOnly(x)))
    }
    if (props.allUnits) {
        const tempUnits = ["C", "F", "K"];
        const tempSetting = getUnitSettingFor("temperature") || "C";
        for (let i = 0; i < opts.length; i++) {
            let unitOpts = allUnits[getSensorTypeOnly(opts[i])]?.units
            let setting = getUnitSettingFor(getSensorTypeOnly(opts[i]))
            if (unitOpts) {
                let mainUnit = i
                for (let j = 0; j < unitOpts.length; j++) {
                    // Expand dew point (humidity cloudStoreKey "2") into C/F/K variants
                    if (getSensorTypeOnly(opts[mainUnit]) === "humidity" && unitOpts[j].cloudStoreKey === "2") {
                        const dewKeys = tempUnits.filter(t => t !== tempSetting);
                        if (setting === "2") {
                            opts[mainUnit] = `humidity_2${tempSetting}`;
                        } else {
                            opts.splice(i + 1, 0, `humidity_2${tempSetting}`);
                            i++;
                        }
                        dewKeys.forEach(t => {
                            opts.splice(i + 1, 0, `humidity_2${t}`);
                            i++;
                        });
                        continue;
                    }
                    if (setting === unitOpts[j].cloudStoreKey) {
                        opts[mainUnit] = `${getSensorTypeOnly(opts[mainUnit])}_${unitOpts[j].cloudStoreKey}`
                        continue;
                    }
                    opts.splice(i + 1, 0, `${getSensorTypeOnly(opts[mainUnit])}_${unitOpts[j].cloudStoreKey}`);
                    i++;
                }
            }
        }
    }

    // Expand humidity options to show relative, absolute, and dewpoint separately on dashboard
    if (props.dashboard) {
        const humidityIndex = opts.findIndex(x => getSensorTypeOnly(x) === "humidity");
        if (humidityIndex !== -1) {
            const humidityUnits = allUnits["humidity"]?.units;
            if (humidityUnits) {
                // Replace the single humidity option with expanded variants
                opts.splice(humidityIndex, 1, 
                    ...humidityUnits.map(u => `humidity_${u.cloudStoreKey}`)
                );
            }
        }
        opts = [null, ...opts];
    }

    // Sort opts according to ORDERED_VISIBILITY_CODES
    opts.sort((a, b) => {
        if (a === null) return -1;
        if (b === null) return 1;
        const getOrder = (opt) => {
            const sensorType = getSensorTypeOnly(opt);
            let unit = getUnitOnly(opt);
            // Normalize dew point temperature variants (e.g. "2C" -> "2") for sorting
            if (sensorType === "humidity" && unit && unit.startsWith("2") && unit.length > 1) {
                unit = "2";
            }
            const cloudCode = unit ? visibilityFromWebToCloud(unit, sensorType) : null;
            if (cloudCode) {
                const idx = ORDERED_VISIBILITY_CODES.indexOf(cloudCode);
                return idx === -1 ? 999 : idx;
            }
            const idx = ORDERED_VISIBILITY_CODES.findIndex(code => {
                return visibilityFromCloudToWeb(code)?.[0] === sensorType;
            });
            return idx === -1 ? 999 : idx;
        };
        return getOrder(a) - getOrder(b);
    });

    if (props.value === null && !props.dashboard) {
        if (props.allUnits) {
            props.onChange(opts[0])
        } else {
            props.onChange(getSensorTypeOnly(opts[0]))
        }
    }

    const getLabelForOption = (value) => {
        if (value === null) {
            return t("not_selected") || "Not selected";
        }

        let label = ""
        if (value == null) return ""

        let sensorType = getSensorTypeOnly(value)
        let unit = getUnitOnly(value)
        let uh = getUnitHelper(sensorType, true, unit)

        // Handle humidity variants on dashboard (humidity_0, humidity_1, humidity_2)
        if (props.dashboard && sensorType === "humidity" && unit) {
            const displayVariant = uh.displayVariants?.[unit];
            if (displayVariant) {
                label = t(displayVariant.label);
            } else {
                let unitTranslationKey = uh.units?.find(x => x.cloudStoreKey === unit)?.translationKey || ""
                label = t("humidity") + (unitTranslationKey ? ` (${t(unitTranslationKey)})` : "")
            }
        } else if (props.allUnits) {
            if (sensorType === "humidity" && unit && unit.startsWith("2") && unit.length > 1) {
                // Dew point with specific temperature unit (e.g. "2C", "2F", "2K")
                let tempUnit = unit.substring(1);
                let tempUnitLabel = allUnits["temperature"]?.units?.find(x => x.cloudStoreKey === tempUnit)?.translationKey || tempUnit;
                label = t("dewpoint") + " (" + t(tempUnitLabel) + ")"
            } else if (sensorType === "humidity" && unit === "2") {
                let unitTranslationKey = uh.units.find(x => x.cloudStoreKey === unit)?.translationKey
                label = t(unitTranslationKey) + " (" + t(getUnitHelper("temperature").unit) + ")"
            }
            else {
                let unitTranslationKey = uh.units?.find(x => x.cloudStoreKey === unit)?.translationKey || ""
                let uhLabel = uh.shortLabel || uh.label || ""
                label = t(uhLabel) + (unitTranslationKey ? ` (${t(unitTranslationKey)})` : "")
            }
        } else {
            let uhLabel = uh?.shortLabel || uh?.label || ""
            label = t((value ? uhLabel : null) || "");
        }

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
                    let x = op === null ? "null" : getSensorTypeOnly(op)
                    let divider = <></>
                    let borderStyle = {};
                    if (i === 0) borderStyle = { borderTopLeftRadius: 6, borderTopRightRadius: 6 }
                    if (i === opts.length - 1) borderStyle = { borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }
                    else divider = <MenuDivider />

                    // Handle the click action for different option types
                    const handleOptionClick = () => {
                        if (op === null) {
                            props.onChange(null);
                        } else if (props.allUnits) {
                            props.onChange(op);
                        } else if (props.dashboard && getSensorTypeOnly(op) === "humidity") {
                            // For humidity on dashboard, pass the full value with unit suffix
                            props.onChange(op);
                        } else {
                            props.onChange(getSensorTypeOnly(op));
                        }
                    };

                    return <div key={`option-${i}-${x}`}>
                        <MenuItem className={
                            (props.value === null && op === null) ||
                                (props.value !== null && props.value === op) ?
                                "menuActive ddlItemAlt" : "ddlItemAlt"
                        }
                            style={{ ...borderStyle }} onClick={handleOptionClick}>
                            {getLabelForOption(op)}
                        </MenuItem>
                        {divider}
                    </div>
                })}
            </MenuList>
        </Menu>
    )
}