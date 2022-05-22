import React from "react";
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    IconButton,
} from "@chakra-ui/react"
import { MdClose } from "react-icons/md";

export default function RDialog(props) {
    return (
        <>
            <Modal isOpen={props.isOpen} onClose={props.onClose} size="xl" isCentered>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader style={{ marginTop: 15 }}>{props.title}</ModalHeader>
                    <ModalCloseButton style={{ margin: 15 }}>
                        <IconButton isRound={true} className="navButton"><MdClose /></IconButton>
                    </ModalCloseButton>
                    <ModalBody mb="3">
                        {props.children}
                    </ModalBody>
                </ModalContent>
            </Modal>
        </>
    )
}