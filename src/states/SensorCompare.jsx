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
import { getUnitHelper, getUnitSettingFor } from "../UnitHelper";

let data = {};
const descriptionStyle = { fontFamily: "mulish", fontSize: "14px", fontWeight: 400, maxWidth: "800px" }
let reloadIndex = 0;

function SensorCompare(props) {
    const [sensors, setSensors] = useState([])
    const [selectedSensors, setSelectedSensors] = useState([])
    const [durationPickerValue, setDurationPickerValue] = useState(24 * 7)
    const [from, setFrom] = useState((new Date().getTime() / 1000) - 60 * 60 * 24 * 7)
    const [to, setTo] = useState(new Date().getTime() / 1000)
    const [dataKey, setDataKey] = useState(null)
    const [loading, setLoading] = useState(false)
    const [viewData, setViewData] = useState(null)
    const isWideVersion = useBreakpointValue({ base: false, md: true })


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

    let canBeSelected = sensors.filter(sensor => !selectedSensors.includes(sensor.sensor));

    const graphTitle = (mobile) => {
        if (dataKey === "measurementSequenceNumber") return "";
        let unit = ""
        let label = "";
        if (typeof(dataKey) === "object") {
            label = dataKey.sensorType
            if (dataKey.unit) {
                unit = t(dataKey.unit.translationKey)
            } else {
                unit = getUnitHelper(label).unit 
            }
        } else {
            label = getUnitHelper(dataKey).label
            unit = getUnitHelper(dataKey).unit
        }

        return <div style={{ marginLeft: 30 }}>
            <span className="graphLengthText" style={{ fontSize: mobile ? "20px" : "24px" }}>
                {t(label)}
            </span>
            {!mobile && <br />}
            <span className="graphInfo" style={{ marginLeft: mobile ? 6 : undefined }}>
                {unit}
            </span>
        </div>
    }
    const graphCtrl = (isMobile) => {
        let key = ""
        if (typeof(dataKey) === "object") {
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
        <SensorPicker sensors={sensors} canBeSelected={canBeSelected} buttonText={i18next.t("sensors_select_button")} onSensorChange={s => setSelectedSensors([...selectedSensors, s])} />
        <Flex gap='2' wrap="wrap" mt={3} mb={3}>
            {selectedSensors.map((sensor, index) => (
                <Box key={index}>
                    <EmailBox email={sensors.find(x => x.sensor === sensor).name || sensor} onRemove={s => {
                        setSelectedSensors(selectedSensors.filter(x => x !== sensor))
                    }} />
                </Box>
            ))}
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

    const updateDuration = (v) => {
        if (loading) return
        setDurationPickerValue(v)
        let setFromTo = null, setToTo = null
        if (typeof v === "object") {
            setFromTo = v.from.getTime() / 1000
            setToTo = v.to.getTime() / 1000
        } else {
            setFromTo = (new Date().getTime() / 1000) - 60 * 60 * v
            setToTo = new Date().getTime() / 1000
        }
        if (viewData) {
            load(setFromTo, setToTo)
        } else {
            setFrom(setFromTo)
            setTo(setToTo)
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