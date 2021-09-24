import React from "react";
import { Box } from '@chakra-ui/layout';
import { Range, getTrackBackground } from 'react-range';
import { getAlertRange } from '../UnitHelper';

const valuesStyle = {
    fontFamily: "montserrat",
    fontSize: 14,
    fontWeight: 500,
    width: 65,
    textAlign:"center",
    color: "#85a4a3"
}

class AlertSlider extends React.Component {
    constructor(props) {
        super(props)
        var range = getAlertRange(props.type)
        this.state = { ...range }
    }
    render() {
        var max = this.props.value.max 
        if (max == null) max = this.state.range.max;
        var min = this.props.value.min
        if (min == null) min = this.state.range.min;
        var sliderValues = [min,max]
        return <div style={{ display: 'flex', alignItems: 'center' }}>
            <Box style={valuesStyle} alignSelf="start" mr="5">{sliderValues[0]/(this.props.type === "pressure" ? 100 : 1)}</Box>
            <Range {...this.state} values={sliderValues}
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
                                colors: ['#cccccc', '#43c7ba', '#cccccc'],
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
                            backgroundColor: '#43c7ba'
                        }}
                    />
                )}
            />
            <Box style={valuesStyle} alignSelf="end" ml="5">{sliderValues[1]/(this.props.type === "pressure" ? 100 : 1)}</Box>
        </div>
    }
};

export default AlertSlider