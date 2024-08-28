export function durationToText(seconds, t) {
    if (isNaN(seconds)) return "-"
    if (seconds < 60) return `${seconds} ${t("s")}`
    var minutes = Math.floor(seconds / 60);
    var resetSeconds = seconds - minutes * 60;
    if (minutes < 60) return `${minutes} ${t("min")} ${resetSeconds} ${t("s")}`
    var hours = Math.floor(seconds / (60 * 60));
    var restMinutes = minutes - hours * 60;
    if (hours < 24) return `${hours} ${t("h")} ${restMinutes} ${t("min")}`
    var days = Math.floor(seconds / (60 * 60 * 24));
    var restHours = hours - days * 24;
    return `${days} ${t(days > 1 ? "days" : "day").toLowerCase()} ${restHours} ${t("h")}`
}

export function getTimestamp(date) {
    let part_date = `${date.getDate()}.${date.getMonth()+1}.${date.getFullYear()}`
    let part_time = `${("0" + date.getHours()).slice(-2)}:${("0" + date.getMinutes()).slice(-2)}`
    return part_date + " " + part_time
}

export function secondsToUserDateString(seconds) {
    return new Date(seconds * 1000).toLocaleString(navigator.language || "fi-FI")
}