import { Alert, Text, createStandaloneToast, AlertIcon, CloseButton } from '@chakra-ui/react'
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
                textAlign="start"
                width="auto"
                padding="20px"
                status={status}
                bg={ruuviTheme.colors.toast[status]}
                color={status !== "info" ? "white" : undefined}
            >
                <AlertIcon color={status !== "info" ? "white" : ruuviTheme.colors.gray} />
                <Text fontWeight={status !== "info" ? 600 : undefined}>
                    {title}
                </Text>
                <CloseButton
                    size="sm"
                    onClick={props.onClose}
                    position="absolute"
                    insetEnd={1}
                    top={1}
                />
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