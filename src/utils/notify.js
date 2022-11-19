import { Alert, Text, AlertIcon, CloseButton } from '@chakra-ui/react'
import { ruuviTheme } from '../themes'
import { createStandaloneToast } from '@chakra-ui/toast'

function hackyGetColorMode() {
    return localStorage.getItem("chakra-ui-color-mode") === "dark" ? "dark" : "light";
}

function toastIt(text, status, duration) {
    const { toast } = createStandaloneToast()
    let colorMode = hackyGetColorMode()
    toast({
        duration: duration || 4000,
        render: (props) => (
            <Alert
                {...props}
                alignItems="start"
                borderRadius="md"
                boxShadow="lg"
                textAlign="start"
                width="auto"
                padding="20px"
                status={status}
                bg={ruuviTheme.colors.toast[status][colorMode]}
                color={status !== "info" || colorMode === "dark" ? "white" : "black"}
            >
                <AlertIcon color={status !== "info" ? "white" : ruuviTheme.colors.gray} />
                <Text fontWeight={status !== "info" ? 600 : undefined}>
                    {text}
                </Text>
                <CloseButton
                    alignSelf='flex-start'
                    position='relative'
                    right={-1}
                    top={-1}
                    size="sm"
                    onClick={props.onClose}
                />
            </Alert>
        ),
    })
}

var notify = {
    success: (text) => {
        toastIt(text, "success")
    },
    error: (text) => {
        toastIt(text, "error")
    },
    info: (text) => {
        toastIt(text, "info", 7 * 1000)
    }
}

export default notify