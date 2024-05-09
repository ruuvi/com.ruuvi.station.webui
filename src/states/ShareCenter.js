import React, { useEffect } from 'react';
import { Box, Button, Flex, Heading, IconButton, Input } from '@chakra-ui/react';
import NetworkApi from '../NetworkApi';
import pjson from '../../package.json';
import SensorMenu from '../components/SensorMenu';
import { MdClear } from 'react-icons/md';
import notify from '../utils/notify';
import i18next from 'i18next';

const EmailBox = (props) => {
    return (
        <Box className='box' width="250px" height="60px">
            <Flex justifyContent="space-between">
                <span style={{ marginTop: "7px" }}>
                    {props.email}
                </span>
                <IconButton variant="ghost" icon={<MdClear />} onClick={props.onRemove} />
            </Flex>
        </Box>
    )
}

const SensorSharedWithMeBox = (props) => {
    return (
        <Box className='box'>
            <div style={{ fontWeight: 800, fontFamily: "mulish" }}>
                {props.sensor.name}
            </div>
            <div>
                {props.sensor.owner}
            </div>
        </Box>
    )
}

const SensorsSharedByMeBox = (props) => {
    return (
        <div>
            <div style={{ fontWeight: 800, fontFamily: "mulish" }}>
                {props.sensor.name}
            </div>
            <div>
                Active Shares ({props.sensor.sharedTo.length}/{pjson.settings.maxSharesPerSensor})
            </div>
            <Flex gap='2' wrap="wrap" >
                {props.sensor.sharedTo.map((sharedWith, index) => (
                    <EmailBox email={sharedWith} onRemove={() => {
                        var confirmMessage = i18next.t("share_sensor_unshare_confirm").replace("{%@^%1$s}", sharedWith)
                        if (window.confirm(confirmMessage)) {
                            new NetworkApi().unshare(props.sensor.sensor, sharedWith, resp => {
                                switch (resp.result) {
                                    case "success":
                                        var sensor = props.sensor;
                                        sensor.sharedTo = sensor.sharedTo.filter(x => x !== sharedWith)
                                        notify.success(i18next.t(`successfully_unshared`))
                                        props.updateSensor(sensor)
                                        break
                                    case "error":
                                        notify.error(i18next.t(`UserApiError.${resp.code}`))
                                        break;
                                    default:
                                }
                            })
                        }
                    }} />
                ))}
            </Flex>
        </div>
    )
}

const isEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
const SensorPicker = ({ sensors, onSensorChange }) => {
    const [selectedSensor, setSelectedSensor] = React.useState("");

    const handleSensorChange = (event) => {
        const selectedValue = event.target.value;
        console.log("here", selectedValue)
        setSelectedSensor(selectedValue);
        onSensorChange(selectedValue);
    };

    return (
        <div>
            <select id="sensorPicker" value={selectedSensor} onChange={handleSensorChange}>
                <option value="">-- Select --</option>
                {sensors.map((sensor) => (
                    <option key={sensor.sensor} value={sensor.sensor}>
                        {sensor.name || sensor.sensor}
                    </option>
                ))}
            </select>
        </div>
    );
};

const ShareCenter = () => {
    const [sensors, setSensors] = React.useState([]);
    const [selectedSensors, setSelectedSensors] = React.useState([]);
    const [shareToEmails, setShareToEmails] = React.useState([]);
    const [email, setEmail] = React.useState("");

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
                console.log("Sensors", sensors)
            }
        })();
    }, [])

    let sensorsThatCanBeShared = sensors.filter(x => x.userIsOwner && x.sharedTo.length < pjson.settings.maxSharesPerSensor)
    sensorsThatCanBeShared = sensorsThatCanBeShared.filter(sensor => !selectedSensors.includes(sensor.sensor));

    return (
        <Box margin={8} marginLeft={16} marginRight={16}>
            <Heading>
                Share Sensors
            </Heading>
            <p>
                Share sensors with your friends and colleagues
            </p>
            <br />
            <Box className='contentImportant' width="100%" padding="30px">
                <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit
                </p>
                <table width="100%">
                    <tr>
                        <td width="150px" valign="top" style={{ paddingTop: 8, fontWeight: 800, fontFamily: "mulish" }}>Select sensors</td>
                        <td>
                            <SensorPicker sensors={sensorsThatCanBeShared} onSensorChange={s => setSelectedSensors([...selectedSensors, s])} />
                            {selectedSensors.map((sensor, index) => (
                                <Box key={index} marginTop={index ? "30px" : undefined}>
                                    <EmailBox email={sensors.find(x => x.sensor === sensor).name || sensor} onRemove={s => {
                                        setSelectedSensors(selectedSensors.filter(x => x !== sensor))
                                    }} />
                                </Box>
                            ))}
                        </td>
                    </tr>
                    <tr>
                        <td valign="top" style={{ paddingTop: 8, fontWeight: 800, fontFamily: "mulish" }}>Select sensors</td>
                        <td>
                            <Input placeholder="Email" w={"300px"} value={email} onChange={e =>
                                setEmail(e.target.value)
                            } />
                            <Box display={"inline-block"}>
                                <Button ml={4} onClick={() => {
                                    setShareToEmails([...shareToEmails, email])
                                    setEmail("");
                                }} isDisabled={email.length === 0 || !isEmail(email)}>
                                    Add
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
                        </td>
                    </tr>
                </table>
                <Button onClick={() => {
                    for (let sensor of selectedSensors) {
                        for (let email of shareToEmails) {
                            new NetworkApi().share(sensor, email, resp => {
                                if (resp.result === "success") {
                                    let sensor = sensors.find(x => x.sensor === sensor)
                                    sensor.sharedTo.push(email)
                                    setSensors([...sensors])
                                }
                            })
                        }
                    }
                }} >
                    Share
                </Button>
            </Box>
            <br />
            <Heading size="lg">Shared by me</Heading>
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
            <Heading size="lg">Shared to me</Heading>
            <hr />
            <br />
            <Flex gap='2' wrap="wrap">
                {sensors.filter(x => !x.userIsOwner).map((sensor, index) => (
                    <a key={index} href={"/" + sensor.sensor}>
                        <Box key={index} width="250px">
                            <SensorSharedWithMeBox sensor={sensor} />
                        </Box>
                    </a>
                ))}
            </Flex>
        </Box>
    );
};

export default ShareCenter;