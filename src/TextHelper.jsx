export function uppercaseFirst(string) {
    string = string.toLowerCase();
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function addHighlight(str, highlightedText) {
    return str.split(highlightedText).map((x, i, all) => {
        return <>{x}{i === all.length - 1 ? null : <span style={{ color: "#f15a24" }}>{highlightedText}</span>}</>
    })
}

export function addNewlines(str, newlineChar, highlightedText) {
    return str.split(newlineChar || "\n").map((x, i, all) => {
        x = addHighlight(x, highlightedText)
        return <p style={{ marginTop: i > 0 ? 10 : undefined }} key={Math.random()}>{x}</p>
    })
}

export function addLink(str, key, link, andNewLines, highlightedText) {
    return str.split(key).map((x, i, all) => {
        if (andNewLines) x = addNewlines(x, undefined, highlightedText)
        return <>{x}{i === all.length - 1 ? null : <a href={link} style={{ textDecoration: "underline" }} target="_blank" rel="noreferrer">{key} ⇗</a>}</>
    })
}

export function addVariablesInString(str, variables) {
    for (let i = 0; i < variables.length; i++) {
        str = str.replace(/{.*?\}/, variables[i])
    }
    return str
}