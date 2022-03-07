import React, { Component } from "react";
import {
    Button,
    Input,
    Box,
} from "@chakra-ui/react"
import RDialog from "./RDialog";

class InputDialog extends Component {
    constructor(props) {
        super(props)
        this.state = { value: "" }
        if (props.value) this.state.value = props.value;
    }
    update() {
        var value = this.state.value;
        if (this.props.number) {
            value = parseFloat(value);
            if (isNaN(value)) {
                this.props.onClose(false)
                return
            }
        }
        this.props.onClose(true, value)
    }
    getNumber() {
        return parseFloat(this.state.value)
    }
    updateInput(e) {
        var value = e.target.value;
        if (this.props.maxLength) {
            value = value.substring(0, this.props.maxLength)
        }
        this.setState({ ...this.state, value: value })
    }
    render() {
        return (
            <RDialog title={this.props.title} isOpen={this.props.open} onClose={() => this.props.onClose(false)}>
                {this.props.description && <Box mb="2">{this.props.description}</Box>}
                <Input autoFocus value={this.state.value} type={this.props.number ? "number" : ""} onChange={e => this.updateInput(e)} />
                <div style={{ textAlign: "right" }}>
                    <Button onClick={this.update.bind(this)} mt="2" disabled={this.props.number && isNaN(this.getNumber())}>{this.props.buttonText}</Button>
                </div>
            </RDialog>
        )
    }
}

export default InputDialog;