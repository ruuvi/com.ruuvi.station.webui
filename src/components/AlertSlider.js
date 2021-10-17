import React from "react";
import { Box } from '@chakra-ui/layout';
import { Range, getTrackBackground } from 'react-range';
import { getAlertRange, localeNumber, temperatureToUserFormat } from '../UnitHelper';
import InputDialog from "./InputDialog";
import { withTranslation } from "react-i18next";
import { uppercaseFirst } from "../TextHelper";
import EditableText from "./EditableText";

const valuesStyle = {
    fontFamily: "montserrat",
    fontSize: 14,
    fontWeight: 500,
    width: 125,
    textAlign: "center",
    color: "#85a4a3",
    cursor: "pointer",
}

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
        var minFormatted = min;
        var maxFormatted = max;
        if (this.props.type === "temperature") {
            minFormatted = temperatureToUserFormat(minFormatted)
            maxFormatted = temperatureToUserFormat(maxFormatted)
        } else if (this.props.type === "pressure") {
            minFormatted /= 100;
            maxFormatted /= 100;
        }
        minFormatted = localeNumber(minFormatted)
        maxFormatted = localeNumber(maxFormatted)
        return <div style={{ display: 'flex', alignItems: 'center' }}>
            <Range {...this.state} values={sliderValues}
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
                onClose={(save, value) => save && value <= max && this.props.onChange([value, max], true) || this.setState({ ...this.state, editMinValue: false })}
                title={uppercaseFirst(this.props.t("min"))}
                number={true}
                buttonText={this.props.t("update")}
            />
            <InputDialog open={this.state.editMaxValue} value={max}
                onClose={(save, value) => save && value >= min && this.props.onChange([min, value], true) || this.setState({ ...this.state, editMaxValue: false })}
                title={uppercaseFirst(this.props.t("max"))}
                number={true}
                buttonText={this.props.t("update")}
            />
        </div>
    }
};

export default withTranslation()(AlertSlider);