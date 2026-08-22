import React from "react";
import {
    Box,
    CloseButton,
    Portal,
    Toast,
    Toaster as ChakraToaster,
    createToaster,
} from "@chakra-ui/react";
import { ruuviTheme } from "../../themes";
import { AlertCheckIcon, AlertInfoIcon, AlertWarningIcon } from "./chakra-icons";
import { useColorMode } from "./color-mode";

// v2's <AlertIcon /> — v3's Toast.Indicator draws different glyphs for
// success/error and nothing at all for `info`, whose icon took the alert's own
// blue because the colour the call site passed was an object and got dropped.
// The keys here are the same three `ruuviTheme.colors.toast` has.
const statusIcon = {
    success: { icon: AlertCheckIcon, color: { light: "white", dark: "white" } },
    error: { icon: AlertWarningIcon, color: { light: "white", dark: "white" } },
    info: { icon: AlertInfoIcon, color: { light: "#3182ce", dark: "#90cdf4" } },
};

// Standalone toaster store. `notify` pushes into it from anywhere, the
// <Toaster /> below renders it inside the Chakra provider.
export const toaster = createToaster({
    placement: "bottom",
    pauseOnPageIdle: true,
});

export function Toaster() {
    const { colorMode } = useColorMode();
    return (
        <Portal>
            <ChakraToaster toaster={toaster} insetInline={{ mdDown: "4" }} bottom="30px">
                {(toast) => {
                    // `loading`, `warning` and an absent type all land on
                    // `info`: this theme has neither a palette nor a glyph for
                    // them, and an unstyled icon-less toast is worse than one
                    // that looks like the info toasts `notify` already sends.
                    const status = statusIcon[toast.type] ? toast.type : "info";
                    const palette = ruuviTheme.colors.toast[status];
                    const StatusIcon = statusIcon[status].icon;
                    return (
                        <Toast.Root
                            alignItems="start"
                            borderRadius="md"
                            boxShadow="lg"
                            textAlign="start"
                            width="auto"
                            padding="20px"
                            // v2's Alert had no gap; the icon carried its own
                            // margin and the spacer below did the rest
                            gap="0"
                            bg={palette[colorMode]}
                            color={status !== "info" || colorMode === "dark" ? "white" : "black"}
                        >
                            <Box
                                as="span"
                                display="inherit"
                                flexShrink={0}
                                marginEnd="3"
                                boxSize="5"
                                color={statusIcon[status].color[colorMode]}
                            >
                                <StatusIcon style={{ width: "100%", height: "100%" }} />
                            </Box>
                            <Toast.Title
                                // Toast.Root points aria-labelledby at this slot,
                                // so the title must be Toast.Title, not a plain
                                // Text; the recipe's sm/medium/marginEnd are
                                // overridden back to the v2 alert metrics.
                                textStyle="md"
                                fontWeight={status !== "info" ? 600 : "normal"}
                                marginEnd="0"
                            >
                                {toast.title}
                            </Toast.Title>
                            <Box flexGrow={10} />
                            {toast.closable && (
                                <CloseButton
                                    alignSelf="flex-start"
                                    position="relative"
                                    right={-1}
                                    top={-1}
                                    // v3's CloseButton rides the button recipe, where
                                    // "sm" is 36px; v2's was 24px. A taller button
                                    // sets the flex row height and leaves dead space
                                    // under the text.
                                    size="2xs"
                                    color="inherit"
                                    onClick={() => toaster.dismiss(toast.id)}
                                />
                            )}
                        </Toast.Root>
                    );
                }}
            </ChakraToaster>
        </Portal>
    );
}
