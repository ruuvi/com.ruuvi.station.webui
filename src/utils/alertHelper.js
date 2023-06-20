import bell from '../img/icon-bell.svg'
import bellAlert from '../img/icon-bell-alert.svg'
import { Image } from '@chakra-ui/react'

export function getAlertIcon(sensor, type) {
    function getSensorAlertState() {
        let alerts = sensor.alerts
        if (type) alerts = alerts.filter(x => x.type === type)
        if (alerts.find(x => x.enabled && x.triggered)) return 1
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