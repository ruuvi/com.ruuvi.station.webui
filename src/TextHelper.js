export function uppercaseFirst(string) {
    string = string.toLowerCase();
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export function addNewlines(str) {
    return str.split("\n").map(x => <span key={x}>{x}<br /></span>)
}