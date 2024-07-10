import React, { useEffect, useState } from "react";
import NetworkApi from "../NetworkApi";
import { Button, Flex, GridItem, SimpleGrid, Box, useBreakpointValue } from "@chakra-ui/react";
import CompairView from "../components/CompareView";
import DurationPicker from "../components/DurationPicker";
import i18next, { t } from "i18next";
import { SensorPicker } from '../components/SensorPicker';
import SensorTypePicker from "../components/SensorTypePicker";
import { EmailBox } from "../components/EmailBox";


function SensorCompare(props) {
    const [sensors, setSensors] = useState([])
    const [selectedSensors, setSelectedSensors] = useState([])
    const [from, setFrom] = useState(24 * 7)
    const [dataKey, setDataKey] = useState("temperature")
    const [loading, setLoading] = useState(false)
    const [viewData, setViewData] = useState(null)

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
                    <Button isDisabled={!selectedSensors.length || loading} onClick={() => setViewData({ sensors: selectedSensors, from, dataKey })}>{i18next.t("load")}</Button>
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
            {viewData && <CompairView key={123} {...viewData} isLoading={s => setLoading(s)} />}
            {!viewData && <Box height={450} textAlign={"center"} pt={200}>{t("select_sensor_and_load")}</Box>}
        </Box>
    </>
}

export default SensorCompare