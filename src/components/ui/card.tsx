import type { PropsWithChildren } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { BlurView } from "expo-blur";
import { radii, spacing } from "@/lib/theme/tokens";
import { useAppTheme } from "@/lib/theme/use-app-theme";

type CardVariant = "default" | "muted" | "glass" | "dark" | "outline";

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
  const hasShadow = elevated || glass;

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
          shadowOpacity: hasShadow ? (resolved === "dark" ? 0.2 : 0.075) : 0,
          shadowRadius: hasShadow ? 20 : 0,
          shadowOffset: { width: 0, height: 10 },
          elevation: hasShadow ? 3 : 0,
          minWidth: 0,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {glass ? (
        <>
          <BlurView pointerEvents="none" intensity={resolved === "dark" ? 24 : 42} tint={resolved} style={StyleSheet.absoluteFill} />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceTint }]} />
          <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 20, right: 20, height: 1, backgroundColor: colors.glassHighlight }} />
        </>
      ) : null}
      {children}
    </View>
  );
}
