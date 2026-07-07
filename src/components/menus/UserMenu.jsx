import React from "react";
import {
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Button,
    MenuDivider,
} from "@chakra-ui/react"
import { FaUserAlt } from "react-icons/fa"
import { MdArrowDropDown } from "react-icons/md"
import { useTranslation } from 'react-i18next';
import { logout } from "../../utils/loginUtils";

function UserMenu({ myAccount }) {
    const { t } = useTranslation();
    return (
        <Menu autoSelect={false}>
            <MenuButton as={Button} variant="topbar" rightIcon={<MdArrowDropDown className="buttonSideIcon" size={26} style={{ marginLeft: -10, marignRight: -10 }} />} style={{ backgroundColor: "transparent", paddingRight: 0, paddingLeft: 10 }}>
                <FaUserAlt />
            </MenuButton>
            <MenuList mt="2" zIndex={10}>
                <MenuItem className="ddlItem" style={{ borderTopLeftRadius: 6, borderTopRightRadius: 6 }} onClick={() => myAccount()}>{t("my_ruuvi_account")}</MenuItem>
                <MenuDivider />
                <MenuItem className="ddlItem" style={{ borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }} onClick={() => logout()}>{t("sign_out")}</MenuItem>
            </MenuList>
        </Menu>
    )
}

export default UserMenu;
