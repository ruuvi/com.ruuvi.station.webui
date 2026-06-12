import React from "react";
import { Button } from "@chakra-ui/react";

const accordionContent = {
    minHeight: 72,
    marginLeft: 10,
    width: "calc(100% - 16px)",
}

const detailedSubText = {
    fontFamily: "mulish",
    fontSize: "14px",
}

function SensorNotesPreview(props) {
    const [expanded, setExpanded] = React.useState(false)
    const [showMore, setShowMore] = React.useState(false)
    const notesRef = React.useRef(null)

    React.useEffect(() => {
        setExpanded(false)
        setShowMore(false)
    }, [props.text])

    React.useEffect(() => {
        if (expanded) return
        const element = notesRef.current
        if (!element) return

        const updateOverflow = () => {
            setShowMore(element.scrollHeight > element.clientHeight + 1)
        }

        updateOverflow()

        if (typeof ResizeObserver === "undefined") {
            window.addEventListener("resize", updateOverflow)
            return () => window.removeEventListener("resize", updateOverflow)
        }

        const observer = new ResizeObserver(updateOverflow)
        observer.observe(element)
        return () => observer.disconnect()
    }, [expanded, props.text])

    if (!props.text) return null

    return <div style={{ ...accordionContent, paddingTop: 4, paddingBottom: 8 }}>
        <div
            ref={notesRef}
            style={{
                ...(expanded ? {} : {
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 3,
                    overflow: "hidden",
                })
            }}
        >
            <span style={{ ...detailedSubText, whiteSpace: "pre-line" }}>{props.text}</span>
        </div>
        {(expanded || showMore) && <Button
            size="sm"
            variant="shareSensorSelect"
            mt={2}
            mb={1}
            borderRadius="full"
            paddingLeft={5} paddingRight={5}
            style={{ fontFamily: detailedSubText.fontFamily, fontSize: "13px", fontWeight: 700 }}
            onClick={() => setExpanded(!expanded)}
        >
            {props.t(expanded ? "show_less" : "show_more")}
        </Button>}
    </div>
}

export default SensorNotesPreview;
