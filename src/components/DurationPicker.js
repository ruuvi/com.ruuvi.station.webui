import {
    Menu,
    MenuList,
    MenuItem,
    MenuButton,
    Button,
} from "@chakra-ui/react"
import { MdArrowDropDown } from "react-icons/md"
import { useTranslation } from 'react-i18next';

var timespans = [{ k: "1", t: "hour", v: 1 }, { k: "2", t: "hours", v: 2 }, { k: "8", t: "hours", v: 8 }, { k: "12", t: "hours", v: 12 }, { k: "1", t: "day", v: 24 }, { k: "2", t: "days", v: 24 * 2 }, { k: "3", t: "days", v: 24 * 3 }, { k: "1", t: "week", v: 24 * 7 }, { k: "2", t: "weeks", v: 24 * 7 * 2 }, { k: "1", t: "month", v: 24 * 7 * 4 }, { k: "2", t: "months", v: 24 * 7 * 4 * 2 }, { k: "3", t: "months", v: 24 * 7 * 4 * 3 }, { k: "6", t: "months", v: 24 * 7 * 4 * 6 }]

export function getTimespans() { return timespans };

const detailedSubText = {
    fontFamily: "mulish",
    fontSize: "14px",
}

export default function DurationPicker(props) {
    const { t } = useTranslation();
    return (
        <Menu strategy="fixed" placement="bottom-end">
            <MenuButton as={Button} rightIcon={<MdArrowDropDown size={20} color="#77cdc2" style={{ margin: -4 }} />} style={{ backgroundColor: "transparent", ...detailedSubText }}>
                {timespans.find(x => x.v === props.value).k} {t(timespans.find(x => x.v === props.value).t).toLowerCase()}
            </MenuButton>
            <MenuList>
                {timespans.map(x => {
                    return <MenuItem key={x.v} style={{ fontFamily: "mulish", fontSize: 16, fontWeight: "bold" }} onClick={() => props.onChange(x.v)}>{x.k} {t(x.t).toLowerCase()}</MenuItem>
                })}
            </MenuList>
        </Menu>
    )
}