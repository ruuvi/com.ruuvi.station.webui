import React, { Component } from "react";
import {
    IconButton
} from "@chakra-ui/react"
import { CloseIcon } from "@chakra-ui/icons";
import { withRouter } from "react-router";
import { addListener, removeListener } from "../utils/shortcuts";

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
        this.props.history.push('/')
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