import type { ReactNode } from "react";
import { Button } from "../../src/components/base/buttons/button";
import { Moon01, Sun } from "@untitledui/icons";
import { useTheme } from "../../src/providers/theme-provider";

/**
 * Theme toggle control component.
 *
 * Renders a button that switches between light and dark themes.
 * Props: none.
 *
 * Usage:
 * Place this component in app-level navigation or settings controls.
 *
 * @returns {ReactNode} A themed icon button for toggling color mode.
 */
export default function ThemeToggle(): ReactNode {
    const { theme, setTheme } = useTheme();

    return (

        // Button toggles the current theme between light and dark modes.
        <Button
            aria-label="Toggle theme"
            color="tertiary"
            size="sm"
            iconLeading={theme === "light" ? Moon01 : Sun}
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        />

    );
}