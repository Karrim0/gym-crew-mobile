import type { PropsWithChildren, ReactNode } from "react";
import { ActivityIndicator, Pressable, type PressableProps, View } from "react-native";
import { AppText } from "./app-text";
import { radii, spacing } from "@/lib/theme/tokens";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "dark";

interface ButtonProps extends PressableProps {
  variant?: Variant;
  loading?: boolean;
  icon?: ReactNode;
  trailingIcon?: ReactNode;
  compact?: boolean;
}

export function Button({ children, variant = "primary", loading = false, icon, trailingIcon, compact = false, disabled, style, ...props }: PropsWithChildren<ButtonProps>) {
  const { colors } = useAppTheme();
  const { rowDirection } = useTranslation();
  const background = variant === "primary"
    ? colors.primary
    : variant === "danger"
      ? colors.danger
      : variant === "success"
        ? colors.success
        : variant === "dark"
          ? colors.hero
          : variant === "secondary"
            ? colors.surfaceMuted
            : "transparent";
  const border = variant === "secondary" || variant === "ghost" ? colors.borderStrong : "transparent";
  const textColor = variant === "primary"
    ? colors.primaryInk
    : variant === "danger" || variant === "success" || variant === "dark"
      ? colors.white
      : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      {...props}
      style={({ pressed }) => [
        {
          minHeight: compact ? 44 : 58,
          borderRadius: compact ? radii.md : radii.lg,
          paddingHorizontal: compact ? spacing.md : spacing.lg,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: rowDirection,
          gap: spacing.sm,
          backgroundColor: background,
          borderColor: border,
          borderWidth: variant === "secondary" || variant === "ghost" ? 1 : 0,
          opacity: disabled ? 0.42 : pressed ? 0.86 : 1,
          transform: [{ scale: pressed && !disabled ? 0.982 : 1 }],
          minWidth: 0,
          shadowColor: variant === "primary" ? colors.primary : colors.shadow,
          shadowOpacity: variant === "primary" ? 0.22 : 0,
          shadowRadius: variant === "primary" ? 16 : 0,
          shadowOffset: { width: 0, height: 9 },
          elevation: variant === "primary" ? 4 : 0,
        },
        typeof style === "function" ? style({ pressed }) : style,
      ]}
    >
      {loading ? <ActivityIndicator color={textColor} /> : null}
      {!loading && icon ? <View>{icon}</View> : null}
      {!loading ? <AppText variant="bodyStrong" align="center" style={{ color: textColor, flexShrink: 1 }}>{children}</AppText> : null}
      {!loading && trailingIcon ? <View>{trailingIcon}</View> : null}
    </Pressable>
  );
}
