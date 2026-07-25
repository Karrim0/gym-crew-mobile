import type { PropsWithChildren, ReactNode } from "react";
import { ActivityIndicator, Pressable, type PressableProps, View } from "react-native";
import * as Haptics from "expo-haptics";
import { AppText } from "./app-text";
import { radii, spacing } from "@/lib/theme/tokens";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { useSettingsStore } from "@/stores/settings-store";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "dark";

interface ButtonProps extends PressableProps {
  variant?: Variant;
  loading?: boolean;
  icon?: ReactNode;
  trailingIcon?: ReactNode;
  compact?: boolean;
}

export function Button({ children, variant = "primary", loading = false, icon, trailingIcon, compact = false, disabled, style, onPress, ...props }: PropsWithChildren<ButtonProps>) {
  const { colors } = useAppTheme();
  const { rowDirection } = useTranslation();
  const hapticsEnabled = useSettingsStore((state) => state.hapticsEnabled);
  const background = variant === "primary"
    ? colors.primary
    : variant === "danger"
      ? colors.danger
      : variant === "success"
        ? colors.success
        : variant === "dark"
          ? colors.heroMuted
          : variant === "secondary"
            ? colors.surfaceMuted
            : "transparent";
  const border = variant === "secondary" || variant === "ghost" || variant === "dark" ? colors.borderStrong : "transparent";
  const textColor = variant === "primary"
    ? colors.primaryInk
    : variant === "danger" || variant === "success"
      ? colors.white
      : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: loading }}
      disabled={disabled || loading}
      onPress={(event) => {
        if (hapticsEnabled) void Haptics.selectionAsync();
        onPress?.(event);
      }}
      {...props}
      style={({ pressed }) => [
        {
          minHeight: compact ? 46 : 56,
          borderRadius: compact ? radii.md : radii.lg,
          paddingHorizontal: compact ? spacing.md : spacing.lg,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: rowDirection,
          gap: spacing.sm,
          backgroundColor: background,
          borderColor: border,
          borderWidth: variant === "secondary" || variant === "ghost" || variant === "dark" ? 1 : 0,
          opacity: disabled ? 0.38 : pressed ? 0.78 : 1,
          transform: [{ scale: pressed && !disabled ? 0.985 : 1 }],
          minWidth: 0,
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
