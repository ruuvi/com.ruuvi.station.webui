import React, { useEffect, useRef, useState } from "react";
import logger from "../utils/logger";
import NetworkApi from "../NetworkApi";
import SensorCard from "../components/sensor/SensorCard";
import Sensor from "./Sensor";
import { Spinner, Box, Link, useMediaQuery, Flex, Input, InputGroup, InputRightElement, Show } from "@chakra-ui/react"
import { withTranslation } from 'react-i18next';
import DurationPicker from "../components/common/DurationPicker";
import Store from "../Store";
import SessionStore from "../SessionStore";
import notify from "../utils/notify";
import { withColorMode } from "../utils/withColorMode";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import SensorTypePicker from "../components/sensor/SensorTypePicker";
import DashboardViewType from "../components/common/DashboardViewType";
import { SearchIcon, CloseIcon } from "@chakra-ui/icons";
import { getSetting } from "../UnitHelper";
import EditNameDialog from "../components/dialogs/EditNameDialog";
import ConfirmationDialog from "../components/dialogs/ConfirmationDialog";

const infoText = {
    fontFamily: "mulish",
    fontSize: 16,
}

function debounce(func, delay) {
    let timeout;
    const debounced = function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
    debounced.cancel = () => clearTimeout(timeout);
    return debounced;
}

function DashboardGrid(props) {
    const [isLargeDisplay] = useMediaQuery("(min-width: 1700px)", { ssr: false });
    const [isMediumDisplay] = useMediaQuery("(min-width: 1024px)", { ssr: false });
    const gridRef = useRef(null);
    const [containerWidth, setContainerWidth] = useState(0);
    const debouncedOnSizeChange = useRef(debounce(props.onSizeChange, 150)).current;

    const debouncedWindowResizeHandlerRef = useRef(null);
    const debouncedResizeObserverHandlerRef = useRef(null);

    let size = "";
    if (isLargeDisplay) size = "large";
    else if (isMediumDisplay) size = "medium";
    else size = "mobile";

    if (props.currSize !== size) {
        debouncedOnSizeChange(size);
    }

    const gap = size === "mobile" ? 10 : 20;
    const minCardWidth = isLargeDisplay ? 450 : isMediumDisplay ? 350 : props.showGraph ? 280 : 320;
    const columnCount = containerWidth > 0
        ? Math.max(1, Math.floor((containerWidth + gap) / (minCardWidth + gap)))
        : 1;

    // Effect for setting up observers and listeners that update containerWidth
    useEffect(() => {
        if (props.disableAdaptiveLayout) return;

        if (!debouncedWindowResizeHandlerRef.current) {
            debouncedWindowResizeHandlerRef.current = debounce(() => {
                if (gridRef.current) {
                    setContainerWidth(gridRef.current.clientWidth);
                }
            }, 100);
        }

        if (!debouncedResizeObserverHandlerRef.current) {
            debouncedResizeObserverHandlerRef.current = debounce(newWidth => {
                setContainerWidth(newWidth);
            }, 50);
        }

        const resizeObserverInstance = new ResizeObserver(entries => {
            for (let entry of entries) {
                debouncedResizeObserverHandlerRef.current(entry.contentRect.width);
            }
        });

        if (gridRef.current) {
            resizeObserverInstance.observe(gridRef.current);
            window.addEventListener('resize', debouncedWindowResizeHandlerRef.current);
            setContainerWidth(gridRef.current.clientWidth);
        }

        const handlerToRemove = debouncedWindowResizeHandlerRef.current;
        return () => {
            resizeObserverInstance.disconnect();
            if (handlerToRemove) {
                window.removeEventListener('resize', handlerToRemove);
            }
            if (debouncedWindowResizeHandlerRef.current && typeof debouncedWindowResizeHandlerRef.current.cancel === 'function') {
                debouncedWindowResizeHandlerRef.current.cancel();
            }
            if (debouncedResizeObserverHandlerRef.current && typeof debouncedResizeObserverHandlerRef.current.cancel === 'function') {
                debouncedResizeObserverHandlerRef.current.cancel();
            }
        };
    }, [props.disableAdaptiveLayout]);

    useEffect(() => {
        if (props.disableAdaptiveLayout) return;

        if (!gridRef.current || containerWidth === 0) {
            if (gridRef.current) gridRef.current.style.height = '0px';
            return;
        }

        const items = gridRef.current.querySelectorAll('.masonry-item');
        if (!items || items.length === 0) {
            gridRef.current.style.height = '0px';
            return;
        }

        const calculateGridDimensions = () => {
            if (!gridRef.current || !containerWidth) return { columnWidth: minCardWidth, columnCount: 1 };
            let columnCount = Math.max(1, Math.floor((containerWidth + gap) / (minCardWidth + gap)));
            const columnWidthVal = Math.floor((containerWidth - (gap * (columnCount - 1))) / columnCount);
            return { columnWidth: columnWidthVal, columnCount };
        };

        const performLayout = () => {
            if (!gridRef.current) return;

            gridRef.current.style.height = '';
            const { columnWidth: calculatedColumnWidth, columnCount } = calculateGridDimensions();

            if (columnCount <= 0 || calculatedColumnWidth <= 0) {
                gridRef.current.style.height = '0px';
                return;
            }

            const columnHeights = Array(columnCount).fill(0);

            Array.from(items).forEach(item => {
                item.style.width = `${calculatedColumnWidth}px`;
            });

            gridRef.current.offsetHeight;

            Array.from(items).forEach(item => {
                const minColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
                const x = minColumnIndex * (calculatedColumnWidth + gap);
                const y = columnHeights[minColumnIndex];

                item.style.transform = `translate(${x}px, ${y}px)`;
                columnHeights[minColumnIndex] += item.offsetHeight;
            });

            if (columnHeights.length > 0) {
                const maxHeight = Math.max(...columnHeights);
                gridRef.current.style.height = `${Math.max(0, maxHeight - gap)}px`;
            } else {
                gridRef.current.style.height = '0px';
            }
        };

        requestAnimationFrame(performLayout);

        const cardResizeObserver = new ResizeObserver(debounce(() => {
            requestAnimationFrame(performLayout);
        }, 50));

        const resizeObsTimeout = setTimeout(() => {
            Array.from(items).forEach(item => {
                cardResizeObserver.observe(item);
            });
        }, 100);

        return () => {
            clearTimeout(resizeObsTimeout);
            cardResizeObserver.disconnect();
        };

    }, [containerWidth, size, props.order, props.sensors, gap, minCardWidth, props.disableAdaptiveLayout]);

    // Non-adaptive layout: simple CSS grid with equal height rows
    if (props.disableAdaptiveLayout) {
        const simpleMinCardWidth = isLargeDisplay ? 500 : isMediumDisplay ? 400 : props.showGraph ? 300 : 360;
        return (
            <Box
                key="non-adaptive"
                style={{ marginBottom: 30, marginTop: 10 }}
                justifyItems="start"
                display="grid"
                gap={gap + "px"}
                gridTemplateColumns={`repeat(auto-fit, minmax(${simpleMinCardWidth}px, max-content))`}
            >
                {props.children(size, null)}
            </Box>
        );
    }

    return (
        <Box
            key="adaptive"
            ref={gridRef}
            className="masonry-grid"
            sx={{
                marginBottom: "30px",
                marginTop: "10px",
                position: "relative",
                display: "grid",
                gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))`,
                columnGap: `${gap}px`,
                rowGap: `${gap}px`,
                "& > span": {
                    position: "absolute",
                    transition: "transform 0.2s ease, width 0.2s ease",
                }
            }}
        >
            {props.children(size, columnCount)}
        </Box>
    );
}

const getSensorCache = () => {
    let sensors = localStorage.getItem("sensors")
    if (!sensors) return []
    return JSON.parse(sensors)
}

function getOrder() {
    let order = getSetting("SENSOR_ORDER", null)
    if (order) {
        order = JSON.parse(order)
        if (order && order.length) {
            return order
        }
    }
    return null
}

function addRuuviLink(text) {
    var splitted = text.split("ruuvi.com")
    if (splitted.length === 1) return text;
    var out = [<span>{splitted[0]}</span>]
    for (var i = 1; i < splitted.length; i++) {
        out.push(<Link href="https://ruuvi.com" isExternal color="primary">ruuvi.com</Link>)
        out.push(<span>{splitted[i]}</span>);
    }
    return out;
}

function Dashboard(props) {
    const { t, params, location, navigate, reloadTags, settingsVersion } = props;

    const [loading, setLoading] = useState(() => getSensorCache().length === 0);
    const [sensors, setSensors] = useState(getSensorCache);
    const [from, setFrom] = useState(() => {
        let f = Store.getDashboardFrom();
        if (f) {
            if (f > 24 * 7) f = 24 * 7;
            return f;
        }
        return 24 * 3;
    });
    const [cardType, setCardTypeState] = useState(Store.getDashboardCardType());
    const [graphType, setGraphTypeState] = useState(null);
    const [search, setSearch] = useState("");
    const [currSize, setCurrSize] = useState('');
    const [rename, setRename] = useState(null);
    const [showResetOrderConfirmation, setShowResetOrderConfirmation] = useState(false);
    const [order, setOrder] = useState(getOrder);
    const [disableAdaptiveLayout, setDisableAdaptiveLayout] = useState(Store.getDashboardDisableAdaptiveLayout());

    const isUnmountedRef = useRef(false);
    const fetchInProgressRef = useRef(false);
    const dataRefreshTimerRef = useRef(null);
    const prevOrderStringRef = useRef(order ? JSON.stringify(order) : null);
    const fetchDataRef = useRef(null);
    const reloadTagsRef = useRef(reloadTags);
    reloadTagsRef.current = reloadTags;

    useEffect(() => {
        document.title = "Ruuvi Station";
    }, [params.id]);

    // Detect external localStorage order changes (e.g. from another tab)
    useEffect(() => {
        const latestOrder = getOrder();
        const latestOrderString = latestOrder ? JSON.stringify(latestOrder) : null;
        const currentOrderString = order ? JSON.stringify(order) : null;
        const previousOrderString = prevOrderStringRef.current;
        prevOrderStringRef.current = currentOrderString;

        if (latestOrderString !== currentOrderString && latestOrderString !== previousOrderString) {
            setOrder(latestOrder ? [...latestOrder] : null);
        }
    }, [order]);

    function getCurrentSensor() {
        return sensors.find(x => x.sensor === params.id);
    }

    function updateFrom(v) {
        setFrom(v);
        Store.setDashboardFrom(v);
    }

    function updateOrder(newOrder) {
        setOrder([...newOrder]);
        try {
            let settings = JSON.parse(localStorage.getItem("settings") || "{}");
            settings["SENSOR_ORDER"] = JSON.stringify(newOrder);
            localStorage.setItem("settings", JSON.stringify(settings));
        } catch { /* ignore */ }
        new NetworkApi().setSetting("SENSOR_ORDER", JSON.stringify(newOrder), b => {
            if (b.result === "success") {
                new NetworkApi().getSettings(settings => {
                    if (settings.result === "success") {
                        localStorage.setItem("settings", JSON.stringify(settings.data.settings));
                        if (reloadTagsRef.current) reloadTagsRef.current();
                    }
                });
            } else if (b.result === "error") {
                notify.error(`UserApiError.${t(b.code)}`);
            }
        }, error => {
            logger.error(error);
            notify.error(t("something_went_wrong"));
        });
    }

    function checkSensorOrder(currentSensors) {
        const currentOrder = getOrder();
        if (!currentOrder) return;
        let orderCopy = JSON.parse(JSON.stringify(currentOrder));
        const sensorIds = currentSensors.map(x => x.sensor);
        for (let i = 0; i < sensorIds.length; i++) {
            if (!orderCopy.includes(sensorIds[i])) {
                orderCopy = [...orderCopy, sensorIds[i]];
            }
        }
        if (orderCopy.length !== currentOrder.length) {
            updateOrder(orderCopy);
        }
    }

    async function fetchData() {
        if (isUnmountedRef.current) return;
        if (fetchInProgressRef.current) return;

        fetchInProgressRef.current = true;
        const api = new NetworkApi();
        let success = false;
        try {
            const resp = await api.getAllSensorsAsync(true);
            if (!isUnmountedRef.current && resp.result === "success") {
                success = true;
                const newSensors = resp.data.sensors;
                if (!isUnmountedRef.current) {
                    setSensors(newSensors);
                    setLoading(false);
                    localStorage.setItem("sensors", JSON.stringify(newSensors));
                    checkSensorOrder(newSensors);
                }
            }
        } catch (e) {
            logger.error("failed to load sensors", e);
        } finally {
            fetchInProgressRef.current = false;
        }

        if (isUnmountedRef.current) return;

        clearTimeout(dataRefreshTimerRef.current);
        const delay = success ? 60_000 : 2_000;
        dataRefreshTimerRef.current = setTimeout(() => fetchDataRef.current(), delay);
    }
    fetchDataRef.current = fetchData;

    useEffect(() => {
        isUnmountedRef.current = false;
        fetchInProgressRef.current = false;
        fetchDataRef.current();
        return () => {
            isUnmountedRef.current = true;
            clearTimeout(dataRefreshTimerRef.current);
        };
    }, []);

    function nextIndex(direction) {
        const currentSensor = getCurrentSensor();
        if (!currentSensor) return;
        const current = currentSensor.sensor;
        let setNext = current;
        let sensorIds = sensors.map(x => x.sensor);
        const currentOrder = getOrder();
        if (currentOrder) sensorIds = currentOrder;
        const indexOfCurrent = sensorIds.findIndex(x => x === current);
        if (indexOfCurrent === -1) return;

        const existingSensorIds = new Set(sensors.map(x => x.sensor));
        const sensorsCount = sensorIds.length;
        for (let i = 1; i <= sensorsCount; i++) {
            let nextIdx;
            if (direction === 1) {
                nextIdx = (indexOfCurrent + i) % sensorsCount;
            } else {
                nextIdx = (indexOfCurrent - i + sensorsCount) % sensorsCount;
            }
            const candidateSensor = sensorIds[nextIdx];
            if (existingSensorIds.has(candidateSensor)) {
                setNext = candidateSensor;
                break;
            } else {
                logger.log(`Sensor ${candidateSensor} does not exist in state, skipping.`);
            }
        }

        if (setNext !== current) {
            navigate('/' + setNext + location.search);
        }
    }

    function removeSensor() {
        const current = getCurrentSensor().sensor;
        setSensors(prev => prev.filter(x => x.sensor !== current));
        localStorage.removeItem("sensors");
        navigate('/');
        reloadTagsRef.current();
    }

    function updateSensor(sensor) {
        setSensors(prev => {
            const idx = prev.findIndex(x => x.sensor === sensor.sensor);
            if (idx > -1) {
                const next = [...prev];
                next[idx] = sensor;
                localStorage.removeItem("sensors");
                return next;
            }
            return prev;
        });
        reloadTagsRef.current();
    }

    function setDashboardViewType(type) {
        setCardTypeState(type);
        Store.setDashboardCardType(type);
    }

    function getSensors() {
        if (search === "") return sensors;
        const searchTerm = search.toLowerCase();
        return sensors.filter(x => x.name.toLowerCase().indexOf(searchTerm) !== -1);
    }

    function shouldDurationBeDisabled() {
        const graphCardTypes = ['graph_view', 'image_graph_view'];
        return !graphCardTypes.includes(cardType);
    }

    function resetOrder(yes) {
        setShowResetOrderConfirmation(false);
        if (yes) updateOrder([]);
    }

    function removeSensorFromState(mac) {
        setSensors(prev => prev.filter(x => x.sensor !== mac));
    }

    const currentSensor = getCurrentSensor();
    if (params.id) SessionStore.setBackRoute(`/${params.id}`);
    else SessionStore.setBackRoute("/");

    const dropdowns = <>
        <DashboardViewType value={cardType}
            onChange={setDashboardViewType}
            showResetOrder={getOrder() !== null}
            resetOrder={() => setShowResetOrderConfirmation(true)}
            adaptiveLayout={!disableAdaptiveLayout}
            setAdaptiveLayout={() => {
                setDisableAdaptiveLayout(prev => {
                    const nextVal = !prev;
                    Store.setDashboardDisableAdaptiveLayout(nextVal);
                    return nextVal;
                });
            }}
        />
        <SensorTypePicker dashboard value={graphType} onChange={type => setGraphTypeState(type)} sensors={sensors} />
        <DurationPicker value={from} onChange={v => updateFrom(v)} dashboard disabled={shouldDurationBeDisabled()} />
    </>

    const renderSearch = width => (
        <InputGroup width={width}>
            <InputRightElement className="buttonSideIcon" style={{ cursor: search ? "pointer" : undefined }} onClick={() => setSearch("")}>
                {search ? <CloseIcon /> : <SearchIcon />}
            </InputRightElement>
            <Input placeholder={t("sensor_search_placeholder")}
                className="searchInput"
                borderRadius={5}
                value={search}
                onChange={e => {
                    setSearch(e.target.value);
                    if (e.target.value === "set_staging") {
                        let staging = new NetworkApi().isStaging();
                        if (staging) {
                            if (window.confirm("Switch back to production environment?") === false) return;
                            new NetworkApi().setEnv("production");
                            window.location.reload();
                        } else {
                            if (window.confirm("Are you sure you want to switch to staging environment?") === false) return;
                            new NetworkApi().setEnv("staging");
                            window.location.reload();
                        }
                    }
                }}
            />
        </InputGroup>
    );

    const sensorCard = (x, size, sensorsInSearch, columnCount) => {
        if (!x) return null;
        const hide = sensorsInSearch.find(y => y.sensor === x.sensor) === undefined;
        const isAdaptive = !disableAdaptiveLayout;
        const wrapperStyle = isAdaptive
            ? { maxWidth: "100%", display: hide ? "none" : undefined }
            : { width: 640, maxWidth: "100%", display: hide ? "none" : "flex", flexDirection: "column" };
        return <span className={isAdaptive ? "masonry-item" : undefined} key={x.sensor} style={wrapperStyle}>
            <span
                role="link"
                onClick={() => navigate('/' + x.sensor)}
                style={{ cursor: 'pointer', display: isAdaptive ? undefined : "block", height: isAdaptive ? undefined : "100%", flex: isAdaptive ? undefined : 1 }}
            >
                <SensorCard sensor={x}
                    settingsVersion={settingsVersion}
                    size={size}
                    adaptiveLayout={!disableAdaptiveLayout}
                    columnCount={columnCount}
                    dataFrom={from}
                    cardType={cardType}
                    graphType={graphType}
                    share={() => navigate('/shares?sensor=' + x.sensor)}
                    rename={() => setRename(x)}
                    remove={() => removeSensorFromState(x.sensor)}
                    move={dir => {
                        let currentOrder = order;
                        if (!currentOrder) {
                            currentOrder = sensors.map(y => y.sensor);
                        }

                        let idx = currentOrder.findIndex(y => y === x.sensor);
                        let toIdx = idx - dir;

                        if (!currentOrder[toIdx]) return;

                        const sensorExistsAtIndex = (targetIndex) => {
                            return sensors.some(y => y.sensor === currentOrder[targetIndex]);
                        };

                        while (!sensorExistsAtIndex(toIdx)) {
                            if (dir && toIdx === currentOrder.length - 1) return;
                            if (!dir && toIdx === 0) return;
                            toIdx = toIdx - dir;
                        }

                        const newOrder = [...currentOrder];
                        const b = newOrder[idx];
                        newOrder[idx] = newOrder[toIdx];
                        newOrder[toIdx] = b;

                        updateOrder(newOrder);
                    }}
                />
            </span>
        </span>
    };

    return (
        <>
            <Box>
                <Box backgroundSize="cover" backgroundPosition="top" >
                    <Box backgroundSize="cover" backgroundPosition="top" >
                        {currentSensor ? (
                            <Sensor key={currentSensor.sensor} sensor={currentSensor}
                                close={() => navigate('/')}
                                next={() => nextIndex(1)}
                                prev={() => nextIndex(-1)}
                                remove={() => removeSensor()}
                                updateSensor={(sensor) => updateSensor(sensor)}
                            />
                        ) : (
                            <Box paddingLeft={{ base: "10px", lg: "50px" }} paddingRight={{ base: "10px", lg: "50px" }}>
                                {sensors.length !== 0 &&
                                    <div style={{ paddingTop: 26 }}>
                                        <Flex flexFlow={"row wrap"} justifyContent={"flex-end"} gap={2}>
                                            <Show breakpoint='(max-width: 799px)'>
                                                {renderSearch(undefined)}
                                            </Show>
                                            <Show breakpoint='(min-width: 800px)'>
                                                {renderSearch("300px")}
                                            </Show>
                                            {dropdowns}
                                        </Flex>
                                    </div>
                                }
                                <DashboardGrid showGraph={undefined} order={getOrder()} sensors={sensors} currSize={currSize} onSizeChange={s => setCurrSize(s)} disableAdaptiveLayout={disableAdaptiveLayout}>
                                    {(size, columnCount) => {
                                        const sensorsInSearch = getSensors();
                                        if (order && order.length > 0) {
                                            return <>
                                                {order.map(m => {
                                                    return sensorCard(sensors.find(x => x.sensor === m), size, sensorsInSearch, columnCount);
                                                })}
                                            </>
                                        }
                                        return <>
                                            {sensors.map(x => {
                                                return sensorCard(x, size, sensorsInSearch, columnCount);
                                            })}
                                        </>
                                    }}
                                </DashboardGrid>
                            </Box>
                        )}
                        {loading &&
                            <center>
                                <Spinner size="xl" />
                            </center>
                        }
                        {!loading && !sensors.length &&
                            <center style={{ margin: 32, ...infoText }}>
                                {t("dashboard_no_sensors").split("\\n").map((x, i) => <div key={i}>{addRuuviLink(x)}<br /></div>)}
                            </center>
                        }
                    </Box>
                </Box>
            </Box>
            <EditNameDialog open={rename} onClose={() => setRename(null)} sensor={rename} updateSensor={(s) => updateSensor(s)} />
            <ConfirmationDialog open={showResetOrderConfirmation} title="dialog_are_you_sure" description='reset_order_confirmation' onClose={(yes) => resetOrder(yes)} />
            {!currentSensor && <ExtraPadding />}
        </>
    );
}

function ExtraPadding() {
    const [extraBottomPadding, setExtraBottomPadding] = React.useState(window.innerHeight < 800 ? 20 : 0);

    React.useEffect(() => {
        const handleResize = () => {
            setExtraBottomPadding(window.innerHeight < 800 ? 20 : 0);
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return <Box height={`${extraBottomPadding}px`} />;
}

export default withTranslation()(withColorMode((props) => (
    <Dashboard
        {...props}
        params={useParams()}
        location={useLocation()}
        navigate={useNavigate()}
        searchParams={useSearchParams()}
    />
)));
