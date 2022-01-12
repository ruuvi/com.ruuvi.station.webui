import React from "react";
import { Range, getTrackBackground } from 'react-range';
import { getAlertRange, getUnitHelper, pressureFromUserFormat, temperatureFromUserFormat } from '../UnitHelper';
import InputDialog from "./InputDialog";
import { withTranslation } from "react-i18next";
import { uppercaseFirst } from "../TextHelper";

function getColor(gray) {
    return `rgba(67,199,186,${gray ? 0.2 : 1})`
}
class AlertSlider extends React.Component {
    constructor(props) {
        super(props)
        var range = getAlertRange(props.type)
        if (this.props.type === "temperature" || this.props.type === "pressure") {
            var uh = getUnitHelper(this.props.type)
            range.max = uh.value(range.max)
            range.min = uh.value(range.min)
        }
        this.state = {
            ...range,
            editMinValue: false,
            editMaxValue: false,
        }
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
        if (max > range.max || min < range.min || min > max) {
            // revert to default if values are fishy
            max = range.max;
            min = range.min;
        }
        var uh = getUnitHelper(this.props.type)
        if (this.props.type === "temperature" || this.props.type === "pressure") {
            max = uh.value(max)
            min = uh.value(min)
        }
        var sliderValues = [min, max]
        return <div style={{ display: 'flex', alignItems: 'center' }}>
            <Range {...this.state} values={sliderValues}
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
                                colors: [getColor(true), getColor(this.props.disabled), getColor(true)],
                                ...this.state,
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
            <InputDialog open={this.state.editMinValue} value={min}
                onClose={(save, value) => (save && value <= max && this.props.onChange([value, max], true)) || this.setState({ ...this.state, editMinValue: false })}
                title={uppercaseFirst(this.props.t("min"))}
                number={true}
                buttonText={this.props.t("update")}
            />
            <InputDialog open={this.state.editMaxValue} value={max}
                onClose={(save, value) => (save && value >= min && this.props.onChange([min, value], true)) || this.setState({ ...this.state, editMaxValue: false })}
                title={uppercaseFirst(this.props.t("max"))}
                number={true}
                buttonText={this.props.t("update")}
            />
        </div>
    }
};

export default withTranslation()(AlertSlider);