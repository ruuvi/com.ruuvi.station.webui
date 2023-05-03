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

var timespans = [
    { k: "1", t: "hour", v: 1 },
    { k: "2", t: "hours", v: 2 },
    { k: "3", t: "hours", v: 3 },
    { k: "12", t: "hours", v: 12 },
    { k: "1", t: "day", v: 24 },
    { k: "2", t: "days", v: 24 * 2 },
    { k: "3", t: "days", v: 24 * 3 },
    { k: "1", t: "week", v: 24 * 7 },
    { k: "2", t: "weeks", v: 24 * 7 * 2 },
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
                rightIcon={<MdArrowDropDown size={26} className="buttonSideIcon" style={{ marginLeft: -10, marginRight: -8 }} />}
                variant="ddl"
                className="durationPicker"
                style={{ ...detailedSubText }}
                disabled={props.disabled}
                borderRadius='4px'>
                {ts.k} {t(ts.t).toLowerCase()}
            </MenuButton>
            <MenuList>
                {renderTimespans.map((x, i) => {
                    let divider = <></>
                    let borderStyle = {};
                    if (i === 0) borderStyle = { borderTopLeftRadius: 6, borderTopRightRadius: 6 }
                    if (i === renderTimespans.length - 1) borderStyle = { borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }
                    else divider = <MenuDivider />
                    return <div key={x.v+"p"}>
                    <MenuItem key={x.v} className={ts.v === x.v ? "menuActive" : undefined} style={{ ...detailedSubText, ...borderStyle }} onClick={() => props.onChange(x.v)}>{x.k} {t(x.t).toLowerCase()}</MenuItem>
                    {divider}
                    </div>
                })}
            </MenuList>
        </Menu>
    )
}