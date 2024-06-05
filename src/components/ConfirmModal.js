import React from 'react';
import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalOverlay, Spinner } from '@chakra-ui/react';
import i18next from 'i18next';


const ConfirmModal = ({ isOpen, title, message, onClose, onConfirm, loading }) => {
    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            onConfirm();
        }
    }
    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalOverlay />
            <ModalContent onKeyDown={handleKeyDown}>
                <ModalHeader>{title}</ModalHeader>
                <ModalBody>
                    {message}
                </ModalBody>
                <ModalFooter>
                    {loading ? <Spinner size="xl" /> : <>
                        <Button onClick={onClose}>{i18next.t("cancel")}</Button>
                        <Button onClick={onConfirm} ml={3}>
                            {i18next.t("ok")}
                        </Button>
                    </>}
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
}

export default ConfirmModal;