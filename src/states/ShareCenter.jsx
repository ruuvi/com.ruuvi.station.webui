import React, { useEffect } from 'react';
import { useBreakpointValue, Box, Button, Flex, Grid, Heading, IconButton, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalOverlay, Progress, Spinner } from '@chakra-ui/react';
import NetworkApi from '../NetworkApi';
import pjson from '../../package.json';
import { MdClear } from 'react-icons/md';
import notify from '../utils/notify';
import i18next from 'i18next';
import { addVariablesInString } from "../TextHelper";
import RemoveSensorDialog from '../components/RemoveSensorDialog';
import ConfirmModal from '../components/ConfirmModal';
import { SensorPicker } from '../components/SensorPicker';
import { EmailBox } from '../components/EmailBox';

const SensorSharedWithMeBox = ({ email, sensor, onRemove }) => {
    const [remove, setRemove] = React.useState(false);
    return (
        <Box className='box'>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 800, fontFamily: "mulish", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {sensor.name || sensor.sensor}
                </div>
                <IconButton variant="ghost" color={"primary"} margin={-2} icon={<MdClear size="13" />} onClick={e => {
                    e.preventDefault()
                    setRemove(true)
                }} />
            </div>
            <div style={{ fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {sensor.owner.toLowerCase()} | {sensor.subscription.subscriptionName}
            </div>
            <RemoveSensorDialog open={remove} sensor={sensor} t={i18next.t} onClose={() => setRemove(false)} remove={() => {
                setRemove(false)
                onRemove()
                notify.success(i18next.t(`sensor_removed`))
            }} />
        </Box>
    )
}

const SensorsSharedByMeBox = (props) => {
    const [loading, setLoading] = React.useState(false)
    const [removeShare, setRemoveShare] = React.useState("");
    return (
        <div>
            <div style={{ fontWeight: 800, fontFamily: "mulish" }}>
                {props.sensor.name || props.sensor.sensor}
            </div>
            <div style={{ fontFamily: "mulish", paddingBottom: 4, fontSize: 14 }}>
                {i18next.t("active_shares")} ({props.sensor.sharedTo.length}/{props.sensor.subscription.maxSharesPerSensor})
            </div>
            <Flex gap='2' wrap="wrap" >
                {props.sensor.sharedTo.map((sharedWith, index) => (
                    <EmailBox email={sharedWith.toLowerCase()} onRemove={() => {
                        setRemoveShare(sharedWith)
                    }} />
                ))}
            </Flex>

            <ConfirmModal isOpen={removeShare} loading={loading} title={i18next.t("remove_share_title")} message={addVariablesInString(i18next.t("share_sensor_unshare_confirm"), [removeShare])} onClose={() => { setRemoveShare("") }} onConfirm={() => {
                setLoading(true)
                new NetworkApi().unshare(props.sensor.sensor, removeShare, resp => {
                    switch (resp.result) {
                        case "success":
                            var sensor = props.sensor;
                            sensor.sharedTo = sensor.sharedTo.filter(x => x !== removeShare)
                            notify.success(i18next.t(`successfully_unshared`))
                            props.updateSensor(sensor)
                            break
                        case "error":
                            notify.error(i18next.t(`UserApiError.${resp.code}`))
                            break;
                        default:
                    }
                    setRemoveShare("")
                    setLoading(false)
                })
            }} />
        </div>
    )
}

const isEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const descriptionStyle = { fontFamily: "mulish", fontSize: "14px", fontWeight: 400, maxWidth: "800px" }
const subTitleStyle = { fontFamily: "montserrat", fontSize: "24px", fontWeight: 800 }
const subTitleDescriptionStyle = { fontFamily: "mulish", fontSize: "14px", fontWeight: 400, paddingBottom: 25, paddingTop: 5, maxWidth: "800px" }

const ShareCenter = () => {
    const [sensors, setSensors] = React.useState([]);
    const [selectedSensors, setSelectedSensors] = React.useState([]);
    const [shareToEmails, setShareToEmails] = React.useState([]);
    const [email, setEmail] = React.useState("");
    const [loading, setLoading] = React.useState(true);
    const [shareResult, setShareResult] = React.useState([]);
    const [shareLoading, setShareLoading] = React.useState(false);
    const [showShareResult, setShowShareResult] = React.useState(false);
    const [shareProgress, setShareProgress] = React.useState([0, 0])

    const isWideVersion = useBreakpointValue({ base: false, md: true })

    useEffect(() => {
        (async () => {
            window.scrollTo(0, 0)
            let user = new NetworkApi().getUser();
            let resp = await new NetworkApi().getAllSensorsAsync();
            if (resp.result === "success") {
                let sensors = resp.data.sensors
                for (let sensor of sensors) {
                    if (sensor.owner === user.email) {
                        sensor.userIsOwner = true
                    }
                }
                setSensors(sensors)
                const urlParams = new URLSearchParams(window.location.search);
                const sensorParam = urlParams.get('sensor');
                if (sensorParam) {
                    setSelectedSensors([sensorParam])
                }
                setLoading(false)
            }
        })();
    }, [])

    const getSensorName = mac => {
        let sensor = sensors.find(x => x.sensor === mac)
        return sensor ? sensor.name || mac : mac
    }

    let mySensors = sensors.filter(x => x.userIsOwner)
    let sensorsThatCanBeShared = mySensors.filter(x => x.sharedTo.length < x.subscription.maxSharesPerSensor)
    sensorsThatCanBeShared = sensorsThatCanBeShared.filter(sensor => !selectedSensors.includes(sensor.sensor));

    const selectSensorTitle = <div style={{ marginTop: 8, paddingRight: 8, fontWeight: 800, fontFamily: "mulish" }}>{i18next.t("sensors_select_label")}</div>
    const selectSensor = <>
        <SensorPicker sensors={mySensors} canBeSelected={sensorsThatCanBeShared} buttonText={i18next.t("sensors_select_button")} onSensorChange={s => setSelectedSensors([...selectedSensors, s])} />
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

    const selectEmailTitle = <div style={{ marginTop: 8, paddingRight: 8, fontWeight: 800, fontFamily: "mulish" }}>{i18next.t("email")}</div>
    const selectEmail = <>
        <Input className='shareEmail' autoCorrect="off" autoCapitalize="none" autoComplete="off" placeholder={i18next.t("email")} w={"250px"} mr={2} value={email} onChange={e =>
            setEmail(e.target.value.toLowerCase())
        } />
        <Box display={"inline-block"}>
            <Button onClick={() => {
                if (!shareToEmails.includes(email)) {
                    setShareToEmails([...shareToEmails, email])
                }
                setEmail("");
            }} isDisabled={email.length === 0 || !isEmail(email)}>
                {i18next.t("add")}
            </Button>
        </Box>
        <Flex gap='2' wrap="wrap" mt={2.5} >
            {shareToEmails.map((email, index) => (
                <EmailBox email={email.toLowerCase()} onRemove={() => {
                    let newEmails = [...shareToEmails]
                    newEmails.splice(index, 1)
                    setShareToEmails(newEmails)
                }} />
            ))}
        </Flex>
    </>

    const shareButton = <Button isDisabled={selectedSensors.length === 0 || shareToEmails.length === 0 || shareLoading}
        onClick={async () => {
            setShareProgress([0, selectedSensors.length * shareToEmails.length])
            setShareResult([])
            setShowShareResult(true)
            setShareLoading(true)
            let result = []
            let progress = 0
            for (let sensor of selectedSensors) {
                for (let email of shareToEmails) {
                    try {
                        let res = await new NetworkApi().shareAsync(sensor, email)
                        if (res.result === "error") {
                            //notify.error(i18next.t("UserApiError." + res.code))
                            progress++
                            setShareProgress([progress, selectedSensors.length * shareToEmails.length])
                            result.push({ sensor, name: getSensorName(sensor), email, result: "error", code: res.code })
                            continue
                        }
                        else if (!res.data.invited) {
                            let thisSensor = sensors.find(x => x.sensor === sensor)
                            thisSensor.sharedTo.push(email)
                            setSensors([...sensors])
                        }
                        result.push({ sensor, name: getSensorName(sensor), email, result: "success" })
                    } catch (e) {
                        notify.error(e.message)
                        result.push({ sensor, name: getSensorName(sensor), email, result: "error", code: e.code })
                    }
                    progress++
                    setShareProgress([progress, selectedSensors.length * shareToEmails.length])
                }
            }
            setSelectedSensors([])
            setShareToEmails([])
            setShareLoading(false)
            setShareResult(result)
        }} >
        {i18next.t("share")}
    </Button>

    return (
        <Box margin={8} marginLeft={{ base: 2, md: 16 }} marginRight={{ base: 2, md: 16 }}>
            <div className={isWideVersion ? "pageTitle" : "mobilePageTitle"}>
                {i18next.t("share_center")}
            </div>
            <p className={isWideVersion ? "pageTitleDescription" : "mobilePageTitleDescription"}>
                {i18next.t("share_center_subtitle")}
            </p>
            <br />
            {loading ?
                <center style={{ position: "relative", top: "50%", marginTop: 50, transform: "translateY(-50%)" }}>
                    <Spinner size="xl" />
                </center>
                :
                <>
                    <Box className='contentImportant' borderRadius={8} width="100%" padding={{ base: "24px", md: "40px" }}>
                        <Box mb={8} style={descriptionStyle}>
                            {i18next.t("share_center_description")}
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
                                        {selectEmailTitle}
                                    </td>
                                    <td>
                                        {selectEmail}
                                    </td>
                                </tr>
                                <tr>
                                    <td valign="top">
                                    </td>
                                    <td>
                                        <div style={{ marginTop: 20 }}>
                                            {shareButton}
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
                                    {selectEmailTitle}
                                </Box>
                                <Box flex={1} ml={{ md: 2, base: 1 }}>
                                    {selectEmail}
                                </Box>
                            </Box>
                            <Box ml={{ md: 2, base: 1 }}>
                                {shareButton}
                            </Box>
                        </>}

                    </Box>
                    <br />
                    <br />
                    <Heading size="lg" style={subTitleStyle}>{i18next.t("shared_by_me")}</Heading>
                    <Box style={subTitleDescriptionStyle}>
                        {i18next.t("sensor_shared_by_me_description")}
                    </Box>
                    <hr />
                    <br />
                    {sensors.filter(x => x.userIsOwner && x.sharedTo.length).map((sensor, index) => (
                        <Box key={index} marginTop={index ? "30px" : undefined}>
                            <SensorsSharedByMeBox sensor={sensor} updateSensor={s => {
                                setSensors(sensors.map(x => x.sensor === s.sensor ? s : x))
                            }} />
                        </Box>
                    ))}
                    <br />
                    <br />
                    <Heading size="lg" style={subTitleStyle}>{i18next.t("shared_to_me")}</Heading>
                    <Box style={subTitleDescriptionStyle}>
                        {i18next.t("sensor_shared_with_me_description")}
                    </Box>
                    <hr />
                    <br />
                    <Flex gap='2' wrap="wrap">
                        {sensors.filter(x => !x.userIsOwner).map((sensor, index) => (
                            <a key={index} href={"/" + sensor.sensor}>
                                <Box key={index} width="300px">
                                    <SensorSharedWithMeBox sensor={sensor} onRemove={() => {
                                        setSensors(sensors.filter(x => x.sensor !== sensor.sensor))
                                    }} />
                                </Box>
                            </a>
                        ))}
                    </Flex>
                </>}
            <ShareResultDialog isOpen={showShareResult} onClose={() => setShowShareResult(false)} result={shareResult} progress={shareProgress} />
        </Box>
    );
};

const ShareResultDialog = ({ isOpen, onClose, result, progress }) => {
    let isSharing = progress[0] !== progress[1]
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{i18next.t("share_result")}</ModalHeader>
                <ModalBody>
                    {isSharing && <Box>
                        <Progress value={progress[0]} max={progress[1]} />
                        {addVariablesInString(i18next.t("sharing_progress"), [progress[0], progress[1]])}
                    </Box>
                    }
                    <Grid templateColumns={{ base: "repeat(1, 1fr)" }} gap={4}>
                        {result.map((r, index) => (
                            <Box key={index} color={r.result}>
                                <Box>
                                    {!r.code ? <>
                                        {addVariablesInString(i18next.t("sensor_shared_to_email"), [r.name, r.email])}
                                    </> : <>
                                        {addVariablesInString(i18next.t("sensor_not_shared_to_email"), [r.name, r.email])}
                                    </>}
                                </Box>
                                {r.code && <Box>
                                    <span>{i18next.t("error")}: </span>
                                    <span style={{ fontWeight: 800 }}>{i18next.t(`UserApiError.${r.code}`)}</span>
                                </Box>}
                            </Box>
                        ))}
                    </Grid>
                </ModalBody>
                <ModalFooter>
                    <Button onClick={onClose}>{i18next.t("close")}</Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
}

export default ShareCenter;