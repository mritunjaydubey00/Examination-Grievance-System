import { useEffect, useMemo, useState } from "react";
import { ThemeContext } from "./theme.js";

const THEME_STORAGE_KEY = "exgrev_theme";

function getInitialTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function toggleTheme(current) {
  return current === "dark" ? "light" : "dark";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.error("Could not save the ExGrev theme preference.", error);
    }
  }, [theme]);

  const value = useMemo(
    () => ({ theme, toggleTheme: () => setTheme(toggleTheme) }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
