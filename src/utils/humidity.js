export function relativeToAbsolute(humidity, temperature) {
    var kelvinTemperature = temperature + 273.15;
    humidity = cgkJ * (humidity * pws(temperature, kelvinTemperature)) / kelvinTemperature;
    humidity /= 100;
    return humidity;
}
export function relativeToDewpoint(humidity, temperature, cFormat) {
    var kelvinTemperature = temperature + 273.15;
    var m = m_fn(temperature);
    var a = a_fn(temperature);
    var tn = tn_fn(temperature);
    var pw = pws(temperature, kelvinTemperature) * humidity / 100 / 100.0;
    if (m != null && a != null && tn != null) {
        var out = tn / ((m / (Math.log10(pw / a))) - 1.0);
        if (cFormat === "F") {
            out = (out * 9.0 / 5.0) + 32.0;
        }
        else if (cFormat === "K") {
            out += 273.15;
        }
        return out;
    } else {
        console.log("err");
        return -1;
    }
}

function pws(celsiusTemperature, kelvinTemperature) {
    if (celsiusTemperature > 0.01) { // estimate for 0°C-373°C
        let n = 1 - (kelvinTemperature / tc)
        let p = tc / kelvinTemperature * (c1 * n + c2 * Math.pow(n, 1.5) + c3 * Math.pow(n, 3) + c4 * Math.pow(n, 3.5) + c5 * Math.pow(n, 4) + c6 * Math.pow(n, 7.5))
        let l = Math.pow(Math.E, p)
        return pc * l
    } else { // estimate for -100°C-0.01°C
        let n = kelvinTemperature / tn
        let p = a0 * (1 - Math.pow(n, -1.5)) + a1 * (1 - Math.pow(n, -1.25))
        let l = Math.pow(Math.E, p)
        return pn * l
    }
}

function tn_fn(c) {
    switch (true) {
        case c <= -20: return 273.1466
        case c <= 50: return 240.7263
        case c <= 100: return 229.3975
        case c <= 150: return 225.1033
        case c <= 200: return 227.1704
        default: return 263.1239
    }
}

function a_fn(c) {
    switch (true) {
        case c <= -20: return 6.114742
        case c <= 50: return 6.116441
        case c <= 100: return 6.004918
        case c <= 150: return 5.856548
        case c <= 200: return 6.002859
        default: return 9.980622
    }
}

function m_fn(c) {
    switch (true) {
        case c <= -20: return 9.778707
        case c <= 50: return 7.591386
        case c <= 100: return 7.337936
        case c <= 150: return 7.27731
        case c <= 200: return 7.290361
        default: return 7.388931
    }
}

const cgkJ = 2.16679; // gk/J
const tc = 647.096; // K
const c1 = -7.85951783;
const c2 = 1.84408259;
const c3 = -11.7866497;
const c4 = 22.6807411;
const c5 = -15.9618719;
const c6 = 1.80122502;
const pc = 22064000.0; // Pa
const tn = 273.16; // K
const a0 = -13.928169;
const a1 = 34.707823;
const pn = 611.657; // Pa

