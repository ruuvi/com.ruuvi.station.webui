import { useMediaQuery } from "@chakra-ui/media-query";

export default function ScreenSizeWrapper(props) {
    const [isLargeDisplay] = useMediaQuery("(min-width: 766px)", { ssr: false })
    if (!props.isMobile && isLargeDisplay) {
        return <>{props.children}</>
    } else if (props.isMobile && !isLargeDisplay) {
        return <>{props.children}</>
    }
    return <></>
}