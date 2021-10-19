import pen from "../img/pen.svg";

function getStyledText(text) {
    var startB = text.split("<b>")
    if (startB.length === 1) return startB;
    var output = [<span>{startB[0]}</span>];
    for (var i = 1; i < startB.length; i++) {
        var boldSplit = startB[i].split("</b>")
        output.push(<b>{boldSplit[0]}</b>)
        if (boldSplit.length > 0) output.push(<span>{boldSplit[1]}</span>)
    }
    return output;
}
export default function EditableText(props) {
    return <span style={{ ...props.style, cursor: "pointer" }} onClick={props.onClick}>
        {getStyledText(props.text)}
        <img src={pen} style={{ paddingLeft: "10px", display: "inline-block", marginBottom: 2 }} width="23px" height="13px" alt="Pen" />
    </span>
}