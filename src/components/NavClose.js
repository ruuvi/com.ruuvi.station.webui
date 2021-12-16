import React, { Component } from "react";
import {
    IconButton
} from "@chakra-ui/react"
import { CloseIcon } from "@chakra-ui/icons";
import { withRouter } from "react-router";
import { addListener, removeListener } from "../utils/shortcuts";
import SessionStore from "../SessionStore";

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
                <IconButton isRound={true} onClick={this.clicked} style={{ backgroundColor: "#f0faf9", color: "#26ccc0", marginTop: "1px", marginRight: "5px" }}><CloseIcon /></IconButton>
            </>
        )
    }
}

export default withRouter(NavClose);