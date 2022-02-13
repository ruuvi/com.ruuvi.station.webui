import React, { Component } from "react";
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    Button,
    Input,
    SimpleGrid,
    FormControl,
    FormLabel,
} from "@chakra-ui/react"
import { withTranslation } from "react-i18next";

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
        var value = this.state.value;
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
            <>
                <Modal isOpen={this.props.open} onClose={() => this.props.onClose(false)} size="xl" isCentered>
                    <ModalOverlay />
                    <ModalContent>
                        <ModalHeader>{this.props.title}</ModalHeader>
                        <ModalCloseButton />
                        <ModalBody mb="3">
                            <FormControl isInvalid={!this.isValid()}>
                                <SimpleGrid columns={2} spacing={4}>
                                    <span>
                                        <FormLabel>{this.props.t("min") + (unit ? ` (${this.props.range.min} ${unit})` : "")}</FormLabel>
                                        <Input autoFocus _focus={{boxShadow: "none"}} value={this.state.value[0]} type={"number"} onChange={e => this.setState({ ...this.state, value: [e.target.value, this.state.value[1]] })} />
                                    </span>
                                    <span>
                                        <FormLabel>{this.props.t("max") + (unit ? ` (${this.props.range.max} ${unit})` : "")}</FormLabel>
                                        <Input _focus={{boxShadow: "none"}} value={this.state.value[1]} type={"number"} onChange={e => this.setState({ ...this.state, value: [this.state.value[0], e.target.value] })} />
                                    </span>
                                </SimpleGrid>
                            </FormControl>
                            <div style={{ textAlign: "right" }}>
                                <Button onClick={this.update.bind(this)} mt="2" disabled={!this.isValid()}>{this.props.buttonText}</Button>
                            </div>
                        </ModalBody>
                    </ModalContent>
                </Modal>
            </>
        )
    }
}

export default withTranslation()(RangeInputDialog);