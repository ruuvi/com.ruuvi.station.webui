import pen from "../img/pen.svg";

function getStyledText(text) {
    var startB = text.split("<b>")
    if (startB.length === 1) return startB;
    var output = [<span key={"s" + 0}>{startB[0]}</span>];
    for (var i = 1; i < startB.length; i++) {
        var boldSplit = startB[i].split("</b>")
        output.push(<b key={"b" + i}>{boldSplit[0]}</b>)
        if (boldSplit.length > 0) output.push(<span key={"s" + i}>{boldSplit[1]}</span>)
    }
    return output;
}
export default function EditableText(props) {
    let disabledStyle = props.disabled ? { opacity: 0.5, pointerEvents: "none" } : {};
    var extraStyle = {};
    if (props.spread) {
        extraStyle.display = "flex"
        extraStyle.justifyContent = "space-between"
        extraStyle.width = "100%"
    }
    return <span style={{ ...props.style, cursor: !props.disabled ? "pointer" : undefined, ...extraStyle }} onClick={props.disabled ? () => { } : props.onClick}>
        <span style={{ opacity: props.opacity }}>
            <span style={disabledStyle}>
                {getStyledText(props.text)}
            </span>
            {props.children}
        </span>
        <img src={pen} style={{ paddingLeft: "10px", display: "inline-block", marginBottom: 2, ...disabledStyle }} width="23px" height="13px" alt="Pen" />
    </span>
}