import React, { Component } from "react";
import {
    IconButton
} from "@chakra-ui/react"
import { withRouter } from "react-router";
import { addListener, removeListener } from "../utils/shortcuts";
import SessionStore from "../SessionStore";
import { MdClose } from "react-icons/md";

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
        if (this.props.match.params.id) {
            this.props.history.push('/')
        } else {
            this.props.history.push(SessionStore.getBackRoute())
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

export default withRouter(NavClose);