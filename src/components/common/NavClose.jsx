import React, { useCallback, useEffect } from "react";
import {
    IconButton
} from "@chakra-ui/react"
import { addListener, removeListener } from "../../utils/shortcuts";
import SessionStore from "../../SessionStore";
import { MdClose } from "react-icons/md";
import { useParams, useNavigate } from "react-router-dom";

function NavClose() {
    const params = useParams();
    const navigate = useNavigate();

    const clicked = useCallback(() => {
        if (params.id) {
            navigate('/')
        } else {
            navigate(SessionStore.getBackRoute())
        }
    }, [params.id, navigate]);

    useEffect(() => {
        addListener("Escape", clicked);
        return () => removeListener("Escape");
    }, [clicked]);

    return (
        <IconButton isRound={true} className="navButton" variant="nav" onClick={clicked} style={{ marginTop: "1px", marginRight: "5px" }}><MdClose /></IconButton>
    )
}

export default NavClose;
