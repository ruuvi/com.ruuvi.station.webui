export function durationToText(seconds, t) {
    if (isNaN(seconds)) return "-"
    if (seconds < 60) return seconds + " " + t("s")
    var minutes = Math.floor(seconds / 60);
    var resetSeconds = seconds - minutes * 60;
    if (minutes < 60) return minutes + " " + t("min") + " " + resetSeconds + " " + t("s")
    var hours = Math.floor(seconds / 3600);
    return hours + " " + t("h") + " " + minutes + " " + t("min")
}