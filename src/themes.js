import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

// Raw palette. Every entry is a { light, dark } pair so that non-Chakra
// consumers (uPlot canvas rendering, inline styles) can pick a value with
// the current color mode as the key.
let colors = {
    bodyBg: { light: "#edf2f2", dark: "#001b1a" },
    contentBg: { light: "white", dark: "#111111" },
    contentImportantBg: { light: "white", dark: "#00343480" },
    text: { light: "#1b4847", dark: "#ffffff" },
    textInactive: { light: "#1b484780", dark: "#ffffff80" },
    topbar: { light: "white", dark: "#001b1a" },
    subtitle: { light: "#1f9385", dark: "#00cebbcc" },
    // v2 had two competing chevron rules (4d global, 80 component); the
    // component one won, so #ffffff80 is what actually shipped
    accordionIcon: { light: undefined, dark: "#ffffff80 !important" },
    accordionButton: { light: "#ffffff", dark: "#003434" },
    accordionPanel: { light: "#f0faf900", dark: "#00343480" },
    sensorValueBoxBg: { light: "#ffffff", dark: "#003434" },
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
    sensorCardBackground: { light: undefined, dark: "#003434 !important" },
    modalBackground: { light: "#ffffff !important", dark: "#002727 !important" },
    signinInputBg: { light: "white", dark: undefined },
    dashboardUpdatedAtColor: { light: "#1b4847", dark: "#ffffff" },
    toastErrorBackground: { light: "#f15a24", dark: "#f15a24" },
    toastInfoBackground: { light: "#ffffffff", dark: "#002727" },
    toastSuccessBackground: { light: "#44c9b9", dark: "#44c9b9" },
    colorMenuActive: { light: "rgba(68, 201, 185, 0.6)", dark: "#0B2626" },
    colorMenuHover: { light: "rgba(68, 201, 185, 0.3)", dark: "#0B2626" },
    buttonBackground: { light: "#35AD9F", dark: "#35AD9F" },
    buttonFocus: { light: "#1f9385", dark: "#1f9385" },
    imageBackgroundColor: { light: "#d8edea", dark: "#2d605c" },
    boxBg: { dark: "rgba(53, 173, 159, 0.2)", light: "rgba(198, 227, 224, 0.5)" },
    gray: { dark: "#d4ede8", light: "#d4ede8" },
};

// Picks the light/dark pair as a Chakra conditional value. NB: a pair with only
// one side defined emits an unconditional value that applies in BOTH modes —
// v2's `undefined` meant "don't set it for this mode". Spell those out at the
// call site instead of relying on this helper.
const mode = (pair) => {
    const out = {};
    if (pair.light !== undefined) out.base = pair.light;
    if (pair.dark !== undefined) out._dark = pair.dark;
    return out;
};

const buttonBg = colors.buttonBackground.light;
const buttonFocus = colors.buttonFocus.light;

// v2's `chakra-border-color`, the colour its CSS reset gave every border.
const v2BorderColor = { base: colors.gray.light, _dark: "rgba(255, 255, 255, 0.16)" };

// v3 tightened the default control scale (md inputs went from 1rem padding /
// 1rem text to 0.75rem / 0.875rem). These restate the v2 metrics so the UI
// keeps the proportions it had.
const v2InputSize = { textStyle: "md", px: "4", borderRadius: "md" };

const avatarSizes = Object.fromEntries(
    Object.entries({
        "2xs": "1rem",
        xs: "1.5rem",
        sm: "2rem",
        md: "3rem",
        lg: "4rem",
        xl: "6rem",
        "2xl": "8rem",
        full: "100%",
    }).map(([key, size]) => [key, { root: { "--avatar-size": size, "--avatar-font-size": `calc(${size} / 2.5)` } }]),
);

const config = defineConfig({
    globalCss: {
        // v3's preset sets `html { bg: bg }`, which stops the body background
        // from propagating to the canvas. `body` is height:100% (index.css), so
        // without this everything past the first viewport shows v3's default.
        // `_dark` expands to `.dark &`, which can never match here — the
        // `dark` class lives on <html> itself, so it has to be `&.dark`.
        html: {
            bg: colors.bodyBg.light + " !important",
            "&.dark": { bg: colors.bodyBg.dark + " !important" },
        },
        body: {
            bg: colors.bodyBg.light + " !important",
            color: "#1b4847 !important",
            _dark: {
                bg: colors.bodyBg.dark + " !important",
                color: "white !important",
            },
        },
        ".bodybg": {
            bg: { base: colors.bodyBg.light + " !important", _dark: colors.bodyBg.dark + " !important" },
        },
        ".subtitle": {
            color: mode(colors.subtitle),
        },
        ".topbar": {
            bg: "#ffffff00",
        },
        ".banner": {
            backgroundColor: "rgba(195, 237, 230, 0.9)",
            color: "#000000",
            minHeight: "20px",
            paddingTop: "10px",
            paddingBottom: "10px",
            fontFamily: "Mulish",
            fontWeight: 600,
            fontStyle: "italic",
        },
        ".banner a": {
            fontWeight: 800,
            color: "#0aa08a",
        },
        ".content": {
            bg: mode(colors.contentBg),
        },
        ".contentImportant": {
            bg: mode(colors.contentImportantBg),
        },
        ".durationPicker": {
            bg: mode(colors.menuButtonBg),
        },
        ".searchInput": {
            bg: mode(colors.searchBg),
            borderColor: "#00000000 !important",
            _hover: { borderColor: buttonFocus + " !important" },
            _focus: { borderColor: buttonFocus + " !important" },
        },
        ".navButton": {
            bg: {
                base: colors.navButtonBg.light + " !important",
                _dark: colors.navButtonBg.dark + " !important",
            },
            color: mode(colors.navButtonColor),
            border: "1px",
            borderColor: "#ffffff00 !important",
        },
        ".sensorValueBox": {
            bg: mode(colors.sensorValueBoxBg),
            _hover: {
                shadow: "0px 0px 0px 1px " + buttonFocus,
            },
        },
        ".sensorValueBox button": {
            color: mode(colors.sensorValueBoxIcon),
        },
        ".sensorCard": {
            backgroundColor: mode(colors.sensorCardBackground),
            _hover: {
                shadow: "0px 0px 0px 1px " + buttonFocus,
            },
        },
        ".signinInput": {
            // same as `hr`: v2 set no background in dark mode
            bg: { base: colors.signinInputBg.light, _dark: "transparent" },
        },
        ".dashboardUpdatedAt": {
            color: mode(colors.dashboardUpdatedAtColor),
        },
        ".menuActive": {
            bg: {
                base: colors.colorMenuActive.light + " !important",
                _dark: colors.colorMenuActive.dark + " !important",
            },
            color: {
                base: colors.textInactive.light + " !important",
                _dark: colors.textInactive.dark + " !important",
            },
        },
        ".buttonSideIcon": {
            color: buttonBg,
        },
        hr: {
            // v2 only set this in light mode and let dark fall through to the
            // reset's border colour (whiteAlpha.300). Leaving it unset here
            // would apply the light value in dark mode too, where it is
            // invisible against the page background.
            borderColor: { base: "#083c3d1a", _dark: "rgba(255, 255, 255, 0.16)" },
        },
        ".imageBackgroundColor": {
            backgroundColor: {
                base: colors.imageBackgroundColor.light + " !important",
                _dark: colors.imageBackgroundColor.dark + " !important",
            },
        },
        ".imageBackgroundOverlay": {
            opacity: { base: 0.3, _dark: 0.75 },
        },
        "#singleSerieGraph .u-marker": {
            display: "none !important",
        },
        ".graphLabel": {
            fontFamily: "Mulish",
            fontWeight: 600,
            fontSize: "15px",
            height: "100%",
            lineHeight: "0px",
        },
        ".graphLabel > th": {
            // globalCss lands in @layer base, and unlayered stylesheets beat every
            // layer: uPlot.min.css sets `.u-legend th { font-weight: 600 }` and would
            // win here without the !important. Same for `.hide` below, where
            // `.u-inline * { display: inline-block }` would un-hide the row.
            fontWeight: "800 !important",
        },
        ".graphLabel > td": {
            marginTop: "2px",
        },
        ".hide": {
            display: "none !important",
        },
        ".nodatatext": {
            color: { base: "#1b484780", _dark: "rgba(255,255,255,0.5)" },
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
            bg: {
                base: colors.menuSubItemBg.light + " !important",
                _dark: colors.menuSubItemBg.dark + " !important",
            },
        },
        ".ddlItemAlt": {
            fontFamily: "mulish",
            fontSize: "14px",
        },
        ".box": {
            backgroundColor: mode(colors.boxBg),
            padding: "10px",
            borderRadius: "5px",
        },
        ".shareEmail": {
            border: "1px solid !important",
            borderColor: buttonBg + " !important",
        },
        ".selectedSensorInMenu": {
            bg: {
                base: colors.colorMenuHover.light + " !important",
                _dark: colors.colorMenuHover.dark + " !important",
            },
            color: {
                base: colors.textInactive.light + " !important",
                _dark: colors.textInactive.dark + " !important",
            },
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
            lineHeight: "1.33",
        },
        ".pageTitleDescription": {
            fontFamily: "mulish",
            fontSize: 18,
            fontWeight: 600,
        },
        ".mobilePageTitleDescription": {
            fontFamily: "mulish",
            fontSize: 14,
        },
        ".graphInfo": {
            fontFamily: "mulish",
            fontSize: 14,
        },
        ".graphLengthText": {
            fontFamily: "montserrat",
            fontWeight: 800,
        },
        ".chakra-toast__root": {
            fontFamily: "mulish",
        },
        ".visibilitySettingsTitle": {
            backgroundColor: mode(colors.accordionButton),
            lineHeight: "2",
            padding: "10px 24px 10px 24px",
        },
        ".visibilitySettingsItem": {
            backgroundColor: mode(colors.accordionPanel),
            padding: "10px 24px 10px 24px",
        },
        ".visibilityListIcons": {
            color: buttonBg,
        },
        ".visibilitSettingList": {
            backgroundColor: mode(colors.bodyBg),
        },
        // v2 drew placeholders in `chakra-placeholder-color` (gray.500 /
        // whiteAlpha.400) and this theme flattened the gray scale to mint, so
        // they were far fainter than v3's `fg.muted/80`.
        "*::placeholder, *[data-placeholder]": {
            color: { base: colors.gray.light, _dark: "rgba(255, 255, 255, 0.24)" },
        },
    },
    theme: {
        // v2's `lg` was 62em (992px); v3 moved it to 1024px, and the page
        // gutters (Dashboard, Sensor, Settings) switch on `lg`.
        breakpoints: {
            lg: "992px",
        },
        tokens: {
            colors: {
                primary: { value: "#44c9b9" },
                primaryDark: { value: "#34ad9f" },
                primaryLight: { value: "rgba(68, 201, 185, 0.3)" },
                primaryLighter: { value: "rgba(68, 201, 185, 0.1)" },
                infoIcon: { value: "rgba(68, 201, 185, 0.6)" },
                error: { value: "rgba(241, 90, 36, 0.8)" },
                errorBackground: { value: "#ff954d7f" },
                inactive: { value: "#d4ede8" },
                text: { value: "#1b4847" },
                pinFieldBgColor: { value: "#b2c2c2" },
                pinFieldBgHoverColor: { value: "#b2c2c2aa" },
                inputFocus: { value: buttonFocus },
                // Accent palette used through `colorPalette="ruuvi"` (switches,
                // radios). Replaces the v2 `buttonIconScheme` color scheme.
                ruuvi: {
                    50: { value: "#e6f6f2" },
                    100: { value: "#c6e3e0" },
                    200: { value: buttonBg },
                    300: { value: "#44c9b9" },
                    400: { value: "#35AD9F" },
                    500: { value: buttonBg },
                    600: { value: "#1f9385" },
                    700: { value: "#1b6763" },
                    800: { value: "#15504a" },
                    900: { value: "#083c3d" },
                    950: { value: "#001b1a" },
                },
            },
        },
        semanticTokens: {
            colors: {
                // v2's CSS reset painted every default border with
                // `chakra-border-color` (gray.200 / whiteAlpha.300), and the
                // theme repainted the whole gray scale mint — so inputs,
                // radios and the like had #d4ede8 borders, not v3's neutral
                // gray. v2 had no muted/subtle/emphasized steps.
                border: {
                    DEFAULT: { value: v2BorderColor },
                    muted: { value: v2BorderColor },
                    subtle: { value: v2BorderColor },
                    emphasized: { value: v2BorderColor },
                },
                ruuvi: {
                    contrast: { value: "white" },
                    fg: { value: { base: "{colors.ruuvi.600}", _dark: "{colors.ruuvi.300}" } },
                    subtle: { value: { base: "{colors.ruuvi.50}", _dark: "{colors.ruuvi.800}" } },
                    muted: { value: { base: "{colors.ruuvi.100}", _dark: "{colors.ruuvi.700}" } },
                    emphasized: { value: { base: "{colors.ruuvi.300}", _dark: "{colors.ruuvi.600}" } },
                    solid: { value: buttonBg },
                    focusRing: { value: buttonFocus },
                    border: { value: buttonBg },
                },
            },
        },
        recipes: {
            button: {
                base: {
                    borderRadius: 30,
                    bg: buttonBg,
                    borderWidth: "1px",
                    borderStyle: "solid",
                    borderColor: "transparent",
                    _hover: { borderColor: buttonFocus + " !important" },
                },
                variants: {
                    size: {
                        // v3 dropped button text to 14px and force-sizes any
                        // nested svg to 20px; v2 did neither, and the icons in
                        // this app carry their own `size` prop.
                        md: { textStyle: "md", _icon: { width: "auto", height: "auto" } },
                    },
                    variant: {
                        solid: {
                            bg: buttonBg + " !important",
                            color: "white",
                            _hover: {
                                borderColor: buttonFocus + " !important",
                                backgroundColor: buttonBg + " !important",
                            },
                            fontFamily: "Mulish",
                            fontWeight: 800,
                            textTransform: "capitalize",
                            paddingLeft: "25px",
                            paddingRight: "25px",
                        },
                        nav: {
                            bg: { base: "#44c9b9", _dark: buttonBg },
                            color: { base: "white" },
                            _hover: { borderColor: buttonFocus + " !important" },
                            fontFamily: "Mulish",
                            fontWeight: 800,
                            textTransform: "capitalize",
                            paddingLeft: "25px",
                            paddingRight: "25px",
                        },
                        topbar: {
                            border: "0px",
                            backgroundColor: "transparent",
                            fontFamily: "mulish",
                            fontSize: "15px",
                            fontWeight: 800,
                            // spacing token 5 (1.25rem), which is what the v2
                            // theme's bare `5` resolved to
                            paddingLeft: 5,
                            paddingRight: 5,
                        },
                        ghost: {
                            bg: "transparent",
                            border: "0px",
                            _hover: { backgroundColor: buttonFocus + "2a !important" },
                        },
                        ddl: {
                            bg: { base: "white", _dark: buttonBg },
                        },
                        shareSensorSelect: {
                            bg: "transparent",
                            borderWidth: "1px",
                            borderStyle: "solid",
                            borderColor: buttonBg + " !important",
                        },
                        imageToggle: {
                            borderRadius: 3,
                            bg: mode(colors.menuButtonBg),
                            color: buttonBg,
                        },
                        link: {
                            // v2 merged this on top of its built-in `link` variant, which
                            // zeroed the padding and height; v3 has no such variant, so
                            // without these the text sits 16px in from the left edge.
                            // px/py, not `padding`: the shorthand loses to the size
                            // variant's longhands (see the menu item note above).
                            px: 0,
                            py: 0,
                            h: "auto",
                            lineHeight: "normal",
                            verticalAlign: "baseline",
                            bg: "transparent",
                            color: "#1f9385",
                            textDecoration: "underline",
                            border: "0px",
                        },
                    },
                },
            },
            input: {
                base: {
                    // v2's `focusBorderColor`. Both vars are needed: the size
                    // variants restate `focusRingColor: var(--focus-color)`,
                    // which overwrites `--focus-ring-color` set here on its own.
                    "--focus-color": buttonFocus,
                    "--focus-ring-color": buttonFocus,
                },
                variants: {
                    size: { md: v2InputSize },
                },
            },
            textarea: {
                base: {
                    "--focus-color": buttonFocus,
                    "--focus-ring-color": buttonFocus,
                },
                variants: {
                    size: { md: { ...v2InputSize, py: "2" } },
                },
            },
            heading: {
                // v3 dropped headings to semibold; v2's were bold
                base: { fontWeight: "bold" },
                variants: {
                    // v3's textStyles carry their own line height (1.5 for md);
                    // v2 pinned every heading to 1.2, and the two large sizes
                    // to 1.33 below the `md` breakpoint.
                    size: {
                        xs: { textStyle: "sm", lineHeight: 1.2 },
                        sm: { textStyle: "md", lineHeight: 1.2 },
                        md: { textStyle: "xl", lineHeight: 1.2 },
                        lg: { fontSize: { base: "2xl", md: "3xl" }, lineHeight: { base: 1.33, md: 1.2 } },
                        xl: { fontSize: { base: "3xl", md: "4xl" }, lineHeight: { base: 1.33, md: 1.2 } },
                    },
                },
            },
            link: {
                // v3 lays links out as inline-flex, which pulls them out of the
                // text flow they sit in; v2 left <a> inline.
                base: { display: "inline" },
            },
            separator: {
                base: {
                    borderColor: { base: "#083c3d1a", _dark: "rgba(255, 255, 255, 0.16)" },
                    // v2's Divider baseStyle
                    opacity: 0.6,
                },
            },
        },
        // NB: never declare `slots` in these overrides. Chakra merges the
        // array element-wise, so a partial list renames the component's real
        // slots (a 4-entry list on `dialog` renamed `positioner`, which
        // silently dropped its `position: fixed` and hid every dialog).
        slotRecipes: {
            dialog: {
                // v2 mapped the dialog size straight onto the content max-width;
                // v3 shifts every step up, so restate them to keep the widths.
                variants: {
                    placement: {
                        // v2's ModalContent sat at `my: 3.75rem`; v3 moved to 4rem
                        top: { content: { "--dialog-base-margin": "3.75rem" } },
                    },
                    size: {
                        xs: { content: { maxW: "xs" } },
                        sm: { content: { maxW: "sm" } },
                        md: { content: { maxW: "md" } },
                        lg: { content: { maxW: "lg" } },
                        xl: { content: { maxW: "xl" } },
                        "2xl": { content: { maxW: "2xl" } },
                    },
                },
                base: {
                    header: {
                        fontFamily: "Montserrat",
                        fontWeight: 800,
                        // v2 sized the modal header itself; v3 moved it to the
                        // Dialog.Title slot, which these dialogs don't render.
                        fontSize: "xl",
                        pt: "4",
                    },
                    body: {
                        pb: "2",
                    },
                    footer: {
                        pt: "4",
                        // v2's ModalFooter had no gap; these dialogs space their
                        // buttons themselves with ml/mr
                        gap: 0,
                    },
                    closeTrigger: {
                        // v2's ModalCloseButton anchor
                        insetEnd: "3",
                    },
                    content: {
                        textStyle: "md",
                        // ...but not `textStyle`'s line height, which is
                        // `1.5rem` — an absolute length every descendant
                        // inherits, so the 38px card value in the measurement
                        // preview got a 24px line box and collided with the
                        // sensor name above it. v2's ModalContent set no line
                        // height at all and inherited the body's unitless 1.5.
                        lineHeight: 1.5,
                        fontFamily: "Mulish",
                        bg: mode(colors.modalBackground),
                        boxShadow: {
                            base: "0px 0px 10px #00000030 !important",
                            _dark: "0px 0px 10px #00000050 !important",
                        },
                    },
                },
            },
            menu: {
                // v3's md size variant wins over `base`, so the v2 metrics have
                // to be restated here rather than in `base`.
                variants: {
                    size: {
                        md: {
                            // v2's MenuList was `minW: 3xs`
                            content: { minW: "14rem", padding: 0 },
                            // py/px, not `padding`: Chakra orders shorthands
                            // before longhands, so `padding` would lose to the
                            // default variant's py/px no matter what.
                            // v2's MenuItem had no gap — the icons in these
                            // menus carry their own margins.
                            item: { py: 3, px: 3, textStyle: "sm", gap: 0 },
                            itemGroupLabel: { mx: "4", my: "2", px: 0, py: 0 },
                        },
                    },
                },
                base: {
                    content: {
                        padding: 0,
                        bg: mode(colors.menuButtonBg),
                        border: "none",
                        // v2 used `md` here and the items round their own outer
                        // corners to 6px to match; v3's `l2` is 4px.
                        borderRadius: "md",
                        // v3 pins menu text to `fg`; v2 inherited the body colour
                        color: "inherit",
                        boxShadow: {
                            base: "0px 0px 10px #00000030 !important",
                            _dark: "0px 0px 10px #00000050 !important",
                        },
                        overflow: "hidden",
                    },
                    item: {
                        overflow: "hidden",
                        color: "inherit",
                        bg: mode(colors.menuItemBg),
                        "@media (hover: hover) and (pointer: fine)": {
                            _hover: {
                                bg: {
                                    base: colors.colorMenuHover.light + " !important",
                                    _dark: colors.colorMenuHover.dark + " !important",
                                },
                            },
                        },
                        padding: 3,
                        borderRadius: 0,
                    },
                    separator: {
                        // my/mx, not `margin` — v3's default my/mx longhands
                        // beat the shorthand (same as the item padding above)
                        my: 0,
                        mx: 0,
                        border: 0,
                        bg: { base: "#0000001a", _dark: "#ffffff1a" },
                    },
                },
            },
            accordion: {
                variants: {
                    // v2 drew the rule above each item (plus one under the
                    // last); v3 draws it underneath, which loses the line above
                    // the first item.
                    variant: {
                        outline: {
                            item: {
                                borderTopWidth: "1px",
                                borderBottomWidth: "0",
                                _last: { borderBottomWidth: "1px" },
                            },
                        },
                    },
                },
                base: {
                    // v2's AccordionButton / AccordionPanel default padding
                    itemTrigger: {
                        px: 4,
                        py: 2,
                        bg: mode(colors.accordionButton),
                    },
                    itemBody: {
                        pt: 2,
                        px: 4,
                        pb: 5,
                        bg: mode(colors.accordionPanel),
                    },
                    itemIndicator: {
                        // v3 defaults to `fg.subtle` (grey); v2 set no colour in
                        // light mode, so the chevron took the body text colour.
                        color: { base: "currentColor", _dark: colors.accordionIcon.dark },
                        // v2's AccordionIcon was `fontSize: 1.25em` on a 1em glyph
                        _icon: { width: "1.25em", height: "1.25em" },
                    },
                },
            },
            avatar: {
                variants: {
                    // v3 sets the background in the `subtle` variant, which
                    // wins over `base`
                    variant: { subtle: { root: { bg: buttonBg, color: "white" } } },
                    // v3 roughly halved the scale (xl went 6rem -> 3rem);
                    // these are v2's sizes, with the initials scaled to match.
                    size: avatarSizes,
                },
            },
            pinInput: {
                base: {
                    input: {
                        "--focus-color": buttonFocus,
                        "--focus-ring-color": buttonFocus,
                    },
                },
                variants: {
                    // v2 never set --input-padding for pin fields, so they had
                    // no horizontal padding; only the type scale is restored.
                    size: { md: { input: { textStyle: "md", borderRadius: "md" } } },
                },
            },
            field: {
                base: {
                    // v2's FormLabel carried mb=2; v3 puts the gap on the root
                    root: { gap: "2" },
                    label: { textStyle: "md", marginEnd: "3" },
                },
            },
            radioGroup: {
                variants: {
                    // `variant` is resolved after `size`, so the ring width has
                    // to be restated here to beat the default `solid` variant
                    variant: { solid: { itemControl: { borderWidth: "2px" } } },
                    size: {
                        md: {
                            item: { textStyle: "md", gap: "2" },
                            // v2's control was a 2px ring with a dot at half
                            // its size; v3 thinned the ring and shrank the dot.
                            itemControl: {
                                boxSize: "4",
                                "& .dot": { scale: "0.5" },
                            },
                            label: { textStyle: "md" },
                        },
                    },
                },
            },
            switch: {
                variants: {
                    variant: {
                        // v3 tracks an unchecked switch with `bg.emphasized`;
                        // v2 used gray.300 / whiteAlpha.400, and this theme
                        // painted the gray scale mint.
                        solid: {
                            control: {
                                bg: { base: colors.gray.light, _dark: "rgba(255, 255, 255, 0.24)" },
                            },
                        },
                    },
                    size: {
                        md: {
                            root: {
                                "--switch-width": "1.875rem",
                                "--switch-height": "sizes.4",
                            },
                        },
                    },
                },
            },
            tooltip: {
                base: {
                    content: {
                        px: "2",
                        py: "0.5",
                        textStyle: "sm",
                        borderRadius: "sm",
                    },
                },
            },
            popover: {
                base: {
                    content: {
                        bg: mode(colors.menuItemBg),
                        // v2's PopoverContent: 1px border, `sm` shadow, and no
                        // text style of its own (so 16px, not v3's 14px), with
                        // the same unitless line height as the dialog.
                        borderWidth: "1px",
                        boxShadow: "sm",
                        textStyle: "md",
                        lineHeight: 1.5,
                    },
                },
            },
            progress: {
                variants: {
                    size: { md: { track: { h: "3" } } },
                    // v2's bar was flat gray.100 / whiteAlpha.300 with the mint
                    // range — no rounding, no inset shadow. The default
                    // `outline`/`rounded` variants set these via
                    // bgColor/shadow/borderRadius after `base`, so the
                    // overrides must shadow those same keys here: in `base`
                    // they lose (same trap as the menu/avatar/switch notes).
                    variant: {
                        outline: {
                            track: {
                                bgColor: { base: colors.gray.light, _dark: "rgba(255, 255, 255, 0.16)" },
                                shadow: "none",
                            },
                            range: { bgColor: buttonBg },
                        },
                    },
                    shape: {
                        rounded: { track: { borderRadius: 0 } },
                    },
                },
            },
        },
    },
});

export const system = createSystem(defaultConfig, config);

// Plain value bag consumed by canvas/inline-style call sites. Mirrors the
// shape the v2 theme object exposed so those call sites are unchanged.
export const ruuviTheme = {
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
        },
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
        gray: colors.gray.light,
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
        sensorCardValueAlertStateLightTheme: "#eb602b",
    },
};
