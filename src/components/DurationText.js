import React, { Component } from "react";
import { durationToText } from '../TimeHelper';
import { ruuviTheme } from "../themes";

class DurationText extends Component {
    constructor(props) {
        super(props)
        this.state = { from: this.props.from, to: new Date().getTime / 1000 }
    }
    componentDidUpdate(prevProps) {
        if (this.props.from !== prevProps.from) {
            this.setState({ ...this.state, from: this.props.from })
        }
    }
    componentDidMount() {
        this.setState({ ...this.state, from: this.props.from, to: new Date().getTime() / 1000 });
        this.interval = setInterval(() => this.setState({ ...this.state, from: this.props.from, to: new Date().getTime() / 1000 }), 1000);
    }
    componentWillUnmount() {
        clearInterval(this.interval);
    }
    render() {
        return (
            <span style={{color: this.props.isAlerting ? ruuviTheme.colors.sensorCardValueAlertState : undefined}}>{durationToText( Math.floor(this.state.to - this.state.from), this.props.t)} {this.props.t("ago")} </span>
        )
    }
}

export default DurationText;