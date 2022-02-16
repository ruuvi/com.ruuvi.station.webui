import React, { Component } from "react";
import {
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton
} from "@chakra-ui/react"
import { withTranslation } from 'react-i18next';
import Settings from "../states/Settings";

class SettingsModal extends Component {
    render() {
        var { t } = this.props;
        return (
            <Modal isOpen={this.props.open} onClose={this.props.onClose} size="xl" isCentered>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>{t("settings")}</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody mb="3">
                        <Settings isModal />
                    </ModalBody>
                </ModalContent>
            </Modal>
        )
    }
}

export default withTranslation()(SettingsModal);