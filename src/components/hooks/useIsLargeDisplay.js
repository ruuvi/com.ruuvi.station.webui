import { useMediaQuery } from "@chakra-ui/react";

const useIsLargeDisplay = () => {
    const [isLargeDisplay] = useMediaQuery("(min-width: 766px)", { ssr: false });
    return isLargeDisplay;
};

export default useIsLargeDisplay;
