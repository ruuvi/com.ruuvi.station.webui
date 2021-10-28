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
    Box,
} from "@chakra-ui/react"
import { withTranslation } from "react-i18next";

class RangeInputDialog extends Component {
    constructor(props) {
        super(props)
        this.state = { value: [0, 100] };
        if (props.value) this.state.value = props.value;
    }
    componentDidUpdate(prevProps) {
        if (this.props.value && (prevProps.value !== this.props.value)) {
            this.setState({ ...this.state, value: this.props.value })
        }
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
        return true;
    }
    render() {
        return (
            <>
                <Modal isOpen={this.props.open} onClose={() => this.props.onClose(false)} size="xl">
                    <ModalOverlay />
                    <ModalContent>
                        <ModalHeader>{this.props.title}</ModalHeader>
                        <ModalCloseButton />
                        <ModalBody mb="3">
                            <SimpleGrid columns={2} spacing={4}>
                                <span>{this.props.t("min")}</span>
                                <span>{this.props.t("max")}</span>
                            </SimpleGrid>
                            <SimpleGrid columns={2} spacing={4}>
                            <Input value={this.state.value[0]} type={"number"} onChange={e => this.setState({ ...this.state, value: [e.target.value, this.state.value[1]] })} />
                            <Input value={this.state.value[1]} type={"number"} onChange={e => this.setState({ ...this.state, value: [ this.state.value[0], e.target.value] })} />
                            </SimpleGrid>
                            <div style={{ textAlign: "right" }}>
                                <Button onClick={this.update.bind(this)} mt="2" disabled={this.props.number && !this.isValid()}>{this.props.buttonText}</Button>
                            </div>
                        </ModalBody>
                    </ModalContent>
                </Modal>
            </>
        )
    }
}

export default withTranslation()(RangeInputDialog);