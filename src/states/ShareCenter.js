import React, { useEffect } from 'react';
import { Box, Button, Flex, Grid, GridItem, Heading, IconButton, Input, Menu, MenuButton, MenuDivider, MenuItem, MenuList, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalOverlay, Progress, Spinner, Tooltip } from '@chakra-ui/react';
import NetworkApi from '../NetworkApi';
import pjson from '../../package.json';
import { MdArrowDropDown, MdClear } from 'react-icons/md';
import notify from '../utils/notify';
import i18next from 'i18next';
import { addVariablesInString } from "../TextHelper";
import RemoveSensorDialog from '../components/RemoveSensorDialog';

const EmailBox = (props) => {
    return (
        <Box className='box' width="250px" height="40px" display="flex" alignItems="center" justifyContent="space-between">
            <Tooltip label={props.email} placement="top" >
                <Box as="span" alignItems="center" display="inline-block" maxWidth="100%" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                    {props.email}
                </Box>
            </Tooltip>
            <IconButton variant="ghost" icon={<MdClear />} onClick={props.onRemove} />
        </Box>
    )
}

const SensorSharedWithMeBox = ({ email, sensor, onRemove }) => {
    const [remove, setRemove] = React.useState(false);

    return (
        <Box className='box'>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 800, fontFamily: "mulish" }}>
                    {sensor.name || sensor.sensor}
                </div>
                <IconButton variant="ghost" margin={-2} icon={<MdClear />} onClick={e => {
                    e.preventDefault()
                    setRemove(true)
                }} />
            </div>
            <div style={{ fontSize: 14 }}>
                {sensor.owner} | {sensor.subscription.subscriptionName}
            </div>
            <RemoveSensorDialog open={remove} sensor={sensor} t={i18next.t} onClose={() => setRemove(false)} remove={() => {
                setRemove(false)
                onRemove()
                notify.success(i18next.t(`successfully_removed`))
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
            <div>
                {i18next.t("active_shares")} ({props.sensor.sharedTo.length}/{pjson.settings.maxSharesPerSensor})
            </div>
            <Flex gap='2' wrap="wrap" >
                {props.sensor.sharedTo.map((sharedWith, index) => (
                    <EmailBox email={sharedWith} onRemove={() => {
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
const SensorPicker = ({ sensors, canBeShared, onSensorChange }) => {

    const handleSensorChange = (selectedSensor) => {
        onSensorChange(selectedSensor);
    };

    return (
        <Menu autoSelect={false} strategy="fixed" placement="bottom-end">
            <MenuButton as={Button} variant="topbar" rightIcon={<MdArrowDropDown size={26} className="buttonSideIcon" style={{ marginLeft: -10, marignRight: -10 }} />} style={{ backgroundColor: "transparent", fontFamily: "mulish", fontSize: 15, fontWeight: 800, paddingRight: 0, paddingLeft: 4 }}>
                {i18next.t("sensors")}
            </MenuButton>
            <MenuList mt="2" zIndex={10}>
                {sensors.map((x, i) => {
                    if (!x) return null
                    let divider = <></>
                    let borderStyle = {};
                    if (i === sensors.length - 1) borderStyle = { borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }
                    else divider = <MenuDivider />
                    return <div key={x.sensor + "div"}>
                        <MenuItem key={x.sensor} isDisabled={!canBeShared.map(y => y.sensor).includes(x.sensor)} className={"ddlItem"} style={{ ...borderStyle }} onClick={() => handleSensorChange(x.sensor)}>{x.name || x.sensor}</MenuItem>
                        {divider}
                    </div>
                })}
            </MenuList>
        </Menu>
    )
};

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

    useEffect(() => {
        (async () => {
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
                setLoading(false)
            }
        })();
    }, [])

    const getSensorName = mac => {
        let sensor = sensors.find(x => x.sensor === mac)
        return sensor ? sensor.name || mac : mac
    }

    let mySensors = sensors.filter(x => x.userIsOwner)
    let sensorsThatCanBeShared = mySensors.filter(x => x.sharedTo.length < pjson.settings.maxSharesPerSensor)
    sensorsThatCanBeShared = sensorsThatCanBeShared.filter(sensor => !selectedSensors.includes(sensor.sensor));

    return (
        <Box margin={8} marginLeft={16} marginRight={16}>
            <Heading>
                {i18next.t("share_center")}
            </Heading>
            <p>
                {i18next.t("share_center_subtitle")}
            </p>
            <br />
            {loading ?
                <center style={{ position: "relative", top: "50%", marginTop: 50, transform: "translateY(-50%)" }}>
                    <Spinner size="xl" />
                </center>
                :
                <>
                    <Box className='contentImportant' width="100%" padding={{ base: "5px", md: "30px" }}>
                        <Box mb={8}>
                            {i18next.t("share_center_description")}
                        </Box>

                        <Grid templateColumns={{ base: "repeat(1, 1fr)", md: "repeat(5, 1fr)" }} gap={2}>
                            <GridItem colSpan={{ base: 1, md: 1 }}>
                                <span valign="top" style={{ paddingTop: 8, fontWeight: 800, fontFamily: "mulish" }}>{i18next.t("select_sensor")}</span>
                            </GridItem>
                            <GridItem colSpan={{ base: 1, md: 4 }}>
                                <SensorPicker sensors={mySensors} canBeShared={sensorsThatCanBeShared} onSensorChange={s => setSelectedSensors([...selectedSensors, s])} />
                                <Flex gap='2' wrap="wrap" mt={1} mb={3} >
                                    {selectedSensors.map((sensor, index) => (
                                        <Box key={index}>
                                            <EmailBox email={sensors.find(x => x.sensor === sensor).name || sensor} onRemove={s => {
                                                setSelectedSensors(selectedSensors.filter(x => x !== sensor))
                                            }} />
                                        </Box>
                                    ))}
                                </Flex>
                            </GridItem>
                        </Grid>

                        <br />

                        <Grid templateColumns={{ base: "repeat(1, 1fr)", md: "repeat(5, 1fr)" }} gap={2}>
                            <GridItem colSpan={{ base: 1, md: 1 }}>
                                <span valign="top" style={{ paddingTop: 8, fontWeight: 800, fontFamily: "mulish" }}>{i18next.t("email")}</span>
                            </GridItem>
                            <GridItem colSpan={{ base: 1, md: 4 }}>
                                <Input placeholder={i18next.t("email")} w={"250px"} mr={2} mb={2} value={email} onChange={e =>
                                    setEmail(e.target.value)
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
                                <Flex gap='2' wrap="wrap" mt={3} >
                                    {shareToEmails.map((email, index) => (
                                        <EmailBox email={email} onRemove={() => {
                                            let newEmails = [...shareToEmails]
                                            newEmails.splice(index, 1)
                                            setShareToEmails(newEmails)
                                        }} />
                                    ))}
                                </Flex>
                            </GridItem>
                        </Grid>

                        <Grid templateColumns={{ base: "repeat(1, 1fr)", md: "repeat(5, 1fr)" }} gap={2} mt={4}>
                            <GridItem colSpan={{ base: 1, md: 1 }}>
                            </GridItem>
                            <GridItem colSpan={{ base: 1, md: 4 }}>
                                <Button isDisabled={selectedSensors.length === 0 || shareToEmails.length === 0 || shareLoading}
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
                                                    let thisSensor = sensors.find(x => x.sensor === sensor)
                                                    thisSensor.sharedTo.push(email)
                                                    setSensors([...sensors])
                                                    result.push({ sensor, name: getSensorName(sensor), email, result: "success" })
                                                } catch (e) {
                                                    notify.error(e.message)
                                                    result.push({ sensor, name: getSensorName(sensor), email, result: "error", code: e.code })
                                                }
                                                progress++
                                                setShareProgress([progress, selectedSensors.length * shareToEmails.length])
                                            }
                                        }
                                        setShareLoading(false)
                                        setShareResult(result)
                                    }} >
                                    {i18next.t("share")}
                                </Button>
                            </GridItem>
                        </Grid>

                    </Box>
                    <br />
                    <Heading size="lg">{i18next.t("shared_by_me")}</Heading>
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
                    <Heading size="lg">{i18next.t("shared_to_me")}</Heading>
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

const ConfirmModal = ({ isOpen, title, message, onClose, onConfirm, loading }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{title}</ModalHeader>
                <ModalBody>
                    {message}
                </ModalBody>
                <ModalFooter>
                    {loading ? <Spinner size="xl" /> : <>
                        <Button onClick={onClose}>{i18next.t("cancel")}</Button>
                        <Button onClick={onConfirm} ml={3}>
                            {i18next.t("ok")}
                        </Button>
                    </>}
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
}

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