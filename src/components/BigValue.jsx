import { ruuviTheme } from "../themes";
import { useColorMode } from "@chakra-ui/react";

const valueStyle = {
    fontFamily: "oswald",
    fontWeight: "bold"
}
const unitStyle = {
    fontFamily: "oswald",
    maxWidth: 100,
    fontSize: 14,
    top: 9,
    position: "absolute",
    marginLeft: 6,
    whiteSpace: 'nowrap'
}
const labelStyle = {
    fontFamily: "mulish",
    fontSize: 12,
    opacity: 0.7,
    marginLeft: 6,
}

const SCALE_COLORS = {
    UNHEALTHY: { r: 237, g: 80, b: 33 },   // Red
    POOR: { r: 247, g: 156, b: 33 },       // Orange
    MODERATE: { r: 247, g: 225, b: 62 },   // Yellow
    GOOD: { r: 150, g: 204, b: 72 },       // Green
    EXCELLENT: { r: 75, g: 200, b: 185 },  // Turquoise
};

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const rgb = ({ r, g, b }) => `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
function colorAtValueRounded(val) {
    const v = clamp(val ?? 0, 0, 100);

    if (v < 9.5) return SCALE_COLORS.UNHEALTHY;
    if (v < 49.5) return SCALE_COLORS.POOR;
    if (v < 79.5) return SCALE_COLORS.MODERATE;
    if (v < 89.5) return SCALE_COLORS.GOOD;
    return SCALE_COLORS.EXCELLENT;
}

function rgbaString(color, alpha) {
    const c = typeof color === 'string' ? color : rgb(color);
    if (c.startsWith('rgb(')) {
        const nums = c
            .replace('rgb(', '')
            .replace(')', '')
            .split(',')
            .map((n) => parseInt(n.trim(), 10));
        return `rgba(${nums[0]}, ${nums[1]}, ${nums[2]}, ${alpha})`;
    }
    return c;
}

export default function BigValue(props) {
    let { value, unit, alertActive, label, showExtras } = props;
    const { colorMode } = useColorMode();
    let extras = <></>
    if (unit === "/100" && value != null && value !== "-") {
        const trackBg = colorMode === "dark" ? "rgb(7, 28, 27)" : "rgb(235, 240, 241)";
        value = clamp(parseFloat(value ?? 0), 0, 100);
        const markerColor = colorAtValueRounded(value);
        const markerLeft = `${value}%`;
        const glow = rgbaString(markerColor, 0.8);

        const barHeight = 4;

        const barStyle = {
            position: "relative",
            width: "40%",
            height: barHeight,
            borderRadius: 4,
            backgroundColor: trackBg,
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
            overflow: "visible",
        };
        const fillStyle = {
            position: "absolute",
            height: "100%",
            width: `${value}%`,
            background: rgb(markerColor),
            borderRadius: 4,
        };
        const markerStyle = {
            position: "absolute",
            left: markerLeft,
            width: 5,
            height: barHeight,
            borderRadius: 6,
            background: rgb(markerColor),
            transform: "translateX(-50%)",
            boxShadow: `0 0 10px 3px ${glow}, 0 0 1px 1px ${rgbaString(markerColor, 0.9)}`,
            zIndex: 1,
            pointerEvents: "none",
        };

        if (label) {
            extras = (
                <div style={barStyle} aria-label={`Value ${Math.round(value)} out of 100`}>
                    <div style={fillStyle} />
                    <div style={markerStyle} />
                </div>
            )
        }
    }
    let isMobile = window.innerWidth <= 768;
    let alertColor = colorMode === "light" ? ruuviTheme.colors.sensorCardValueAlertStateLightTheme : ruuviTheme.colors.sensorCardValueAlertState;
    return (
        <div>
            <div style={{ position: "relative" }}>
                <span style={{ ...valueStyle, color: alertActive ? alertColor : undefined, fontSize: isMobile ? 34 : 38 }}>
                    {value ?? "-"}
                </span>
                <span style={unitStyle}>
                    {unit}
                </span>
                {label && <span style={labelStyle}>
                    {label}
                </span>}
            </div>
            {extras}
        </div>
    );
}