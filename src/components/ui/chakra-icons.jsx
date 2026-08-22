import React from "react";

// The handful of @chakra-ui/icons glyphs the app used before the v3 migration.
// That package only ships for v2, so the icons are inlined here rather than
// swapped for lookalikes from react-icons — the shapes and the 1em sizing are
// what the surrounding layout was built around.
const baseStyle = {
    width: "1em",
    height: "1em",
    display: "inline-block",
    lineHeight: "1em",
    flexShrink: 0,
    color: "currentColor",
    verticalAlign: "middle",
};

function ChakraIcon({ children, style, ...rest }) {
    return (
        <svg viewBox="0 0 24 24" focusable="false" style={{ ...baseStyle, ...style }} {...rest}>
            {children}
        </svg>
    );
}

export const SearchIcon = (props) => (
    <ChakraIcon {...props}>
        <path
            fill="currentColor"
            d="M23.384,21.619,16.855,15.09a9.284,9.284,0,1,0-1.768,1.768l6.529,6.529a1.266,1.266,0,0,0,1.768,0A1.251,1.251,0,0,0,23.384,21.619ZM2.75,9.5a6.75,6.75,0,1,1,6.75,6.75A6.758,6.758,0,0,1,2.75,9.5Z"
        />
    </ChakraIcon>
);

export const CloseIcon = (props) => (
    <ChakraIcon {...props}>
        <path
            fill="currentColor"
            d="M.439,21.44a1.5,1.5,0,0,0,2.122,2.121L11.823,14.3a.25.25,0,0,1,.354,0l9.262,9.263a1.5,1.5,0,1,0,2.122-2.121L14.3,12.177a.25.25,0,0,1,0-.354l9.263-9.262A1.5,1.5,0,0,0,21.439.44L12.177,9.7a.25.25,0,0,1-.354,0L2.561.44A1.5,1.5,0,0,0,.439,2.561L9.7,11.823a.25.25,0,0,1,0,.354Z"
        />
    </ChakraIcon>
);

export const ArrowUpIcon = (props) => (
    <ChakraIcon {...props}>
        <path fill="currentColor" d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z" />
    </ChakraIcon>
);

export const ArrowDownIcon = (props) => (
    <ChakraIcon {...props}>
        <path fill="currentColor" d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z" />
    </ChakraIcon>
);

export const SunIcon = (props) => (
    <ChakraIcon {...props}>
        <g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2" />
            <path d="M12 21v2" />
            <path d="M4.22 4.22l1.42 1.42" />
            <path d="M18.36 18.36l1.42 1.42" />
            <path d="M1 12h2" />
            <path d="M21 12h2" />
            <path d="M4.22 19.78l1.42-1.42" />
            <path d="M18.36 5.64l1.42-1.42" />
        </g>
    </ChakraIcon>
);

// v2's <AccordionIcon />: a solid chevron, not v3's stroked one, drawn at the
// 1.25em the accordion theme gave it. The size is set here as well as on the
// recipe because the inline sizing every icon here carries would otherwise win.
export const ChevronDownIcon = ({ style, ...rest }) => (
    <ChakraIcon style={{ width: "1.25em", height: "1.25em", ...style }} {...rest}>
        <path fill="currentColor" d="M16.59 8.59L12 13.17 8.41 8.59 7 10l5 5 5-5z" />
    </ChakraIcon>
);

// The status glyphs v2's <AlertIcon /> drew inside a toast. v3's toast has its
// own (different) success/error icons and none at all for `info`.
export const AlertCheckIcon = (props) => (
    <ChakraIcon {...props}>
        <path
            fill="currentColor"
            d="M12,0A12,12,0,1,0,24,12,12.014,12.014,0,0,0,12,0Zm6.927,8.2-6.845,9.289a1.011,1.011,0,0,1-1.43.188L5.764,13.769a1,1,0,1,1,1.25-1.562l4.076,3.261,6.227-8.451A1,1,0,1,1,18.927,8.2Z"
        />
    </ChakraIcon>
);

export const AlertInfoIcon = (props) => (
    <ChakraIcon {...props}>
        <path
            fill="currentColor"
            d="M12,0A12,12,0,1,0,24,12,12.013,12.013,0,0,0,12,0Zm.25,5a1.5,1.5,0,1,1-1.5,1.5A1.5,1.5,0,0,1,12.25,5ZM14.5,18.5h-4a1,1,0,0,1,0-2h.75a.25.25,0,0,0,.25-.25v-4.5a.25.25,0,0,0-.25-.25H10.5a1,1,0,0,1,0-2h1a2,2,0,0,1,2,2v4.75a.25.25,0,0,0,.25.25h.75a1,1,0,1,1,0,2Z"
        />
    </ChakraIcon>
);

export const AlertWarningIcon = (props) => (
    <ChakraIcon {...props}>
        <path
            fill="currentColor"
            d="M11.983,0a12.206,12.206,0,0,0-8.51,3.653A11.8,11.8,0,0,0,0,12.207,11.779,11.779,0,0,0,11.8,24h.214A12.111,12.111,0,0,0,24,11.791h0A11.766,11.766,0,0,0,11.983,0ZM10.5,16.542a1.476,1.476,0,0,1,1.449-1.53h.027a1.527,1.527,0,0,1,1.523,1.47,1.475,1.475,0,0,1-1.449,1.53h-.027A1.529,1.529,0,0,1,10.5,16.542ZM11,12.5v-6a1,1,0,0,1,2,0v6a1,1,0,1,1-2,0Z"
        />
    </ChakraIcon>
);
