import React from "react";
import { Range, getTrackBackground } from 'react-range';
import { getAlertRange } from '../UnitHelper';
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
        this.state = {
            ...range,
            editMinValue: false,
            editMaxValue: false,
        }
    }
    render() {
        var max = this.props.value.max
        if (max == null) max = this.state.max;
        var min = this.props.value.min
        if (min == null) min = this.state.min;
        if (max > this.state.max || min < this.state.min || min > max) {
            // revert to default if values are fishy
            max = this.state.max;
            min = this.state.min;
        }
        var sliderValues = [min, max]
        return <div style={{ display: 'flex', alignItems: 'center' }}>
            <Range {...this.state} values={sliderValues}
                step={this.props.type === "pressure" ? 100 : 1}
                disabled={this.props.disabled}
                onChange={values => this.props.onChange(values, false)}
                onFinalChange={values => this.props.onChange(values, true)}
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