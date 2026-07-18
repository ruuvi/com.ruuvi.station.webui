// Alert types and their allowed value ranges.

// Order matters: this is the display order in alert UIs.
export const alertTypes = ["temperature", "humidity", "humidityAbsolute", "dewPoint", "pressure", "signal", "movement", "offline", "battery", "aqi", "co2", "voc", "nox", "pm10", "pm25", "pm40", "pm100", "luminosity", "sound"];

const DEFAULT_ALERT_RANGE = { max: 100, min: 0 };

// "movement" intentionally has no entry: it falls back to the default range.
const ALERT_RANGES = {
    temperature: { max: 85, min: -40, extended: { max: 150, min: -55 } },
    humidity: { max: 100, min: 0 },
    humidityAbsolute: { max: 50, min: 0 },
    dewPoint: { max: 85, min: -40 },
    pressure: { max: 115500, min: 50000 },
    signal: { max: 0, min: -105 },
    offline: { max: +Infinity, min: 120 },
    battery: { max: 3.6, min: 1.8 },
    aqi: { max: 100, min: 0 },
    co2: { max: 2500, min: 350, extended: { max: 40000, min: 0 } },
    voc: { max: 500, min: 0 },
    nox: { max: 500, min: 0 },
    pm10: { max: 250, min: 0, extended: { max: 1000, min: 0 } },
    pm25: { max: 250, min: 0, extended: { max: 1000, min: 0 } },
    pm40: { max: 250, min: 0, extended: { max: 1000, min: 0 } },
    pm100: { max: 250, min: 0, extended: { max: 1000, min: 0 } },
    luminosity: { max: 144284, min: 0 },
    sound: { max: 127, min: 0 }
};

export function getAlertRange(type) {
    // Copy: callers (e.g. AlertSlider) mutate the returned range.
    const range = { ...(ALERT_RANGES[type] ?? DEFAULT_ALERT_RANGE) };
    if (range.extended) range.extended = { ...range.extended };
    return range;
}
