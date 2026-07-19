import type { PropsWithChildren } from "react";
import { View, type ViewProps } from "react-native";
import { radii, spacing } from "@/lib/theme/tokens";
import { useAppTheme } from "@/lib/theme/use-app-theme";

type CardVariant = "default" | "muted" | "glass" | "dark" | "outline";

interface CardProps extends ViewProps {
  padded?: boolean;
  muted?: boolean;
  elevated?: boolean;
  variant?: CardVariant;
}

export function Card({ children, style, padded = true, muted = false, elevated = true, variant = "default", ...props }: PropsWithChildren<CardProps>) {
  const { colors, resolved } = useAppTheme();
  const effective = muted ? "muted" : variant;
  const backgroundColor = effective === "muted"
    ? colors.surfaceMuted
    : effective === "glass"
      ? colors.surfaceGlass
      : effective === "dark"
        ? colors.hero
        : effective === "outline"
          ? "transparent"
          : colors.surface;
  const borderColor = effective === "dark" ? colors.borderStrong : colors.border;
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
          shadowOpacity: elevated ? (resolved === "dark" ? 0.32 : 0.075) : 0,
          shadowRadius: elevated ? 22 : 0,
          shadowOffset: { width: 0, height: 10 },
          elevation: elevated ? 3 : 0,
          minWidth: 0,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
