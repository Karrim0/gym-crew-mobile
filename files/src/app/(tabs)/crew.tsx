import { useCallback, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useFocusEffect } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Check, Copy, Crown, Medal, ShieldCheck, UsersRound } from "lucide-react-native";
import { Screen } from "@/components/ui/screen";
import { AppHeader } from "@/components/layout/app-header";
import { AppText } from "@/components/ui/app-text";
import { Avatar } from "@/components/profile/avatar";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ErrorState } from "@/components/ui/states";
import { ScreenSkeleton } from "@/components/ui/skeleton";
import { SectionHeader } from "@/components/ui/section-header";
import { fetchGroupWeeklyStats } from "@/features/groups/group-service";
import { friendlyError } from "@/lib/supabase/errors";
import { useSessionStore } from "@/stores/session-store";
import { useTranslation } from "@/lib/localization/use-translation";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { spacing } from "@/lib/theme/tokens";
import { formatShortDate } from "@/lib/utils/date";
import type { GroupMemberWeeklyStats } from "@/types";

export default function CrewScreen() {
  const membership = useSessionStore((state) => state.membership);
  const user = useSessionStore((state) => state.user);
  const { colors } = useAppTheme();
  const { t, language, rowDirection } = useTranslation();
  const [stats, setStats] = useState<GroupMemberWeeklyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!membership || membership.group.isPersonal) { setLoading(false); return; }
    if (refresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try { setStats((await fetchGroupWeeklyStats(membership.group.id)).sort((a, b) => b.adherencePercent - a.adherencePercent || b.sessionsThisWeek - a.sessionsThisWeek)); }
    catch (caught) { setError(friendlyError(caught)); }
    finally { setLoading(false); setRefreshing(false); }
  }, [membership]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const summary = useMemo(() => {
    const visible = stats.filter((item) => item.userId === user?.id || item.shareWorkoutSummary);
    return {
      average: visible.length ? Math.round(visible.reduce((sum, item) => sum + item.adherencePercent, 0) / visible.length) : 0,
      sessions: visible.reduce((sum, item) => sum + item.sessionsThisWeek, 0),
    };
  }, [stats, user?.id]);

  async function copyInvite() {
    if (!membership) return;
    await Clipboard.setStringAsync(membership.group.inviteCode);
    setCopied(true);
    void Haptics.selectionAsync();
    setTimeout(() => setCopied(false), 1600);
  }

  if (loading) return <Screen><ScreenSkeleton /></Screen>;
  if (error && !stats.length) return <Screen><AppHeader title={t("crew.title")} /><ErrorState message={language === "ar" ? "تعذر تحميل نشاط الجروب دلوقتي. جرّب تاني بعد لحظة." : "Crew activity could not load right now. Try again in a moment."} onRetry={() => void load()} /></Screen>;
  if (!membership || membership.group.isPersonal) {
    return (
      <Screen>
        <AppHeader title={t("crew.title")} subtitle={language === "ar" ? "مساحتك الحالية شخصية وآمنة." : "Your current workspace is private."} />
        <Card style={{ minHeight: 410, alignItems: "center", justifyContent: "center", gap: spacing.lg, paddingHorizontal: spacing.xl }}>
          <View style={{ width: 104, height: 104, borderRadius: 36, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}><UsersRound size={50} color={colors.primary} /></View>
          <View style={{ gap: 8 }}><AppText variant="title2" align="center">{t("crew.soloTitle")}</AppText><AppText color="muted" align="center">{t("crew.soloDesc")}</AppText></View>
          <Card muted elevated={false} style={{ width: "100%", gap: 8 }}><View style={{ flexDirection: rowDirection, gap: 10, alignItems: "center" }}><ShieldCheck color={colors.success} /><AppText variant="smallBold" style={{ flex: 1 }}>{language === "ar" ? "بياناتك الحالية مش هتضيع لما نفعّل إدارة الجروبات." : "Your workout data stays safe when crew management is enabled."}</AppText></View></Card>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={() => void load(true)}>
      <AppHeader title={membership.group.name} subtitle={language === "ar" ? "الترتيب على الالتزام بخطة كل واحد، مش على الأوزان." : "Ranked by plan adherence, not weight lifted."} />

      <Card variant="dark" style={{ gap: spacing.lg, padding: spacing.xl, borderRadius: 30 }}>
        <View pointerEvents="none" style={{ position: "absolute", width: 210, height: 210, borderRadius: 105, backgroundColor: colors.glow, end: -95, top: -115 }} />
        <View style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md }}>
          <View style={{ width: 58, height: 58, borderRadius: 20, backgroundColor: colors.heroMuted, alignItems: "center", justifyContent: "center" }}><UsersRound color={colors.primary} size={29} /></View>
          <View style={{ flex: 1, minWidth: 0 }}><AppText variant="title2" style={{ color: colors.textOnDark }}>{stats.length} {language === "ar" ? "عضو" : stats.length === 1 ? "member" : "members"}</AppText><AppText variant="small" style={{ color: colors.textMuted }}>{summary.sessions} {language === "ar" ? "تمرينة الأسبوع ده" : "workouts this week"}</AppText></View>
          <View style={{ alignItems: "center" }}><AppText variant="title1" color="primary" align="center">{summary.average}%</AppText><AppText variant="caption" style={{ color: colors.textMuted }} align="center">{language === "ar" ? "التزام" : "adherence"}</AppText></View>
        </View>
        <ProgressBar value={summary.average} />
      </Card>

      <Card style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md }}>
        <View style={{ flex: 1, minWidth: 0 }}><AppText variant="caption" color="muted">{t("crew.invite")}</AppText><AppText variant="title2" style={{ letterSpacing: 3 }}>{membership.group.inviteCode}</AppText></View>
        <Pressable accessibilityRole="button" onPress={() => void copyInvite()} style={({ pressed }) => ({ width: 52, height: 52, borderRadius: 18, backgroundColor: copied ? colors.successSoft : colors.primarySoft, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.72 : 1 })}>{copied ? <Check color={colors.success} /> : <Copy color={colors.primary} />}</Pressable>
      </Card>

      <SectionHeader title={t("crew.leaderboard")} />
      <View style={{ gap: spacing.sm }}>
        {stats.map((member, index) => {
          const isMe = member.userId === user?.id;
          const canViewSummary = isMe || member.shareWorkoutSummary;
          const canViewRecords = isMe || member.sharePersonalRecords;
          const role = member.role === "owner" ? (language === "ar" ? "المالك" : "Owner") : member.role === "admin" ? (language === "ar" ? "أدمن" : "Admin") : null;
          return (
            <Card key={member.userId} style={{ gap: spacing.md, borderColor: isMe ? colors.primary : colors.border }}>
              <View style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md }}>
                <View style={{ width: 38, alignItems: "center" }}>{index === 0 ? <Crown color={colors.warning} size={25} /> : index < 3 ? <Medal color={colors.primary} size={24} /> : <AppText variant="bodyStrong" align="center">{index + 1}</AppText>}</View>
                <Avatar name={member.displayName} url={member.avatarUrl} size={48} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 6 }}><AppText variant="bodyStrong" numberOfLines={1}>{member.displayName}{isMe ? (language === "ar" ? " (أنت)" : " (You)") : ""}</AppText>{role ? <View style={{ backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}><AppText variant="caption" color="primary">{role}</AppText></View> : null}</View>
                  <AppText variant="small" color="muted">
                    {canViewSummary
                      ? t("crew.adherence", { completed: member.sessionsThisWeek, planned: member.scheduledThisWeek, percent: member.adherencePercent })
                      : (language === "ar" ? "ملخص التمرينات خاص" : "Workout summary is private")}
                  </AppText>
                  <View style={{ flexDirection: rowDirection, flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                    {canViewRecords ? <AppText variant="caption" color="muted">{member.personalRecordsCount} PR</AppText> : null}
                    {canViewSummary && member.lastWorkoutAt ? <AppText variant="caption" color="muted">{formatShortDate(member.lastWorkoutAt, language)}</AppText> : null}
                  </View>
                </View>
                <AppText variant="title3" color={canViewSummary ? "primary" : "faint"}>{canViewSummary ? `${member.adherencePercent}%` : "—"}</AppText>
              </View>
              {canViewSummary ? <ProgressBar value={member.adherencePercent} tone={index === 0 ? "warning" : "primary"} /> : null}
            </Card>
          );
        })}
        {!stats.length ? <Card><AppText color="muted">{language === "ar" ? "أول ما أعضاء الجروب يتمرنوا، الترتيب هيظهر هنا." : "The leaderboard will appear after members complete workouts."}</AppText></Card> : null}
      </View>
      {error ? <Card muted elevated={false}><AppText variant="small" color="warning">{language === "ar" ? "معروض آخر نشاط محفوظ على الجهاز. اسحب للتحديث لما النت يستقر." : "Showing the latest activity saved on this device. Pull to refresh when the connection is stable."}</AppText></Card> : null}
    </Screen>
  );
}
