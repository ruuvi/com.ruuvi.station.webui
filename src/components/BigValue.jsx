import { ruuviTheme } from "../themes";

const valueStyle = {
    fontFamily: "oswald",
    fontSize: 38,
    fontWeight: "bold"
}
const unitStyle = {
    fontFamily: "oswald",
    fontSize: 14,
    marginLeft: 2,
    top: 9,
    position: "absolute",
}


export default function BigValue(props) {
    return (
        <div>
            <div style={{ position: "relative", color: props.alertActive ? ruuviTheme.colors.sensorCardValueAlertState : undefined }}>
                <span style={valueStyle}>
                    {props.value || "-"}
                </span>
                <span style={unitStyle}>
                    {props.unit}
                </span>
            </div>
        </div>
    );
}