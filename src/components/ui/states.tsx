import { ActivityIndicator, View } from "react-native";
import { AppText } from "./app-text";
import { Button } from "./button";
import { spacing } from "@/lib/theme/tokens";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";

export function LoadingState({ label }: { label?: string }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, minHeight: 220 }}>
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText color="muted" align="center">{label ?? t("common.loading")}</AppText>
    </View>
  );
}

export function EmptyState({ title, description, actionLabel, onAction }: { title: string; description?: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", gap: spacing.sm, minHeight: 220, padding: spacing.xl }}>
      <AppText variant="title3" align="center">{title}</AppText>
      {description ? <AppText color="muted" align="center">{description}</AppText> : null}
      {actionLabel && onAction ? <Button onPress={onAction} style={{ marginTop: spacing.sm }}>{actionLabel}</Button> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={{ alignItems: "center", justifyContent: "center", gap: spacing.sm, minHeight: 220, padding: spacing.xl }}>
      <AppText variant="title3" color="danger" align="center">{t("common.error")}</AppText>
      <AppText color="muted" align="center">{message}</AppText>
      {onRetry ? <Button variant="secondary" onPress={onRetry}>{t("common.retry")}</Button> : null}
    </View>
  );
}
