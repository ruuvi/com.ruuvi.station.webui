import React from 'react';
import { Button, Menu, MenuButton, MenuList, MenuItem, MenuDivider, useColorMode } from '@chakra-ui/react';
import { MdArrowDropDown, MdMenu, MdOpenInNew } from "react-icons/md"
import i18next from 'i18next';
import { logout } from '../utils/loginUtils';
import { useNavigate } from 'react-router-dom';

const MobileMenu = ({ openSettings, myAccount }) => {
    const [show, setShow] = React.useState(false);
    const [showMyProfile, setShowMyProfile] = React.useState(false);
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
    const { t } = i18next
    const { colorMode, toggleColorMode } = useColorMode()
    return (
        <Menu autoSelect={false} closeOnSelect={false}>
            <MenuButton as={Button} variant="topbar" style={{ backgroundColor: "transparent", paddingRight: 0, paddingLeft: 10 }}>
                <MdMenu size={28} />
            </MenuButton>
            <MenuList mt="2" zIndex={10}>
                <MenuItem className={(window.location.href.endsWith("/") ? "menuActive" : "") + " ddlItem"} onClick={() => nav("/")}>{t("home")}</MenuItem>
                <MenuDivider />
                <MenuItem className={(window.location.href.endsWith("/shares") ? "menuActive" : "") + " ddlItem"} onClick={() => nav("/shares")}>{t("share_sensors")}</MenuItem>
                <MenuDivider />
                <MenuItem className={(window.location.href.endsWith("/compare") ? "menuActive" : "") + " ddlItem"} onClick={() => nav("/compare")}>{t("compare")}</MenuItem>
                <MenuDivider />
                <MenuItem className="ddlItem" onClick={handleToggle} display={"flex"} justifyContent={"space-between"}>
                    <span>
                        {t('app_settings')}
                    </span>
                    <MdArrowDropDown size={26} className="buttonSideIcon" style={{ marginLeft: -10, marignRight: -10 }} />
                </MenuItem>
                {show && <>
                    <MenuDivider />
                    <MenuItem className="ddlSubItem" onClick={() => toggleColorMode()} >{t(colorMode === "light" ? "switch_to_dark_mode" : "switch_to_light_mode")}</MenuItem>
                    <MenuDivider />
                    <MenuItem className="ddlSubItem" onClick={() => openSettings()}>{t("settings")}</MenuItem>
                    <MenuDivider />
                    <MenuItem className="ddlSubItem" onClick={() => window.open(`https://${i18next.language === "fi" ? "ruuvi.com/fi/tuki" : "ruuvi.com/support"}`, "_blank")}>{t("help")} <MdOpenInNew style={{ marginLeft: 8 }} /></MenuItem>
                    <MenuDivider />
                    <MenuItem className="ddlSubItem" onClick={() => window.open(`mailto:support@ruuvi.com?subject=Ruuvi Station Web Feedback`)}>{t("contact_support")} <MdOpenInNew style={{ marginLeft: 8 }} /></MenuItem>
                    <MenuDivider />
                    <MenuItem className="ddlSubItem" onClick={() => window.open(`https://${i18next.language === "fi" ? "ruuvi.com/fi/ideat" : "ruuvi.com/ideas"}`, "_blank")}>{t("what_to_measure")} <MdOpenInNew style={{ marginLeft: 8 }} /></MenuItem>
                </>}
                <MenuDivider />
                <MenuItem className="ddlItem" onClick={handleToggleProfile} display={"flex"} justifyContent={"space-between"} style={showMyProfile ? undefined : { borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }}>
                    <span>
                        {t('my_profile')}
                    </span>
                    <MdArrowDropDown size={26} className="buttonSideIcon" style={{ marginLeft: -10, marignRight: -10 }} />
                </MenuItem>
                {showMyProfile && <>
                    <MenuDivider />
                    <MenuItem className="ddlSubItem" onClick={() => myAccount()}>{t("my_ruuvi_account")}</MenuItem>
                    <MenuDivider />
                    <MenuItem className="ddlSubItem" style={{ borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }} onClick={() => logout()}>{t("sign_out")}</MenuItem>
                </>}
            </MenuList>
        </Menu>
    );
};

export default MobileMenu;