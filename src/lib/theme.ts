// Light or dark mode. The choice lives in a cookie so the server can render
// the right mode on first paint; with no cookie the device decides (CSS
// prefers-color-scheme in globals.css).
export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_COOKIE = "academe_theme";
export const isTheme = (v: unknown): v is Theme => v === "light" || v === "dark";
