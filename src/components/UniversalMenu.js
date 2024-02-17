import React from "react";
import {
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Button,
    MenuDivider,
} from "@chakra-ui/react"
import { MdArrowDropDown } from "react-icons/md"

const detailedSubText = {
    fontFamily: "mulish",
    fontSize: "14px",
}

export default function UniversalMenu(props) {
    return (
        <Menu autoSelect={false}>
            <MenuButton as={Button}
                rightIcon={<MdArrowDropDown size={26} className="buttonSideIcon" style={{ marginLeft: -10, marginRight: -8 }} />}
                variant="ddl"
                className="durationPicker"
                style={{ ...detailedSubText }}
                borderRadius='4px'>
                {props.buttonText}
            </MenuButton>
            <MenuList>
                {props.items?.map((x, i) => {
                    let style = { ...detailedSubText }
                    if (i === 0) style = { ...style, borderTopLeftRadius: 6, borderTopRightRadius: 6 }
                    else if (i === props.items.length - 1) style = { ...style, borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }
                    return <>
                        <MenuItem style={style} onClick={() => props.onClick(x)}>{x}</MenuItem>
                        {i !== props.items.length - 1 && <MenuDivider />}
                    </>
                })}
            </MenuList>
        </Menu>
    )
}