import React from 'react';
import { Button, Menu, MenuButton, MenuList, MenuItem, MenuDivider, useColorMode } from '@chakra-ui/react';
import { MdArrowDropDown, MdArrowRightAlt } from "react-icons/md"
import i18next from 'i18next';
import { FaCog } from 'react-icons/fa';

const itemStyle = { fontFamily: "mulish", fontSize: 15, fontWeight: 800 }
const SettingsMenu = ({openSettings}) => {
    const { t } = i18next
    const { colorMode, toggleColorMode } = useColorMode()
    return (
        <Menu autoSelect={false}>
            <MenuButton as={Button} variant="topbar" rightIcon={<MdArrowDropDown className="buttonSideIcon" size={26} style={{ marginLeft: -10, marignRight: -10 }} />} style={{ backgroundColor: "transparent", paddingRight: 0, paddingLeft: 10 }}>
                <FaCog />
            </MenuButton>
            <MenuList mt="2" zIndex={10}>
                <MenuItem style={itemStyle} onClick={() => toggleColorMode()} >{t(colorMode === "light" ? "switch_to_dark_mode" : "switch_to_light_mode")}</MenuItem>
                <MenuDivider />
                <MenuItem style={itemStyle} onClick={() => openSettings()}>{t("settings")}</MenuItem>
                <MenuDivider />
                <MenuItem style={itemStyle} onClick={() => window.open(`https://${i18next.language === "fi" ? "ruuvi.com/fi/tuki" : "ruuvi.com/support"}`, "_blank")}>{t("help")} <MdArrowRightAlt style={{marginLeft: 8}} /></MenuItem>
                <MenuDivider />
                <MenuItem style={itemStyle} onClick={() => window.open(`mailto:support@ruuvi.com?subject=Ruuvi Station Web Feedback`)}>{t("contact_support")} <MdArrowRightAlt style={{marginLeft: 8}} /></MenuItem>
                <MenuDivider />
                <MenuItem style={itemStyle} onClick={() => window.open(`https://${i18next.language === "fi" ? "ruuvi.com/fi/ideat" : "ruuvi.com/ideas"}`, "_blank")}>{t("what_to_measure")} <MdArrowRightAlt style={{marginLeft: 8}} /></MenuItem>
            </MenuList>
        </Menu>
    );
};

export default SettingsMenu;