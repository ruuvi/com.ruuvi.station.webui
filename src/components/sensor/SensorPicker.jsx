import React from "react";
import { Box, Button, Menu, Portal } from "@chakra-ui/react";
import { MdArrowDropDown } from "react-icons/md";
import i18next from "i18next";
import { getSetting } from "../../UnitHelper";

export const SensorPicker = ({
    sensors,
    canBeSelected,
    onSensorChange,
    normalStyle,
    buttonText,
    showSelectAll = false,
}) => {
    const handleSensorChange = (selectedSensor) => {
        onSensorChange(selectedSensor);
    };

    const handleSelectAll = (e) => {
        e.preventDefault();
        const selectableSensors = canBeSelected
            ? sensors.filter((x) => canBeSelected.map((y) => y.sensor).includes(x.sensor))
            : sensors;
        // Instead of calling for each, call once with all sensor IDs
        onSensorChange(selectableSensors.map((sensor) => sensor.sensor));
    };

    let style = {
        variant: "shareSensorSelect",
        style: { fontFamily: "mulish", fontSize: 15, fontWeight: 800, width: "250px", textAlign: "left" },
    };

    if (normalStyle) {
        style = {
            variant: "ddl",
            className: "durationPicker",
        };
    }

    function getSensors() {
        let order = getSetting("SENSOR_ORDER", null);
        if (order) {
            order = JSON.parse(order);
            if (order && order.length > 0) {
                return order.map((x) => sensors.find((y) => y.sensor === x));
            }
        }
        return sensors;
    }

    return (
        <Menu.Root positioning={{ placement: "bottom-end", gutter: 16 }}>
            <Menu.Trigger asChild>
                <Button {...style} borderRadius="4px">
                    <Box pl={1} flex="1 0 auto" minW={0} className={normalStyle ? "ddlItemAlt" : ""}>
                        {buttonText || i18next.t("sensors")}
                    </Box>
                    <MdArrowDropDown size={26} className="buttonSideIcon" />
                </Button>
            </Menu.Trigger>
            <Portal>
                <Menu.Positioner zIndex={10}>
                    <Menu.Content ml={2} maxH={"800px"} overflowY={"scroll"}>
                        {showSelectAll && (
                            <>
                                <Menu.Item
                                    value="select_all"
                                    className={!normalStyle ? "ddlItem" : "ddlItemAlt"}
                                    style={{ borderTopLeftRadius: 6, borderTopRightRadius: 6 }}
                                    onClick={handleSelectAll}
                                >
                                    {i18next.t("select_all")}
                                </Menu.Item>
                                <Menu.Separator />
                            </>
                        )}
                        {getSensors().map((x, i) => {
                            if (!x) return null;
                            let divider = <></>;
                            let borderStyle = {};
                            if (i === 0) borderStyle = { borderTopLeftRadius: 6, borderTopRightRadius: 6 };
                            if (i === sensors.length - 1)
                                borderStyle = { borderBottomLeftRadius: 6, borderBottomRightRadius: 6 };
                            else divider = <Menu.Separator />;
                            return (
                                <React.Fragment key={x.sensor}>
                                    <Menu.Item
                                        value={x.sensor}
                                        disabled={
                                            canBeSelected && !canBeSelected.map((y) => y.sensor).includes(x.sensor)
                                        }
                                        className={!normalStyle ? "ddlItem" : "ddlItemAlt"}
                                        style={{ ...borderStyle }}
                                        onClick={() => handleSensorChange(x.sensor)}
                                    >
                                        {x.name || x.sensor}
                                    </Menu.Item>
                                    {divider}
                                </React.Fragment>
                            );
                        })}
                    </Menu.Content>
                </Menu.Positioner>
            </Portal>
        </Menu.Root>
    );
};
