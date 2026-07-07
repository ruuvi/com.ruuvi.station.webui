import React, { useEffect, useState } from "react";
import logger from "../../utils/logger";
import {
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Button,
    MenuDivider,
} from "@chakra-ui/react"
import { MdArrowDropDown, MdOpenInNew } from "react-icons/md"
import NetworkApi from "../../NetworkApi";
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from "react-router-dom";
import { getSetting } from "../../UnitHelper";
import i18next from "i18next";


function SensorMenu(props) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [sensors, setSensors] = useState([]);
    const [sensorsOpen, setSensorsOpen] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        new NetworkApi().user(resp => {
            if (resp.result === "success") {
                setSensors(resp.data.sensors)
            } else if (resp.result === "error") {
                logger.error("sensor menu error", resp.error)
            }
        });
    }, []);

    const getCurrentSensor = () => {
        var path = location.pathname
        return path.substring(path.indexOf("/") + 1, path.length)
    }

    const getSensors = () => {
        let order = getSetting("SENSOR_ORDER", null)
        if (order) {
            order = JSON.parse(order)
            if (order && order.length > 0) {
                return order.map(x => sensors.find(y => y.sensor === x))
            }
        }
        return sensors
    }

    const toggleSensorList = e => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        setSensorsOpen(open => !open)
    }

    const toggleMenu = () => {
        setIsMenuOpen(open => !open)
    }

    const sensorClicked = (sensor) => {
        toggleMenu()
        navigate('/' + sensor)
    }

    const extraStyle = {}
    if (props.small) {
        extraStyle.paddingLeft = 4
        extraStyle.paddingRight = 0
    }
    return (
        <>
            <Menu autoSelect={false} closeOnSelect={false} placement="bottom-end" isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)}>
                <MenuButton as={Button} variant="topbar"
                    rightIcon={<MdArrowDropDown size={26} className="buttonSideIcon" style={{ marginLeft: -10, marignRight: -10 }} />}
                    onClick={toggleMenu}
                    style={extraStyle}>
                    {t("my_sensors")}
                </MenuButton>
                <MenuList mt="2" zIndex={10}>
                    <MenuItem className="ddlItem" style={{ borderTopLeftRadius: 6, borderTopRightRadius: 6 }} onClick={() => window.open(`https://${i18next.language === "fi" ? "ruuvi.com/fi/tuotteet" : "ruuvi.com/products"}`, "_blank")}>
                        {t('buy_sensors')}  <MdOpenInNew style={{ marginLeft: 8 }} />
                    </MenuItem>
                    <MenuDivider />
                    <MenuItem className="ddlItem" onClick={() => props.addSensor()}>{t('add_new_sensor')}</MenuItem>
                    <MenuDivider />
                    <MenuItem className="ddlItem" onClick={toggleSensorList} display={"flex"} justifyContent={"space-between"} style={sensorsOpen ? undefined : { borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }}>
                        <span>
                            {t('all_my_sensors')}
                        </span>
                        <MdArrowDropDown size={26} className="buttonSideIcon" style={{ marginLeft: -10, marignRight: -10 }} />
                    </MenuItem>
                    {getSensors().map((x, i) => {
                        if (!sensorsOpen) return null
                        if (!x) return null
                        let divider = <></>
                        let borderStyle = {};
                        if (i === sensors.length - 1) borderStyle = { borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }
                        else divider = <MenuDivider />
                        return <div key={x.sensor + "div"}>
                            {i === 0 && <MenuDivider />}
                            <MenuItem key={x.sensor} className={`ddlSubItem ${getCurrentSensor() === x.sensor ? "selectedSensorInMenu" : ""}`} style={{ ...borderStyle }} onClick={() => sensorClicked(x.sensor)}>{x.name || x.sensor}</MenuItem>
                            {divider}
                        </div>
                    })}
                </MenuList>
            </Menu>
        </>
    )
}

export default SensorMenu;
