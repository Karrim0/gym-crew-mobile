import { useCallback, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { CalendarDays, ChevronDown, ChevronUp, Dumbbell, Heart, Lock, MoonStar, Sparkles, WandSparkles } from "lucide-react-native";
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
import { ActionSheet } from "@/components/ui/action-sheet";
import {
  applySplitTemplate,
  fetchPersonalSplit,
  reorderPersonalSplitDays,
  type SplitTemplateKey,
} from "@/features/splits/split-service";
import { friendlyError } from "@/lib/supabase/errors";
import { spacing } from "@/lib/theme/tokens";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { useSessionStore } from "@/stores/session-store";
import { weekdayLabel } from "@/constants/schedule";
import type { SplitDayWithDetails, Weekday } from "@/types";

const WEEKDAYS: Weekday[] = ["saturday", "sunday", "monday", "tuesday", "wednesday", "thursday", "friday"];

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
  const [weekOrderOpen, setWeekOrderOpen] = useState(false);
  const [orderDraft, setOrderDraft] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const orderedSplit = useMemo(() => [...split].sort((a, b) => WEEKDAYS.indexOf(a.weekday) - WEEKDAYS.indexOf(b.weekday)), [split]);

  const load = useCallback(async (refresh = false) => {
    if (!user) return;
    if (refresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try { setSplit(await fetchPersonalSplit(user.id)); }
    catch (caught) { setError(friendlyError(caught)); }
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  function showNotice(message: string) {
    setNotice(message);
    setTimeout(() => setNotice(null), 3200);
  }

  async function apply(template: SplitTemplateKey) {
    setWorking(true);
    try {
      const updated = await applySplitTemplate(user!.id, template);
      setSplit(updated);
      await refreshContext();
      setTemplatesOpen(false);
      showNotice(language === "ar" ? "الجدول اتطبق." : "Plan applied.");
    } catch (caught) {
      setError(friendlyError(caught));
    } finally {
      setWorking(false);
    }
  }

  function openWeekOrder() {
    setOrderDraft(orderedSplit.map((day) => day.id));
    setWeekOrderOpen(true);
  }

  function moveDay(index: number, direction: -1 | 1) {
    const target = index + direction;
    const fridayIndex = orderDraft.length - 1;
    if (index === fridayIndex || target < 0 || target >= fridayIndex) return;
    setOrderDraft((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function saveWeekOrder() {
    setWorking(true);
    try {
      await reorderPersonalSplitDays(orderDraft);
      await Promise.all([load(), refreshContext()]);
      setWeekOrderOpen(false);
      showNotice(language === "ar" ? "ترتيب الأسبوع اتحفظ." : "Week order saved.");
    } catch (caught) {
      setError(friendlyError(caught));
    } finally {
      setWorking(false);
    }
  }

  const summary = useMemo(() => ({
    training: split.filter((day) => day.workoutType !== "rest").length,
    rest: split.filter((day) => day.workoutType === "rest").length,
    exercises: split.reduce((sum, day) => sum + day.exercises.length, 0),
  }), [split]);

  if (loading) return <Screen><ScreenSkeleton /></Screen>;
  if (error && !split.length) return <Screen><ErrorState message={error} onRetry={() => void load()} /></Screen>;

  const needsSetup = !profile?.splitSetupCompletedAt || split.every((day) => day.exercises.length === 0);
  const templates: { key: SplitTemplateKey; title: string; description: string; badge: string; girls?: boolean }[] = [
    {
      key: "girls_strength_4",
      title: language === "ar" ? "Girls 4-Day Strength" : "Girls 4-Day Strength",
      description: language === "ar" ? "٤ أيام متوازنة بتركيز قوي على الجلوتس والجزء السفلي مع بوش وبول وكور." : "Four balanced days with glute and lower-body priority plus push, pull, and core.",
      badge: language === "ar" ? "جديد · يومين Hip Thrust" : "New · 2 Hip Thrust days",
      girls: true,
    },
    { key: "full_body_3", title: t("split.templates.full_body_3"), description: language === "ar" ? "٣ أيام بسيطة ومتوازنة." : "Three simple balanced days.", badge: language === "ar" ? "٣ أيام" : "3 days" },
    { key: "upper_lower_4", title: t("split.templates.upper_lower_4"), description: language === "ar" ? "تقسيمة علوي وسفلي قابلة للتعديل." : "A customizable upper/lower split.", badge: language === "ar" ? "٤ أيام" : "4 days" },
    { key: "ppl_ul_5", title: t("split.templates.ppl_ul_5"), description: language === "ar" ? "PPL مع Upper/Lower." : "PPL plus Upper/Lower.", badge: language === "ar" ? "٥ أيام" : "5 days" },
    { key: "ppl_6", title: t("split.templates.ppl_6"), description: language === "ar" ? "Push/Pull/Legs مرتين أسبوعيًا." : "Push/Pull/Legs twice weekly.", badge: language === "ar" ? "٦ أيام" : "6 days" },
  ];

  return (
    <Screen refreshing={refreshing} onRefresh={() => void load(true)}>
      <AppHeader title={t("split.title")} subtitle={language === "ar" ? "القالب مجرد بداية؛ ترتيب الأيام والتمارين كله بإيدك." : "Templates are only a starting point. Every day and exercise is yours to customize."} />

      {needsSetup ? (
        <SetupChooser onManual={() => void apply("manual")} onStarter={() => setTemplatesOpen(true)} loading={working} />
      ) : (
        <>
          <Card style={{ flexDirection: rowDirection, flexWrap: "wrap", gap: spacing.sm, backgroundColor: colors.primarySofter, borderColor: colors.primarySoft }}>
            {[
              { icon: CalendarDays, value: split.length, label: language === "ar" ? "أيام الأسبوع" : "Week days", color: colors.primary },
              { icon: Dumbbell, value: summary.training, label: language === "ar" ? "أيام تمرين" : "Training days", color: colors.success },
              { icon: MoonStar, value: summary.rest, label: language === "ar" ? "أيام راحة" : "Rest days", color: colors.warning },
            ].map(({ icon: Icon, value, label, color }) => (
              <View key={label} style={{ flexGrow: 1, flexBasis: 90, alignItems: "center", gap: 4 }}>
                <Icon size={20} color={color} />
                <AppText variant="title2" align="center">{value}</AppText>
                <AppText variant="caption" color="muted" align="center">{label}</AppText>
              </View>
            ))}
          </Card>

          <SectionHeader
            title={t("split.basePlan")}
            action={
              <View style={{ flexDirection: rowDirection, gap: 7 }}>
                <Button compact variant="secondary" onPress={openWeekOrder}>{language === "ar" ? "رتّب الأيام" : "Reorder days"}</Button>
                <Button compact variant="secondary" icon={<WandSparkles size={17} color={colors.primary} />} onPress={() => setTemplatesOpen(true)}>{t("split.starterPlan")}</Button>
              </View>
            }
          />

          <View style={{ gap: spacing.sm }}>
            {orderedSplit.map((day) => <DayCard key={day.id} day={day} onPress={() => router.push(`/split-day/${day.id}`)} />)}
          </View>

          <Card muted elevated={false} style={{ gap: 4 }}>
            <AppText variant="smallBold">{language === "ar" ? "كل حاجة قابلة للتعديل" : "Everything is customizable"}</AppText>
            <AppText variant="small" color="muted">{language === "ar" ? `${summary.exercises} تمرين حاليًا. افتح أي يوم لتغيّر التمارين، ترتيبها، السِتات والعدات.` : `${summary.exercises} exercises now. Open any day to change exercises, order, sets, and reps.`}</AppText>
          </Card>
        </>
      )}

      <ActionSheet visible={templatesOpen} title={language === "ar" ? "اختار نقطة بداية" : "Choose a starting point"} description={language === "ar" ? "بعد الاختيار تقدر تغيّر ترتيب الأيام والتمارين وكل الأهداف." : "After choosing, you can change days, exercises, and every target."} onClose={() => setTemplatesOpen(false)} scroll>
        <View style={{ gap: spacing.sm }}>
          {templates.map((template) => (
            <Pressable key={template.key} disabled={working} onPress={() => void apply(template.key)} style={({ pressed }) => ({ opacity: pressed ? 0.76 : 1 })}>
              <Card elevated={false} style={{ gap: spacing.sm, borderColor: template.girls ? colors.primary : colors.border, backgroundColor: template.girls ? colors.primarySofter : colors.surface }}>
                <View style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.sm }}>
                  <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: template.girls ? colors.primarySoft : colors.surfaceMuted, alignItems: "center", justifyContent: "center" }}>
                    {template.girls ? <Heart color={colors.primary} size={22} /> : <Sparkles color={colors.primary} size={21} />}
                  </View>
                  <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                    <AppText variant="bodyStrong">{template.title}</AppText>
                    <AppText variant="small" color="muted">{template.description}</AppText>
                  </View>
                </View>
                <View style={{ alignSelf: "flex-start", backgroundColor: template.girls ? colors.primarySoft : colors.surfaceMuted, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 }}><AppText variant="caption" color={template.girls ? "primary" : "muted"}>{template.badge}</AppText></View>
              </Card>
            </Pressable>
          ))}
        </View>
      </ActionSheet>

      <ActionSheet visible={weekOrderOpen} title={language === "ar" ? "رتّب أيام جدولك" : "Reorder your week"} description={language === "ar" ? "أول عنصر يبقى السبت، وبعده الأحد وهكذا. تاريخ تمريناتك القديمة مش هيتغير." : "The first item becomes Saturday, then Sunday, and so on. Workout history stays unchanged."} onClose={() => setWeekOrderOpen(false)} scroll>
        <View style={{ gap: 8 }}>
          {orderDraft.map((id, index) => {
            const day = split.find((item) => item.id === id);
            if (!day) return null;
            return (
              <View key={id} style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.sm, backgroundColor: colors.surfaceMuted, borderRadius: 16, padding: 10 }}>
                <View style={{ minWidth: 58, height: 36, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", paddingHorizontal: 7 }}><AppText variant="caption" color="primary">{weekdayLabel(WEEKDAYS[index], language)}</AppText></View>
                <View style={{ flex: 1, minWidth: 0 }}><AppText variant="smallBold" numberOfLines={1}>{day.displayName ?? day.workoutType}</AppText><AppText variant="caption" color="muted" numberOfLines={1}>{day.workoutType === "rest" ? (language === "ar" ? "راحة" : "Rest") : `${day.exercises.length} ${language === "ar" ? "تمرين" : "exercises"}`}</AppText></View>
                {index === orderDraft.length - 1 ? (
                  <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 5, paddingHorizontal: 8 }}><Lock color={colors.textFaint} size={16} /><AppText variant="caption" color="faint">{language === "ar" ? "ثابت" : "Fixed"}</AppText></View>
                ) : (
                  <>
                    <Pressable disabled={index === 0} onPress={() => moveDay(index, -1)} style={{ padding: 8, opacity: index === 0 ? 0.25 : 1 }}><ChevronUp color={colors.text} size={19} /></Pressable>
                    <Pressable disabled={index === orderDraft.length - 2} onPress={() => moveDay(index, 1)} style={{ padding: 8, opacity: index === orderDraft.length - 2 ? 0.25 : 1 }}><ChevronDown color={colors.text} size={19} /></Pressable>
                  </>
                )}
              </View>
            );
          })}
        </View>
        <Button loading={working} onPress={() => void saveWeekOrder()}>{language === "ar" ? "حفظ ترتيب الأسبوع" : "Save week order"}</Button>
      </ActionSheet>

      {notice ? <Card muted elevated={false} style={{ borderColor: colors.primary }}><AppText variant="smallBold" color="primary">{notice}</AppText></Card> : null}
      {error ? <Card muted elevated={false}><AppText variant="small" color="warning">{error}</AppText></Card> : null}
    </Screen>
  );
}
