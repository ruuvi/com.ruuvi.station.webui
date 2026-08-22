import { ruuviTheme } from "../../themes";

// Hoisted so every keystroke does not hand Chakra a fresh style object to serialise.
const highlight = { backgroundColor: ruuviTheme.colors.pinFieldBgHoverColor }
const style = { margin: 5, fontWeight: 800, maxWidth: "9%" }
// v2 passed focusBorderColor="#1f938500" here: these fields show no focus ring
const focusRing = { "--focus-color": "#1f938500", "--focus-ring-color": "#1f938500" }

// The look the MAC address and activation code <PinInput.Input> fields share.
export const pinFieldProps = {
    bg: ruuviTheme.colors.pinFieldBgColor,
    _focus: highlight,
    _hover: highlight,
    css: focusRing,
    color: "black",
    height: 12,
    style,
}
