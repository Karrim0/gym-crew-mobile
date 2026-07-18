import { useCallback, useMemo, useState } from "react";
import { Alert, Modal, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { CalendarDays, Dumbbell, MoonStar, WandSparkles } from "lucide-react-native";
import { Screen } from "@/components/ui/screen";
import { AppHeader } from "@/components/layout/app-header";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { ErrorState } from "@/components/ui/states";
import { ScreenSkeleton } from "@/components/ui/skeleton";
import { SetupChooser } from "@/components/split/setup-chooser";
import { DayCard } from "@/components/split/day-card";
import { applySplitTemplate, fetchPersonalSplit } from "@/features/splits/split-service";
import { friendlyError } from "@/lib/supabase/errors";
import { spacing } from "@/lib/theme/tokens";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { useSessionStore } from "@/stores/session-store";
import type { SplitDayWithDetails } from "@/types";

export default function SplitScreen() {
  const { t, language, rowDirection } = useTranslation();
  const { colors } = useAppTheme();
  const router = useRouter();
  const user = useSessionStore((state) => state.user);
  const profile = useSessionStore((state) => state.profile);
  const refreshContext = useSessionStore((state) => state.refreshContext);
  const [split, setSplit] = useState<SplitDayWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (!user) return;
    if (refresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try { setSplit(await fetchPersonalSplit(user.id)); }
    catch (caught) { setError(friendlyError(caught)); }
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function apply(template: "manual" | "full_body_3" | "upper_lower_4" | "ppl_ul_5" | "ppl_6") {
    setWorking(true);
    try {
      await applySplitTemplate(template);
      await Promise.all([load(), refreshContext()]);
      setTemplatesOpen(false);
    } catch (caught) { Alert.alert(t("common.error"), friendlyError(caught)); }
    finally { setWorking(false); }
  }

  const summary = useMemo(() => ({ training: split.filter((day) => day.workoutType !== "rest").length, rest: split.filter((day) => day.workoutType === "rest").length, exercises: split.reduce((sum, day) => sum + day.exercises.length, 0) }), [split]);
  if (loading) return <Screen><ScreenSkeleton /></Screen>;
  if (error && !split.length) return <Screen><ErrorState message={error} onRetry={() => void load()} /></Screen>;

  const needsSetup = !profile?.splitSetupCompletedAt || split.every((day) => day.exercises.length === 0);
  const templates = ["full_body_3", "upper_lower_4", "ppl_ul_5", "ppl_6"] as const;

  return (
    <Screen refreshing={refreshing} onRefresh={() => void load(true)}>
      <AppHeader title={t("split.title")} subtitle={t("split.subtitle")} />
      {needsSetup ? (
        <SetupChooser onManual={() => void apply("manual")} onStarter={() => setTemplatesOpen(true)} loading={working} />
      ) : (
        <>
          <Card style={{ flexDirection: rowDirection, flexWrap: "wrap", gap: spacing.sm, backgroundColor: colors.primarySofter, borderColor: colors.primarySoft }}>
            {[
              { icon: CalendarDays, value: split.length, label: language === "ar" ? "أيام الأسبوع" : "Week days", color: colors.primary },
              { icon: Dumbbell, value: summary.training, label: language === "ar" ? "أيام تمرين" : "Training days", color: colors.success },
              { icon: MoonStar, value: summary.rest, label: language === "ar" ? "أيام راحة" : "Rest days", color: colors.warning },
            ].map(({ icon: Icon, value, label, color }) => <View key={label} style={{ flexGrow: 1, flexBasis: 90, alignItems: "center", gap: 4 }}><Icon size={20} color={color} /><AppText variant="title2" align="center">{value}</AppText><AppText variant="caption" color="muted" align="center">{label}</AppText></View>)}
          </Card>
          <SectionHeader title={t("split.basePlan")} action={<Button compact variant="secondary" icon={<WandSparkles size={17} color={colors.primary} />} onPress={() => setTemplatesOpen(true)}>{t("split.starterPlan")}</Button>} />
          <View style={{ gap: spacing.sm }}>{split.map((day) => <DayCard key={day.id} day={day} onPress={() => router.push(`/split-day/${day.id}`)} />)}</View>
          <Card muted elevated={false}><AppText variant="small" color="muted">{language === "ar" ? `${summary.exercises} تمرين موزعين على جدولك. اسحب لتحديث النسخة المحفوظة للأوفلاين.` : `${summary.exercises} exercises across your split. Pull to refresh the offline copy.`}</AppText></Card>
        </>
      )}

      <Modal transparent visible={templatesOpen} animationType="slide" onRequestClose={() => setTemplatesOpen(false)}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" }}>
          <Card style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, gap: spacing.md, paddingBottom: 38, maxHeight: "82%" }}>
            <View style={{ width: 52, height: 5, borderRadius: 3, backgroundColor: colors.surfaceStrong, alignSelf: "center" }} />
            <AppText variant="title2">{t("split.starterPlan")}</AppText>
            <AppText color="muted">{language === "ar" ? "اختيار قالب جديد هيحدّث جدولك الحالي. تقدر تعدّل كل يوم بعد كده." : "A new template updates your current split. You can edit every day afterward."}</AppText>
            {templates.map((template) => <Button key={template} variant="secondary" loading={working} onPress={() => void apply(template)}>{t(`split.templates.${template}`)}</Button>)}
            <Button variant="ghost" onPress={() => setTemplatesOpen(false)}>{t("common.cancel")}</Button>
          </Card>
        </View>
      </Modal>
      {error ? <Card muted elevated={false}><AppText variant="small" color="warning">{error}</AppText></Card> : null}
    </Screen>
  );
}
