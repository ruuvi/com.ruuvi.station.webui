import { useEffect, useMemo, useRef, useState } from "react";
import NetworkApi from "../../NetworkApi";
import parse from "../../decoder/parser";

const REFRESH_INTERVAL_MS = (dataFrom) => 60 * 1000 * (dataFrom > 1 ? 5 : 1);

const useSensorData = (sensor, dataFrom, options = {}) => {
    const { fetchHistory = true } = options;

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(fetchHistory);
    const [loadingHistory, setLoadingHistory] = useState(fetchHistory);
    const [errorFetchingData, setErrorFetchingData] = useState(false);
    const [hasDataForTypes, setHasDataForTypes] = useState([]);

    const timerRef = useRef(null);
    const abortControllerRef = useRef(null);
    const sensorRef = useRef(sensor);

    useEffect(() => {
        sensorRef.current = sensor;
    }, [sensor]);

    useEffect(() => {
        abortControllerRef.current?.abort();
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        if (!fetchHistory) {
            abortControllerRef.current = null;
            setData(null);
            setHasDataForTypes([]);
            setLoading(false);
            setLoadingHistory(false);
            setErrorFetchingData(false);
            return () => {
                abortControllerRef.current?.abort();
                if (timerRef.current) {
                    clearTimeout(timerRef.current);
                    timerRef.current = null;
                }
            };
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        setLoading(true);
        setLoadingHistory(true);
        setErrorFetchingData(false);

        const runFetch = async () => {
            if (controller.signal.aborted) return;

            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }

            timerRef.current = setTimeout(runFetch, REFRESH_INTERVAL_MS(dataFrom));

            const currentSensor = sensorRef.current;
            const maxHistoryDays = currentSensor?.subscription?.maxHistoryDays ?? 0;

            if (maxHistoryDays === 0) {
                setLoading(false);
                setLoadingHistory(false);
                return;
            }

            const networkApi = new NetworkApi();
            const nowTs = Math.floor(Date.now() / 1000);
            const rangeStart = nowTs - 60 * 60 * dataFrom;

            try {
                const graphData = await networkApi.getAsync(
                    currentSensor.sensor,
                    parseInt(String(rangeStart), 10),
                    null,
                    { mode: dataFrom <= 12 ? "mixed" : "sparse" },
                    controller.signal,
                );

                if (graphData.result === "success") {
                    Object.keys(currentSensor)
                        .filter((key) => key.startsWith("offset"))
                        .forEach((key) => {
                            graphData.data[key] = currentSensor[key];
                        });

                    const parsedData = parse(graphData.data);
                    const dataTypes = parsedData.measurements.length
                        ? Object.keys(parsedData.measurements[0].parsed)
                        : [];

                    setData(parsedData);
                    setHasDataForTypes(dataTypes);
                    setErrorFetchingData(false);
                } else if (graphData.result === "error") {
                    console.log(graphData.error);
                    setErrorFetchingData(true);
                }
            } catch (error) {
                if (error.name === "AbortError") return;
                console.log("Error fetching graph data:", error);
                setErrorFetchingData(true);
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                    setLoadingHistory(false);
                }
            }
        };

        runFetch();

        return () => {
            abortControllerRef.current?.abort();
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [dataFrom, fetchHistory, sensor.sensor, sensor.subscription?.maxHistoryDays]);

    const latestReading = useMemo(() => {
        if (sensor.measurements.length === 1) {
            const [latest] = sensor.measurements;
            return { ...latest.parsed, timestamp: latest.timestamp };
        }
        return null;
    }, [sensor.measurements]);

    const measurements = useMemo(() => {
        const historical = data?.measurements ?? [];
        if (historical.length && sensor.measurements.length) {
            return [sensor.measurements[0], ...historical];
        }
        if (sensor.measurements.length) {
            return [sensor.measurements[0], ...historical];
        }
        return historical;
    }, [data, sensor.measurements]);

    return {
        data,
        latestReading,
        measurements,
        loading,
        loadingHistory,
        errorFetchingData,
        hasDataForTypes,
    };
};

export default useSensorData;
