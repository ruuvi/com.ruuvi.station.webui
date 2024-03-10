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
} from "@chakra-ui/react"
import { MdArrowDropDown } from "react-icons/md"
import { AiOutlineCalendar } from "react-icons/ai"
import { useTranslation } from 'react-i18next';
import DatePicker from "./DatePicker";
import { useState } from "react";

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

export default function DurationPicker(props) {
    const { t } = useTranslation();
    const [lastCustom, setLastCustom] = useState(null)
    const [custom, setCustom] = useState(null)
    const [showPicker, setShowPicker] = useState(false)
    const [showDropdown, setShowDropdown] = useState(false)
    var ts = getTimespan(props.value)
    var renderTimespans = timespans;

    if (props.dashboard) renderTimespans = renderTimespans.filter(x => x.v <= 24 * 7)
    if (props.showMaxHours !== undefined) renderTimespans = renderTimespans.filter(x => x.v <= props.showMaxHours)
    return (
        <>
            {/* 
            <Modal isOpen={showPicker} onClose={() => setShowPicker(false)}>
                <ModalOverlay />
                <ModalContent maxWidth={"360px"}>
                    <ModalBody>
                        <DatePicker onChange={setLastCustom} />
                    </ModalBody>
                    <ModalFooter>
                        <Button variant='ghost' mr={3} onClick={() => setShowPicker(false)}>
                            Close
                        </Button>
                        <Button onClick={() => {
                            setCustom(lastCustom)
                            setShowPicker(false)
                            lastCustom.from.setHours(0, 0, 0, 0)
                            lastCustom.to.setHours(23, 59, 59, 999)
                            props.onChange(lastCustom)
                        }}>Set</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
            */}

            <Menu autoSelect={false} strategy="fixed" placement="bottom-end" isOpen={showDropdown} onClose={() => setShowDropdown(false)}>
                <Popover isOpen={showPicker} placement="bottom-end" onClose={() => setShowPicker(false)}>
                    <PopoverAnchor>
                        <MenuButton as={Button}
                            rightIcon={<MdArrowDropDown size={26} className="buttonSideIcon" onClick={e => setShowPicker(false) || setShowDropdown(!showDropdown)} style={{ marginRight: -8, marginLeft: 4 }} />}
                            leftIcon={!props.dashboard && <AiOutlineCalendar size={26} className="buttonSideIcon" onClick={e => setShowDropdown(false) || setShowPicker(!showPicker)} style={{ marginRight: 6, marginLeft: -8 }} />}
                            variant="ddl"
                            className="durationPicker"
                            style={{ ...detailedSubText }}
                            disabled={props.disabled}
                            borderRadius='4px'>
                            {custom ? (
                                <>
                                    {ddmm(custom.from) + " - " + ddmm(custom.to)}
                                </>
                            ) : (
                                <>
                                    {ts.k} {t(ts.t).toLowerCase()}
                                </>
                            )}
                        </MenuButton>
                    </PopoverAnchor>
                    <PopoverContent>
                        <PopoverBody>
                            <DatePicker onChange={setLastCustom} />
                            <Box textAlign="right">
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
                        </PopoverBody>
                    </PopoverContent>
                </Popover>
                <MenuList zIndex={2}>
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
        </>
    )
}