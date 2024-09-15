import React, { Component } from "react";
import {
    IconButton
} from "@chakra-ui/react"
import { MdArrowBack, MdArrowForward } from "react-icons/md";

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
                <IconButton isRound={true} className="navButton" variant="nav" onClick={() => this.props.prev()} style={{ marginTop: "2px", marginRight: "5px" }}><MdArrowBack /></IconButton>
                <IconButton isRound={true} className="navButton" variant="nav" onClick={() => this.props.next()} style={{ marginTop: "1px", marginRight: "5px" }}><MdArrowForward /></IconButton>
            </>
        )
    }
}

export default NavPrevNext;