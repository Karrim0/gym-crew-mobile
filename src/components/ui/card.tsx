import type { PropsWithChildren } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { BlurView } from "expo-blur";
import { radii, spacing } from "@/lib/theme/tokens";
import { useAppTheme } from "@/lib/theme/use-app-theme";

type CardVariant = "default" | "raised" | "muted" | "sunken" | "glass" | "dark" | "outline";

interface CardProps extends ViewProps {
  padded?: boolean;
  muted?: boolean;
  elevated?: boolean;
  variant?: CardVariant;
}

export function Card({ children, style, padded = true, muted = false, elevated = false, variant = "default", ...props }: PropsWithChildren<CardProps>) {
  const { colors, resolved } = useAppTheme();
  const effective = muted ? "muted" : variant;
  const glass = effective === "glass";
  const backgroundColor = effective === "muted"
    ? colors.surfaceMuted
    : effective === "sunken"
      ? colors.surfaceSunken
      : effective === "raised"
        ? colors.surfaceRaised
        : glass
          ? colors.surfaceGlass
          : effective === "dark"
            ? colors.hero
            : effective === "outline"
              ? "transparent"
              : colors.surface;
  const borderColor = glass
    ? colors.glassBorder
    : effective === "dark" || effective === "outline"
      ? colors.borderStrong
      : colors.border;
  const hasShadow = elevated || effective === "raised" || glass;

  return (
    <View
      {...props}
      style={[
        {
          backgroundColor,
          borderColor,
          borderWidth: 1,
          borderRadius: radii.xl,
          padding: padded ? spacing.lg : 0,
          shadowColor: colors.shadow,
          shadowOpacity: hasShadow ? (resolved === "dark" ? 0.22 : 0.08) : 0,
          shadowRadius: hasShadow ? 24 : 0,
          shadowOffset: { width: 0, height: 12 },
          elevation: hasShadow ? 4 : 0,
          minWidth: 0,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {glass ? (
        <>
          <BlurView pointerEvents="none" intensity={resolved === "dark" ? 22 : 46} tint={resolved} style={StyleSheet.absoluteFill} />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceTint }]} />
          <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 18, right: 18, height: 1, backgroundColor: colors.glassHighlight }} />
        </>
      ) : null}
      {children}
    </View>
  );
}
