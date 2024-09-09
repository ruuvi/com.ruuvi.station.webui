import React from "react";
import { AlertDialog, AlertDialogBody, AlertDialogCloseButton, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogOverlay, Button } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { addNewlines } from "../TextHelper";

export default function ConfirmationDialog(props) {
    const { t } = useTranslation();
    const close = (yes) => {
        props.onClose(yes)
    }
    return <AlertDialog isOpen={props.open} onClose={() => close()} isCentered>
        <AlertDialogOverlay />
        <AlertDialogContent>
            <AlertDialogHeader>
                {t(props.title)}
            </AlertDialogHeader>
            <AlertDialogCloseButton />
            <AlertDialogBody>
                {addNewlines(t(props.description))}
            </AlertDialogBody>
            <AlertDialogFooter>
                <Button onClick={() => close()}>{t('cancel')}</Button>
                <Button onClick={() => close(true)} ml={3}>{t('confirm')}</Button>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
}