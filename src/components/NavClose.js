import React, { Component } from "react";
import {
    IconButton
} from "@chakra-ui/react"
import { addListener, removeListener } from "../utils/shortcuts";
import SessionStore from "../SessionStore";
import { MdClose } from "react-icons/md";
import { useParams, useNavigate } from "react-router-dom";

class NavClose extends Component {
    constructor(props) {
        super(props)
        this.clicked = this.clicked.bind(this)
    }
    componentDidMount() {
        addListener("Escape", this.clicked);
    }
    componentWillUnmount() {
        removeListener("Escape")
    }
    clicked() {
        if (this.props.params.id) {
            this.props.navigate('/')
        } else {
            this.props.navigate(SessionStore.getBackRoute())
        }
    }
    render() {
        return (
            <>
                <IconButton isRound={true} className="navButton" variant="nav" onClick={this.clicked} style={{ marginTop: "1px", marginRight: "5px" }}><MdClose /></IconButton>
            </>
        )
    }
}

export default (props) => (
    <NavClose
        {...props}
        params={useParams()}
        navigate={useNavigate()}
    />
);