export const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
export const MISTRAL_MODEL = "mistral-large-latest";
export const MAX_TOOL_ROUNDS = 6;

export const DEFAULT_READING_FIELDS = [
    "temperature",
    "humidity",
    "pressure",
    "battery",
    "rssi",
    "aqi",
    "co2",
    "voc",
    "nox",
    "pm10",
    "pm25",
    "pm40",
    "pm100",
    "illuminance",
    "soundLevelAvg",
    "movementCounter"
];

export const FIELD_ALIASES = {
    temp: "temperature",
    air_pressure: "pressure",
    signal: "rssi",
    signal_strength: "rssi",
    light: "illuminance",
    luminosity: "illuminance",
    sound: "soundLevelAvg",
    movement: "movementCounter",
    movements: "movementCounter",
    pm1: "pm10",
    pm2_5: "pm25",
    pm4: "pm40",
    particulate_matter_10: "pm100"
};

export const ALERT_TYPE_ALIASES = {
    temp: "temperature",
    air_pressure: "pressure",
    signal_strength: "signal",
    rssi: "signal",
    light: "luminosity",
    illuminance: "luminosity",
    cloud: "offline",
    connection: "offline",
    cloud_connection: "offline",
    movementCounter: "movement",
    movements: "movement",
    soundLevelAvg: "sound"
};
