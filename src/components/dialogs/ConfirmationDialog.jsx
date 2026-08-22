import React from "react";
import { Button, CloseButton, Dialog, Portal } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { addNewlines } from "../../TextHelper";

export default function ConfirmationDialog(props) {
    const { t } = useTranslation();
    const close = (yes) => {
        props.onClose(yes)
    }
    return <Dialog.Root role="alertdialog" open={!!props.open} onOpenChange={(e) => { if (!e.open) close() }} placement="center">
        <Portal>
            <Dialog.Backdrop />
            <Dialog.Positioner>
                <Dialog.Content>
                    <Dialog.Header>
                        {t(props.title)}
                    </Dialog.Header>
                    <Dialog.CloseTrigger asChild>
                        <CloseButton size="sm" />
                    </Dialog.CloseTrigger>
                    <Dialog.Body>
                        {addNewlines(t(props.description))}
                    </Dialog.Body>
                    <Dialog.Footer>
                        <Button onClick={() => close()}>{t('cancel')}</Button>
                        <Button onClick={() => close(true)} ml={3}>{t('confirm')}</Button>
                    </Dialog.Footer>
                </Dialog.Content>
            </Dialog.Positioner>
        </Portal>
    </Dialog.Root>
}
