import React, { useEffect, useRef, useState } from "react";
import logger from "../utils/logger";
import NetworkApi from "../NetworkApi";
import parse from "../decoder/parser";
import Sensor from "./Sensor";
import { Box, Spinner, Text } from "@chakra-ui/react";
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

    if (errorKey) {
        return <Box style={{ margin: 64 }} textAlign="center">
            <Text fontFamily="mulish" fontSize="lg">{t(errorKey)}</Text>
        </Box>;
    }

    if (loading && !sensor) {
        return <center style={{ margin: 64 }}>
            <Spinner size="xl" />
        </center>;
    }

    if (!sensor) {
        return <Box style={{ margin: 64 }} textAlign="center">
            <Text fontFamily="mulish" fontSize="lg">{t("UserApiError.ER_SENSOR_NOT_FOUND")}</Text>
        </Box>;
    }

    return <Sensor sensor={sensor} isPublic />;
}

export default PublicSensor;
