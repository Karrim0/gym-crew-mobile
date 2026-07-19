import type { PropsWithChildren } from "react";
import { View, type ViewProps } from "react-native";
import { radii, spacing } from "@/lib/theme/tokens";
import { useAppTheme } from "@/lib/theme/use-app-theme";

interface CardProps extends ViewProps {
  padded?: boolean;
  muted?: boolean;
  elevated?: boolean;
}

export function Card({ children, style, padded = true, muted = false, elevated = true, ...props }: PropsWithChildren<CardProps>) {
  const { colors, resolved } = useAppTheme();
  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: muted ? colors.surfaceMuted : colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radii.xl,
          padding: padded ? spacing.lg : 0,
          shadowColor: colors.shadow,
          shadowOpacity: elevated ? (resolved === "dark" ? 0.28 : 0.06) : 0,
          shadowRadius: elevated ? 24 : 0,
          shadowOffset: { width: 0, height: 12 },
          elevation: elevated ? 2 : 0,
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
