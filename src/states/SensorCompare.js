import React, { useEffect, useState } from "react";
import NetworkApi from "../NetworkApi";
import { Button, Flex, Divider, Box, useBreakpointValue } from "@chakra-ui/react";
import CompairView from "../components/CompareView";
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

function SensorCompare(props) {
    const [sensors, setSensors] = useState([])
    const [selectedSensors, setSelectedSensors] = useState([])
    const [from, setFrom] = useState(24 * 7)
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

    const load = () => {
        setViewData({ sensors: selectedSensors, from, dataKey })
        setLoadedDataKeys(dataKey)
    }

    return <>
        <Box margin={8} marginLeft={{ base: 2, md: 16 }} marginRight={{ base: 2, md: 16 }}>
            <div className={isWideVersion ? "pageTitle" : "mobilePageTitle"}>
                {i18next.t("compare_sensors")}
            </div>
            <p className={isWideVersion ? "pageTitleDescription" : "mobilePageTitleDescription"}>
                {i18next.t("compare_subtitle")}
            </p>
            <Flex mt={6}>
                <Flex grow={1}>
                </Flex>
                <Flex gap='2' wrap="wrap" justifyContent="end">
                    <SensorTypePicker value={dataKey} onChange={v => setDataKey(v)} />
                    <SensorPicker sensors={sensors} canBeSelected={canBeSelected} onSensorChange={s => setSelectedSensors([...selectedSensors, s])} normalStyle />
                    <DurationPicker value={from} onChange={v => setFrom(v)} />
                    <Button isDisabled={!selectedSensors.length || loading} onClick={() => load()}>{i18next.t("load")}</Button>
                </Flex>
            </Flex>
            <Flex gap='2' wrap="wrap" mt={3} mb={3}>
                {selectedSensors.map((sensor, index) => (
                    <Box key={index}>
                        <EmailBox email={sensors.find(x => x.sensor === sensor).name || sensor} onRemove={s => {
                            setSelectedSensors(selectedSensors.filter(x => x !== sensor))
                        }} />
                    </Box>
                ))}
            </Flex>
            <br />
            {viewData && !loading && <>
                <ScreenSizeWrapper>
                    <div style={{ marginTop: 30 }} id="history">
                        <table width="100%">
                            <tbody>
                                <tr>
                                    <td>
                                        {graphTitle()}
                                    </td>
                                    <td>
                                        <Flex justify="end" gap={"6px"}>
                                            {graphCtrl()}
                                        </Flex>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </ScreenSizeWrapper>
                <ScreenSizeWrapper isMobile>
                    <div style={{ marginTop: 30, marginBottom: -10 }} id="history">
                        {graphTitle(true)}
                        <table width="100%" style={{ marginTop: "10px" }}>
                            <tbody>
                                <tr>
                                    <td>
                                        <Flex justify="end" flexWrap="wrap" gap={"6px"}>
                                            {graphCtrl(true)}
                                        </Flex>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </ScreenSizeWrapper>
            </>}
            <br />
            {viewData && <CompairView key={123} {...viewData} isLoading={s => setLoading(s)} setData={d => data = d} />}
            {!viewData && <Box height={450} textAlign={"center"} pt={200}>{t("select_sensor_and_load")}</Box>}
        </Box>
    </>
}

export default SensorCompare