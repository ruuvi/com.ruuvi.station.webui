import { toaster } from '../components/ui/toaster'

function toastIt(text, status, duration) {
    toaster.create({
        type: status,
        // v2 used `null` to mean "stays until dismissed"
        duration: duration === undefined ? 4000 : duration === null ? Infinity : duration,
        title: text,
        closable: true,
    })
}

var notify = {
    success: (text, duration) => {
        toastIt(text, "success", duration)
    },
    error: (text) => {
        toastIt(text, "error")
    },
    info: (text) => {
        toastIt(text, "info", null)
    }
}

export default notify
