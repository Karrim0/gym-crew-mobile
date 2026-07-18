import type { PropsWithChildren } from "react";
import { Text, type TextProps, type TextStyle } from "react-native";
import { typography } from "@/lib/theme/tokens";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";

type Variant = keyof typeof typography;

interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: "default" | "muted" | "faint" | "primary" | "success" | "danger" | "warning";
  align?: TextStyle["textAlign"];
}

export function AppText({
  children,
  variant = "body",
  color = "default",
  align,
  style,
  ...props
}: PropsWithChildren<AppTextProps>) {
  const { colors } = useAppTheme();
  const { textAlign, isRTL } = useTranslation();
  const colorMap = {
    default: colors.text,
    muted: colors.textMuted,
    faint: colors.textFaint,
    primary: colors.primary,
    success: colors.success,
    danger: colors.danger,
    warning: colors.warning,
  } as const;

  return (
    <Text
      maxFontSizeMultiplier={1.35}
      allowFontScaling
      {...props}
      style={[
        typography[variant],
        {
          color: colorMap[color],
          textAlign: align ?? textAlign,
          writingDirection: isRTL ? "rtl" : "ltr",
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
