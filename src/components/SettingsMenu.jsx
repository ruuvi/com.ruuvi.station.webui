import React from 'react';
import { Button, Menu, MenuButton, MenuList, MenuItem, MenuDivider, useColorMode } from '@chakra-ui/react';
import { MdArrowDropDown, MdOpenInNew } from "react-icons/md"
import i18next from 'i18next';
import { FaCog } from 'react-icons/fa';

const SettingsMenu = ({openSettings}) => {
    const { t } = i18next
    const { colorMode, toggleColorMode } = useColorMode()
    return (
        <Menu autoSelect={false}>
            <MenuButton as={Button} variant="topbar" rightIcon={<MdArrowDropDown className="buttonSideIcon" size={26} style={{ marginLeft: -10, marignRight: -10 }} />} style={{ backgroundColor: "transparent", paddingRight: 0, paddingLeft: 10 }}>
                <FaCog />
            </MenuButton>
            <MenuList mt="2" zIndex={10}>
                <MenuItem className="ddlItem" style={{ borderTopRightRadius: 8, borderTopLeftRadius: 8 }} onClick={() => toggleColorMode()} >{t(colorMode === "light" ? "switch_to_dark_mode" : "switch_to_light_mode")}</MenuItem>
                <MenuDivider />
                <MenuItem className="ddlItem" onClick={() => openSettings()}>{t("settings")}</MenuItem>
                <MenuDivider />
                <MenuItem className="ddlItem" onClick={() => window.open(`https://${i18next.language === "fi" ? "ruuvi.com/fi/tuki" : "ruuvi.com/support"}`, "_blank")}>{t("help")} <MdOpenInNew style={{marginLeft: 8}} /></MenuItem>
                <MenuDivider />
                <MenuItem className="ddlItem" onClick={() => window.open(`mailto:support@ruuvi.com?subject=Ruuvi Station Web Feedback`)}>{t("contact_support")} <MdOpenInNew style={{marginLeft: 8}} /></MenuItem>
                <MenuDivider />
                <MenuItem className="ddlItem" style={{ borderBottomRightRadius: 8, borderBottomLeftRadius: 8 }} onClick={() => window.open(`https://${i18next.language === "fi" ? "ruuvi.com/fi/ideat" : "ruuvi.com/ideas"}`, "_blank")}>{t("what_to_measure")} <MdOpenInNew style={{marginLeft: 8}} /></MenuItem>
            </MenuList>
        </Menu>
    );
};

export default SettingsMenu;