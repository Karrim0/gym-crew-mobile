import type { PropsWithChildren } from "react";
import { Text, type TextProps, type TextStyle } from "react-native";
import { fontFamilies, typography } from "@/lib/theme/tokens";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";

type Variant = keyof typeof typography;

interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: "default" | "muted" | "faint" | "primary" | "success" | "danger" | "warning";
  align?: TextStyle["textAlign"];
  numeric?: boolean;
}

function familyFor(variant: Variant, numeric: boolean) {
  if (numeric || variant === "metric" || variant === "metricLarge") {
    if (variant === "metricLarge" || variant === "display") return fontFamilies.numericBlack;
    if (variant === "metric" || variant === "title1" || variant === "title2") return fontFamilies.numericExtraBold;
    if (variant === "bodyStrong" || variant === "smallBold" || variant === "title3") return fontFamilies.numericBold;
    return fontFamilies.numericMedium;
  }
  if (variant === "hero" || variant === "display" || variant === "title1") return fontFamilies.extraBold;
  if (variant === "title2" || variant === "title3" || variant === "bodyStrong" || variant === "smallBold" || variant === "overline") return fontFamilies.bold;
  if (variant === "body" || variant === "small") return fontFamilies.medium;
  return fontFamilies.regular;
}

export function AppText({
  children,
  variant = "body",
  color = "default",
  align,
  numeric = false,
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
          fontFamily: familyFor(variant, numeric),
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
