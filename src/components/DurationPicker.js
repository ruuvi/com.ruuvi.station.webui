import {
    Menu,
    MenuList,
    MenuItem,
    MenuButton,
    Button,
} from "@chakra-ui/react"
import { MdArrowDropDown } from "react-icons/md"
import { useTranslation } from 'react-i18next';
import { ruuviTheme } from "../themes";

var timespans = [
    { k: "1", t: "hour", v: 1 },
    { k: "2", t: "hours", v: 2 },
    { k: "3", t: "hours", v: 3 },
    { k: "12", t: "hours", v: 12 },
    { k: "1", t: "day", v: 24 },
    { k: "2", t: "days", v: 24 * 2 },
    { k: "3", t: "days", v: 24 * 3 },
    { k: "1", t: "week", v: 24 * 7 },
    { k: "1", t: "month", v: 24 * 7 * 4 },
    { k: "3", t: "months", v: 24 * 7 * 4 * 3 },
    { k: "6", t: "months", v: 24 * 7 * 4 * 6 },
    { k: "1", t: "year", v: 24 * 7 * 4 * 12 },
    { k: "2", t: "years", v: 24 * 7 * 4 * 12 * 2 }
]

export function getTimespans() { return timespans };
export function getTimespan(value) {
    var ts = timespans.find(x => x.v === value)
    if (!ts) ts = timespans[2];
    return ts;
};

const detailedSubText = {
    fontFamily: "mulish",
    fontSize: "14px",
}

export default function DurationPicker(props) {
    const { t } = useTranslation();
    var ts = getTimespan(props.value)
    var renderTimespans = timespans;
    if (props.dashboard) renderTimespans = renderTimespans.filter(x => x.v <= 24 * 7)
    return (
        <Menu autoSelect={false} strategy="fixed" placement="bottom-end">
            <MenuButton as={Button}
                rightIcon={<MdArrowDropDown size={26} color="#77cdc2" style={{ marginLeft: -10, marginRight: -8 }} />}
                variant="ddl"
                className="durationPicker"
                style={{ ...detailedSubText }}
                borderRadius='4px'
                borderWidth="1px">
                {ts.k} {t(ts.t).toLowerCase()}
            </MenuButton>
            <MenuList>
                {renderTimespans.map(x => {
                    return <MenuItem key={x.v} style={{ fontFamily: "mulish", fontSize: 16, backgroundColor: ts.v === x.v ? ruuviTheme.colors.primaryLight : undefined }} onClick={() => props.onChange(x.v)}>{x.k} {t(x.t).toLowerCase()}</MenuItem>
                })}
            </MenuList>
        </Menu>
    )
}