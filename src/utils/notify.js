import { createStandaloneToast } from '@chakra-ui/react'

function toastIt(title, status, duration) {
    const toast = createStandaloneToast()
    toast({
        title,
        status,
        duration: duration || 4000,
        isClosable: true,
    })
}

var notify = {
    success: (title) => {
        toastIt(title, "success")
    },
    error: (title) => {
        toastIt(title, "error")
    },
    info: (title) => {
        toastIt(title, "info", 7 * 1000)
    }
}

export default notify