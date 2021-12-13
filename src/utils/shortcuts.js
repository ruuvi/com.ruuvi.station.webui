var cbs = [];

var listener = function (event) {
    var key = event.key;
    var idx = cbs.findIndex(x => x[0] === key)
    if (idx !== -1) cbs[idx][1]()
}

export function addListener(key, cb) {
    if (!cbs.length) {
        document.addEventListener('keydown', listener);
    }
    cbs.push([key, cb]);
}

export function removeListener(key) {
    var idx = cbs.findIndex(x => x[0] === key)
    if (idx !== -1) cbs.splice(idx, 1);
    if (!cbs.length) {
        document.removeEventListener("keydown", listener);
    }
}