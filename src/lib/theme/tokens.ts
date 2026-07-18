export type AppTheme = "light" | "dark";

const shared = {
  primary: "#6F5AF7",
  primaryStrong: "#5842E8",
  success: "#12A66A",
  warning: "#E39118",
  danger: "#E45165",
  info: "#2F7FF8",
  white: "#FFFFFF",
  black: "#0A0B10",
} as const;

export const themes = {
  light: {
    ...shared,
    primarySoft: "#EEEAFE",
    primarySofter: "#F6F3FF",
    background: "#F6F7FB",
    backgroundElevated: "#FFFFFF",
    surface: "#FFFFFF",
    surfaceMuted: "#F0F2F7",
    surfaceStrong: "#E6E9F1",
    text: "#191A23",
    textMuted: "#656A79",
    textFaint: "#969BAA",
    border: "#E2E5ED",
    borderStrong: "#CDD2DE",
    overlay: "rgba(19, 20, 30, 0.48)",
    shadow: "#242636",
    nav: "rgba(255,255,255,0.98)",
    input: "#FAFBFD",
    successSoft: "#E8F8F1",
    warningSoft: "#FFF4E2",
    dangerSoft: "#FDECEF",
    infoSoft: "#EAF2FF",
  },
  dark: {
    ...shared,
    primary: "#8D7BFF",
    primaryStrong: "#755FF7",
    primarySoft: "#2C2745",
    primarySofter: "#211E31",
    background: "#0E0F14",
    backgroundElevated: "#15161D",
    surface: "#191A22",
    surfaceMuted: "#21232D",
    surfaceStrong: "#2A2D39",
    text: "#F7F7FA",
    textMuted: "#B3B6C2",
    textFaint: "#7F8494",
    border: "#2D303C",
    borderStrong: "#414655",
    overlay: "rgba(0, 0, 0, 0.72)",
    shadow: "#000000",
    nav: "rgba(24,25,33,0.98)",
    input: "#20222B",
    successSoft: "#17372B",
    warningSoft: "#3A2D18",
    dangerSoft: "#3B2027",
    infoSoft: "#1C2D49",
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
  huge: 48,
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 30,
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
