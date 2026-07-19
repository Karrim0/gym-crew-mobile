import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, BellRing, CheckCheck, ChevronLeft, Trash2 } from "lucide-react-native";
import { Screen } from "@/components/ui/screen";
import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { Button } from "@/components/ui/button";
import { ActionSheet } from "@/components/ui/action-sheet";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { spacing } from "@/lib/theme/tokens";
import { useNotificationCenterStore } from "@/stores/notification-center-store";
import { formatShortDate } from "@/lib/utils/date";

export default function NotificationsScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { language, rowDirection, isRTL, t } = useTranslation();
  const items = useNotificationCenterStore((state) => state.items);
  const markRead = useNotificationCenterStore((state) => state.markRead);
  const markAllRead = useNotificationCenterStore((state) => state.markAllRead);
  const clear = useNotificationCenterStore((state) => state.clear);
  const unread = items.filter((item) => !item.readAt).length;
  const [clearOpen, setClearOpen] = useState(false);

  function openItem(id: string, route: string | null) {
    markRead(id);
    if (route?.startsWith("/")) router.push(route as never);
  }

  return (
    <Screen>
      <View style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.sm }}>
        <IconButton onPress={() => router.back()} icon={isRTL ? <ChevronLeft color={colors.text} /> : <ArrowLeft color={colors.text} />} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText variant="title2">{language === "ar" ? "الإشعارات" : "Notifications"}</AppText>
          <AppText variant="small" color="muted">
            {unread ? (language === "ar" ? `${unread} إشعار جديد` : `${unread} unread`) : (language === "ar" ? "أنت متابع كل حاجة" : "You are all caught up")}
          </AppText>
        </View>
        {items.length ? <IconButton accessibilityLabel={language === "ar" ? "تحديد الكل كمقروء" : "Mark all read"} onPress={markAllRead} icon={<CheckCheck color={colors.primary} size={20} />} tone="primary" /> : null}
      </View>

      {!items.length ? (
        <Card style={{ minHeight: 390, alignItems: "center", justifyContent: "center", gap: spacing.lg, paddingHorizontal: spacing.xl }}>
          <View style={{ width: 96, height: 96, borderRadius: 32, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
            <BellRing size={44} color={colors.primary} />
          </View>
          <View style={{ gap: 6 }}>
            <AppText variant="title2" align="center">{language === "ar" ? "مفيش إشعارات لسه" : "No notifications yet"}</AppText>
            <AppText color="muted" align="center">{language === "ar" ? "تنبيهات الراحة والتحديثات المهمة هتظهر هنا." : "Rest alerts and important updates will appear here."}</AppText>
          </View>
        </Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {items.map((item) => (
            <Pressable key={item.id} accessibilityRole="button" onPress={() => openItem(item.id, item.route)} style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}>
              <Card elevated={!item.readAt} style={{ flexDirection: rowDirection, gap: spacing.md, borderColor: item.readAt ? colors.border : colors.primary }}>
                <View style={{ width: 48, height: 48, borderRadius: 17, backgroundColor: item.readAt ? colors.surfaceMuted : colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                  <BellRing size={23} color={item.readAt ? colors.textMuted : colors.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 7 }}>
                    <AppText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>{item.title}</AppText>
                    {!item.readAt ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary }} /> : null}
                  </View>
                  <AppText variant="small" color="muted">{item.body}</AppText>
                  <AppText variant="caption" color="faint">{formatShortDate(item.createdAt.slice(0, 10), language)}</AppText>
                </View>
              </Card>
            </Pressable>
          ))}
          <Button variant="ghost" icon={<Trash2 color={colors.danger} size={18} />} onPress={() => setClearOpen(true)}>
            {language === "ar" ? "امسح السجل" : "Clear history"}
          </Button>
        </View>
      )}
      <ActionSheet visible={clearOpen} title={language === "ar" ? "مسح سجل الإشعارات؟" : "Clear notification history?"} description={language === "ar" ? "ده هيمسح السجل من الجهاز بس، ومش هيغيّر إعدادات التنبيهات." : "This only clears the local history and does not change notification settings."} onClose={() => setClearOpen(false)}>
        <Button variant="secondary" onPress={() => setClearOpen(false)}>{t("common.cancel")}</Button>
        <Button variant="danger" onPress={() => { clear(); setClearOpen(false); }}>{language === "ar" ? "مسح السجل" : "Clear history"}</Button>
      </ActionSheet>
    </Screen>
  );
}
