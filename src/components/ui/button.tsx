import type { PropsWithChildren, ReactNode } from "react";
import { ActivityIndicator, Pressable, type PressableProps, View } from "react-native";
import { AppText } from "./app-text";
import { radii, spacing } from "@/lib/theme/tokens";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";

interface ButtonProps extends PressableProps {
  variant?: Variant;
  loading?: boolean;
  icon?: ReactNode;
  compact?: boolean;
}

export function Button({ children, variant = "primary", loading = false, icon, compact = false, disabled, style, ...props }: PropsWithChildren<ButtonProps>) {
  const { colors } = useAppTheme();
  const { rowDirection } = useTranslation();
  const background = variant === "primary" ? colors.primary : variant === "danger" ? colors.danger : variant === "success" ? colors.success : variant === "secondary" ? colors.surfaceMuted : "transparent";
  const border = variant === "secondary" ? colors.borderStrong : "transparent";
  const textColor = variant === "primary" ? colors.black : variant === "danger" || variant === "success" ? colors.white : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      {...props}
      style={({ pressed }) => [
        {
          minHeight: compact ? 42 : 56,
          borderRadius: compact ? radii.md : radii.lg,
          paddingHorizontal: compact ? spacing.md : spacing.lg,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: rowDirection,
          gap: spacing.sm,
          backgroundColor: background,
          borderColor: border,
          borderWidth: variant === "secondary" ? 1 : 0,
          opacity: disabled ? 0.45 : pressed ? 0.86 : 1,
          transform: [{ scale: pressed && !disabled ? 0.985 : 1 }],
          minWidth: 0,
          shadowColor: variant === "primary" ? colors.primary : colors.shadow,
          shadowOpacity: variant === "primary" ? 0.2 : 0,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: variant === "primary" ? 3 : 0,
        },
        typeof style === "function" ? style({ pressed }) : style,
      ]}
    >
      {loading ? <ActivityIndicator color={textColor} /> : null}
      {!loading && icon ? <View>{icon}</View> : null}
      {!loading ? <AppText variant="bodyStrong" align="center" style={{ color: textColor, flexShrink: 1 }}>{children}</AppText> : null}
    </Pressable>
  );
}
