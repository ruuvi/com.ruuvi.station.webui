import { extendTheme } from "@chakra-ui/react";

export const ruuviTheme = extendTheme({
    styles: {
        global: {
            body: {
                bg: "#e6f6f2",
                color: "#1b4847 !important",
            },
        }
    },
    colors: {
        primary: "#44c9b9",
        primaryLight: "rgba(68, 201, 185, 0.3)",
        inactive: "#d4ede8",
        graphGrid: "rgba(212,237,232,0.5)",
        gray: {
            50: '#d4ede8',
            100: '#d4ede8',
            200: '#d4ede8',
            300: '#d4ede8',
            400: '#d4ede8',
            500: '#d4ede8',
            600: '#d4ede8',
            700: '#d4ede8',
            800: '#d4ede8',
            900: '#d4ede8',
        },
        primaryScheme: {
            500: '#44c9b9',
        }
    },
})