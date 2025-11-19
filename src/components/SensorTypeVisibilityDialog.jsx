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
import { DEFAULT_VISIBLE_SENSOR_TYPES, getUnitHelper, getUnitSettingFor } from "../UnitHelper";
import SensorCard from "./SensorCard";
import { MdAdd, MdClose, MdUnfoldMore } from "react-icons/md";
import ConfirmationDialog from "./ConfirmationDialog";
import NetworkApi from "../NetworkApi";
import { visibilityCodes, visibilityFromCloudToWeb, visibilityFromWebToCloud } from "../utils/cloudTranslator";
import notify from "../utils/notify";

const SensorTypeVisibilityDialog = ({ open, onClose, t, sensor, graphType, updateSensor }) => {
    const [isSaving, setIsSaving] = useState(false);
    const getAvailableSensorTypes = (dataObj) => {
        let availableTypes = [];
        if (sensor && sensor.measurements && sensor.measurements.length > 0) {
            if (sensor.measurements[0].parsed) {
                availableTypes = Object.keys(sensor.measurements[0].parsed);
            }
        }
        if (dataObj) return availableTypes;
        return visibilityCodes.filter(code => availableTypes.includes(code[1])).map(code => code[0]);
    };

    const getPreferredUnitKeyForType = (type) => {
        switch (type) {
            case "temperature":
            case "humidity":
            case "pressure":
            case "voc":
                return getUnitSettingFor(type);
            default:
                return null;
        }
    };

    const getInitialVisibleTypes = () => {
        const availableCodes = getAvailableSensorTypes();
        if (!availableCodes || availableCodes.length === 0) return [];

        const availableCodeSet = new Set(availableCodes);
        const availableWebTypes = getAvailableSensorTypes(true);

        const defaultTypeCandidates = availableWebTypes.length > 0
            ? DEFAULT_VISIBLE_SENSOR_TYPES.filter(type => availableWebTypes.includes(type))
            : [];

        const resolvedDefaults = [];

        for (const type of defaultTypeCandidates) {
            const preferredUnit = getPreferredUnitKeyForType(type);
            if (preferredUnit) {
                const preferredCloudCode = visibilityFromWebToCloud(preferredUnit, type);
                if (preferredCloudCode && availableCodeSet.has(preferredCloudCode)) {
                    resolvedDefaults.push(preferredCloudCode);
                    continue;
                }
            }

            const fallbackCloudCode = availableCodes.find(code => {
                const mapping = visibilityFromCloudToWeb(code);
                return mapping && mapping[0] === type;
            });

            if (fallbackCloudCode) {
                resolvedDefaults.push(fallbackCloudCode);
            }
        }

        return resolvedDefaults;
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
            const savedCustomTypes = sensor.settings?.displayOrder ? JSON.parse(sensor.settings.displayOrder) : [];
            const savedUseDefault = (sensor.settings?.defaultDisplayOrder || "true") === "true";
            const availableCodes = getAvailableSensorTypes();
            const hasAvailableCodes = availableCodes.length > 0;
            const availableCodeSet = new Set(availableCodes);

            const sanitizedCustomTypes = savedCustomTypes && savedCustomTypes.length > 0
                ? (hasAvailableCodes ? savedCustomTypes.filter(type => availableCodeSet.has(type)) : savedCustomTypes)
                : [];

            const defaultTypes = getInitialVisibleTypes();
            const initialCustomTypes = sanitizedCustomTypes.length > 0
                ? sanitizedCustomTypes
                : defaultTypes;

            setCustomVisibleTypes(initialCustomTypes);
            setUseDefault(savedUseDefault);

            if (savedUseDefault) {
                setVisibleTypes(defaultTypes);
            } else {
                setVisibleTypes(initialCustomTypes);
            }
        } else if (open && !sensor?.sensor) {
            // Fallback when no sensor data available yet, should not happen in normal use
            const fallbackTypes = [];
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
            "movementCounter": "movement",
            "rssi": "signal",
            "illuminance": "luminosity",
            "soundLevelAvg": "sound"
        };

        return sensorTypeToAlertType[sensorType] || sensorType || null;
    };

    const hasEnabledAlerts = (sensorType) => {
        if (!sensor?.alerts) return [];


        let webTypeSensorType = getWebTypeFromSensorType(sensorType);
        const alertType = getAlertTypeFromSensorType(webTypeSensorType);
        if (!alertType) return [];

        const otherVisibleSameAlertType = visibleTypes.some(vt => {
            if (vt === sensorType) return false;
            const vtWeb = getWebTypeFromSensorType(vt);
            return getAlertTypeFromSensorType(vtWeb) === alertType;
        });
        if (otherVisibleSameAlertType) return [];


        return sensor.alerts.filter(alert =>
            alert.type === alertType && alert.enabled
        );
    };

    const getOrphanedAlerts = (targetVisibleTypes) => {
        if (!sensor?.alerts) return [];

        const orphanedAlerts = [];
        const enabledAlerts = sensor.alerts.filter(a => a.enabled);

        for (const alert of enabledAlerts) {
            const isSupported = targetVisibleTypes.some(vt => {
                let webType = getWebTypeFromSensorType(vt);
                const alertType = getAlertTypeFromSensorType(webType);
                return alertType === alert.type;
            });

            if (!isSupported) {
                orphanedAlerts.push(alert);
            }
        }
        return orphanedAlerts;
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
        const { sensorType, alertsToDisable } = confirmationDialog;

        setConfirmationDialog({ open: false, sensorType: null, affectedAlerts: [], alertsToDisable: null });

        if (confirmed) {
            if (sensorType) {
                await disableAlertsForSensorType(sensorType);
                performToggleSensorType(sensorType);
            } else if (alertsToDisable) {
                for (const alert of alertsToDisable) {
                    try {
                        const disabledAlert = { ...alert, enabled: false, sensor: sensor.sensor };
                        await new Promise((resolve) => {
                            new NetworkApi().setAlert(disabledAlert, resolve);
                        });
                    } catch (error) {
                        console.error('Failed to disable alert:', error);
                    }
                }
                setUseDefault(true);
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

    const handleUseDefaultChange = (checked) => {
        if (checked) {
            const defaultTypes = getInitialVisibleTypes();
            const orphanedAlerts = getOrphanedAlerts(defaultTypes);

            if (orphanedAlerts.length > 0) {
                setConfirmationDialog({
                    open: true,
                    sensorType: null,
                    affectedAlerts: orphanedAlerts,
                    alertsToDisable: orphanedAlerts
                });
                return;
            }
        }

        if (!checked && customVisibleTypes.length === 0) {
            const defaults = getInitialVisibleTypes();
            setCustomVisibleTypes(defaults);
            setVisibleTypes(defaults);
        }
        setUseDefault(checked);
    };

    const handleSave = async () => {
        if (!sensor?.sensor) {
            console.warn("No sensor ID available for saving visibility settings");
            return;
        }
        setIsSaving(true);
        try {
            let data = await new NetworkApi().updateSensorSetting(sensor.sensor, ["defaultDisplayOrder", "displayOrder"], [useDefault ? "true" : "false", JSON.stringify(customVisibleTypes)]);
            if (!data || data.result !== "success") {
                notify.error(t("failed_to_save_visibility_settings"));
                setIsSaving(false);
                return
            }

            // Update the sensor object with the new visibility settings
            if (updateSensor) {
                const updatedSensor = {
                    ...sensor,
                    settings: {
                        ...(sensor.settings || {}),
                        defaultDisplayOrder: useDefault ? "true" : "false",
                        displayOrder: JSON.stringify(customVisibleTypes)
                    }
                };
                updateSensor(updatedSensor);
            }
            onClose();
        } catch (error) {
            console.error("Failed to save visibility settings:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const getWebTypeFromSensorType = (sensorType) => {
        if (sensorType.indexOf("_") !== -1) {
            let webType = visibilityFromCloudToWeb(sensorType);
            if (!webType) return sensorType;
            return webType[0];
        }
        return sensorType;
    };

    const getSensorDisplayName = (sensorType) => {
        let unit = null;
        if (sensorType.indexOf("_") !== -1) {
            let webType = visibilityFromCloudToWeb(sensorType)
            if (!webType) return sensorType;
            const [type, _unit] = webType;
            unit = _unit;
            sensorType = type
        }
        const unitHelper = getUnitHelper(sensorType, true, unit);
        return t(unitHelper.shortLabel || sensorType);
    };

    const getSensorUnit = (sensorType) => {
        if (sensorType.indexOf("_") !== -1) {
            let webType = visibilityFromCloudToWeb(sensorType)
            if (!webType) return sensorType;
            const [type, unit] = webType;
            let uh = getUnitHelper(type);
            if (uh && uh.units) {
                for (const u of uh.units) {
                    if (u.cloudStoreKey === unit) {
                        return u.translationKey;
                    }
                }
            }
            return unit;
        }
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
                        colorScheme="buttonIconScheme"
                        onChange={(e) => handleUseDefaultChange(e.target.checked)}
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
                    {sensor && <SensorCard sensor={sensor} visibleSensorTypes={useDefault ? "default" : visibleTypes} graphType={null} />}
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
                                            <MdUnfoldMore opacity={0.6} className="visibilityListIcons" />
                                            {sensorTypeLeftSide(sensorType)}
                                        </HStack>
                                        <HStack spacing={2}>
                                            <IconButton
                                                icon={<MdClose className="visibilityListIcons" />}
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
                                            icon={<MdAdd className="visibilityListIcons" />}
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
                    <Button onClick={handleSave} isLoading={isSaving}>
                        {t("ok")}
                    </Button>
                </Flex>
            </Flex>

            <ConfirmationDialog
                open={confirmationDialog.open}
                title="dialog_are_you_sure"
                description={confirmationDialog.sensorType || confirmationDialog.alertsToDisable ?
                    t("hide_sensor_type_alert_warning") :
                    ""
                }
                onClose={handleConfirmHideSensorType}
            />
        </RDialog>
    );
};

export default withTranslation()(SensorTypeVisibilityDialog);