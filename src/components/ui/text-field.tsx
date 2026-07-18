import { forwardRef } from "react";
import { TextInput, View, type TextInputProps } from "react-native";
import { AppText } from "./app-text";
import { radii, spacing, typography } from "@/lib/theme/tokens";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, style, ...props },
  ref,
) {
  const { colors } = useAppTheme();
  const { textAlign, isRTL } = useTranslation();
  return (
    <View style={{ gap: spacing.xs, minWidth: 0 }}>
      {label ? <AppText variant="small" color="muted">{label}</AppText> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textFaint}
        selectionColor={colors.primary}
        {...props}
        style={[
          typography.body,
          {
            minHeight: 52,
            borderWidth: 1,
            borderColor: error ? colors.danger : colors.border,
            backgroundColor: colors.input,
            color: colors.text,
            borderRadius: radii.lg,
            paddingHorizontal: spacing.md,
            paddingVertical: 12,
            textAlign,
            writingDirection: isRTL ? "rtl" : "ltr",
            fontSize: 16,
            minWidth: 0,
          },
          style,
        ]}
      />
      {error ? <AppText variant="caption" color="danger">{error}</AppText> : null}
    </View>
  );
});
