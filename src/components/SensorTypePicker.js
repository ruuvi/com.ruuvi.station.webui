import {
    Menu,
    MenuList,
    MenuItem,
    MenuButton,
    Button,
    MenuDivider,
} from "@chakra-ui/react"
import { MdArrowDropDown } from "react-icons/md"
import { useTranslation } from 'react-i18next';
import { getUnitHelper } from "../UnitHelper";

const detailedSubText = {
    fontFamily: "mulish",
    fontSize: "14px",
}

const opts = ["temperature", "humidity", "pressure", "movementCounter", "battery", "accelerationX", "accelerationY", "accelerationZ", "rssi", "measurementSequenceNumber"]

export default function SensorTypePicker(props) {
    const { t } = useTranslation();
    let v = props.value || "temperature";
    let current = t(getUnitHelper(v).label);
    if (current.length > 15) current = current.substring(0,15)+"..."
    return (
        <Menu autoSelect={false} strategy="fixed" placement="bottom-end">
            <MenuButton as={Button}
                mr={2}
                rightIcon={<MdArrowDropDown size={26} className="buttonSideIcon" style={{ marginLeft: -10, marginRight: -8 }} />}
                variant="ddl"
                className="durationPicker"
                style={{ ...detailedSubText }}
                borderRadius='4px'>
                {current}
            </MenuButton>
            <MenuList>
                {opts.map((x, i) => {
                    let divider = <></>
                    let borderStyle = {};
                    if (i === 0) borderStyle = { borderTopLeftRadius: 6, borderTopRightRadius: 6 }
                    if (i === opts.length - 1) borderStyle = { borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }
                    else divider = <MenuDivider />
                    return <div key={x + "s"}>
                        <MenuItem key={x} className={v === x ? "menuActive" : undefined} style={{ ...detailedSubText, ...borderStyle }} onClick={() => props.onChange(x)}>{t(getUnitHelper(x).label)}</MenuItem>
                        {divider}
                    </div>
                })}
            </MenuList>
        </Menu>
    )
}