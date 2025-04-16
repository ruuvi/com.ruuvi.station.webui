import React, { useEffect, useState } from "react";
import NetworkApi from "../NetworkApi";
import { Button, Flex, Box, useBreakpointValue } from "@chakra-ui/react";
import CompairView, { EmptyGraph } from "../components/CompareView";
import DurationPicker from "../components/DurationPicker";
import i18next, { t } from "i18next";
import { SensorPicker } from '../components/SensorPicker';
import SensorTypePicker from "../components/SensorTypePicker";
import { EmailBox } from "../components/EmailBox";
import ZoomInfo from "../components/ZoomInfo";
import ExportMenu from "../components/ExportMenu";
import { uppercaseFirst } from "../TextHelper";
import { exportMuliSensorCSV, exportMuliSensorXLSX } from "../utils/export";
import ScreenSizeWrapper from "../components/ScreenSizeWrapper";
import { getSensorTypeOnly, getUnitHelper, getUnitOnly } from "../UnitHelper";
import { useLocation, useNavigate } from "react-router-dom";

let data = {};
const descriptionStyle = { fontFamily: "mulish", fontSize: "14px", fontWeight: 400, maxWidth: "800px" }
let reloadIndex = 0;

function SensorCompare(props) {
    const [sensors, setSensors] = useState([])
    const [durationPickerValue, setDurationPickerValue] = useState(24 * 7)
    const [from, setFrom] = useState((new Date().getTime() / 1000) - 60 * 60 * 24 * 7)
    const [to, setTo] = useState(new Date().getTime() / 1000)
    const [loading, setLoading] = useState(false)
    const [viewData, setViewData] = useState(null)
    const isWideVersion = useBreakpointValue({ base: false, md: true })

    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        (async () => {
            try {
                let res = await new NetworkApi().getAllSensorsAsync()
                let sensors = res.data.sensors
                if (!sensors) throw new Error("No sensors")
                setSensors(sensors)
            } catch (e) {
                console.log("sensor menu error", e)
            }
        })()
    }, [])

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const urlFrom = params.get("from");
        const urlTo = params.get("to");
        const urlFromHours = params.get("fromHours");
        if (urlFromHours) {
            const hours = Number(urlFromHours);
            setDurationPickerValue(hours);
            const now = Math.floor(new Date().getTime() / 1000);
            setFrom(now - 60 * 60 * hours);
            setTo(now);
        } else if (urlFrom && urlTo) {
            setFrom(Number(urlFrom));
            setTo(Number(urlTo));
            setDurationPickerValue({
                from: new Date(Number(urlFrom) * 1000),
                to: new Date(Number(urlTo) * 1000)
            });
        } else if (urlFrom) {
            setFrom(Number(urlFrom));
        } else if (urlTo) {
            setTo(Number(urlTo));
        }
    }, []);

    const getDataKey = () => {
        const params = new URLSearchParams(location.search);
        return params.get("unit") || "temperature_C";
    }
    const setDataKey = (key) => {
        const params = new URLSearchParams(location.search);
        if (key) {
            params.set("unit", key);
        } else {
            params.delete("unit");
        }
        setParams(params);
    }
    let dataKey = getDataKey();
    console.log(dataKey)

    const getSelectedSensors = () => {
        const params = new URLSearchParams(location.search);
        const selectedSensors = params.getAll("sensor");
        return selectedSensors || [];
    }

    const setParams = (params) => {
        const paramString = params.toString().replace(/%3A/g, ':');
        navigate({ search: paramString });
    }

    const addSensorToUrl = (sensor) => {
        const params = new URLSearchParams(location.search);
        const selectedSensors = params.getAll("sensor");
        if (Array.isArray(sensor)) {
            sensor.forEach(s => {
                if (!selectedSensors.includes(s)) {
                    params.append("sensor", s);
                }
            });
        } else {
            if (!selectedSensors.includes(sensor)) {
                params.append("sensor", sensor);
            }
        }
        setParams(params);
    }

    const removeSensorFromUrl = (sensor) => {
        const params = new URLSearchParams(location.search);

        const newParams = new URLSearchParams();

        for (const [key, value] of params.entries()) {
            if (key === "sensor" && value === sensor) {
                continue;
            }
            newParams.append(key, value);
        }
        setParams(newParams);
    }

    const clearSelectedSensors = () => {
        const params = new URLSearchParams(location.search);
        params.delete("sensor");
        setParams(params);
    }

    let selectedSensors = getSelectedSensors();
    let canBeSelected = sensors.filter(sensor => !selectedSensors.includes(sensor.sensor));

    const graphTitle = (mobile) => {
        let uh = getUnitHelper(getSensorTypeOnly(dataKey))
        let unit = uh.units?.find(x => x.cloudStoreKey === getUnitOnly(dataKey))?.translationKey || uh.unit
        let label = uh.label;

        return <div style={{ marginLeft: 30 }}>
            <span className="graphLengthText" style={{ fontSize: mobile ? "20px" : "24px" }}>
                {t(label)}
            </span>
            {!mobile && <br />}
            <span className="graphInfo" style={{ marginLeft: mobile ? 6 : undefined }}>
                {t(unit)}
            </span>
        </div>
    }
    const graphCtrl = (isMobile) => {
        let key = ""
        if (typeof (dataKey) === "object") {
            key = dataKey.sensorType
        } else {
            key = dataKey
        }
        return <>
            <ZoomInfo />
            <ExportMenu buttonText={uppercaseFirst(t("export"))} noPdf onClick={val => {
                switch (val) {
                    case "XLSX":
                        exportMuliSensorXLSX(data, i18next.t, dataKey)
                        break
                    default:
                        exportMuliSensorCSV(data, i18next.t, dataKey)
                }
            }} />
        </>
    }

    const selectSensorTitle = <div style={{ marginTop: 8, paddingRight: 8, fontWeight: 800, fontFamily: "mulish" }}>{i18next.t("sensors_select_label")}</div>
    const selectSensor = <>
        <SensorPicker
            sensors={sensors}
            showSelectAll
            canBeSelected={canBeSelected}
            buttonText={i18next.t("sensors_select_button")}
            onSensorChange={s => addSensorToUrl(s)}
        />
        <Flex gap='2' wrap="wrap" mt={3} mb={3}>
            {getSelectedSensors().map((sensor, index) => {
                if (!sensors.find(x => x.sensor === sensor)) {
                    return <Box key={index}>
                        <EmailBox email={sensor} onRemove={() => {
                            removeSensorFromUrl(sensor)
                        }} />
                    </Box>
                }

                return <Box key={index}>
                    <EmailBox email={sensors.find(x => x.sensor === sensor).name || sensor} onRemove={() => {
                        removeSensorFromUrl(sensor)
                    }} />
                </Box>
            })}
            {selectedSensors.length > 1 &&
                <Button variant='link' onClick={() => clearSelectedSensors([])}>
                    {i18next.t("clear_all")}
                </Button>
            }
        </Flex>
    </>

    const selectUnit = <>
        <SensorTypePicker value={dataKey} onChange={v => setDataKey(v)} allUnits={true} sensors={sensors.filter(x => selectedSensors.find(y => y === x.sensor))} />
    </>

    const loadButton = <Button
        isDisabled={!selectedSensors.length || loading}
        onClick={() => load()}>
        {i18next.t("load")}
    </Button>

    const load = (newFrom, newTo) => {
        reloadIndex++
        setViewData({ sensors: selectedSensors, from: newFrom || from, to: newTo || to, dataKey, reloadIndex })
        if (newFrom && newTo) {
            setFrom(newFrom)
            setTo(newTo)
        }
    }

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (typeof durationPickerValue === "number") {
            params.set("fromHours", durationPickerValue);
            params.delete("from");
            params.delete("to");
            setParams(params);
        } else if (from && to) {
            params.set("from", Math.floor(from));
            params.set("to", Math.floor(to));
            params.delete("fromHours");
            setParams(params);
        }
    }, [from, to, durationPickerValue]);

    const updateDuration = (v) => {
        if (loading) return
        setDurationPickerValue(v)
        let setFromTo = null, setToTo = null
        if (typeof v === "object") {
            setFromTo = v.from.getTime() / 1000
            setToTo = v.to.getTime() / 1000
            setFrom(setFromTo)
            setTo(setToTo)
        } else {
            setFromTo = (new Date().getTime() / 1000) - 60 * 60 * v
            setToTo = new Date().getTime() / 1000
            setFrom(setFromTo)
            setTo(setToTo)
        }
        if (viewData) {
            load(setFromTo, setToTo)
        }
    }
    const durationPicker = <DurationPicker value={durationPickerValue} onChange={v => updateDuration(v)} />

    return <>
        <Box margin={8} marginLeft={{ base: 2, md: 16 }} marginRight={{ base: 2, md: 16 }}>
            <div className={isWideVersion ? "pageTitle" : "mobilePageTitle"}>
                {i18next.t("compare_sensors")}
            </div>
            <p className={isWideVersion ? "pageTitleDescription" : "mobilePageTitleDescription"}>
                {i18next.t("compare_subtitle")}
            </p>
            <br />
            <Box className='contentImportant' borderRadius={8} width="100%" padding={{ base: "24px", md: "40px" }}>
                <Box mb={8} style={descriptionStyle}>
                    {i18next.t("compare_description")}
                </Box>

                {isWideVersion ? <>
                    <table>
                        <tr>
                            <td valign='top' style={{ minWidth: "150px" }}>
                                {selectSensorTitle}
                            </td>
                            <td>
                                {selectSensor}
                            </td>
                        </tr>
                        <tr>
                            <td valign="top">
                            </td>
                            <td>
                                <div style={{ marginTop: 20 }}>
                                    {loadButton}
                                </div>
                            </td>
                        </tr>
                    </table>
                </> : <>
                    <Box display="block" mb={2}>
                        <Box p={2}>
                            {selectSensorTitle}
                        </Box>
                        <Box flex={1} ml={{ md: 2, base: 1 }}>
                            {selectSensor}
                        </Box>
                    </Box>
                    <Box ml={{ md: 2, base: 1 }}>
                        {loadButton}
                    </Box>
                </>}

            </Box>

            <br />
            <ScreenSizeWrapper>
                <div id="history">
                    <table width="100%">
                        <tbody>
                            <tr>
                                <td>
                                    {(viewData && !loading) && <>
                                        {graphTitle()}
                                    </>}

                                </td>
                                <td>
                                    <Flex justify="end" flexWrap="wrap" gap={"6px"}>
                                        {(viewData && !loading) && <>
                                            {graphCtrl()}
                                        </>}
                                        {selectUnit}
                                        {durationPicker}
                                    </Flex>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </ScreenSizeWrapper>
            <ScreenSizeWrapper isMobile>
                <div style={{ marginBottom: -10 }} id="history">
                    {(viewData && !loading) && <>
                        {graphTitle(true)}
                    </>}
                    <table width="100%" style={{ marginTop: "10px" }}>
                        <tbody>
                            <tr>
                                <td>
                                    <Flex justify="end" flexWrap="wrap" gap={"6px"}>
                                        {(viewData && !loading) && <>
                                            {graphCtrl(true)}
                                        </>}
                                        {selectUnit}
                                        {durationPicker}
                                    </Flex>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </ScreenSizeWrapper>
            <br />
            {viewData && <CompairView key={123} {...viewData} dataKey={dataKey} isLoading={s => setLoading(s)} setData={d => data = d} />}
            {!viewData && <Box height={450}><EmptyGraph /></Box>}
            <Box height={90} />
        </Box >
    </>
}

export default SensorCompare