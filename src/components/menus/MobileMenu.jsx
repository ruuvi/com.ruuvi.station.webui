import React from 'react';
import { Button, Menu, Portal, useDisclosure } from '@chakra-ui/react';
import { MdArrowDropDown, MdMenu, MdOpenInNew } from "react-icons/md"
import i18next from 'i18next';
import { logout } from '../../utils/loginUtils';
import { useNavigate } from 'react-router-dom';
import { useColorMode } from '../ui/color-mode';

const MobileMenu = ({ openSettings, myAccount }) => {
    const [show, setShow] = React.useState(false);
    const [showMyProfile, setShowMyProfile] = React.useState(false);
    const { open, onOpen, onClose } = useDisclosure();

    const handleToggle = (e) => {
        setShow(!show);
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
    }
    const handleToggleProfile = (e) => {
        setShowMyProfile(!showMyProfile);
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
    }
    const nav = useNavigate()
    const navigateTo = (path) => {
        onClose();
        nav(path);
    }
    const { t } = i18next
    const { colorMode, toggleColorMode } = useColorMode()
    return (
        <Menu.Root
            open={open}
            onOpenChange={(e) => (e.open ? onOpen() : onClose())}
            closeOnSelect={false}
            positioning={{ gutter: 16 }}
        >
            <Menu.Trigger asChild>
                <Button variant="topbar" style={{ backgroundColor: "transparent", paddingRight: 0, paddingLeft: 10 }}>
                    <MdMenu size={28} />
                </Button>
            </Menu.Trigger>
            <Portal>
                <Menu.Positioner zIndex={10}>
                    <Menu.Content>
                        <Menu.Item value="home" className={(window.location.href.endsWith("/") ? "menuActive" : "") + " ddlItem"} onClick={() => navigateTo("/")}>{t("home")}</Menu.Item>
                        <Menu.Separator />
                        <Menu.Item value="shares" className={(window.location.href.endsWith("/shares") ? "menuActive" : "") + " ddlItem"} onClick={() => navigateTo("/shares")}>{t("share_sensors")}</Menu.Item>
                        <Menu.Separator />
                        <Menu.Item value="compare" className={(window.location.href.endsWith("/compare") ? "menuActive" : "") + " ddlItem"} onClick={() => navigateTo("/compare")}>{t("compare")}</Menu.Item>
                        <Menu.Separator />
                        <Menu.Item value="app-settings" className="ddlItem" onClick={handleToggle} display={"flex"} justifyContent={"space-between"}>
                            <span>
                                {t('app_settings')}
                            </span>
                            <MdArrowDropDown size={26} className="buttonSideIcon" style={{ marginLeft: -10 }} />
                        </Menu.Item>
                        {show && <>
                            <Menu.Separator />
                            <Menu.Item value="color-mode" className="ddlSubItem" onClick={() => toggleColorMode()} >{t(colorMode === "light" ? "switch_to_dark_mode" : "switch_to_light_mode")}</Menu.Item>
                            <Menu.Separator />
                            <Menu.Item value="settings" className="ddlSubItem" onClick={() => openSettings()}>{t("settings")}</Menu.Item>
                            <Menu.Separator />
                            <Menu.Item value="help" className="ddlSubItem" onClick={() => window.open(`https://${i18next.language === "fi" ? "ruuvi.com/fi/tuki" : "ruuvi.com/support"}`, "_blank")}>{t("help")} <MdOpenInNew style={{ marginLeft: 8 }} /></Menu.Item>
                            <Menu.Separator />
                            <Menu.Item value="contact" className="ddlSubItem" onClick={() => window.open(`mailto:support@ruuvi.com?subject=Ruuvi Station Web Feedback`)}>{t("contact_support")} <MdOpenInNew style={{ marginLeft: 8 }} /></Menu.Item>
                            <Menu.Separator />
                            <Menu.Item value="ideas" className="ddlSubItem" onClick={() => window.open(`https://${i18next.language === "fi" ? "ruuvi.com/fi/ideat" : "ruuvi.com/ideas"}`, "_blank")}>{t("what_to_measure")} <MdOpenInNew style={{ marginLeft: 8 }} /></Menu.Item>
                        </>}
                        <Menu.Separator />
                        <Menu.Item value="my-profile" className="ddlItem" onClick={handleToggleProfile} display={"flex"} justifyContent={"space-between"} style={showMyProfile ? undefined : { borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }}>
                            <span>
                                {t('my_profile')}
                            </span>
                            <MdArrowDropDown size={26} className="buttonSideIcon" style={{ marginLeft: -10 }} />
                        </Menu.Item>
                        {showMyProfile && <>
                            <Menu.Separator />
                            <Menu.Item value="account" className="ddlSubItem" onClick={() => myAccount()}>{t("my_ruuvi_account")}</Menu.Item>
                            <Menu.Separator />
                            <Menu.Item value="signout" className="ddlSubItem" style={{ borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }} onClick={() => logout()}>{t("sign_out")}</Menu.Item>
                        </>}
                    </Menu.Content>
                </Menu.Positioner>
            </Portal>
        </Menu.Root>
    );
};

export default MobileMenu;
