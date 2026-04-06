import { useTheme } from "./ThemeContext";

export function useThemeColors() {
  const { theme } = useTheme();

  return theme === "light"
    ? {
        bg: "#f8fafc",
        card: "#ffffff",
        text: "#020617",
        border: "#e2e8f0",
        secondaryText: "#64748b",
      }
    : {
        bg: "#020617",
        card: "#0f172a",
        text: "#e2e8f0",
        border: "#1e293b",
        secondaryText: "#64748b",
      };
}
