export type AppTheme = "light" | "dark";

const shared = {
  primary: "#7C5CFC",
  primaryStrong: "#6545E8",
  primarySoft: "#EEE9FF",
  success: "#16A36A",
  warning: "#D88A11",
  danger: "#E05263",
  info: "#2D7FF9",
  white: "#FFFFFF",
  black: "#0A0B10",
} as const;

export const themes = {
  light: {
    ...shared,
    background: "#F4F5F9",
    backgroundElevated: "#FFFFFF",
    surface: "#FFFFFF",
    surfaceMuted: "#ECEEF5",
    surfaceStrong: "#E4E7F1",
    text: "#171821",
    textMuted: "#686B7B",
    textFaint: "#9397A9",
    border: "#DFE2EC",
    borderStrong: "#C9CEDD",
    overlay: "rgba(18, 19, 27, 0.45)",
    shadow: "#161821",
    nav: "rgba(255,255,255,0.96)",
    input: "#F9FAFC",
  },
  dark: {
    ...shared,
    primarySoft: "#2B2445",
    background: "#101117",
    backgroundElevated: "#171820",
    surface: "#1B1C25",
    surfaceMuted: "#232531",
    surfaceStrong: "#2B2E3B",
    text: "#F7F7FB",
    textMuted: "#B2B5C2",
    textFaint: "#7C8192",
    border: "#303342",
    borderStrong: "#424659",
    overlay: "rgba(0, 0, 0, 0.68)",
    shadow: "#000000",
    nav: "rgba(23,24,32,0.96)",
    input: "#20222C",
  },
} as const;

export type ThemeTokens = (typeof themes)[AppTheme];

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  caption: { fontSize: 12, lineHeight: 17 },
  small: { fontSize: 14, lineHeight: 20 },
  smallBold: { fontSize: 14, lineHeight: 20, fontWeight: "700" as const },
  body: { fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: "700" as const },
  title3: { fontSize: 20, lineHeight: 27, fontWeight: "800" as const },
  title2: { fontSize: 24, lineHeight: 31, fontWeight: "800" as const },
  title1: { fontSize: 32, lineHeight: 39, fontWeight: "900" as const },
  display: { fontSize: 42, lineHeight: 48, fontWeight: "900" as const },
} as const;
