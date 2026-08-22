import React from "react";
import { Portal, Tooltip as ChakraTooltip } from "@chakra-ui/react";

// Keeps the v2 single-component Tooltip signature (label / hasArrow /
// isDisabled / placement) on top of the v3 compound component.
export function Tooltip({
    label,
    children,
    hasArrow = false,
    isDisabled = false,
    placement = "bottom",
    openDelay = 0,
    closeDelay = 0,
    contentProps,
    ...rest
}) {
    if (isDisabled) return children;
    return (
        <ChakraTooltip.Root
            positioning={{ placement }}
            openDelay={openDelay}
            closeDelay={closeDelay}
            {...rest}
        >
            <ChakraTooltip.Trigger asChild>{children}</ChakraTooltip.Trigger>
            <Portal>
                <ChakraTooltip.Positioner>
                    <ChakraTooltip.Content {...contentProps}>
                        {hasArrow && (
                            <ChakraTooltip.Arrow>
                                <ChakraTooltip.ArrowTip />
                            </ChakraTooltip.Arrow>
                        )}
                        {label}
                    </ChakraTooltip.Content>
                </ChakraTooltip.Positioner>
            </Portal>
        </ChakraTooltip.Root>
    );
}

export default Tooltip;
