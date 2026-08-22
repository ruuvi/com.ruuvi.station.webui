import { useColorMode } from "../components/ui/color-mode"

export function withColorMode(Component) {
    return function Wrapped(props) {
        const colorMode = useColorMode();
        return <Component {...props} colorMode={colorMode} />
    }
}
