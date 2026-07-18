import type { PropsWithChildren } from "react";
import { View, type ViewProps } from "react-native";
import { radii, spacing } from "@/lib/theme/tokens";
import { useAppTheme } from "@/lib/theme/use-app-theme";

interface CardProps extends ViewProps {
  padded?: boolean;
  muted?: boolean;
}

export function Card({ children, style, padded = true, muted = false, ...props }: PropsWithChildren<CardProps>) {
  const { colors } = useAppTheme();
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
          shadowOpacity: 0.06,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 2,
          minWidth: 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
