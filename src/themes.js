import { background, extendTheme } from "@chakra-ui/react";

const config = {
    initialColorMode: localStorage.getItem("chakra-ui-color-mode") || "system",
    useSystemColorMode: false,
}

let colors = {
    bodyBg: { light: "#edf2f2", dark: "#001b1a" },
    contentBg: { light: "white", dark: "#111111" },
    contentImportantBg: { light: "white", dark: "#00343480" },
    text: { light: "#1b4847", dark: "#ffffff" },
    textInactive: { light: "#1b484780", dark: "#ffffff80" },
    topbar: { light: "white", dark: "#001b1a" },
    subtitle: { light: "#1f9385", dark: "#00cebbcc" },
    accordionIcon: { light: undefined, dark: "#ffffff4d !important" },
    accordionButton: { light: "#ffffff", dark: "#003434" },
    accordionPanel: { light: "#f0faf900", dark: "#00343480" },
    sensorValueBoxBg: { light: "#ffffff", dark: "#083c3d" },
    sensorValueBoxIcon: { light: "rgba(68, 201, 185, 0.3)", dark: "#00ae9480" },
    sensorValueBoxActiveBorder: { light: "#1f9385", dark: "#1f9385" },
    menuButtonBg: { light: "white", dark: "#003434 !important" },
    menuItemBg: { light: "white", dark: "#003434" },
    menuSubItemBg: { light: "#f6faf9", dark: "#002727" },
    searchBg: { light: "#ffffff7F !important", dark: "#0034347F !important" },
    navButtonBg: { light: "#ffffff", dark: "#083c3d" },
    navButtonColor: { light: "#1f9385 !important", dark: "white !important" },
    graphFill: { dark: "#15504a", light: "#bae6e1" },
    graphFillCard: { dark: "#1b6763", light: "#c7efea" },
    graphStroke: { dark: "#34ad9f", light: "#1f9385" },
    graphFillAlert: { dark: "#7f5833", light: "#f6c39f" },
    graphFillAlertCard: { dark: "#836845", light: "#ffcaa6" },
    graphStrokeAlert: { dark: "#ce5325", light: "#f47546" },
    graphGrid: { dark: "rgba(68, 201, 185, 0.1)", light: "#083c3d1a" },
    sensorCardBackground: { light: undefined, dark: "#083c3d !important" },
    signinInputBg: { light: "white", dark: undefined },
    dashboardUpdatedAtColor: { light: "#1b484780", dark: "#ffffff80" },
    toastErrorBackground: { light: "#f15a24", dark: "#f15a24" },
    toastInfoBackground: { light: "#e6f6f2", dark: "#003434" },
    toastSuccessBackground: { light: "#44c9b9", dark: "#44c9b9" },
    colorMenuActive: { light: "rgba(68, 201, 185, 0.6)", dark: "#0B2626" },
    colorMenuHover: { light: "rgba(68, 201, 185, 0.3)", dark: "#0B2626" },
    buttonBackground: { light: "#35AD9F", dark: "#35AD9F" },
    buttonFocus: { light: "#1f9385", dark: "#1f9385" },
    imageBackgroundColor: { light: "#d8edea", dark: "#2d605c" },
    boxBg: { dark: "rgba(53, 173, 159, 0.2)", light: "rgba(198, 227, 224, 0.5)" },
    gray: { dark: "#d4ede8", light: "#d4ede8" },
}

export const ruuviTheme = extendTheme({
    config: config,
    styles: {
        global: (props) => ({
            body: {
                bg: colors.bodyBg[props.colorMode] + " !important",
                color: props.colorMode === "light" ? "#1b4847 !important" : "white !important",
            },
            '.bodybg': {
                bg: colors.bodyBg[props.colorMode] + " !important",
            },
            '.subtitle': {
                color: colors.subtitle[props.colorMode]
            },
            '.topbar': {
                bg: "#ffffff00"//colors.topbar[props.colorMode],
            },
            '.banner': {
                backgroundColor: "rgba(195, 237, 230, 0.9)",
                color: "#000000",
                minHeight: "20px",
                paddingTop: "10px",
                paddingBottom: "10px",
                fontFamily: "Mulish",
                fontWeight: 600,
                fontStyle: "italic",
            },
            '.banner a': {
                fontWeight: 800,
                color: "#0aa08a"
            },
            '.content': {
                bg: colors.contentBg[props.colorMode]
            },
            '.contentImportant': {
                bg: colors.contentImportantBg[props.colorMode]
            },
            '.durationPicker': {
                bg: colors.menuButtonBg[props.colorMode],
            },
            '.searchInput': {
                bg: colors.searchBg[props.colorMode],
                borderColor: "#00000000 !important",
                _hover: { borderColor: ruuviTheme.colors.inputFocus + " !important" },
                _focus: { borderColor: ruuviTheme.colors.inputFocus + " !important" }
            },
            '.navButton': {
                bg: colors.navButtonBg[props.colorMode] + " !important",
                color: colors.navButtonColor[props.colorMode],
                border: "1px",
                borderColor: "#ffffff00 !important",
            },
            '.chakra-accordion__button': {
                bg: colors.accordionButton[props.colorMode],
            },
            '.chakra-accordion__panel': {
                bg: colors.accordionPanel[props.colorMode],
            },
            '.chakra-accordion__icon': {
                color: colors.accordionIcon[props.colorMode]
            },
            '.sensorValueBox': {
                bg: colors.sensorValueBoxBg[props.colorMode],
                _hover: {
                    shadow: "0px 0px 0px 1px " + colors.buttonFocus[props.colorMode]
                },
            },
            '.sensorValueBox button': {
                color: colors.sensorValueBoxIcon[props.colorMode],
            },
            '.sensorCard': {
                backgroundColor: colors.sensorCardBackground[props.colorMode],
                _hover: {
                    shadow: "0px 0px 0px 1px " + colors.buttonFocus[props.colorMode]
                },
            },
            '.signinInput': {
                bg: colors.signinInputBg[props.colorMode],
            },
            '.dashboardUpdatedAt': {
                color: colors.dashboardUpdatedAtColor[props.colorMode]
            },
            '.menuActive': {
                bg: colors.colorMenuActive[props.colorMode] + " !important",
                color: colors.textInactive[props.colorMode] + " !important",
            },
            '.buttonSideIcon': {
                color: colors.buttonBackground[props.colorMode]
            },
            hr: {
                borderColor: props.colorMode === "light" ? "#083c3d1a" : undefined
            },
            '.imageBackgroundColor': {
                backgroundColor: colors.imageBackgroundColor[props.colorMode] + " !important",
            },
            '.imageBackgroundOverlay': {
                opacity: props.colorMode === "dark" ? 0.75 : 0.3,
            },
            '#singleSerieGraph .u-marker': {
                display: 'none !important'
            },
            '.graphLabel': {
                fontFamily: "Mulish",
                fontWeight: 600,
                fontSize: "15px",
                height: "100%",
                lineHeight: "0px",
            },
            '.graphLabel > th': {
                fontWeight: 800,
            },
            '.graphLabel > td': {
                marginTop: "2px",
            },
            '.hide': {
                display: "none",
            },
            ".nodatatext": {
                color: props.colorMode === "light" ? "#1b484780" : "rgba(255,255,255,0.5)",
                fontFamily: "mulish",
                fontSize: 15,
            },
            ".ddlItem": {
                fontFamily: "mulish",
                fontSize: "14px",
                fontWeight: 800,
            },
            ".ddlSubItem": {
                fontFamily: "mulish",
                fontSize: "14px",
                bg: colors.menuSubItemBg[props.colorMode] + " !important",
            },
            ".ddlItemAlt": {
                fontFamily: "mulish",
                fontSize: "14px",
            },
            ".box": {
                backgroundColor: colors.boxBg[props.colorMode],
                padding: "10px",
                borderRadius: "5px",
            },
            ".shareEmail": {
                border: "1px solid !important",
                borderColor: colors.buttonBackground[props.colorMode] + " !important",
            },
            '.selectedSensorInMenu': {
                bg: colors.colorMenuHover[props.colorMode] + " !important",
                color: colors.textInactive[props.colorMode] + " !important",
            },
            ".activeNav": {
                color: "#44c9b9",
            },
            ".pageTitle": {
                fontFamily: "montserrat",
                fontSize: "54px",
                fontWeight: 800,
                lineHeight: "1.2",
                paddingBottom: "10px",
            },
            ".mobilePageTitle": {
                fontFamily: "montserrat",
                fontSize: "32px",
                fontWeight: 800,
                lineHeight: "1.33"
            },
            ".pageTitleDescription": {
                fontFamily: "mulish",
                fontSize: 18,
                fontWeight: 600,
                ontStyle: "italic",
            },
            ".mobilePageTitleDescription": {
                fontFamily: "mulish",
                fontSize: 14
            },
            ".graphInfo": {
                fontFamily: "mulish",
                fontSize: 14,
            },
            ".graphLengthText": {
                fontFamily: "montserrat",
                fontWeight: 800,
            },
            '.chakra-toast': {
                fontFamily: "mulish",
            }
        })
    },
    graph: {
        fill: colors.graphFill,
        fillCard: colors.graphFillCard,
        stroke: colors.graphStroke,
        grid: colors.graphGrid,
        axisLabels: colors.text,
        alert: {
            fill: colors.graphFillAlert,
            fillCard: colors.graphFillAlertCard,
            stroke: colors.graphStrokeAlert,
        }
    },
    newColors: colors,
    colors: {
        primary: "#44c9b9",
        primaryDark: "#34ad9f",
        primaryLight: "rgba(68, 201, 185, 0.3)",
        primaryLighter: "rgba(68, 201, 185, 0.1)",
        infoIcon: "rgba(68, 201, 185, 0.6)",
        error: "rgba(241, 90, 36, 0.8)",
        errorBackground: "#ff954d7f",
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
        buttonIconScheme: {
            200: colors.buttonBackground.dark, // dark mode
            500: colors.buttonBackground.light, // light mode
        },
        text: "#1b4847",
        toast: {
            error: colors.toastErrorBackground,
            info: colors.toastInfoBackground,
            success: colors.toastSuccessBackground,
        },
        pinFieldBgColor: "#b2c2c2",
        pinFieldBgHoverColor: "#b2c2c2aa",
        inputFocus: colors.buttonFocus.dark,
        sensorCardValueAlertState: "#ff8700",
    },
    components: {
        Button: {
            baseStyle: (props) => ({
                borderRadius: 30,
                bg: colors.buttonBackground[props.colorMode],
                border: "1px",
                borderColor: "#ffffff00 !important",
                _hover: { borderColor: colors.buttonFocus[props.colorMode] + " !important" },
            }),
            variants: {
                solid: (props) => ({
                    bg: colors.buttonBackground[props.colorMode] + " !important",
                    color: props.colorMode === "light" ? "white" : undefined,
                    _hover: { borderColor: colors.buttonFocus[props.colorMode] + " !important", backgroundColor: colors.buttonBackground[props.colorMode] + " !important" },
                    fontFamily: "Mulish",
                    fontWeight: 800,
                    textTransform: "capitalize",
                    paddingLeft: 25,
                    paddingRight: 25,
                }),
                nav: (props) => ({
                    bg: props.colorMode === "light" ? "#44c9b9" : undefined,
                    color: props.colorMode === "light" ? "white" : undefined,
                    _hover: { borderColor: colors.buttonFocus[props.colorMode] + " !important" },
                    fontFamily: "Mulish",
                    fontWeight: 800,
                    textTransform: "capitalize",
                    paddingLeft: 25,
                    paddingRight: 25,
                }),
                topbar: (props) => ({
                    bg: props.colorMode === "light" ? "white" : undefined,
                    border: "0px",
                    _hover: {},
                    backgroundColor: "transparent",
                    fontFamily: "mulish",
                    fontSize: 15,
                    fontWeight: 800,
                    paddingLeft: 5,
                    paddingRight: 5,
                }),
                ghost: (props) => ({
                    bg: "transparent",
                    border: "0px",
                    _hover: { backgroundColor: colors.buttonFocus[props.colorMode] + "2a !important" },
                }),
                ddl: (props) => ({
                    bg: props.colorMode === "light" ? "white" : undefined,
                }),
                shareSensorSelect: (props) => ({
                    bg: "transparent",
                    border: "1px solid",
                    borderColor: colors.buttonBackground[props.colorMode],
                }),
                imageToggle: (props) => ({
                    borderRadius: 3,
                    bg: colors.menuButtonBg[props.colorMode],
                    color: colors.buttonBackground[props.colorMode],
                }),
                link: (props) => ({
                    bg: "transparent",
                    color: "#1f9385",
                    textDecoration: "underline",
                    _hover: {},
                    border: "0px",
                })
            },
        },
        Input: {
            defaultProps: {
                focusBorderColor: colors.buttonFocus.dark,
            },
        },
        Modal: {
            parts: ['header'],
            baseStyle: (props) => ({
                header: {
                    fontFamily: "Montserrat",
                    fontWeight: 800,
                },
                dialog: {
                    fontFamily: "Mulish",
                    bg: colors.sensorCardBackground[props.colorMode]
                }
            }),
        },
        Menu: {
            baseStyle: (props) => ({
                button: {
                    border: "none"
                },
                list: {
                    padding: 0,
                    bg: colors.menuButtonBg[props.colorMode],
                    border: "none",
                    boxShadow: props.colorMode === "dark" ? "0px 0px 10px #00000050 !important" : "0px 0px 10px #00000030 !important",
                    overflow: "hidden",
                },
                item: {
                    overflow: "hidden",
                    bg: colors.menuItemBg[props.colorMode],
                    '@media (hover: hover) and (pointer: fine)': {
                        _hover: { bg: colors.colorMenuHover[props.colorMode] + " !important" },
                    },
                    padding: 3
                },
                divider: {
                    margin: 0,
                    color: props.colorMode === "dark" ? "#ffffff1a" : "#0000001a",
                }
            }),
        },
        Accordion: {
            baseStyle: (props) => ({
                icon: {
                    color: props.colorMode === "dark" ? "#ffffff80 !important" : undefined
                },
            }),
        },
        Avatar: {
            baseStyle: (props) => ({
                container: {
                    bg: colors.buttonBackground[props.colorMode]
                },
            }),
        },
        Popover: {
            baseStyle: (props) => ({
                content: {
                    bg: colors.menuItemBg[props.colorMode],
                }
            }),
        },
        Progress: {
            baseStyle: (props) => ({
                filledTrack: {
                    bg: colors.buttonBackground[props.colorMode]
                },
            }),
        },
    },
})