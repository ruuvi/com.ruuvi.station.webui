// Chakra v3 ships a tighter default scale than v2 (smaller control padding,
// 14px body text, forced icon sizes) and its size variants override `base`.
// These lock in the v2 metrics the UI was designed around.
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";

window.matchMedia =
    window.matchMedia ||
    ((q) => ({
        matches: false,
        media: q,
        onchange: null,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent: () => false,
    }));

const { system } = await import("./themes");
const { Provider } = await import("./components/ui/provider");
const RDialog = (await import("./components/dialogs/RDialog")).default;

// The emitted stylesheet is the only place a bad conditional selector shows up
const render = async (node) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
        root.render(<Provider>{node}</Provider>);
    });
    await act(async () => {
        await new Promise((r) => setTimeout(r, 30));
    });
    const css = [...document.querySelectorAll("style")].map((s) => s.textContent).join("\n");
    const cleanup = async () => {
        await act(async () => {
            root.unmount();
        });
        container.remove();
    };
    return { css, cleanup };
};

const emittedCss = async () => {
    const { css, cleanup } = await render(<div />);
    await cleanup();
    return css;
};

describe("v2 metric parity", () => {
    it("paints the page background on html so it survives scrolling", () => {
        // v3 sets `html { bg: bg }`, which blocks body-background propagation
        const html = system.getGlobalCss()["@layer base"]["&html"];
        expect(JSON.stringify(html)).toContain("#edf2f2");
        // the dark rule must target html itself; `_dark` would emit `.dark html`,
        // which never matches because the class is on <html>
        expect(JSON.stringify(html["&.dark"])).toContain("#001b1a");
        expect(html._dark).toBeUndefined();
    });

    it("keeps every component's own slot anatomy", () => {
        // Chakra merges `slots` element-wise, so declaring a partial list in an
        // override renames real slots and silently drops their styles.
        const required = {
            dialog: ["trigger", "backdrop", "positioner", "content", "header", "body", "footer"],
            menu: ["trigger", "positioner", "content", "item", "separator", "itemGroupLabel"],
            accordion: ["root", "item", "itemTrigger", "itemContent", "itemBody", "itemIndicator"],
            radioGroup: ["root", "item", "itemControl", "itemText", "label"],
            field: ["root", "label", "errorText", "helperText"],
            progress: ["root", "track", "range", "label"],
            popover: ["positioner", "content", "arrow"],
            tooltip: ["positioner", "content", "arrow"],
            pinInput: ["root", "control", "input"],
            avatar: ["root", "image", "fallback"],
            switch: ["root", "control", "thumb"],
        };
        for (const [name, slots] of Object.entries(required)) {
            const actual = system.getSlotRecipe(name).slots;
            for (const slot of slots) {
                expect(actual, `${name} is missing the "${slot}" slot`).toContain(slot);
            }
        }
    });

    it("keeps the dialog positioner fixed over the page", async () => {
        const { css, cleanup } = await render(
            <RDialog isOpen title="T" onClose={() => {}}>
                body
            </RDialog>,
        );
        const positioner = document.body.querySelector('[data-scope="dialog"][data-part="positioner"]');
        // an unstyled positioner means the slot lost its recipe: the dialog
        // then lays out in normal flow, underneath the backdrop
        const styleClass = positioner.className.split(" ").find((x) => x.startsWith("css-"));
        expect(styleClass, "positioner has no generated style class").toBeTruthy();
        const rule = css.split("}").find((r) => r.includes("." + styleClass) && r.includes("position:fixed"));
        expect(rule, "positioner is not position:fixed").toBeTruthy();
        await cleanup();
    });

    it("gives both colour modes a visible hr", async () => {
        const css = await emittedCss();
        // v2 only styled hr in light mode; a single unconditional rule leaves
        // the dividers invisible on the dark background
        expect(css).toMatch(/hr\{border-color:#083c3d1a/);
        expect(css).toMatch(/\.dark hr[^{]*\{border-color:rgba\(255, ?255, ?255, ?0\.16\)/);
    });

    it("keeps v2's faint placeholder colour", async () => {
        const css = await emittedCss();
        // v2 resolved `chakra-placeholder-color` (gray.500) through this
        // theme's flattened gray scale; v3 uses a much darker `fg.muted/80`
        expect(css).toMatch(/\*::placeholder,\*\[data-placeholder\]\{color:#d4ede8/);
        expect(css).toMatch(/\.dark \*::placeholder[^{]*\{color:rgba\(255, ?255, ?255, ?0\.24\)/);
        expect(css).not.toContain("fg-muted/80");
    });

    it("targets html itself for the dark background", async () => {
        const css = await emittedCss();
        expect(css).toMatch(/html\{[^}]*#edf2f2/);
        // must be `html.dark`, never `.dark html` — <html> carries the class,
        // so a descendant selector silently never matches
        expect(css).toContain("html.dark{");
        expect(css).not.toMatch(/\.dark html\{/);
    });

    it("keeps the v2 control scale", () => {
        const input = system.getRecipe("input");
        expect(input.variants.size.md.px).toBe("4");
        expect(input.variants.size.md.textStyle).toBe("md");
        expect(input.variants.size.md.borderRadius).toBe("md");

        const textarea = system.getRecipe("textarea");
        expect(textarea.variants.size.md.px).toBe("4");
        expect(textarea.variants.size.md.py).toBe("2");

        const menu = system.getSlotRecipe("menu");
        expect(menu.variants.size.md.content.padding).toBe(0);
        // v2's MenuList was minW 3xs
        expect(menu.variants.size.md.content.minW).toBe("14rem");
        expect(menu.base.content.borderRadius).toBe("md");
        // v3 pins menu text to `fg` and spaces item children by 8px; v2 did neither
        expect(menu.base.content.color).toBe("inherit");
        expect(menu.base.item.color).toBe("inherit");
        expect(menu.variants.size.md.item.gap).toBe(0);
        // py/px, not `padding` — Chakra emits shorthands first, so a
        // `padding` override always loses to the default variant's longhands
        expect(menu.variants.size.md.item.py).toBe(3);
        expect(menu.variants.size.md.item.px).toBe(3);

        const dialog = system.getSlotRecipe("dialog");
        expect(dialog.base.content.textStyle).toBe("md");
        // the line height must stay unitless: `textStyle`'s is in rem, which
        // every descendant inherits as an absolute length
        expect(dialog.base.content.lineHeight).toBe(1.5);
        expect(system.getSlotRecipe("popover").base.content.lineHeight).toBe(1.5);
        expect(dialog.base.header.fontSize).toBe("xl");
        expect(dialog.base.header.pt).toBe("4");
        expect(dialog.base.body.pb).toBe("2");
        expect(dialog.base.footer.pt).toBe("4");
        // v2's ModalFooter had no gap and sat 3.75rem from the top
        expect(dialog.base.footer.gap).toBe(0);
        expect(dialog.base.closeTrigger.insetEnd).toBe("3");
        expect(dialog.variants.placement.top.content["--dialog-base-margin"]).toBe("3.75rem");

        const field = system.getSlotRecipe("field");
        expect(field.base.root.gap).toBe("2");
        expect(field.base.label.textStyle).toBe("md");

        const radio = system.getSlotRecipe("radioGroup");
        expect(radio.variants.size.md.itemControl.boxSize).toBe("4");
        expect(radio.variants.size.md.item.textStyle).toBe("md");
        // v2's ring was 2px with a half-size dot; `variant` resolves after
        // `size`, so the width has to live on the variant to win
        expect(radio.variants.variant.solid.itemControl.borderWidth).toBe("2px");
        expect(radio.variants.size.md.itemControl["& .dot"].scale).toBe("0.5");

        const sw = system.getSlotRecipe("switch");
        expect(sw.variants.size.md.root["--switch-width"]).toBe("1.875rem");
        // v3 tracks an unchecked switch with bg.emphasized; v2 used the (mint) gray scale
        expect(sw.variants.variant.solid.control.bg.base).toBe("#d4ede8");

        const pin = system.getSlotRecipe("pinInput");
        expect(pin.variants.size.md.input.textStyle).toBe("md");

        const avatar = system.getSlotRecipe("avatar");
        expect(avatar.variants.variant.subtle.root.bg).toBe("#35AD9F");
        // v3 halved the scale; the sensor page header relies on v2's 6rem
        expect(avatar.variants.size.xl.root["--avatar-size"]).toBe("6rem");
        expect(avatar.variants.size.lg.root["--avatar-size"]).toBe("4rem");

        const tooltip = system.getSlotRecipe("tooltip");
        expect(tooltip.base.content.textStyle).toBe("sm");

        const heading = system.getRecipe("heading");
        expect(heading.variants.size.sm.textStyle).toBe("md");
        // v3 headings are semibold with the text style's own line height
        expect(heading.base.fontWeight).toBe("bold");
        expect(heading.variants.size.sm.lineHeight).toBe(1.2);
        expect(heading.variants.size.xl.lineHeight).toEqual({ base: 1.33, md: 1.2 });

        // spinner must stay uncoloured, the way v2 left it
        const spinner = system.getRecipe("spinner");
        expect(spinner.base.color).toBeUndefined();

        // button variant padding must still beat the size variant
        const button = system.getRecipe("button");
        expect(button.variants.variant.solid.paddingLeft).toBe("25px");
        expect(button.base.borderRadius).toBe(30);
        expect(button.variants.size.md.textStyle).toBe("md");
        expect(button.variants.size.md._icon.width).toBe("auto");
        expect(button.variants.size.md.px).toBe("4");
        // v2's bare `5` was the spacing token (1.25rem), not 5px
        expect(button.variants.variant.topbar.paddingLeft).toBe(5);
        // v2's built-in link variant zeroed padding/height; v3 has none
        expect(button.variants.variant.link.px).toBe(0);
        expect(button.variants.variant.link.py).toBe(0);
        expect(button.variants.variant.link.h).toBe("auto");
        expect(button.variants.variant.link.padding).toBeUndefined();

        const menuSeparator = system.getSlotRecipe("menu").base.separator;
        expect(menuSeparator.bg.base).toBe("#0000001a");
        expect(menuSeparator.bg._dark).toBe("#ffffff1a");

        const separator = system.getRecipe("separator");
        expect(separator.base.borderColor.base).toBe("#083c3d1a");
        expect(separator.base.borderColor._dark).toBe("rgba(255, 255, 255, 0.16)");
        expect(separator.base.opacity).toBe(0.6);

        // the size variants restate `focusRingColor: var(--focus-color)`, so
        // setting only --focus-ring-color leaves inputs with a grey focus ring
        expect(system.getRecipe("input").base["--focus-color"]).toBe("#1f9385");
        expect(system.getSlotRecipe("pinInput").base.input["--focus-color"]).toBe("#1f9385");

        // v2's reset painted every default border with the (mint) gray scale
        expect(system.token("colors.border")).toContain("border");
        expect(system.tokens.getByName("colors.border").value).toBe("#d4ede8");
        expect(system.tokens.getByName("colors.border.emphasized").value).toBe("#d4ede8");
    });

    it("keeps v2's 992px lg breakpoint", () => {
        // v2's lg was 62em; v3 moved it to 1024px, shifting the page gutters
        expect(system.tokens.getByName("breakpoints.lg").value).toBe("992px");
        // the override merges into the default set — every other step must
        // survive it (v2's em values equal v3's px defaults at 16px root)
        expect(system.tokens.getByName("breakpoints.sm").value).toBe("480px");
        expect(system.tokens.getByName("breakpoints.md").value).toBe("768px");
        expect(system.tokens.getByName("breakpoints.xl").value).toBe("1280px");
        expect(system.tokens.getByName("breakpoints.2xl").value).toBe("1536px");
    });

    // getSlotRecipe() returns the merged *config*, which cannot see that the
    // default size/variant styles resolve after `base` — the exact failure the
    // overrides guard against. These assertions resolve the recipe the way the
    // renderer does, so an override parked on the losing side fails here.
    it("wins over the default variants in the rendered styles", () => {
        const resolved = (name) => {
            const styles = system.getSlotRecipeFn(name)({});
            return Object.fromEntries(
                Object.entries(styles).map(([slot, s]) => [slot, s["@layer recipes"]]),
            );
        };
        const darkRule = (slot) =>
            Object.entries(slot).find(([selector]) => selector.includes(".dark"))?.[1];

        // v2's track was a flat gray.100 / whiteAlpha.300 bar with the mint
        // range — no rounding, no inset shadow
        const progress = resolved("progress");
        expect(progress.track.backgroundColor).toBe("#d4ede8");
        expect(darkRule(progress.track).backgroundColor).toBe("rgba(255, 255, 255, 0.16)");
        expect(progress.track.borderRadius).toBe(0);
        expect(progress.track.boxShadow).toBe("none");
        expect(progress.track.height).toBe("var(--chakra-sizes-3)");
        expect(progress.range.backgroundColor).toBe("#35AD9F");

        // v2's MenuDivider sat flush; v3's default my/mx longhands beat a
        // `margin` shorthand override
        const menu = resolved("menu");
        expect(menu.separator.marginBlock).toBe(0);
        expect(menu.separator.marginInline).toBe(0);

        // v2 shipped the component rule (#ffffff80), not the losing global
        const accordion = resolved("accordion");
        expect(darkRule(accordion.itemIndicator).color).toBe("#ffffff80 !important");
    });
});
