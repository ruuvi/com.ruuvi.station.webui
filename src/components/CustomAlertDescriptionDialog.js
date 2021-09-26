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
} from "@chakra-ui/react"
import { withTranslation } from 'react-i18next';

class CustomAlertDescriptionDialog extends Component {
    constructor(props) {
        super(props)
        this.state = { description: "" }
        if (props.value) this.state.description = props.value;
    }
    componentDidUpdate(prevProps) {
        if (this.props.value && (prevProps.value !== this.props.value)) {
            this.setState({...this.state, description: this.props.value})
        }
    }
    update() {
        this.props.onClose(true, this.state.description)
    }
    render() {
        var { t } = this.props;
        return (
            <>
                <Modal isOpen={this.props.open} onClose={() => this.props.onClose(false)} size="xl">
                    <ModalOverlay />
                    <ModalContent>
                        <ModalHeader>{t("alarm_custom_title_hint")}</ModalHeader>
                        <ModalCloseButton />
                        <ModalBody mb="3">
                            <Input value={this.state.description} onChange={e => this.setState({ ...this.state, description: e.target.value })} />
                            <div style={{ textAlign: "right" }}>
                                <Button onClick={this.update.bind(this)} mt="2">{t("update")}</Button>
                            </div>
                        </ModalBody>
                    </ModalContent>
                </Modal>
            </>
        )
    }
}

export default withTranslation()(CustomAlertDescriptionDialog);