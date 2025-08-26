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
            <Modal isOpen={props.isOpen} onClose={props.onClose} size={props.size || "xl"} >
                <ModalOverlay />
                <ModalContent marginRight={4} marginLeft={4}>
                    <ModalHeader style={{ marginTop: 15, marginRight: 40 }}>{props.title}</ModalHeader>
                    <ModalCloseButton style={{ margin: 15 }}>
                        <IconButton isRound={true} style={{background: "transparent"}} className="navButton" variant="nav"><MdClose /></IconButton>
                    </ModalCloseButton>
                    <ModalBody mb="3">
                        {props.children}
                    </ModalBody>
                </ModalContent>
            </Modal>
        </>
    )
}