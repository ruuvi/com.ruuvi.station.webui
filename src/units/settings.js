// Access to user settings stored in localStorage under "settings".

export function readSettings() {
    try { return JSON.parse(localStorage.getItem("settings")) ?? {}; } catch { return {}; }
}

// Settings key per sensor type, for types with selectable units.
export const UNIT_SETTING_KEYS = {
    temperature: "UNIT_TEMPERATURE",
    humidity: "UNIT_HUMIDITY",
    pressure: "UNIT_PRESSURE",
    voc: "UNIT_VOC"
};

export const UNIT_DEFAULTS = {
    UNIT_TEMPERATURE: "C",
    UNIT_HUMIDITY: "0",
    UNIT_PRESSURE: "1",
    UNIT_VOC: "index"
};

export function getUnitSettingFor(key) {
    const settingKey = UNIT_SETTING_KEYS[key];
    if (!settingKey) return null;
    return readSettings()[settingKey] || UNIT_DEFAULTS[settingKey] || null;
}

export function getSetting(key, fallback) {
    const settings = readSettings();
    if (settings[key]) return settings[key];
    return fallback;
}
