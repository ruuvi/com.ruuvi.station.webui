import React from "react";
import {
    Dialog,
    IconButton,
    Portal,
} from "@chakra-ui/react"
import { MdClose } from "react-icons/md";

export default function RDialog(props) {
    return (
        <Dialog.Root
            open={!!props.isOpen}
            onOpenChange={(e) => { if (!e.open) props.onClose() }}
            size={props.size || "xl"}
        >
            <Portal>
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content marginRight={4} marginLeft={4}>
                        <Dialog.Header style={{ marginTop: 15, marginRight: 40 }}>{props.title}</Dialog.Header>
                        <Dialog.CloseTrigger asChild>
                            <IconButton rounded="full" aria-label="close" style={{ background: "transparent", margin: 15 }} className="navButton" variant="nav"><MdClose /></IconButton>
                        </Dialog.CloseTrigger>
                        <Dialog.Body mb="3">
                            {props.children}
                        </Dialog.Body>
                        {props.footer}
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    )
}
