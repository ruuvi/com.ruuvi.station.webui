import {
    Menu,
    MenuList,
    MenuItem,
    MenuButton,
    Button,
    MenuDivider,
    Popover,
    PopoverContent,
    PopoverAnchor,
    PopoverBody,
    Box,
    Divider,
    Flex,
} from "@chakra-ui/react"
import { MdArrowDropDown } from "react-icons/md"
import { AiOutlineCalendar } from "react-icons/ai"
import { useTranslation } from 'react-i18next';
import DatePicker from "./DatePicker";
import { useState, useEffect } from "react";

var timespans = [
    { k: "1", t: "hour", v: 1 },
    { k: "2", t: "hours", v: 2 },
    { k: "3", t: "hours", v: 3 },
    { k: "6", t: "hours", v: 6 },
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
    { k: "2", t: "years", v: 24 * 7 * 4 * 12 * 2 },
    { k: "3", t: "years", v: 24 * 7 * 4 * 12 * 3 }
]

export function getTimespans() { return timespans };
export function getTimespan(value) {
    var ts = timespans.find(x => x.v === value)
    if (!ts) ts = timespans[2];
    return ts;
};

function ddmm(ts) {
    return ts.getDate() + "." + (ts.getMonth() + 1) + "." + (ts.getFullYear())
}

const detailedSubText = {
    fontFamily: "mulish",
    fontSize: "14px",
}

const iconProps = {
    size: 26,
    style: { margin: -9 }
}

let wasInClose = false

export default function DurationPicker(props) {
    const { t } = useTranslation();
    const [lastCustom, setLastCustom] = useState(typeof props.value === "object" ? props.value : null)
    const [custom, setCustom] = useState(typeof props.value === "object" ? props.value : null)
    const [showPicker, setShowPicker] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)

    useEffect(() => {
        if (typeof props.value === "object" && props.value && props.value.from && props.value.to) {
            setCustom(props.value)
            setLastCustom(props.value)
        }
    }, [props.value])

    const setDropdownFromClick = (state) => {
        wasInClose = false
        setShowDropdown(state)
    }

    var ts = getTimespan(props.value)
    var renderTimespans = timespans;

    if (props.dashboard) renderTimespans = renderTimespans.filter(x => x.v <= 24 * 7)
    if (props.showMaxHours !== undefined) renderTimespans = renderTimespans.filter(x => x.v <= props.showMaxHours)

    return (
        <>
            <span>
                <Popover isOpen={showPicker} placement="bottom-end">
                    <Menu autoSelect={false} strategy="fixed" placement="bottom-end" isOpen={showDropdown} onClose={() => {
                        wasInClose = true
                        setTimeout(() => {
                            wasInClose = false
                        }, 100)
                        setShowDropdown(false)
                    }}>
                        <PopoverAnchor>
                            <span className="durationPicker" style={{ height: "40px", display: "inline-block", borderRadius: "4px" }} >
                                <Flex>
                                    {!props.dashboard &&
                                        <Button className="durationPicker" variant="imageToggle" style={{ borderRadius: '4px' }}
                                            onClick={e => setDropdownFromClick(false) || setShowPicker(!showPicker)} >
                                            <AiOutlineCalendar {...iconProps} />
                                        </Button>
                                    }
                                    {!props.dashboard ? (
                                        <Divider orientation="vertical" height={"38px"} mt={"1px"} className="bodybg" width={"2px"} borderStyle="none" />
                                    ) : (
                                        <Box width={"4px"} />
                                    )
                                    }
                                    <span style={{ display: "inline-block", marginLeft: props.dashboard ? 10 : 14, marginRight: 14, marginTop: 10, fontFamily: "mulish", fontSize: 14, fontWeight: 600 }}>
                                        {custom ? (
                                            <>
                                                {ddmm(custom.from) + " - " + ddmm(custom.to)}
                                            </>
                                        ) : (
                                            <>
                                                {ts.k} {t(ts.t).toLowerCase()}
                                            </>
                                        )}
                                    </span>
                                    <Divider orientation="vertical" height={"38px"} mt={"1px"} className="bodybg" width={"2px"} borderStyle="none" />
                                    <Button className="durationPicker" variant="imageToggle" style={{ borderRadius: '4px' }}
                                        onClick={e => {
                                            if (wasInClose) {
                                                wasInClose = false
                                                return
                                            }
                                            setShowPicker(false)
                                            setDropdownFromClick(!showDropdown)
                                        }}>
                                        <MdArrowDropDown {...iconProps} />
                                    </Button>
                                    <MenuButton height={"40px"} >
                                    </MenuButton>
                                </Flex>
                            </span>

                        </PopoverAnchor>

                        <MenuList zIndex={100}>
                            {renderTimespans.map((x, i) => {
                                let divider = <></>
                                let borderStyle = {};
                                if (i === 0) borderStyle = { borderTopLeftRadius: 6, borderTopRightRadius: 6 }
                                if (i === renderTimespans.length - 1) borderStyle = { borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }
                                else divider = <MenuDivider />
                                return <div key={x.v + "p"}>
                                    <MenuItem key={x.v} className={!custom && ts.v === x.v ? "menuActive" : undefined} style={{ ...detailedSubText, ...borderStyle }}
                                        onClick={() => {
                                            setCustom(null)
                                            props.onChange(x.v)
                                        }}>
                                        {x.k} {t(x.t).toLowerCase()}
                                    </MenuItem>
                                    {divider}
                                </div>
                            })}
                        </MenuList>
                    </Menu>

                    <PopoverContent>
                        <DatePicker onChange={setLastCustom} />
                        <Box textAlign="right" pr={"20px"} pb={"20px"}>
                            <Button variant='ghost' mr={3} onClick={() => setShowPicker(false)}>
                                {t("close")}
                            </Button>
                            <Button isDisabled={!lastCustom || !lastCustom.from || !lastCustom.to} onClick={() => {
                                setCustom(lastCustom)
                                setShowPicker(false)
                                lastCustom.from.setHours(0, 0, 0, 0)
                                lastCustom.to.setHours(23, 59, 59, 999)
                                props.onChange(lastCustom)
                            }}>{t("set")}</Button>
                        </Box>
                    </PopoverContent>
                </Popover>
            </span>
        </>
    )
}