import { useCallback, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { useFocusEffect } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { Copy, Crown, Medal, UsersRound } from "lucide-react-native";
import { Screen } from "@/components/ui/screen";
import { AppHeader } from "@/components/layout/app-header";
import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { SectionHeader } from "@/components/ui/section-header";
import { fetchGroupWeeklyStats } from "@/features/groups/group-service";
import { friendlyError } from "@/lib/supabase/errors";
import { useSessionStore } from "@/stores/session-store";
import { useTranslation } from "@/lib/localization/use-translation";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { spacing } from "@/lib/theme/tokens";
import type { GroupMemberWeeklyStats } from "@/types";

export default function CrewScreen() {
  const membership = useSessionStore((s) => s.membership);
  const { colors } = useAppTheme();
  const { t, language, rowDirection } = useTranslation();
  const [stats, setStats] = useState<GroupMemberWeeklyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!membership || membership.group.isPersonal) { setLoading(false); return; }
    setLoading(true); setError(null);
    try { setStats((await fetchGroupWeeklyStats(membership.group.id)).sort((a, b) => b.adherencePercent - a.adherencePercent)); }
    catch (caught) { setError(friendlyError(caught)); }
    finally { setLoading(false); }
  }, [membership]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) return <Screen><LoadingState /></Screen>;
  if (error && !stats.length) return <Screen><ErrorState message={error} onRetry={() => void load()} /></Screen>;
  if (!membership || membership.group.isPersonal) {
    return (
      <Screen>
        <AppHeader title={t("crew.title")} />
        <View style={{ flex: 1, minHeight: 500, alignItems: "center", justifyContent: "center", gap: spacing.lg }}>
          <View style={{ width: 100, height: 100, borderRadius: 34, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}><UsersRound size={48} color={colors.primary} /></View>
          <AppText variant="title2" align="center">{t("crew.soloTitle")}</AppText>
          <AppText color="muted" align="center">{t("crew.soloDesc")}</AppText>
          <Button onPress={() => Alert.alert(t("crew.title"), language === "ar" ? "تحويل المساحة الشخصية لجروب هيتضاف في مرحلة إدارة الجروبات. بيانات تمرينك الحالية هتفضل آمنة." : "Converting a personal workspace into a crew is planned for crew management. Your current workout data stays safe.")}>{language === "ar" ? "إدارة الجروب قريب" : "Crew management next"}</Button>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title={membership.group.name} subtitle={language === "ar" ? "التقييم على الالتزام بجدول كل واحد." : "Ranked by each member's plan adherence."} />
      <Card style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md }}>
        <View style={{ flex: 1, minWidth: 0 }}><AppText variant="caption" color="muted">{t("crew.invite")}</AppText><AppText variant="title2" style={{ letterSpacing: 3 }}>{membership.group.inviteCode}</AppText></View>
        <Pressable onPress={() => void Clipboard.setStringAsync(membership.group.inviteCode)} style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}><Copy color={colors.primary} /></Pressable>
      </Card>
      <SectionHeader title={t("crew.leaderboard")} />
      <View style={{ gap: spacing.sm }}>
        {stats.map((member, index) => (
          <Card key={member.userId} style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md }}>
            <View style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: index === 0 ? "rgba(216,138,17,.14)" : colors.surfaceMuted, alignItems: "center", justifyContent: "center" }}>
              {index === 0 ? <Crown color={colors.warning} /> : index < 3 ? <Medal color={colors.primary} /> : <AppText variant="bodyStrong" align="center">{index + 1}</AppText>}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="bodyStrong" numberOfLines={1}>{member.displayName}</AppText>
              <AppText variant="small" color="muted">{t("crew.adherence", { completed: member.sessionsThisWeek, planned: member.scheduledThisWeek, percent: member.adherencePercent })}</AppText>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surfaceStrong, overflow: "hidden", marginTop: 7 }}><View style={{ height: "100%", width: `${Math.min(100, member.adherencePercent)}%`, backgroundColor: colors.primary }} /></View>
            </View>
            <AppText variant="title3" color="primary">{member.adherencePercent}%</AppText>
          </Card>
        ))}
        {!stats.length ? <Card><AppText color="muted">{language === "ar" ? "أول ما الناس تتمرن، الترتيب هيظهر هنا." : "The leaderboard will appear after the first workouts."}</AppText></Card> : null}
      </View>
    </Screen>
  );
}
