import type { TextStyle } from "react-native";

export type AppTheme = "light" | "dark";

const shared = {
  primary: "#FF5A36",
  primaryStrong: "#FF704D",
  primaryInk: "#180805",
  success: "#39D98A",
  warning: "#FFB547",
  danger: "#FF5C6C",
  info: "#6EA8FF",
  white: "#FFFFFF",
  black: "#030405",
} as const;

export const themes = {
  light: {
    ...shared,
    primarySoft: "#FFE7DF",
    primarySofter: "#FFF3EF",
    background: "#F4F1EC",
    backgroundElevated: "#FBF8F3",
    surface: "#FFFFFF",
    surfaceMuted: "#EEE9E2",
    surfaceStrong: "#DDD6CD",
    surfaceGlass: "rgba(255,255,255,0.96)",
    surfaceInverse: "#101216",
    text: "#17181B",
    textMuted: "#696B73",
    textFaint: "#9B9DA4",
    textOnDark: "#F5F1E8",
    border: "#E5DED5",
    borderStrong: "#CFC6BC",
    overlay: "rgba(5,6,8,0.72)",
    shadow: "#19120F",
    nav: "rgba(255,255,255,0.98)",
    input: "#F7F3EE",
    successSoft: "#DFF7EB",
    warningSoft: "#FFF0D4",
    dangerSoft: "#FFE2E7",
    infoSoft: "#E7F0FF",
    hero: "#101216",
    heroMuted: "#1A1D22",
    glow: "rgba(255,90,54,0.18)",
  },
  dark: {
    ...shared,
    primarySoft: "#3B1C15",
    primarySofter: "#24120E",
    background: "#090A0D",
    backgroundElevated: "#0D0F13",
    surface: "#13161A",
    surfaceMuted: "#191D22",
    surfaceStrong: "#242A31",
    surfaceGlass: "rgba(19,22,26,0.97)",
    surfaceInverse: "#F5F1E8",
    text: "#F5F1E8",
    textMuted: "#A0A3AA",
    textFaint: "#656A73",
    textOnDark: "#F9F6F0",
    border: "#24282F",
    borderStrong: "#353B44",
    overlay: "rgba(2,3,5,0.88)",
    shadow: "#000000",
    nav: "rgba(15,17,21,0.985)",
    input: "#171A1F",
    successSoft: "#143326",
    warningSoft: "#382A14",
    dangerSoft: "#3A1A21",
    infoSoft: "#172943",
    hero: "#0D0F12",
    heroMuted: "#191C22",
    glow: "rgba(255,90,54,0.16)",
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
  xl: 22,
  xxl: 28,
  hero: 30,
  pill: 999,
} as const;

export const typography = {
  overline: {
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "800" as const,
    letterSpacing: 1.35,
  },
  caption: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500" as const,
  },
  small: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "500" as const,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500" as const,
  },
  bodyStrong: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "700" as const,
  },
  title3: {
    fontSize: 19,
    lineHeight: 27,
    fontWeight: "700" as const,
  },
  title2: {
    fontSize: 25,
    lineHeight: 33,
    fontWeight: "800" as const,
  },
  title1: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "800" as const,
  },
  display: {
    fontSize: 42,
    lineHeight: 48,
    fontWeight: "900" as const,
  },
  hero: {
    fontSize: 36,
    lineHeight: 43,
    fontWeight: "800" as const,
  },
  metric: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "800" as const,
    fontVariant: ["tabular-nums"] as TextStyle["fontVariant"],
  },
  metricLarge: {
    fontSize: 48,
    lineHeight: 52,
    fontWeight: "900" as const,
    fontVariant: ["tabular-nums"] as TextStyle["fontVariant"],
  },
} as const;

export const fontFamilies = {
  regular: "Alexandria_400Regular",
  medium: "Alexandria_500Medium",
  semibold: "Alexandria_600SemiBold",
  bold: "Alexandria_700Bold",
  extraBold: "Alexandria_800ExtraBold",
  numericMedium: "Inter_500Medium",
  numericSemibold: "Inter_600SemiBold",
  numericBold: "Inter_700Bold",
  numericExtraBold: "Inter_800ExtraBold",
  numericBlack: "Inter_900Black",
} as const;