import airBackground from "../img/new_bg_air.jpg";
import tagBackground from "../img/new_bg2.jpg";

export function getDefaultSensorPicture(sensor) {
    const dataFormat = sensor?.measurements?.[0]?.parsed?.dataFormat;
    // Match Ruuvi Station's RuuviTag.dataFormatIsAir / ImageInteractor defaults.
    return [6, "e0", "e1", "f0"].includes(dataFormat) ? airBackground : tagBackground;
}
