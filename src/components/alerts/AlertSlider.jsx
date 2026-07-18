import React from "react";
import { Range, getTrackBackground } from 'react-range';
import { getAlertRange, getUnitHelper, pressureFromUserFormat, temperatureFromUserFormat } from '../../UnitHelper';
import { ruuviTheme } from "../../themes";

function getColor(gray, alert) {
    if (alert) return ruuviTheme.colors.sensorCardValueAlertState
    return `rgba(67,199,186,${gray ? 0.2 : 1})`
}

function AlertSlider(props) {
    const getRange = () => {
        var range = getAlertRange(props.type)
        if (range.extended) {
            if (props.value.min < range.min ||
                props.value.max > range.max) {
                range.min = range.extended.min
                range.max = range.extended.max
            }
        }
        if (props.value.max > range.max) range.max = props.value.max
        if (props.value.min < range.min) range.min = props.value.min
        if (props.type === "pressure" || props.type === "temperature" || props.type === "dewPoint") {
            // For dewPoint, use temperature unit helper
            var uh = props.type === "dewPoint" ? getUnitHelper("temperature") : getUnitHelper(props.type)
            range.max = uh.value(range.max)
            range.min = uh.value(range.min)
        }
        return range
    }

    // the slider bounds and the track background must use the same range, otherwise
    // the colored area drifts away from the thumbs when the range widens
    const trackRange = getRange();

    const onChange = (values, final) => {
        if (props.type === "temperature" || props.type === "dewPoint") {
            values = [temperatureFromUserFormat(values[0]), temperatureFromUserFormat(values[1])]
        } else if (props.type === "pressure") {
            values = [pressureFromUserFormat(values[0]), pressureFromUserFormat(values[1])]
        }
        // always keep min and max different
        if (values[0] === values[1]) {
            // figure out which value has changed
            let oldMin = props.value.min
            if (oldMin === values[0]) {
                values[1] = values[0] + 1
            } else {
                values[0] = values[1] - 1
            }
        }
        props.onChange(values, final)
    }

    var range = getAlertRange(props.type)
    var max = props.value.max
    if (max == null) max = range.max;
    var min = props.value.min
    if (min == null) min = range.min;
    // For dewPoint, use temperature unit helper
    var uh = props.type === "dewPoint" ? getUnitHelper("temperature") : getUnitHelper(props.type)
    if (props.type === "temperature" || props.type === "pressure" || props.type === "dewPoint") {
        min = uh.value(min)
        max = uh.value(max)
    }
    if (min > max) {
        var tmp = min
        min = max
        max = tmp
    }
    var sliderValues = [min, max]

    return <div style={{ display: 'flex', alignItems: 'center', marginLeft: 4, marginRight: 4 }}>
        <Range min={trackRange.min} max={trackRange.max} values={sliderValues}
            step={props.type === "pressure" && uh.unit === "Pa" ? 100 : props.type === "battery" ? 0.1 : 1}
            disabled={props.disabled}
            onChange={values => onChange(values, false)}
            onFinalChange={values => onChange(values, true)}
            renderTrack={({ props: trackProps, children }) => (
                <div
                    {...trackProps}
                    style={{
                        ...trackProps.style,
                        height: '2px',
                        width: '100%',
                        background: getTrackBackground({
                            colors: [getColor(true, true), getColor(props.disabled), getColor(true, true)],
                            ...trackRange,
                            values: sliderValues
                        }),
                    }}
                >
                    {children.map((child, i) => {
                        if (min === max) {
                            if (min === range.min) {
                                if (i === 0) {
                                    child.props.style.display = "none"
                                }
                            }
                            if (min === range.max) {
                                if (i === 1) {
                                    child.props.style.display = "none"
                                }
                            }
                        }
                        return child
                    })}
                </div>
            )}
            renderThumb={({ props: thumbProps }) => (
                <div
                    {...thumbProps}
                    key={thumbProps.key + props.type}
                    style={{
                        ...thumbProps.style,
                        borderRadius: '6px',
                        height: '12px',
                        width: '12px',
                        backgroundColor: getColor(props.disabled)
                    }}
                />
            )}
        />
    </div>
}

export default AlertSlider;
