import React, { Component, useEffect, useRef, useState } from "react";
import NetworkApi from "../NetworkApi";
import SensorCard from "../components/SensorCard";
import Sensor from "./Sensor";
import { Spinner, Box, Link, useMediaQuery, Flex, Input, InputGroup, InputRightElement, Show, Button } from "@chakra-ui/react"
import { withTranslation } from 'react-i18next';
import DurationPicker from "../components/DurationPicker";
import Store from "../Store";
import SessionStore from "../SessionStore";
import notify from "../utils/notify";
import { withColorMode } from "../utils/withColorMode";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import SensorTypePicker from "../components/SensorTypePicker";
import DashboardViewType from "../components/DashboardViewType";
import { SearchIcon, CloseIcon } from "@chakra-ui/icons";
import { getSetting } from "../UnitHelper";
import EditNameDialog from "../components/EditNameDialog";
import ConfirmationDialog from "../components/ConfirmationDialog";

const infoText = {
    fontFamily: "mulish",
    fontSize: 16,
}

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

function DashboardGrid(props) {
    const [isLargeDisplay] = useMediaQuery("(min-width: 1700px)", { ssr: false });
    const [isMediumDisplay] = useMediaQuery("(min-width: 1024px)", { ssr: false });
    const gridRef = useRef(null);
    const [containerWidth, setContainerWidth] = useState(0);
    const debouncedOnSizeChange = useRef(debounce(props.onSizeChange, 150)).current;

    let size = "";
    if (isLargeDisplay) size = "large";
    else if (isMediumDisplay) size = "medium";
    else size = "mobile";

    if (props.currSize !== size) {
        debouncedOnSizeChange(size);
    }

    const gap = size === "mobile" ? 10 : 20;
    const minCardWidth = isLargeDisplay ? 450 : isMediumDisplay ? 350 : props.showGraph ? 280 : 320;

    // Effect for setting up observers and listeners that update containerWidth
    const debouncedWindowResizeHandlerRef = useRef(null);
    const debouncedResizeObserverHandlerRef = useRef(null);

    useEffect(() => {
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
    }, []);

    useEffect(() => {
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
            const columnWidthVal = (containerWidth - (gap * (columnCount - 1))) / columnCount;
            return { columnWidth: columnWidthVal, columnCount };
        };

        const performLayout = () => {
            if (!gridRef.current) return;
            
            gridRef.current.style.height = '';
            const { columnWidth: calculatedColumnWidth, columnCount } = calculateGridDimensions();
            
            if (columnCount <= 0 || calculatedColumnWidth <= 0) { // Avoid issues with zero or negative columns/width
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

    }, [containerWidth, size, props.order, gap, minCardWidth]); // Dependencies for re-calculating layout

    return (
        <Box
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
            {props.children(size)}
        </Box>
    );
}

const getSensorCache = () => {
    let sensors = localStorage.getItem("sensors")
    if (!sensors) return []
    return JSON.parse(sensors)
}

class Dashboard extends Component {
    constructor(props) {
        super(props)
        let store = new Store();
        this.state = {
            loading: true,
            sensors: getSensorCache(),
            from: 24 * 3,
            cardType: store.getDashboardCardType(),
            showBig: true,
            graphType: store.getDashboardGraphType(),
            search: "",
            currSize: '',
            rename: null,
            showResetOrderConfirmation: false,
            order: this.getOrder(),
        }
        var from = store.getDashboardFrom();
        if (from) {
            // apply new dashboard history length limit to old stored value
            if (from > 24 * 7) from = 24 * 7;
            this.state.from = from;
        }
    }
    getOrder() {
        let order = getSetting("SENSOR_ORDER", null)
        if (order) {
            order = JSON.parse(order)
            if (order && order.length) {
                return order
            }
        }
        return null
    }
    getCurrentSensor() {
        let id = this.props.params.id;
        return this.state.sensors.find(x => x.sensor === id);
    }
    componentDidUpdate() {
        document.title = "Ruuvi Station"
    }
    componentWillUnmount() {
        clearTimeout(this.alertUpdateLoop);
    }
    async fetchData(initialSensors) {
        clearTimeout(this.alertUpdateLoop);
        this.alertUpdateLoop = setTimeout(() => {
            this.fetchData()
        }, 60 * 1000);

        try {
            let resp = await new NetworkApi().getAllSensorsAsync();
            if (resp.result === "success") {
                let sensors = this.state.sensors;
                if (initialSensors) sensors = initialSensors
                sensors.forEach((x, i) => {
                    let newSensor = resp.data.sensors.find(y => y.sensor === x.sensor)
                    if (newSensor) {
                        sensors[i] = { ...x, ...newSensor }
                    }
                })
                this.setState({ ...this.state, sensors: sensors, loading: false }, () => {
                    localStorage.setItem("sensors", JSON.stringify(sensors))
                    this.checkSensorOrder()
                })
                return
            }
        } catch (e) {
            console.log("failed to load sensors", e)
        }

        setTimeout(() => {
            this.fetchData(initialSensors)
        }, 2000);
    }
    updateFrom(v) {
        this.setState({ ...this.state, from: v })
        new Store().setDashboardFrom(v)
    }
    loadSensors() {
        new NetworkApi().user(uresp => {
            if (uresp.result === "success") {
                this.fetchData(uresp.data.sensors)
                return
            } else if (uresp.result === "error") {
                notify.error(this.props.t(`UserApiError.${uresp.code}`))
            }
            setTimeout(() => {
                this.loadSensors()
            }, 60000)
        }, () => {
            setTimeout(() => {
                this.loadSensors()
            }, 60000)
        })
    }
    componentDidMount() {
        this.loadSensors()
    }
    nextIndex(direction) {
        var current = this.getCurrentSensor().sensor;
        var setNext = current;
        let sensors = this.state.sensors.map(x => x.sensor)
        let order = this.getOrder()
        if (order) {
            sensors = order
        }
        var indexOfCurrent = sensors.findIndex(x => x === current)
        if (indexOfCurrent === -1) return;
        if (direction === 1 && indexOfCurrent === sensors.length - 1) setNext = sensors[0]
        else if (direction === -1 && indexOfCurrent === 0) setNext = sensors[sensors.length - 1]
        else setNext = sensors[indexOfCurrent + direction]
        this.props.navigate('/' + setNext)
    }
    removeSensor() {
        var current = this.getCurrentSensor().sensor;
        this.setState({ ...this.state, sensors: this.state.sensors.filter(x => x.sensor !== current) })
        this.props.navigate('/')
        this.props.reloadTags();
    }
    updateSensor(sensor) {
        var idx = this.state.sensors.findIndex(x => x.sensor === sensor.sensor)
        if (idx > -1) {
            var sensors = this.state.sensors;
            sensors[idx] = sensor
            this.setState({ ...this.state, sensors: sensors })
        }
        this.props.reloadTags()
    }
    addRuuviLink(text) {
        var splitted = text.split("ruuvi.com")
        if (splitted.length === 1) return text;
        var out = [<span>{splitted[0]}</span>]
        for (var i = 1; i < splitted.length; i++) {
            out.push(<Link href="https://ruuvi.com" isExternal color="primary">ruuvi.com</Link>)
            out.push(<span>{splitted[i]}</span>);
        }
        return out;
    }
    showModal(name) {
        return this.props.showDialog === name
    }
    closeModal() {
        this.props.closeDialog()
    }
    setDashboardViewType(type) {
        this.setState({ ...this.state, cardType: type })
        new Store().setDashboardCardType(type)
    }
    setGraphType(type) {
        this.setState({ ...this.state, graphType: type })
        new Store().setDashboardGraphType(type)
    }
    getSensors() {
        if (this.state.search === "") return this.state.sensors
        let sensors = [];
        for (let i = 0; i < this.state.sensors.length; i++) {
            let x = this.state.sensors[i]
            let searchTerm = this.state.search.toLowerCase()
            if (x.name.toLowerCase().indexOf(searchTerm) !== -1) {
                sensors.push(x)
            }
        }
        return sensors
    }
    shouldDurationBeDisabled() {
        if (this.state.currSize === 'mobile' && this.state.cardType === 'image_view') return true
        return this.state.cardType === "simple_view"
    }
    updateOrder(order) {
        this.setState({ ...this.state, order: [...order] })
        new NetworkApi().setSetting("SENSOR_ORDER", JSON.stringify(order), b => {
            if (b.result === "success") {
                //notify.success(this.props.t("successfully_saved"))
                new NetworkApi().getSettings(settings => {
                    if (settings.result === "success") {
                        localStorage.setItem("settings", JSON.stringify(settings.data.settings))
                        if (this.props.reloadTags) this.props.reloadTags()
                    }
                })
            } else if (b.result === "error") {
                notify.error(`UserApiError.${this.props.t(b.code)}`)
            }
        }, error => {
            console.log(error);
            notify.error(this.props.t("something_went_wrong"))
        })
    }
    checkSensorOrder() {
        let order = JSON.parse(JSON.stringify(this.getOrder()))
        if (order) {
            let sensors = this.state.sensors.map(x => x.sensor)
            for (let i = 0; i < sensors.length; i++) {
                let found = false
                for (let j = 0; j < order.length; j++) {
                    if (sensors[i] === order[j]) found = true
                }
                if (!found) {
                    order = [...order, sensors[i]]
                }
            }
            if (order.length !== this.getOrder().length) {
                this.updateOrder(order)
            }
        }
    }
    resetOrder(yes) {
        this.setState({ ...this.state, showResetOrderConfirmation: false }, () => {
            if (yes) this.updateOrder([])
        })
    }
    removeSensorFromState(mac) {
        this.setState({ ...this.state, sensors: this.state.sensors.filter(x => x.sensor !== mac) })
    }
    render() {
        var { t } = this.props;
        let order = this.state.order;
        if (this.props.params.id) SessionStore.setBackRoute(`/${this.props.params.id}`)
        else SessionStore.setBackRoute("/")
        const dropdowns = <>
            <DashboardViewType value={this.state.cardType} onChange={this.setDashboardViewType.bind(this)} showResetOrder={this.getOrder() !== null} resetOrder={() => this.setState({ ...this.state, showResetOrderConfirmation: true })} />
            <SensorTypePicker value={this.state.graphType} onChange={type => this.setGraphType(type)} sensors={this.state.sensors} />
            <DurationPicker value={this.state.from} onChange={v => this.updateFrom(v)} dashboard disabled={this.shouldDurationBeDisabled()} />
        </>
        const search = width => {
            return <InputGroup width={width}>
                <InputRightElement className="buttonSideIcon" style={{ cursor: this.state.search ? "pointer" : undefined }} onClick={() => this.setState({ ...this.state, search: "" })}>
                    {this.state.search ? <CloseIcon /> : <SearchIcon />}
                </InputRightElement>
                <Input placeholder={t("sensor_search_placeholder")}
                    className="searchInput"
                    borderRadius={5}
                    value={this.state.search}
                    onChange={e => {
                        this.setState({ ...this.state, search: e.target.value })
                        if (e.target.value === "set_staging") {
                            let staging = new NetworkApi().isStaging()
                            if (staging) {
                                if (window.confirm("Switch back to production environment?") === false) return
                                new NetworkApi().setEnv("production")
                                window.location.reload()
                            } else {
                                if (window.confirm("Are you sure you want to switch to staging environment?") === false) return
                                new NetworkApi().setEnv("staging")
                                window.location.reload()
                            }
                        }
                    }}
                />
            </InputGroup>
        }
        const sensorCard = (x, size, sensorsInSearch) => {
            if (!x) return <></>
            let hide = sensorsInSearch.find(y => y.sensor === x.sensor) === undefined
            return <span className="masonry-item" key={x.sensor} style={{ maxWidth: "100%", display: hide ? "none" : undefined }}>
                <a href={"/" + x.sensor}>
                    <SensorCard sensor={x}
                        size={size}
                        dataFrom={this.state.from}
                        cardType={this.state.cardType}
                        graphType={this.state.graphType}
                        share={() => this.props.navigate('/shares?sensor=' + x.sensor)}
                        rename={() => this.setState({ ...this.state, rename: x })}
                        remove={() => this.removeSensorFromState(x.sensor)}
                        move={dir => {
                            if (!order) {
                                order = this.state.sensors.map(y => y.sensor);
                            }

                            let idx = order.findIndex(y => y === x.sensor);
                            let toIdx = idx - dir;

                            if (!order[toIdx]) {
                                return;
                            }

                            const sensorExistsAtIndex = (targetIndex) => {
                                return this.state.sensors.some(y => y.sensor === order[targetIndex]);
                            };

                            while (!sensorExistsAtIndex(toIdx)) {
                                if (dir && toIdx === order.length - 1) return
                                if (!dir && toIdx === 0) return
                                toIdx = toIdx - dir;
                            }

                            let b = order[idx];
                            order[idx] = order[toIdx];
                            order[toIdx] = b;

                            this.updateOrder(order);
                        }}
                    />
                </a></span>
        }
        return (
            <>
                <Box>
                    <Box backgroundSize="cover" backgroundPosition="top" >
                        <Box backgroundSize="cover" backgroundPosition="top" >
                            {this.getCurrentSensor() ? (
                                <Sensor key={this.getCurrentSensor().sensor} sensor={this.getCurrentSensor()}
                                    close={() => this.props.navigate('/')}
                                    next={() => this.nextIndex(1)}
                                    prev={() => this.nextIndex(-1)}
                                    remove={() => this.removeSensor()}
                                    updateSensor={(sensor) => this.updateSensor(sensor)}
                                />
                            ) : (
                                <Box paddingLeft={{ base: "10px", lg: "50px" }} paddingRight={{ base: "10px", lg: "50px" }}>
                                    {this.state.sensors.length !== 0 &&
                                        <div style={{ paddingTop: 26 }}>
                                            <Flex flexFlow={"row wrap"} justifyContent={"flex-end"} gap={2}>
                                                <Show breakpoint='(max-width: 799px)'>
                                                    {search(undefined)}
                                                </Show>
                                                <Show breakpoint='(min-width: 800px)'>
                                                    {search("300px")}
                                                </Show>
                                                {dropdowns}
                                            </Flex>
                                        </div>
                                    }
                                    <DashboardGrid showGraph={this.state.showGraph} order={this.getOrder()} currSize={this.state.currSize} onSizeChange={s => this.setState({ ...this.state, currSize: s })}>
                                        {size => {
                                            let sensorsInSearch = this.getSensors()
                                            if (order) {
                                                return <>
                                                    {order.map(m => {
                                                        return sensorCard(this.state.sensors.find(x => x.sensor === m), size, sensorsInSearch)
                                                    })}
                                                </>
                                            }
                                            return <>
                                                {this.state.sensors.map(x => {
                                                    return sensorCard(x, size, sensorsInSearch)
                                                })}
                                            </>
                                        }}
                                    </DashboardGrid>
                                </Box>
                            )}
                            {this.state.loading &&
                                <center>
                                    <Spinner size="xl" />
                                </center>
                            }
                            {!this.state.loading && !this.state.sensors.length &&
                                <center style={{ margin: 32, ...infoText }}>
                                    {t("dashboard_no_sensors").split("\\n").map((x, i) => <div key={i}>{this.addRuuviLink(x)}<br /></div>)}
                                </center>
                            }
                        </Box>
                    </Box>
                </Box>
                <EditNameDialog open={this.state.rename} onClose={() => this.setState({ ...this.state, rename: null })} sensor={this.state.rename} updateSensor={(s) => this.updateSensor(s)} />
                <ConfirmationDialog open={this.state.showResetOrderConfirmation} title="dialog_are_you_sure" description='reset_order_confirmation' onClose={(yes) => this.resetOrder(yes)} />
                {!this.getCurrentSensor() && <ExtraPadding />}
            </>
        )
    }
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