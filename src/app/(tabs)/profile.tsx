import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Settings2,
  ShieldCheck,
  UserRoundPen,
  UsersRound,
} from "lucide-react-native";
import { appConfig } from "@/config/app";
import { Screen } from "@/components/ui/screen";
import { AppText } from "@/components/ui/app-text";
import { Avatar } from "@/components/profile/avatar";
import { Card } from "@/components/ui/card";
import { AppHeader } from "@/components/layout/app-header";
import { PhotoHero } from "@/components/brand/photo-hero";
import { BrandWordmark } from "@/components/brand/brand-mark";
import { fetchWorkoutHistory } from "@/features/workouts/workout-service";
import { brandImages } from "@/lib/brand/workout-visuals";
import { friendlyError } from "@/lib/supabase/errors";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { spacing } from "@/lib/theme/tokens";
import { useConnectivityStore } from "@/stores/connectivity-store";
import { useSessionStore } from "@/stores/session-store";
import type { WorkoutSessionWithDetails } from "@/types";

function MenuRow({ icon, title, subtitle, onPress }: { icon: ReactNode; title: string; subtitle?: string; onPress: () => void }) {
  const { colors } = useAppTheme();
  const { rowDirection, isRTL } = useTranslation();
  const Arrow = isRTL ? ChevronLeft : ChevronRight;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ flexDirection: rowDirection, alignItems: "center", gap: spacing.sm, minHeight: 66, paddingVertical: 7, opacity: pressed ? 0.65 : 1 })}>
      <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: colors.primarySofter, alignItems: "center", justifyContent: "center" }}>{icon}</View>
      <View style={{ flex: 1, minWidth: 0 }}><AppText variant="bodyStrong">{title}</AppText>{subtitle ? <AppText variant="small" color="muted" numberOfLines={1}>{subtitle}</AppText> : null}</View>
      <Arrow color={colors.textFaint} size={18} />
    </Pressable>
  );
}

function ProfileMetric({ value, label }: { value: number; label: string }) {
  return (
    <Card variant="glass" style={{ flex: 1, padding: 12, borderRadius: 18, gap: 1 }}>
      <AppText variant="metric" numeric align="center">{value}</AppText>
      <AppText variant="caption" color="muted" align="center">{label}</AppText>
    </Card>
  );
}

export default function ProfileHubScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { language, rowDirection } = useTranslation();
  const user = useSessionStore((state) => state.user);
  const profile = useSessionStore((state) => state.profile);
  const membership = useSessionStore((state) => state.membership);
  const pending = useConnectivityStore((state) => state.pending);
  const failed = useConnectivityStore((state) => state.failed);
  const networkStatus = useConnectivityStore((state) => state.networkStatus);
  const [history, setHistory] = useState<WorkoutSessionWithDetails[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try { setHistory(await fetchWorkoutHistory(user.id, 100)); setError(null); }
    catch (caught) { setError(friendlyError(caught)); }
  }, [user]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const stats = useMemo(() => {
    const sets = history.flatMap((session) => session.exercises.flatMap((exercise) => exercise.sets)).filter((set) => set.isCompleted);
    const exerciseIds = new Set(history.flatMap((session) => session.exercises.filter((exercise) => exercise.sets.some((set) => set.isCompleted)).map((exercise) => exercise.exerciseId)));
    return { workouts: history.length, sets: sets.length, exercises: exerciseIds.size };
  }, [history]);

  const showDataStatus = failed > 0 || pending > 0 || networkStatus === "offline";
  const syncLabel = failed
    ? language === "ar" ? `${failed} تعديل محتاج محاولة تانية` : `${failed} changes need another try`
    : pending
      ? language === "ar" ? `${pending} تعديل محفوظ ومستني النت` : `${pending} changes are waiting for a connection`
      : language === "ar" ? "إنت أوفلاين وبياناتك محفوظة" : "You are offline and your data is safe";

  return (
    <Screen horizontalPadding={16}>
      <AppHeader title={language === "ar" ? "حسابي" : "Profile"} subtitle={language === "ar" ? "جدولك، جروبك، وإعداداتك." : "Your plan, crew, and settings."} />

      <PhotoHero source={brandImages.squat} height={228}>
        <View style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md }}>
          <Avatar name={profile?.displayName} url={profile?.avatarUrl} size={72} ring />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <AppText variant="title2" style={{ color: colors.textOnDark }} numberOfLines={1}>{profile?.displayName || (language === "ar" ? "بطل" : "Athlete")}</AppText>
            <AppText variant="small" style={{ color: colors.textOnDarkMuted }} numberOfLines={1}>{user?.email}</AppText>
            <View style={{ alignSelf: "flex-start", marginTop: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: "rgba(19,22,26,0.76)", borderWidth: 1, borderColor: colors.borderStrong }}><AppText variant="caption" color="primary">{membership?.group.isPersonal ? (language === "ar" ? "وضع فردي" : "Solo") : membership?.group.name}</AppText></View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={language === "ar" ? "عدّل حسابك" : "Edit profile"} onPress={() => router.push("/profile")} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 15, backgroundColor: "rgba(19,22,26,0.78)", borderWidth: 1, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.65 : 1 })}><UserRoundPen color={colors.primary} size={20} /></Pressable>
        </View>
      </PhotoHero>

      <View style={{ flexDirection: rowDirection, gap: 8 }}>
        <ProfileMetric value={stats.workouts} label={language === "ar" ? "تمرينات" : "Workouts"} />
        <ProfileMetric value={stats.sets} label={language === "ar" ? "سِتات" : "Sets"} />
        <ProfileMetric value={stats.exercises} label={language === "ar" ? "تمارين" : "Exercises"} />
      </View>

      <Card variant="glass" style={{ paddingVertical: 5 }}>
        <MenuRow icon={<CalendarDays color={colors.primary} size={20} />} title={language === "ar" ? "جدولي" : "Training plan"} subtitle={language === "ar" ? "الأيام والتمارين والعدات" : "Days, exercises, and rep targets"} onPress={() => router.push("/(tabs)/split")} />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <MenuRow icon={<UsersRound color={colors.primary} size={20} />} title={membership?.group.isPersonal ? (language === "ar" ? "الجروب" : "Crew") : membership?.group.name ?? "Crew"} subtitle={membership?.group.isPersonal ? (language === "ar" ? "اعمل جروب أو ادخل بكود" : "Create or join a crew") : (language === "ar" ? "الترتيب ونشاط الصحاب" : "Leaderboard and crew activity")} onPress={() => router.push("/(tabs)/crew")} />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <MenuRow icon={<Bell color={colors.primary} size={20} />} title={language === "ar" ? "الإشعارات" : "Notifications"} onPress={() => router.push("/notifications")} />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <MenuRow icon={<Settings2 color={colors.primary} size={20} />} title={language === "ar" ? "الإعدادات" : "Settings"} subtitle={language === "ar" ? "الشكل، التسجيل السريع، والوحدات" : "Appearance, quick logging, and units"} onPress={() => router.push("/settings")} />
      </Card>

      {showDataStatus ? (
        <Card muted elevated={false} style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.sm }}>
          <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: failed ? colors.dangerSoft : colors.primarySofter, alignItems: "center", justifyContent: "center" }}>{failed ? <ShieldCheck color={colors.danger} size={19} /> : <Cloud color={colors.primaryStrong} size={19} />}</View>
          <AppText variant="small" color={failed ? "danger" : "muted"} style={{ flex: 1 }}>{syncLabel}</AppText>
        </Card>
      ) : null}

      {error ? <AppText variant="small" color="warning">{error}</AppText> : null}
      <View style={{ flexDirection: rowDirection, alignItems: "center", justifyContent: "center", gap: 8 }}><BrandWordmark compact /><AppText variant="caption" numeric color="faint">{appConfig.version}</AppText></View>
    </Screen>
  );
}
