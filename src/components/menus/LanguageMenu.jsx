import React from "react";
import { useTranslation } from 'react-i18next';
import { uppercaseFirst } from "../../TextHelper";
import RadioInput from "../common/RadioInput";

const langs = ["en", "fi", "sv", "fr", "de"];
const radioLangs = [
    {label: "language_english", value: "en"},
    {label: "language_finnish", value: "fi"},
    {label: "language_swedish", value: "sv"},
    {label: "language_french", value: "fr"},
    {label: "language_german", value: "de"}
];

function LanguageMenu(props) {
    const { i18n } = useTranslation();

    const langChange = (lng) => {
        localStorage.setItem("selected_language", lng)
        i18n.changeLanguage(lng);
        props.onChange(lng)
    }

    if (props.loginPage) {
        return (
            <>
                {langs.map(x => {
                    return <span key={x} style={{ fontFamily: "mulish", margin: 6, fontWeight: "bold", cursor: "pointer", textDecoration: (i18n.language || "en") === x ? "underline" : "" }} onClick={() => langChange(x)}>{uppercaseFirst(x)}</span>
                })}
            </>
        )
    }
    return (
        <RadioInput label={"language"} value={i18n.language || "en"} options={radioLangs} onChange={v => langChange(v)} loading={props.loading} />
    )
}

export default LanguageMenu;
