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
    Box,
} from "@chakra-ui/react"

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
            <>
                <Modal isOpen={this.props.open} onClose={() => this.props.onClose(false)} size="xl" isCentered>
                    <ModalOverlay />
                    <ModalContent>
                        <ModalHeader>{this.props.title}</ModalHeader>
                        <ModalCloseButton />
                        <ModalBody mb="3">
                            {this.props.description && <Box mb="2">{this.props.description}</Box>}
                            <Input value={this.state.value} type={this.props.number ? "number" : ""} onChange={e => this.updateInput(e)} />
                            <div style={{ textAlign: "right" }}>
                                <Button onClick={this.update.bind(this)} mt="2" disabled={this.props.number && isNaN(this.getNumber())}>{this.props.buttonText}</Button>
                            </div>
                        </ModalBody>
                    </ModalContent>
                </Modal>
            </>
        )
    }
}

export default InputDialog;