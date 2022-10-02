import React, { Component } from "react";
import {
    Button,
    Input,
    SimpleGrid,
    FormControl,
    FormLabel,
} from "@chakra-ui/react"
import { withTranslation } from "react-i18next";
import RDialog from "./RDialog";

class RangeInputDialog extends Component {
    constructor(props) {
        super(props)
        this.state = { value: [props.range.min, props.range.max] };
        if (props.value) this.state.value = props.value;
    }
    update() {
        var value = this.state.value;
        if (this.props.number) {
            for (var i = 0; i < value.length; i++) {
                value[i] = parseFloat(value[i]);
                if (isNaN(value[i])) {
                    this.props.onClose(false)
                    return
                }
            }
        }
        this.props.onClose(true, value)
    }
    isValid() {
        var value = JSON.parse(JSON.stringify(this.state.value));
        for (var i = 0; i < value.length; i++) {
            value[i] = parseFloat(value[i]);
            if (isNaN(value[i])) {
                return false
            }
        }
        if (parseFloat(value[0]) < this.props.range.min) return false
        if (parseFloat(value[1]) > this.props.range.max) return false
        if (value[0] > value[1]) return false
        return true;
    }
    render() {
        var unit = this.props.unit();
        return (
            <RDialog title={this.props.title} isOpen={this.props.open} onClose={() => this.props.onClose(false)}>
                <FormControl isInvalid={!this.isValid()}>
                    <SimpleGrid columns={2} spacing={4}>
                        <span>
                            <FormLabel>{this.props.t("min") + (unit ? ` (${this.props.range.min} ${unit})` : "")}</FormLabel>
                            <Input autoFocus value={this.state.value[0]} type={"number"} onChange={e => this.setState({ ...this.state, value: [e.target.value, this.state.value[1]] })} />
                        </span>
                        <span>
                            <FormLabel>{this.props.t("max") + (unit ? ` (${this.props.range.max} ${unit})` : "")}</FormLabel>
                            <Input value={this.state.value[1]} type={"number"} onChange={e => this.setState({ ...this.state, value: [this.state.value[0], e.target.value] })} />
                        </span>
                    </SimpleGrid>
                </FormControl>
                <div style={{ textAlign: "right" }}>
                    <Button onClick={this.update.bind(this)} mt="17px" disabled={!this.isValid()}>{this.props.buttonText}</Button>
                </div>
            </RDialog>
        )
    }
}

export default withTranslation()(RangeInputDialog);