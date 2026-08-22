import React from "react";
import { ChakraProvider } from "@chakra-ui/react";
import { system } from "../../themes";
import { ColorModeProvider } from "./color-mode";

export function Provider({ children }) {
    return (
        <ChakraProvider value={system}>
            <ColorModeProvider>{children}</ColorModeProvider>
        </ChakraProvider>
    );
}

export default Provider;
