export function isBatteryLow(voltage, temperature) {
    if (temperature < -20) {
        return voltage < 2000
    } else if (temperature < 0) {
        return voltage < 2300
    } else {
        return voltage < 2500
    }
}
