import React, { useEffect, useState } from "react";
import {
    Button,
    Switch,
    Box,
    Flex,
    Text,
} from "@chakra-ui/react";
import { withTranslation } from 'react-i18next';
import NetworkApi from "../../NetworkApi";
import notify from "../../utils/notify";
import RDialog from "./RDialog";

const PublicSensorDialog = ({ open, onClose, t, sensor, updateSensor }) => {
    const [isPublic, setIsPublic] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) setIsPublic(!!sensor?.public);
    }, [open, sensor]);

    const setPublic = (value) => {
        setIsPublic(value);
        setSaving(true);
        new NetworkApi().updateSensorData(sensor.sensor, { public: value }, resp => {
            setSaving(false);
            if (resp.result === "success") {
                notify.success(t("successfully_saved"));
                if (updateSensor) updateSensor({ ...sensor, public: value });
            } else {
                setIsPublic(!value);
                notify.error(t(`UserApiError.${resp.code}`));
            }
        });
    };

    // the link must target the environment the sensor was made public in
    const publicPath = new NetworkApi().isStaging() ? "/public-dev" : "/public";
    const publicUrl = `${window.location.origin}${publicPath}/${sensor?.sensor}`;

    return (
        <RDialog title={t("make_public")} isOpen={open} onClose={onClose} size="lg">
            <Box mb={4}>
                <Text fontSize="sm">
                    {t("make_public_description")}
                </Text>
            </Box>
            <Box mb={4}>
                <Flex justify="space-between" align="center">
                    <Box>
                        <Text fontWeight="bold" fontSize="md">
                            {t("public_sensor")}
                        </Text>
                        <Text fontSize="sm" color="gray.500">
                            {t("public_sensor_description")}
                        </Text>
                    </Box>
                    <Switch.Root
                        size="md"
                        checked={isPublic}
                        disabled={saving}
                        colorPalette="ruuvi"
                        onCheckedChange={e => setPublic(e.checked)}
                    >
                        <Switch.HiddenInput />
                        <Switch.Control />
                    </Switch.Root>
                </Flex>
            </Box>
            {isPublic && (
                <Box mb={4}>
                    <Text fontWeight="bold" fontSize="md" mb={2}>
                        {t("public_sensor_url")}
                    </Text>
                    <Box p={3} borderRadius={6} bg="whiteAlpha.200" border="1px" borderColor="gray.200">
                        <Text fontSize="sm" userSelect="all">
                            {publicUrl}
                        </Text>
                    </Box>
                </Box>
            )}
            <Flex justify="flex-end" gap={3} mt={6}>
                <Button onClick={onClose}>
                    {t("close")}
                </Button>
            </Flex>
        </RDialog>
    );
};

export default withTranslation()(PublicSensorDialog);
