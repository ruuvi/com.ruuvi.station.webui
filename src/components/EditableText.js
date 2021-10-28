import pen from "../img/pen.svg";

export default function EditableText(props) {
    return <span style={{ ...props.style, cursor: "pointer" }} onClick={props.onClick}>
            {props.text}
            <img src={pen} style={{ paddingLeft: "10px", display: "inline-block", marginBottom: 2 }} width="23px" height="13px" alt="Pen" />
    </span>
}