import { Button } from '../../src/components/base/buttons/button';
import { Moon01, Sun } from "@untitledui/icons";
import { useTheme } from '../../src/providers/theme-provider';
 
export default function ThemeToggle() {
    const { theme, setTheme } = useTheme();
 
    return (
            <Button
                aria-label="Toggle theme"
                color="tertiary"
                size="sm"
                iconLeading={theme === "light" ? Moon01 : Sun}
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            />
    );
}