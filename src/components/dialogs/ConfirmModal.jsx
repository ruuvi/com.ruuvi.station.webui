import React from 'react';
import { Button, Dialog, Portal, Spinner } from '@chakra-ui/react';
import i18next from 'i18next';


const ConfirmModal = ({ isOpen, title, message, onClose, onConfirm, loading }) => {
    const handleKeyDown = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            onConfirm();
        }
    }
    return (
        <Dialog.Root open={!!isOpen} onOpenChange={(e) => { if (!e.open) onClose() }}>
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content onKeyDown={handleKeyDown}>
                        <Dialog.Header>{title}</Dialog.Header>
                        <Dialog.Body>
                            {message}
                        </Dialog.Body>
                        <Dialog.Footer>
                            {loading ? <Spinner size="xl" /> : <>
                                <Button onClick={onClose}>{i18next.t("cancel")}</Button>
                                <Button onClick={onConfirm} ml={3}>
                                    {i18next.t("ok")}
                                </Button>
                            </>}
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    )
}

export default ConfirmModal;
