export function aqi(pm25, co2) {
    if (pm25 === undefined && co2 === undefined) return null;
    if (isNaN(pm25) || isNaN(co2)) return null;

    const AQI_MAX = 100;

    const PM25_MAX = 60, PM25_MIN = 0;
    const PM25_SCALE = AQI_MAX / (PM25_MAX - PM25_MIN); // ≈ 1.6667

    const CO2_MAX = 2300, CO2_MIN = 420;
    const CO2_SCALE = AQI_MAX / (CO2_MAX - CO2_MIN); // ≈ 0.05319

    function clamp(x, lo, hi) { return Math.min(Math.max(x, lo), hi); }

    function calc_aqi(pm25, co2) {
        if (isNaN(pm25) || isNaN(co2)) { return NaN; }

        pm25 = clamp(pm25, PM25_MIN, PM25_MAX);
        co2 = clamp(co2, CO2_MIN, CO2_MAX);

        const dx = (pm25 - PM25_MIN) * PM25_SCALE; // 0..100
        const dy = (co2 - CO2_MIN) * CO2_SCALE;  // 0..100

        const r = Math.hypot(dx, dy); // sqrt(dx*dx + dy*dy)
        return clamp(AQI_MAX - r, 0, AQI_MAX);
    }

    let aqi = calc_aqi(pm25, co2);
    return round(aqi, 2);
}
