import React, { useEffect, useRef, useState } from "react";
import logger from "../utils/logger";
import NetworkApi from "../NetworkApi";
import parse from "../decoder/parser";
import Sensor from "./Sensor";
import { Box, Spinner, Text, Button } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import pjson from "../../package.json";

// /get does not include the owner's plan details, so assume a history window
// here; the backend enforces the real limit on the history requests anyway.
const PUBLIC_SENSOR_DEFAULTS = {
    alerts: [],
    settings: null,
    subscription: { maxHistoryDays: 90, pdfExportAllowed: false },
};

function PublicSensor() {
    const { id } = useParams();
    const { t } = useTranslation();
    const [sensor, setSensor] = useState(null);
    const [errorKey, setErrorKey] = useState(null);
    const [loading, setLoading] = useState(true);
    const hasSensorRef = useRef(false);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                // Public sensors are served by /get without authentication (and to
                // any authenticated user); non-public sensors return ER_FORBIDDEN.
                const resp = await new NetworkApi().request(
                    `/get?sensor=${encodeURIComponent(id)}&mode=dense&limit=1`,
                    { timeout: 30000 }
                );
                if (cancelled) return;
                if (resp.result === "success") {
                    const sensorObj = {
                        ...PUBLIC_SENSOR_DEFAULTS,
                        ...resp.data,
                        subscription: { ...PUBLIC_SENSOR_DEFAULTS.subscription, ...resp.data.subscription },
                        offsetTemperature: resp.data.offsetTemperature || 0,
                        offsetHumidity: resp.data.offsetHumidity || 0,
                        offsetPressure: resp.data.offsetPressure || 0,
                        public: true,
                    };
                    parse(sensorObj);
                    // The sensor views expect at most the latest measurement here;
                    // history is fetched separately by the Sensor view.
                    sensorObj.measurements = sensorObj.measurements.slice(0, 1);
                    if (!sensorObj.name) {
                        const splitMac = sensorObj.sensor.split(":");
                        sensorObj.name = "Ruuvi " + splitMac[4] + splitMac[5];
                    }
                    sensorObj.name = sensorObj.name.substring(0, pjson.settings.sensorNameMaxLength);
                    hasSensorRef.current = true;
                    setSensor(sensorObj);
                    setErrorKey(null);
                } else {
                    setErrorKey(`UserApiError.${resp.code || "ER_FORBIDDEN"}`);
                }
            } catch (e) {
                logger.error("failed to load public sensor", e);
                if (!cancelled && !hasSensorRef.current) setErrorKey("internet_connection_problem");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        // keep the latest reading fresh; the Sensor view refreshes history itself
        const intervalId = setInterval(load, 60 * 1000);
        return () => { cancelled = true; clearInterval(intervalId); };
    }, [id]);

    useEffect(() => {
        if (!sensor) return;

        const previousTitle = document.title;
        const sensorName = sensor.name || t("unnamed_sensor");

        const latest = sensor.measurements?.[0]?.parsed;
        let title = `${sensorName} | Ruuvi Station`;

        if (latest) {
            const parts = [];
            if (latest.temperature !== undefined) parts.push(`${Number(latest.temperature).toFixed(1)}°C`);
            if (latest.humidity !== undefined) parts.push(`${Number(latest.humidity).toFixed(1)}%`);
            if (latest.pressure !== undefined) parts.push(`${Math.round(Number(latest.pressure) / 100)} hPa`);
            if (parts.length > 0) {
                title = `${sensorName} (${parts.slice(0, 2).join(", ")}) | Ruuvi Station`;
            }
        }

        document.title = title;

        return () => {
            document.title = previousTitle;
        };
    }, [sensor, t]);

    if (errorKey) {
        return (
            <Box maxW="500px" mx="auto" my={16} p={8} textAlign="center">
                <Text fontFamily="mulish" fontSize="xl" fontWeight="bold" mb={2}>
                    {t("error")}
                </Text>
                <Text fontFamily="mulish" fontSize="md" color="gray.500" mb={6}>
                    {t(errorKey)}
                </Text>
                <Button onClick={() => window.location.href = "/"} colorPalette="ruuvi">
                    {t("login_to_ruuvi_station")}
                </Button>
            </Box>
        );
    }

    if (loading && !sensor) {
        return (
            <center style={{ margin: 96 }}>
                <Spinner size="xl" />
            </center>
        );
    }

    if (!sensor) {
        return (
            <Box maxW="500px" mx="auto" my={16} p={8} textAlign="center">
                <Text fontFamily="mulish" fontSize="xl" fontWeight="bold" mb={2}>
                    {t("UserApiError.ER_SENSOR_NOT_FOUND")}
                </Text>
                <Text fontFamily="mulish" fontSize="md" color="gray.500" mb={6}>
                    {t(errorKey || "network_error")}
                </Text>
                <Button onClick={() => window.location.href = "/"} colorPalette="ruuvi">
                    {t("login_to_ruuvi_station")}
                </Button>
            </Box>
        );
    }

    return <Sensor sensor={sensor} isPublic />;
}

export default PublicSensor;
