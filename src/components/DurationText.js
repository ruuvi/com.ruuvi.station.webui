import React, { Component } from "react";
import { durationToText } from '../TimeHelper';

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
        this.interval = setInterval(() => this.setState({ ...this.state, to: new Date().getTime() / 1000 }), 1000);
    }
    componentWillUnmount() {
        clearInterval(this.interval);
    }
    render() {
        return (
            <>{durationToText( Math.floor(this.state.to - this.state.from), this.props.t)} {this.props.t("ago")} </>
        )
    }
}

export default DurationText;