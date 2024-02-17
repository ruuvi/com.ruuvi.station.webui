import bell from '../img/icon-bell.svg'
import bellAlert from '../img/icon-bell-alert.svg'
import { Image } from '@chakra-ui/react'

export function getAlertIcon(sensor, type) {
    function getSensorAlertState() {
        let alerts = sensor.alerts
        if (type) {
            alerts = alerts.filter(x => x.type === type)
            if (isAlerting(sensor, type)) return 1
        } else {
            const alertTypes = ["temperature", "humidity", "pressure", "offline", "signal", "movement"]
            for (let i = 0; i < alertTypes.length; i++) {
                if (isAlerting(sensor, alertTypes[i])) return 1
            }
        }
        if (alerts.find(x => x.enabled)) return 0
        return -1
    }

    let sensorAlertState = getSensorAlertState()
    let sensorSubscription = sensor.subscription
    let alertIcon = <></>
    if (sensorSubscription.emailAlertAllowed) {
        if (sensorAlertState === 0) alertIcon = <Image src={bell} width="15px" />
        if (sensorAlertState === 1) alertIcon = <Image src={bellAlert} width="15px" className="alarmFadeInOut" />
    }
    return alertIcon
}

export function isAlerting(sensor, type) {
    let alerts = sensor.alerts
    if (type) alerts = alerts.filter(x => x.type === type)
    if (!alerts.find(x => x.enabled)) return false
    let data = sensor.measurements.length === 1 ? sensor.measurements[0] : null
    if (data && data.parsed) {
        let dp = type === "offline" ? data.timestamp : type === "signal" ? data.rssi : data.parsed[type]
        if (alerts.find(x => checkIfShouldBeAlerting(x, dp))) return true
    } else {
        if (alerts.find(x => x.enabled && x.triggered)) return true
    }
    return false
}

export function hasAlertBeenHit(alerts, measurements, type) {
    if (type) alerts = alerts.filter(x => x.type === type)
    if (!alerts.find(x => x.enabled)) return false
    for (let i = 0; measurements && i < measurements.length; i++) {
        let data = measurements[i]
        if (data && data.parsed) {
            let dp = type === "offline" ? data.timestamp : type === "signal" ? data.rssi : data.parsed[type]
            if (alerts.find(x => checkIfShouldBeAlerting(x, dp))) return true
        } else {
            if (alerts.find(x => x.enabled && x.triggered)) return true
        }
    }
    return false
}

function checkIfShouldBeAlerting(alert, data) {
    if (!data) return alert.enabled && alert.triggered
    if (!alert.enabled) return false
    switch (alert.type) {
        case "movement":
            return alert.triggered
        case "offline":
            return data + alert.max < Date.now() / 1000
        default:
            return (data > alert.max || data < alert.min)
    }
}