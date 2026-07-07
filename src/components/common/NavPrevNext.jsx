import React from "react";
import {
    IconButton
} from "@chakra-ui/react"
import { MdArrowBack, MdArrowForward } from "react-icons/md";

function NavPrevNext({ prev, next }) {
    return (
        <>
            <IconButton isRound={true} className="navButton" variant="nav" onClick={prev} style={{ marginTop: "2px", marginRight: "5px" }}><MdArrowBack /></IconButton>
            <IconButton isRound={true} className="navButton" variant="nav" onClick={next} style={{ marginTop: "1px", marginRight: "5px" }}><MdArrowForward /></IconButton>
        </>
    )
}

export default NavPrevNext;
