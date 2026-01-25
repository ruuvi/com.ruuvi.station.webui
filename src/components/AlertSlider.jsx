import React from "react";
import { Range, getTrackBackground } from 'react-range';
import { getAlertRange, getUnitHelper, pressureFromUserFormat, temperatureFromUserFormat } from '../UnitHelper';
import { withTranslation } from "react-i18next";
import { ruuviTheme } from "../themes";

function getColor(gray, alert) {
    if (alert) return ruuviTheme.colors.sensorCardValueAlertState
    return `rgba(67,199,186,${gray ? 0.2 : 1})`
}
class AlertSlider extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            range: this.getRange(),
        }
    }
    getRange() {
        var range = getAlertRange(this.props.type)
        if (this.props.type === "temperature" || this.props.type === "pressure") {
            if (range.extended) {
                if (this.props.value.min < range.min ||
                    this.props.value.max > range.max) {
                    range.min = range.extended.min
                    range.max = range.extended.max
                }
            }
        }
        if (this.props.value.max > range.max) range.max = this.props.value.max
        if (this.props.value.min < range.min) range.min = this.props.value.min
        if (this.props.type === "pressure" || this.props.type === "temperature" || this.props.type === "dewPoint" || this.props.type === "battery") {
            // For dewPoint, use temperature unit helper
            var uh = this.props.type === "dewPoint" ? getUnitHelper("temperature") : getUnitHelper(this.props.type)
            range.max = uh.value(range.max)
            range.min = uh.value(range.min)
        }
        return range
    }
    onChange(values, final) {
        if (this.props.type === "temperature" || this.props.type === "dewPoint") {
            values = [temperatureFromUserFormat(values[0]), temperatureFromUserFormat(values[1])]
        } else if (this.props.type === "pressure") {
            values = [pressureFromUserFormat(values[0]), pressureFromUserFormat(values[1])]
        } else if (this.props.type === "battery") {
            values = [values[0] * 1000, values[1] * 1000]
        }
        // always keep min and max different
        if (values[0] === values[1]) {
            // figure out which value has changed
            let oldMin = this.props.value.min
            if (oldMin === values[0]) {
                values[1] = values[0] + 1
            } else {
                values[0] = values[1] - 1
            }
        }
        this.props.onChange(values, final)
    }
    render() {
        var range = getAlertRange(this.props.type)
        var max = this.props.value.max
        if (max == null) max = range.max;
        var min = this.props.value.min
        if (min == null) min = range.min;
        // For dewPoint, use temperature unit helper
        var uh = this.props.type === "dewPoint" ? getUnitHelper("temperature") : getUnitHelper(this.props.type)
        if (this.props.type === "temperature" || this.props.type === "pressure" || this.props.type === "dewPoint" || this.props.type === "battery") {
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
            <Range {...this.getRange()} values={sliderValues}
                step={this.props.type === "pressure" && uh.unit === "Pa" ? 100 : this.props.type === "battery" ? 0.1 : 1}
                disabled={this.props.disabled}
                onChange={values => this.onChange(values, false)}
                onFinalChange={values => this.onChange(values, true)}
                renderTrack={({ props, children }) => (
                    <div
                        {...props}
                        style={{
                            ...props.style,
                            height: '2px',
                            width: '100%',
                            background: getTrackBackground({
                                colors: [getColor(true, true), getColor(this.props.disabled), getColor(true, true)],
                                ...this.state.range,
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
                renderThumb={({ props }) => (
                    <div
                        {...props}
                        key={props.key + this.props.type}
                        style={{
                            ...props.style,
                            borderRadius: '6px',
                            height: '12px',
                            width: '12px',
                            backgroundColor: getColor(this.props.disabled)
                        }}
                    />
                )}
            />
        </div>
    }
};

export default withTranslation()(AlertSlider);