import React from 'react';
import { Box, Button, Menu, MenuButton, MenuDivider, MenuItem, MenuList } from '@chakra-ui/react';
import { MdArrowDropDown } from 'react-icons/md';
import i18next from 'i18next';

export const SensorPicker = ({ sensors, canBeSelected, onSensorChange, normalStyle }) => {

    const handleSensorChange = (selectedSensor) => {
        onSensorChange(selectedSensor);
    };

    let style = {
        variant: "shareSensorSelect",
        style: { fontFamily: "mulish", fontSize: 15, fontWeight: 800, width: "250px", textAlign: "left" }
    }

    if (normalStyle) {
        style = {
            variant: "ddl",
            className: "durationPicker",
        }
    }

    return (
        <Menu autoSelect={false} placement="bottom-end">
            <MenuButton as={Button}
                {...style}
                borderRadius="4px"
                rightIcon={<MdArrowDropDown size={26} className="buttonSideIcon" style={{}} />}
            >
                <Box pl={1} className={normalStyle ? "ddlItemAlt" : ""}>
                    {i18next.t("sensors")}
                </Box>
            </MenuButton>
            <MenuList mt="2" zIndex={10} ml={2}>
                {sensors.map((x, i) => {
                    if (!x) return null;
                    let divider = <></>;
                    let borderStyle = {};
                    if (i === 0) borderStyle = { borderTopLeftRadius: 6, borderTopRightRadius: 6 };
                    if (i === sensors.length - 1) borderStyle = { borderBottomLeftRadius: 6, borderBottomRightRadius: 6 };
                    else divider = <MenuDivider />;
                    return <div key={x.sensor + "div"}>
                        <MenuItem key={x.sensor} isDisabled={canBeSelected && !canBeSelected.map(y => y.sensor).includes(x.sensor)} className={!normalStyle ? "ddlItem" : "ddlItemAlt"} style={{ ...borderStyle }} onClick={() => handleSensorChange(x.sensor)}>{x.name || x.sensor}</MenuItem>
                        {divider}
                    </div>;
                })}
            </MenuList>
        </Menu>
    );
};