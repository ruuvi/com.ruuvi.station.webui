import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// Chakra v3 has no built-in color mode manager; it only reacts to a `light` /
// `dark` class on the document root. This is a drop-in replacement for the v2
// hooks that keeps the storage key ("chakra-ui-color-mode") and the
// light/dark/system semantics the app already relies on — index.html and
// index.jsx read the same key before React boots.
export const STORAGE_KEY = "chakra-ui-color-mode";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function matchDark() {
    try {
        return window.matchMedia && window.matchMedia(DARK_QUERY).matches;
    } catch {
        return false;
    }
}

function readStored() {
    try {
        return localStorage.getItem(STORAGE_KEY);
    } catch {
        return null;
    }
}

export function resolveColorMode(preference) {
    if (preference === "light" || preference === "dark") return preference;
    return matchDark() ? "dark" : "light";
}

function applyColorMode(colorMode) {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(colorMode);
    root.style.colorScheme = colorMode;
}

// Applied at import time so the very first paint already has the right class,
// mirroring what the inline script in index.html does for the body background.
applyColorMode(resolveColorMode(readStored()));

const ColorModeContext = createContext(null);

export function ColorModeProvider({ children }) {
    const [preference, setPreference] = useState(() => readStored() || "system");
    const colorMode = useMemo(() => resolveColorMode(preference), [preference]);

    useEffect(() => {
        applyColorMode(colorMode);
    }, [colorMode]);

    // Follow the OS while the user has not made an explicit choice.
    useEffect(() => {
        if (preference !== "system") return undefined;
        let mql;
        try {
            mql = window.matchMedia(DARK_QUERY);
        } catch {
            return undefined;
        }
        if (!mql || !mql.addEventListener) return undefined;
        const onChange = () => applyColorMode(matchDark() ? "dark" : "light");
        mql.addEventListener("change", onChange);
        return () => mql.removeEventListener("change", onChange);
    }, [preference]);

    // Keep other tabs in sync, the way the v2 localStorage manager did.
    useEffect(() => {
        const onStorage = (event) => {
            if (event.key === STORAGE_KEY) setPreference(event.newValue || "system");
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    const setColorMode = useCallback((next) => {
        setPreference(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            /* storage may be unavailable (private mode) */
        }
    }, []);

    const toggleColorMode = useCallback(() => {
        setColorMode(resolveColorMode(readStored() || "system") === "dark" ? "light" : "dark");
    }, [setColorMode]);

    const value = useMemo(
        () => ({ colorMode, setColorMode, toggleColorMode }),
        [colorMode, setColorMode, toggleColorMode],
    );

    return <ColorModeContext.Provider value={value}>{children}</ColorModeContext.Provider>;
}

export function useColorMode() {
    const context = useContext(ColorModeContext);
    if (context) return context;
    // Components rendered outside the provider (unit tests) still need a value.
    return {
        colorMode: resolveColorMode(readStored()),
        setColorMode: () => {},
        toggleColorMode: () => {},
    };
}

export function useColorModeValue(light, dark) {
    const { colorMode } = useColorMode();
    return colorMode === "dark" ? dark : light;
}
