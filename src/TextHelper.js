export function uppercaseFirst(string) {
    string = string.toLowerCase();
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export function addNewlines(str, newlineChar) {
    return str.split(newlineChar || "\n").map((x, i) => <p style={{ marginTop: i > 0 ? 10 : undefined }} key={Math.random()}>{x}</p>)
}

export function addVariablesInString(str, variables) {
    for (let i = 0; i < variables.length; i++) {
        str = str.replace(/{(.*?)}/, variables[i])
    }
    return str
}