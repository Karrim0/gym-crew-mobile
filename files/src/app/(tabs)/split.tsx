import { useCallback, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { CalendarDays, ChevronDown, ChevronUp, Heart, Lock, Sparkles, WandSparkles } from "lucide-react-native";
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
import { applySplitTemplate, fetchPersonalSplit, reorderPersonalSplitDays, type SplitTemplateKey } from "@/features/splits/split-service";
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

  async function apply(template: SplitTemplateKey) {
    if (!user) return;
    setWorking(true);
    setError(null);
    try {
      const updated = await applySplitTemplate(user.id, template);
      setSplit(updated);
      setTemplatesOpen(false);
      void refreshContext();
    } catch (caught) { setError(friendlyError(caught)); }
    finally { setWorking(false); }
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
    if (!user) return;
    setWorking(true);
    setError(null);
    try {
      await reorderPersonalSplitDays(user.id, orderDraft);
      await load();
      setWeekOrderOpen(false);
    } catch (caught) { setError(friendlyError(caught)); }
    finally { setWorking(false); }
  }

  const summary = useMemo(() => ({
    training: split.filter((day) => day.workoutType !== "rest").length,
    rest: split.filter((day) => day.workoutType === "rest").length,
    exercises: split.reduce((sum, day) => sum + day.exercises.length, 0),
    sets: split.reduce((sum, day) => sum + day.exercises.reduce((daySum, exercise) => daySum + exercise.targetSets, 0), 0),
  }), [split]);

  if (loading) return <Screen><ScreenSkeleton /></Screen>;
  if (error && !split.length) return <Screen><ErrorState message={error} onRetry={() => void load()} /></Screen>;

  const needsSetup = !profile?.splitSetupCompletedAt || split.every((day) => day.exercises.length === 0);
  const templates: { key: SplitTemplateKey; title: string; description: string; badge: string; girls?: boolean }[] = [
    { key: "girls_strength_4", title: "Girls 4-Day Strength", description: language === "ar" ? "٤ أيام بتركيز Glutes وLower مع Push وPull وCore." : "Four glute/lower-focused days with push, pull, and core.", badge: language === "ar" ? "٤ أيام · ٢٥ تمرين" : "4 days · 25 exercises", girls: true },
    { key: "full_body_3", title: t("split.templates.full_body_3"), description: language === "ar" ? "٣ أيام بسيطة ومتوازنة." : "Three simple balanced days.", badge: language === "ar" ? "٣ أيام" : "3 days" },
    { key: "upper_lower_4", title: t("split.templates.upper_lower_4"), description: language === "ar" ? "علوي وسفلي قابل للتعديل." : "A customizable upper/lower split.", badge: language === "ar" ? "٤ أيام" : "4 days" },
    { key: "ppl_ul_5", title: t("split.templates.ppl_ul_5"), description: language === "ar" ? "PPL مع Upper/Lower." : "PPL plus Upper/Lower.", badge: language === "ar" ? "٥ أيام" : "5 days" },
    { key: "ppl_6", title: t("split.templates.ppl_6"), description: language === "ar" ? "Push/Pull/Legs مرتين." : "Push/Pull/Legs twice weekly.", badge: language === "ar" ? "٦ أيام" : "6 days" },
  ];

  return (
    <Screen refreshing={refreshing} onRefresh={() => void load(true)}>
      <AppHeader title={t("split.title")} subtitle={language === "ar" ? "جدول جاهز، بس كل تفصيلة فيه بتاعتك." : "Start ready. Customize everything."} />

      {needsSetup ? (
        <SetupChooser onManual={() => void apply("manual")} onStarter={() => setTemplatesOpen(true)} loading={working} />
      ) : (
        <>
          <Card variant="dark" style={{ gap: spacing.lg, padding: spacing.xl, borderColor: colors.borderStrong }}>
            <View pointerEvents="none" style={{ position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: colors.glow, end: -80, bottom: -95 }} />
            <View style={{ flexDirection: rowDirection, alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ gap: 4 }}><AppText variant="overline" color="primary">TRAINING PLAN</AppText><AppText variant="title2" style={{ color: colors.textOnDark }}>{language === "ar" ? "أسبوعك على مزاجك" : "Your week, your way"}</AppText></View>
              <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}><CalendarDays color={colors.primaryInk} size={24} /></View>
            </View>
            <View style={{ flexDirection: rowDirection, gap: 9 }}>
              {[
                { value: summary.training, label: language === "ar" ? "أيام تمرين" : "Training" },
                { value: summary.exercises, label: language === "ar" ? "تمرين" : "Exercises" },
                { value: summary.sets, label: language === "ar" ? "سِت أسبوعي" : "Weekly sets" },
              ].map((item) => <View key={item.label} style={{ flex: 1, backgroundColor: colors.heroMuted, borderRadius: 17, padding: 12, gap: 3 }}><AppText variant="title3" style={{ color: colors.textOnDark }}>{item.value}</AppText><AppText variant="caption" style={{ color: colors.textMuted }}>{item.label}</AppText></View>)}
            </View>
            <View style={{ flexDirection: rowDirection, gap: 8 }}>
              <Button compact style={{ flex: 1 }} variant="dark" onPress={openWeekOrder}>{language === "ar" ? "رتّب الأيام" : "Reorder"}</Button>
              <Button compact style={{ flex: 1 }} icon={<WandSparkles size={17} color={colors.primaryInk} />} onPress={() => setTemplatesOpen(true)}>{language === "ar" ? "غيّر القالب" : "Change preset"}</Button>
            </View>
          </Card>

          <SectionHeader title={language === "ar" ? "أيام الأسبوع" : "Week days"} />
          <View style={{ gap: 10 }}>{orderedSplit.map((day) => <DayCard key={day.id} day={day} onPress={() => router.push(`/split-day/${day.id}`)} />)}</View>
        </>
      )}

      <ActionSheet visible={templatesOpen} title={language === "ar" ? "اختار نقطة بداية" : "Choose a starting point"} description={language === "ar" ? "اختيار القالب بيعمل نسخة شخصية تقدر تعدلها بالكامل." : "A preset creates a personal copy you can fully edit."} onClose={() => setTemplatesOpen(false)} scroll>
        <View style={{ gap: 10 }}>
          {templates.map((template) => (
            <Pressable key={template.key} disabled={working} onPress={() => void apply(template.key)} style={({ pressed }) => ({ opacity: pressed ? 0.76 : 1 })}>
              <Card elevated={false} style={{ gap: spacing.sm, borderColor: template.girls ? colors.primary : colors.border, backgroundColor: template.girls ? colors.primarySofter : colors.surface }}>
                <View style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.sm }}>
                  <View style={{ width: 48, height: 48, borderRadius: 17, backgroundColor: template.girls ? colors.primary : colors.surfaceMuted, alignItems: "center", justifyContent: "center" }}>{template.girls ? <Heart color={colors.primaryInk} fill={colors.primaryInk} size={22} /> : <Sparkles color={colors.primaryStrong} size={21} />}</View>
                  <View style={{ flex: 1, minWidth: 0, gap: 3 }}><AppText variant="bodyStrong">{template.title}</AppText><AppText variant="small" color="muted">{template.description}</AppText></View>
                </View>
                <View style={{ alignSelf: "flex-start", backgroundColor: template.girls ? colors.primarySoft : colors.surfaceMuted, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 }}><AppText variant="caption" color={template.girls ? "primary" : "muted"}>{template.badge}</AppText></View>
              </Card>
            </Pressable>
          ))}
        </View>
      </ActionSheet>

      <ActionSheet visible={weekOrderOpen} title={language === "ar" ? "رتّب أيام جدولك" : "Reorder your week"} description={language === "ar" ? "أول عنصر يبقى السبت. الجمعة تفضل راحة ثابتة." : "The first item becomes Saturday. Friday stays fixed."} onClose={() => setWeekOrderOpen(false)} scroll>
        <View style={{ gap: 8 }}>
          {orderDraft.map((id, index) => {
            const day = split.find((item) => item.id === id);
            if (!day) return null;
            return (
              <View key={id} style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.sm, backgroundColor: colors.surfaceMuted, borderRadius: 17, padding: 10 }}>
                <View style={{ minWidth: 62, height: 38, borderRadius: 13, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", paddingHorizontal: 7 }}><AppText variant="caption" color="primary">{weekdayLabel(WEEKDAYS[index], language)}</AppText></View>
                <View style={{ flex: 1, minWidth: 0 }}><AppText variant="smallBold" numberOfLines={1}>{day.displayName ?? day.workoutType}</AppText><AppText variant="caption" color="muted">{day.workoutType === "rest" ? (language === "ar" ? "راحة" : "Rest") : `${day.exercises.length} ${language === "ar" ? "تمرين" : "exercises"}`}</AppText></View>
                {index === orderDraft.length - 1 ? <View style={{ flexDirection: rowDirection, gap: 5 }}><Lock color={colors.textFaint} size={16} /><AppText variant="caption" color="faint">{language === "ar" ? "ثابت" : "Fixed"}</AppText></View> : <><Pressable disabled={index === 0} onPress={() => moveDay(index, -1)} style={{ padding: 8, opacity: index === 0 ? 0.25 : 1 }}><ChevronUp color={colors.text} size={19} /></Pressable><Pressable disabled={index === orderDraft.length - 2} onPress={() => moveDay(index, 1)} style={{ padding: 8, opacity: index === orderDraft.length - 2 ? 0.25 : 1 }}><ChevronDown color={colors.text} size={19} /></Pressable></>}
              </View>
            );
          })}
        </View>
        <Button loading={working} onPress={() => void saveWeekOrder()}>{language === "ar" ? "حفظ الترتيب" : "Save order"}</Button>
      </ActionSheet>

      {error ? <Card muted elevated={false}><AppText variant="small" color="warning">{error}</AppText></Card> : null}
    </Screen>
  );
}
