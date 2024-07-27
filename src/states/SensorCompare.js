import React, { useEffect, useState } from "react";
import NetworkApi from "../NetworkApi";
import { Button, Flex, Box, useBreakpointValue } from "@chakra-ui/react";
import CompairView, { EmtpyGraph } from "../components/CompareView";
import DurationPicker from "../components/DurationPicker";
import i18next, { t } from "i18next";
import { SensorPicker } from '../components/SensorPicker';
import SensorTypePicker from "../components/SensorTypePicker";
import { EmailBox } from "../components/EmailBox";
import ZoomInfo from "../components/ZoomInfo";
import ExportMenu from "../components/ExportMenu";
import { uppercaseFirst } from "../TextHelper";
import { exportMuliSensorCSV } from "../utils/export";
import ScreenSizeWrapper from "../components/ScreenSizeWrapper";
import { getUnitHelper } from "../UnitHelper";

let data = {};
const descriptionStyle = { fontFamily: "mulish", fontSize: "14px", fontWeight: 400, maxWidth: "800px" }
function SensorCompare(props) {
    const [sensors, setSensors] = useState([])
    const [selectedSensors, setSelectedSensors] = useState([])
    const [durationPickerValue, setDurationPickerValue] = useState(24 * 7)
    const [from, setFrom] = useState((new Date().getTime() / 1000) - 60 * 60 * 24 * 7)
    const [to, setTo] = useState(new Date().getTime() / 1000)
    const [dataKey, setDataKey] = useState("temperature")
    const [loading, setLoading] = useState(false)
    const [viewData, setViewData] = useState(null)
    const [loadedDataKeys, setLoadedDataKeys] = useState(dataKey)
    const isWideVersion = useBreakpointValue({ base: false, md: true })


    useEffect(() => {
        new NetworkApi().user(resp => {
            if (resp.result === "success") {
                var d = resp.data.sensors;
                setSensors(d)
            } else if (resp.result === "error") {
                console.log("sensor menu error", resp.error)
            }
        });
    }, [])

    let canBeSelected = sensors.filter(sensor => !selectedSensors.includes(sensor.sensor));

    const graphTitle = (mobile) => {
        if (loadedDataKeys === "measurementSequenceNumber") return "";
        let unit = getUnitHelper(loadedDataKeys).unit
        if (loadedDataKeys === "movementCounter") return `(${this.props.t(unit)})`;

        return <div style={{ marginLeft: 30 }}>
            <span className="graphLengthText" style={{ fontSize: mobile ? "20px" : "24px" }}>
                {t(getUnitHelper(loadedDataKeys).label)}
            </span>
            {!mobile && <br />}
            <span className="graphInfo" style={{ marginLeft: mobile ? 6 : undefined }}>
                {unit}
            </span>
        </div>
    }
    const graphCtrl = (isMobile) => {
        return <>
            <ZoomInfo />
            <ExportMenu buttonText={uppercaseFirst(t("export"))} noPdf onClick={val => {
                exportMuliSensorCSV(data, i18next.t, loadedDataKeys)
                /*
                switch (val) {
                    case "XLSX":
                        this.export_XLSX()
                        break
                    default:
                        this.export()
                }
                        */
            }} />
        </>
    }

    const selectSensorTitle = <div style={{ marginTop: 8, paddingRight: 8, fontWeight: 800, fontFamily: "mulish" }}>{i18next.t("select_sensor")}</div>
    const selectSensor = <>
        <SensorPicker sensors={sensors} canBeSelected={canBeSelected} onSensorChange={s => setSelectedSensors([...selectedSensors, s])} />
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

    const selectUnitTitle = <div style={{ marginTop: 8, paddingRight: 8, fontWeight: 800, fontFamily: "mulish" }}>{i18next.t("unit")}</div>
    const selectUnit = <>
        <SensorTypePicker value={dataKey} onChange={v => setDataKey(v)} />
    </>

    const loadButton = <Button isDisabled={!selectedSensors.length || loading} onClick={() => load()}>{i18next.t("load")}</Button>

    const load = () => {
        setViewData({ sensors: selectedSensors, from, to, dataKey })
        setLoadedDataKeys(dataKey)
    }

    const updateDuration = (v) => {
        setDurationPickerValue(v)
        if (typeof v === "object") {
            setFrom(v.from.getTime() / 1000)
            setTo(v.to.getTime() / 1000)
        } else {
            setFrom((new Date().getTime() / 1000) - 60 * 60 * v)
            setTo(new Date().getTime() / 1000)
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
            <Box className='contentImportant' borderRadius={8} width="100%" padding={{ base: "5px", md: "40px" }}>
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
                                {selectUnitTitle}
                            </td>
                            <td>
                                {selectUnit}
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

                    <Box display="block" mb={4}>
                        <Box p={2}>
                            {selectUnitTitle}
                        </Box>
                        <Box flex={1} ml={{ md: 2, base: 1 }}>
                            {selectUnit}
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
                                    <Flex justify="end" gap={"6px"}>
                                        {(viewData && !loading) && <>
                                            {graphCtrl()}
                                        </>}
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
                                        {durationPicker}
                                    </Flex>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </ScreenSizeWrapper>
            <br />
            {viewData && <CompairView key={123} {...viewData} isLoading={s => setLoading(s)} setData={d => data = d} />}
            {!viewData && <Box height={450}><EmtpyGraph /></Box>}
            <Box height={50} />
        </Box >
    </>
}

export default SensorCompare