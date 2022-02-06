import React, { Component } from "react";
import {
    IconButton
} from "@chakra-ui/react"
import { ArrowBackIcon, ArrowForwardIcon } from "@chakra-ui/icons";

class NavPrevNext extends Component {
    componentDidMount() {
    }
    componentWillUnmount() {
    }
    clicked() {
        this.props.history.push('/')
    }
    render() {
        return (
            <>
                <IconButton isRound={true} onClick={() => this.props.prev()} style={{ backgroundColor: "#f0faf9", color: "#26ccc0", marginTop: "2px", marginRight: "5px" }}><ArrowBackIcon /></IconButton>
                <IconButton isRound={true} onClick={() => this.props.next()} style={{ backgroundColor: "#f0faf9", color: "#26ccc0", marginTop: "1px", marginRight: "5px" }}><ArrowForwardIcon /></IconButton>
            </>
        )
    }
}

export default NavPrevNext;