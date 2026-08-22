import React from "react";
import {
    Menu,
    Button,
    Portal,
} from "@chakra-ui/react"
import { FaUserAlt } from "react-icons/fa"
import { MdArrowDropDown } from "react-icons/md"
import { useTranslation } from 'react-i18next';
import { logout } from "../../utils/loginUtils";

function UserMenu({ myAccount }) {
    const { t } = useTranslation();
    return (
        <Menu.Root positioning={{ gutter: 16 }}>
            <Menu.Trigger asChild>
                <Button variant="topbar" style={{ backgroundColor: "transparent", paddingRight: 0, paddingLeft: 10 }}>
                    <FaUserAlt />
                    <MdArrowDropDown className="buttonSideIcon" size={26} style={{ marginLeft: -10 }} />
                </Button>
            </Menu.Trigger>
            <Portal>
                <Menu.Positioner zIndex={10}>
                    <Menu.Content>
                        <Menu.Item value="account" className="ddlItem" style={{ borderTopLeftRadius: 6, borderTopRightRadius: 6 }} onClick={() => myAccount()}>{t("my_ruuvi_account")}</Menu.Item>
                        <Menu.Separator />
                        <Menu.Item value="signout" className="ddlItem" style={{ borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }} onClick={() => logout()}>{t("sign_out")}</Menu.Item>
                    </Menu.Content>
                </Menu.Positioner>
            </Portal>
        </Menu.Root>
    )
}

export default UserMenu;
