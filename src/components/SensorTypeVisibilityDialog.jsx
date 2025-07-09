import React, { useState, useEffect, useRef } from "react";
import {
    Button,
    Switch,
    Box,
    List,
    ListItem,
    Flex,
    Text,
    IconButton,
    useColorModeValue,
    VStack,
    HStack
} from "@chakra-ui/react";
import { withTranslation } from 'react-i18next';
import RDialog from "./RDialog";
import { DEFAULT_VISIBLE_SENSOR_TYPES, getUnitHelper } from "../UnitHelper";
import Store from "../Store";
import SensorCard from "./SensorCard";
import { MdAdd, MdClose, MdUnfoldMore } from "react-icons/md";
import ConfirmationDialog from "./ConfirmationDialog";
import { getMappedAlertDataType } from "../utils/alertHelper";
import NetworkApi from "../NetworkApi";
import { addVariablesInString } from "../TextHelper";

const DONTT_SHOW_TYPES = ["txPower", "mac", "dataFormat", "flags", "timestamp"];

const getVisibleSensorTypesForSensor = (sensorId, graphType = "temperature") => {
    const store = new Store();
    const perSensorTypes = store.getPerSensorVisibleTypes(sensorId);

    if (perSensorTypes && perSensorTypes.length > 0) {
        return perSensorTypes;
    }

    return [...DEFAULT_VISIBLE_SENSOR_TYPES];
};

const SensorTypeVisibilityDialog = ({ open, onClose, t, sensor, graphType }) => {
    // Get available sensor types for filtering
    const getAvailableSensorTypes = () => {
        let availableTypes = [];
        if (sensor && sensor.measurements && sensor.measurements.length > 0) {
            if (sensor.measurements[0].parsed) {
                availableTypes = Object.keys(sensor.measurements[0].parsed);
            }
        }
        // filter out types that should not be shown
        return availableTypes.filter(type => !DONTT_SHOW_TYPES.includes(type));
    };

    const getInitialVisibleTypes = () => {
        let defaultTypes = getVisibleSensorTypesForSensor(sensor?.sensor);
        if (defaultTypes.length === 0) {
            defaultTypes = [...DEFAULT_VISIBLE_SENSOR_TYPES];
        }
        
        // Filter default types to only include those available on this sensor
        const availableTypes = getAvailableSensorTypes();
        if (availableTypes.length > 0) {
            defaultTypes = defaultTypes.filter(type => availableTypes.includes(type));
        }
        
        return defaultTypes;
    };

    const [visibleTypes, setVisibleTypes] = useState([]);
    const [customVisibleTypes, setCustomVisibleTypes] = useState([]);
    const [draggedItem, setDraggedItem] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const [useDefault, setUseDefault] = useState(false);
    const [confirmationDialog, setConfirmationDialog] = useState({ open: false, sensorType: null, affectedAlerts: [] });
    const dragCounter = useRef(0);

    const dragOverBg = useColorModeValue("blue.50", "blue.900");

    let avaiableSensorTypes = getAvailableSensorTypes();

    // if some sensor is selected but no measurements are available, add those to the list
    for (const type of visibleTypes) {
        if (!avaiableSensorTypes.includes(type)) {
            avaiableSensorTypes.push(type);
        }
    }

    useEffect(() => {
        if (open && sensor?.sensor) {
            const sensorId = sensor.sensor;
            const store = new Store();
            const savedCustomTypes = store.getPerSensorCustomTypes(sensorId);
            const savedUseDefault = store.getPerSensorUseDefault(sensorId);
            let initialTypes;

            if (savedCustomTypes && savedCustomTypes.length > 0) {
                console.log("Found custom settings for sensor:", savedCustomTypes, "useDefault:", savedUseDefault);
                initialTypes = savedCustomTypes;
                setCustomVisibleTypes(initialTypes);
            } else {
                console.log("No custom settings for sensor, creating default custom types, useDefault:", savedUseDefault);
                initialTypes = getInitialVisibleTypes();
                setCustomVisibleTypes(initialTypes);
            }

            setUseDefault(savedUseDefault);

            if (savedUseDefault) {
                setVisibleTypes(getInitialVisibleTypes());
            } else {
                setVisibleTypes(initialTypes);
            }
        } else if (open && !sensor?.sensor) {
            // Fallback when no sensor data available yet, should not happen in normal use
            const fallbackTypes = getInitialVisibleTypes();
            setVisibleTypes(fallbackTypes);
            setCustomVisibleTypes(fallbackTypes);
        }
    }, [open, sensor?.sensor]);

    useEffect(() => {
        if (useDefault) {
            setVisibleTypes(getInitialVisibleTypes());
        } else {
            setVisibleTypes(customVisibleTypes);
        }
    }, [useDefault, customVisibleTypes]);

    const getAlertTypeFromSensorType = (sensorType) => {
        const sensorTypeToAlertType = {
            "temperature": "temperature",
            "humidity": "humidity",
            "pressure": "pressure",
            "movementCounter": "movement",
            "rssi": "signal",
            "co2": "co2",
            "voc": "voc",
            "nox": "nox",
            "pm1p0": "pm10",
            "pm2p5": "pm25",
            "pm4p0": "pm40",
            "pm10p0": "pm100",
            "illuminance": "luminosity",
            "soundLevelAvg": "sound"
        };

        return sensorTypeToAlertType[sensorType] || null;
    };

    const hasEnabledAlerts = (sensorType) => {
        if (!sensor?.alerts) return [];

        const alertType = getAlertTypeFromSensorType(sensorType);
        if (!alertType) return [];

        return sensor.alerts.filter(alert =>
            alert.type === alertType && alert.enabled
        );
    };

    const disableAlertsForSensorType = async (sensorType) => {
        const enabledAlerts = hasEnabledAlerts(sensorType);

        for (const alert of enabledAlerts) {
            try {
                const disabledAlert = { ...alert, enabled: false, sensor: sensor.sensor };
                await new Promise((resolve) => {
                    new NetworkApi().setAlert(disabledAlert, resolve);
                });
            } catch (error) {
                console.error('Failed to disable alert:', error);
            }
        }
    };

    const toggleSensorType = (sensorType) => {
        const isRemoving = visibleTypes.includes(sensorType);

        if (isRemoving) {
            const enabledAlerts = hasEnabledAlerts(sensorType);

            if (enabledAlerts.length > 0) {
                setConfirmationDialog({
                    open: true,
                    sensorType: sensorType,
                    affectedAlerts: enabledAlerts
                });
                return;
            }
        }

        performToggleSensorType(sensorType);
    };

    const performToggleSensorType = (sensorType) => {
        const newTypes = (() => {
            if (visibleTypes.includes(sensorType)) {
                if (visibleTypes.length <= 1) return visibleTypes;

                return visibleTypes.filter(type => type !== sensorType);
            } else {
                return [...visibleTypes, sensorType];
            }
        })();

        setVisibleTypes(newTypes);

        if (!useDefault) {
            setCustomVisibleTypes(newTypes);
        }
    };

    const handleConfirmHideSensorType = async (confirmed) => {
        const { sensorType } = confirmationDialog;

        setConfirmationDialog({ open: false, sensorType: null, affectedAlerts: [] });

        if (confirmed && sensorType) {
            // Disable alerts for this sensor type
            await disableAlertsForSensorType(sensorType);

            // Now proceed with hiding the sensor type
            performToggleSensorType(sensorType);
        }
    };

    const moveSensorUp = (index) => {
        if (index > 0) {
            const newTypes = [...visibleTypes];
            [newTypes[index], newTypes[index - 1]] = [newTypes[index - 1], newTypes[index]];
            setVisibleTypes(newTypes);

            if (!useDefault) {
                setCustomVisibleTypes(newTypes);
            }
        }
    };

    const moveSensorDown = (index) => {
        if (index < visibleTypes.length - 1) {
            const newTypes = [...visibleTypes];
            [newTypes[index], newTypes[index + 1]] = [newTypes[index + 1], newTypes[index]];
            setVisibleTypes(newTypes);

            if (!useDefault) {
                setCustomVisibleTypes(newTypes);
            }
        }
    };

    const handleDragStart = (e, index) => {
        setDraggedItem(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverIndex(index);
    };

    const handleDragEnter = (e) => {
        e.preventDefault();
        dragCounter.current++;
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        dragCounter.current--;
        if (dragCounter.current === 0) {
            setDragOverIndex(null);
        }
    };

    const handleDrop = (e, dropIndex) => {
        e.preventDefault();
        dragCounter.current = 0;
        setDragOverIndex(null);

        if (draggedItem !== null && draggedItem !== dropIndex) {
            const newTypes = [...visibleTypes];
            const draggedSensor = newTypes[draggedItem];
            newTypes.splice(draggedItem, 1);
            newTypes.splice(dropIndex, 0, draggedSensor);
            setVisibleTypes(newTypes);

            if (!useDefault) {
                setCustomVisibleTypes(newTypes);
            }
        }
        setDraggedItem(null);
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
        setDragOverIndex(null);
        dragCounter.current = 0;
    };

    const handleSave = () => {
        if (!sensor?.sensor) {
            console.warn("No sensor ID available for saving visibility settings");
            return;
        }

        const sensorId = sensor.sensor;
        const store = new Store();

        store.setPerSensorVisibleTypes(sensorId, customVisibleTypes, useDefault);

        onClose();
    };

    const handleReset = () => {
        const resetTypes = getInitialVisibleTypes();

        setVisibleTypes(resetTypes);

        if (!useDefault) {
            setCustomVisibleTypes(resetTypes);
        }
    };

    const getSensorDisplayName = (sensorType) => {
        const unitHelper = getUnitHelper(sensorType);
        return t(unitHelper.label || sensorType);
    };

    const getSensorUnit = (sensorType) => {
        const unitHelper = getUnitHelper(sensorType);
        return unitHelper.unit || "";
    };

    const unselectedSensors = avaiableSensorTypes.filter(type => !visibleTypes.includes(type));


    const sensorTypeLeftSide = sensorType => {
        return <Box>
            <Text fontSize="md" fontWeight="medium">
                {getSensorDisplayName(sensorType)}
            </Text>
            <Text fontSize="xs" color="gray.500">
                {getSensorUnit(sensorType) && `(${getSensorUnit(sensorType)})`}
            </Text>
        </Box>
    }

    return (
        <RDialog title={t("visible_measurements")} isOpen={open} onClose={onClose} size="lg">
            <Box mb={4}>
                <Text fontSize="sm">
                    {t("visible_measurements_description")}
                </Text>
            </Box>
            <Box mb={4}>
                <Flex justify="space-between" align="center">
                    <Box>
                        <Text fontWeight="bold" fontSize="md">
                            {t("use_default")}
                        </Text>
                    </Box>
                    <Switch
                        size="md"
                        isChecked={useDefault}
                        onChange={(e) => setUseDefault(e.target.checked)}
                    />
                </Flex>
            </Box>

            <Box mb={4}>
                <Text fontWeight="bold" fontSize="md" mb={3}>
                    {t("preview")}
                </Text>
            </Box>

            <Box mb={4}>
                <div style={{ width: "75%", margin: "0 auto" }}>
                    {sensor && <SensorCard sensor={sensor} visibleSensorTypes={visibleTypes} graphType={null} />}
                </div>
            </Box>

            <Box mb={4}>
                <Text fontWeight="bold" fontSize="md" mb={3}>
                    {t("customisation_settings")}
                </Text>
            </Box>

            <Box mb={4}>
                <Text fontSize="sm" >
                    {t("customisation_settings_description")}
                </Text>
            </Box>

            <VStack
                align="stretch"
                overflowY="auto"
                gap={0}
                borderRadius={8}
                opacity={useDefault ? 0.4 : 1}
                pointerEvents={useDefault ? "none" : "auto"}
                transition="opacity 0.2s ease-in-out"
            >
                <Box className="visibilitySettingsTitle">
                    <Text fontWeight="bold" fontSize="md">
                        {t("show_measurements")}
                    </Text>
                </Box>
                {visibleTypes.length > 0 && (
                    <Box>
                        <List spacing={0}>
                            {visibleTypes.map((sensorType, index) => (
                                <ListItem
                                    key={`selected-${sensorType}`}
                                    className="visibilitySettingsItem"
                                    bg={dragOverIndex === index ? dragOverBg : undefined}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragEnter={handleDragEnter}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, index)}
                                    onDragEnd={handleDragEnd}
                                    cursor="move"
                                >
                                    <Flex justify="space-between" align="center">
                                        <HStack spacing={3}>
                                            {sensorTypeLeftSide(sensorType)}
                                        </HStack>
                                        <HStack spacing={2}>
                                            <MdUnfoldMore />

                                            <IconButton
                                                icon={<MdClose />}
                                                variant="ghost"
                                                onClick={() => toggleSensorType(sensorType)}
                                            />
                                        </HStack>
                                    </Flex>
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                )}

                {unselectedSensors.length > 0 && (
                    <Box>
                        <Box className="visibilitySettingsTitle">
                            <Text fontWeight="bold" fontSize="md">
                                {t("hide_measurements")}
                            </Text>
                        </Box>
                        <List spacing={0}>
                            {unselectedSensors.map(sensorType => {
                                return <ListItem key={`unselected-${sensorType}`} className="visibilitySettingsItem">
                                    <Flex justify="space-between" align="center">
                                        {sensorTypeLeftSide(sensorType)}
                                        <IconButton
                                            icon={<MdAdd />}
                                            variant="ghost"
                                            onClick={() => toggleSensorType(sensorType)}
                                        />
                                    </Flex>
                                </ListItem>
                            })}
                        </List>
                    </Box>
                )}
            </VStack>

            <Flex justify="space-between" mt={6}>
                <Text fontSize="sm" >
                </Text>
                <Flex gap={3}>
                    <Button onClick={onClose}>
                        {t("cancel")}
                    </Button>
                    <Button onClick={handleSave}>
                        {t("ok")}
                    </Button>
                </Flex>
            </Flex>

            <ConfirmationDialog
                open={confirmationDialog.open}
                title="dialog_are_you_sure"
                description={confirmationDialog.sensorType ?
                    t("hide_sensor_type_alert_warning") :
                    ""
                }
                onClose={handleConfirmHideSensorType}
            />
        </RDialog>
    );
};

export default withTranslation()(SensorTypeVisibilityDialog);