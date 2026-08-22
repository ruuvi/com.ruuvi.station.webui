import React from 'react';
import { Button, Menu, Portal } from '@chakra-ui/react';
import { MdArrowDropDown, MdOpenInNew } from "react-icons/md"
import i18next from 'i18next';
import { FaCog } from 'react-icons/fa';
import { useColorMode } from '../ui/color-mode';

const SettingsMenu = ({ openSettings }) => {
    const { t } = i18next
    const { colorMode, toggleColorMode } = useColorMode()
    return (
        <Menu.Root positioning={{ gutter: 16 }}>
            <Menu.Trigger asChild>
                <Button variant="topbar" style={{ backgroundColor: "transparent", paddingRight: 0, paddingLeft: 10 }}>
                    <FaCog />
                    <MdArrowDropDown className="buttonSideIcon" size={26} style={{ marginLeft: -10 }} />
                </Button>
            </Menu.Trigger>
            <Portal>
                <Menu.Positioner zIndex={10}>
                    <Menu.Content>
                        <Menu.Item value="color-mode" className="ddlItem" style={{ borderTopRightRadius: 8, borderTopLeftRadius: 8 }} onClick={() => toggleColorMode()} >{t(colorMode === "light" ? "switch_to_dark_mode" : "switch_to_light_mode")}</Menu.Item>
                        <Menu.Separator />
                        <Menu.Item value="settings" className="ddlItem" onClick={() => openSettings()}>{t("settings")}</Menu.Item>
                        <Menu.Separator />
                        <Menu.Item value="help" className="ddlItem" onClick={() => window.open(`https://${i18next.language === "fi" ? "ruuvi.com/fi/tuki" : "ruuvi.com/support"}`, "_blank")}>{t("help")} <MdOpenInNew style={{ marginLeft: 8 }} /></Menu.Item>
                        <Menu.Separator />
                        <Menu.Item value="contact" className="ddlItem" onClick={() => window.open(`mailto:support@ruuvi.com?subject=Ruuvi Station Web Feedback`)}>{t("contact_support")} <MdOpenInNew style={{ marginLeft: 8 }} /></Menu.Item>
                        <Menu.Separator />
                        <Menu.Item value="ideas" className="ddlItem" style={{ borderBottomRightRadius: 8, borderBottomLeftRadius: 8 }} onClick={() => window.open(`https://${i18next.language === "fi" ? "ruuvi.com/fi/ideat" : "ruuvi.com/ideas"}`, "_blank")}>{t("what_to_measure")} <MdOpenInNew style={{ marginLeft: 8 }} /></Menu.Item>
                    </Menu.Content>
                </Menu.Positioner>
            </Portal>
        </Menu.Root>
    );
};

export default SettingsMenu;
