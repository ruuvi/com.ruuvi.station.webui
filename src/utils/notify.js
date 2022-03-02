import { Alert, Text, createStandaloneToast } from '@chakra-ui/react'
import { ruuviTheme } from '../themes'

function toastIt(title, status, duration) {
    const toast = createStandaloneToast()
    toast({
        duration: duration || 4000,
        render: (props) => (
            <Alert
                {...props}
                alignItems="start"
                borderRadius="md"
                boxShadow="lg"
                paddingEnd={8}
                textAlign="start"
                width="auto"
                bg={ruuviTheme.colors.toast[status]}
                color={status !== "info" ? "white" : undefined}
            >
                <Text fontWeight={status !== "info" ? 600 : undefined}>
                    {title}
                </Text>
            </Alert>
        ),
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