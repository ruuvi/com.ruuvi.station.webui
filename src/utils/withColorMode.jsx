import { useColorMode } from "@chakra-ui/react"

export function withColorMode(Component) {
    return function Wrapped(props) {
        const colorMode = useColorMode();
        return <Component {...props} colorMode={colorMode} />
    }
}