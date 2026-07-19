export type AppTheme = "light" | "dark";

const shared = {
  primary: "#99E61A",
  primaryStrong: "#77C900",
  success: "#53C85A",
  warning: "#F4A524",
  danger: "#F15B67",
  info: "#4D8DFF",
  white: "#FFFFFF",
  black: "#070A0C",
} as const;

export const themes = {
  light: {
    ...shared,
    primarySoft: "#E9F9C9",
    primarySofter: "#F4FBE7",
    background: "#F4F6F2",
    backgroundElevated: "#FFFFFF",
    surface: "#FFFFFF",
    surfaceMuted: "#F0F3ED",
    surfaceStrong: "#E4E9DF",
    text: "#101412",
    textMuted: "#667067",
    textFaint: "#98A097",
    border: "#E1E6DD",
    borderStrong: "#CBD2C8",
    overlay: "rgba(6, 10, 8, 0.52)",
    shadow: "#182119",
    nav: "rgba(255,255,255,0.98)",
    input: "#F8FAF6",
    successSoft: "#E7F7E8",
    warningSoft: "#FFF4DE",
    dangerSoft: "#FDEBED",
    infoSoft: "#EAF1FF",
  },
  dark: {
    ...shared,
    primary: "#A5EF22",
    primaryStrong: "#83D50B",
    primarySoft: "#26370F",
    primarySofter: "#17210D",
    background: "#070B0D",
    backgroundElevated: "#0C1215",
    surface: "#0E1518",
    surfaceMuted: "#151D20",
    surfaceStrong: "#202A2D",
    text: "#F7FAF6",
    textMuted: "#AAB3AA",
    textFaint: "#6F7A72",
    border: "#263034",
    borderStrong: "#394549",
    overlay: "rgba(0, 0, 0, 0.76)",
    shadow: "#000000",
    nav: "rgba(12,18,21,0.98)",
    input: "#11191C",
    successSoft: "#18351F",
    warningSoft: "#382B13",
    dangerSoft: "#3B1E25",
    infoSoft: "#172844",
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
