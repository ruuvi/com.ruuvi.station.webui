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
        primaryDark: "#34ad9f",
        primaryLight: "rgba(68, 201, 185, 0.3)",
        primaryLighter: "rgba(68, 201, 185, 0.1)",
        error: "#f15a24",
        errorBackground: "rgb(241,90,36,0.3)",
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
        },
        text: "#1b4847",
        toast: {
            error: "#f15a24",
            info: "#c4ede7",
            success: "#44c9b9",
        }
    },
    components: {
        Button: {
            baseStyle: {
                borderRadius: 30,
            },
            variants: {
                solid: (props) => ({
                    bg: "primary",
                    color: "white",
                    _hover: { bg: "primaryDark" },
                    fontFamily: "Mulish",
                    fontWeight: 800,
                    textTransform: "capitalize",
                    paddingLeft: 25,
                    paddingRight: 25,
                }),
            },
        },
        Input: {
            defaultProps: {
                focusBorderColor: "rgba(1,174,144,0.3)",
            }
        },
        Modal: {
            parts: ['header'],
            baseStyle: {
                header: {
                    fontFamily: "Montserrat",
                    fontWeight: 800,
                },
                dialog: {
                    fontFamily: "Mulish"
                }
            },
        }
    }
})