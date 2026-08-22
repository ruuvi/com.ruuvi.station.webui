import React, { useEffect, useState } from "react";
import logger from "../../utils/logger";
import {
    Menu,
    Button,
    Portal,
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
            <Menu.Root closeOnSelect={false} positioning={{ placement: "bottom-end", gutter: 16 }} open={isMenuOpen} onOpenChange={(e) => { if (!e.open) setIsMenuOpen(false) }}>
                <Menu.Trigger asChild>
                    <Button variant="topbar" onClick={toggleMenu} style={extraStyle}>
                        {t("my_sensors")}
                        <MdArrowDropDown size={26} className="buttonSideIcon" style={{ marginLeft: -10 }} />
                    </Button>
                </Menu.Trigger>
                <Portal>
                    <Menu.Positioner zIndex={10}>
                        <Menu.Content>
                            <Menu.Item value="buy" className="ddlItem" style={{ borderTopLeftRadius: 6, borderTopRightRadius: 6 }} onClick={() => window.open(`https://${i18next.language === "fi" ? "ruuvi.com/fi/tuotteet" : "ruuvi.com/products"}`, "_blank")}>
                                {t('buy_sensors')}  <MdOpenInNew style={{ marginLeft: 8 }} />
                            </Menu.Item>
                            <Menu.Separator />
                            <Menu.Item value="add" className="ddlItem" onClick={() => props.addSensor()}>{t('add_new_sensor')}</Menu.Item>
                            <Menu.Separator />
                            <Menu.Item value="all" className="ddlItem" onClick={toggleSensorList} display={"flex"} justifyContent={"space-between"} style={sensorsOpen ? undefined : { borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }}>
                                <span>
                                    {t('all_my_sensors')}
                                </span>
                                <MdArrowDropDown size={26} className="buttonSideIcon" style={{ marginLeft: -10 }} />
                            </Menu.Item>
                            {getSensors().map((x, i) => {
                                if (!sensorsOpen) return null
                                if (!x) return null
                                let divider = <></>
                                let borderStyle = {};
                                if (i === sensors.length - 1) borderStyle = { borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }
                                else divider = <Menu.Separator />
                                return <div key={x.sensor + "div"}>
                                    {i === 0 && <Menu.Separator />}
                                    <Menu.Item value={x.sensor} key={x.sensor} className={`ddlSubItem ${getCurrentSensor() === x.sensor ? "selectedSensorInMenu" : ""}`} style={{ ...borderStyle }} onClick={() => sensorClicked(x.sensor)}>{x.name || x.sensor}</Menu.Item>
                                    {divider}
                                </div>
                            })}
                        </Menu.Content>
                    </Menu.Positioner>
                </Portal>
            </Menu.Root>
        </>
    )
}

export default SensorMenu;
