import React, { Component } from "react";
import {
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Button,
} from "@chakra-ui/react"
import { ChevronDownIcon } from "@chakra-ui/icons";
import { FaUserAlt } from "react-icons/fa"

class UserMenu extends Component {
    constructor(props) {
        super(props)
    }
    render() {
        return (
            <Menu>
                <MenuButton as={Button} rightIcon={<ChevronDownIcon />} style={{ backgroundColor: "transparent" }}>
                    <FaUserAlt />
                </MenuButton>
                <MenuList>
                    <MenuItem onClick={() => this.props.logout()}>Logout</MenuItem>
                </MenuList>
            </Menu>
        )
    }
}

export default UserMenu;