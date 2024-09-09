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
            let min = range.min
            let max = range.max
            if (range.extended) {
                if (this.props.value.min < range.min) {
                    min = range.extended.min
                    max = range.extended.max
                } else if (this.props.value.max > range.max) {
                    min = range.extended.min
                    max = range.extended.max
                }
            }
            var uh = getUnitHelper(this.props.type)
            range.max = uh.value(max)
            range.min = uh.value(min)
        }
        if (this.props.value.max > range.max) range.max = this.props.value.max
        if (this.props.value.min < range.min) range.min = this.props.value.min
        return range
    }
    onChange(values, final) {
        if (this.props.type === "temperature") {
            values = [temperatureFromUserFormat(values[0]), temperatureFromUserFormat(values[1])]
        } else if (this.props.type === "pressure") {
            values = [pressureFromUserFormat(values[0]), pressureFromUserFormat(values[1])]
        }
        this.props.onChange(values, final)
    }
    render() {
        var range = getAlertRange(this.props.type)
        var max = this.props.value.max
        if (max == null) max = range.max;
        var min = this.props.value.min
        if (min == null) min = range.min;
        var uh = getUnitHelper(this.props.type)
        if (this.props.type === "temperature" || this.props.type === "pressure") {
            max = uh.value(max)
            min = uh.value(min)
        }
        var sliderValues = [min, max]
        return <div style={{ display: 'flex', alignItems: 'center', marginLeft: 4, marginRight: 4 }}>
            <Range {...this.state.range} values={sliderValues}
                step={this.props.type === "pressure" && uh.unit === "Pa" ? 100 : 1}
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
                        {children}
                    </div>
                )}
                renderThumb={({ props }) => (
                    <div
                        {...props}
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