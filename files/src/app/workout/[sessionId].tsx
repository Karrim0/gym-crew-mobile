import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Circle,
  Dumbbell,
  Flag,
  History,
  ListChecks,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Shuffle,
  StickyNote,
  TimerReset,
  Trash2,
  TrendingUp,
} from "lucide-react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { TextField } from "@/components/ui/text-field";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ActionSheet } from "@/components/ui/action-sheet";
import { AppToast } from "@/components/ui/app-toast";
import { WorkoutValueControl } from "@/components/workout/workout-value-control";
import { RestTimerSheet } from "@/components/workout/rest-timer-sheet";
import {
  addWorkoutSet,
  cancelWorkout,
  fetchPreviousPerformances,
  fetchWorkoutSession,
  finishWorkout,
  logWorkoutSet,
  reorderWorkoutExercises,
  undoWorkoutSet,
} from "@/features/workouts/workout-service";
import { friendlyError } from "@/lib/supabase/errors";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { spacing } from "@/lib/theme/tokens";
import { formatWeight, fromKilograms, toKilograms } from "@/lib/utils/weight";
import { useRestTimerStore } from "@/stores/rest-timer-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useSessionStore } from "@/stores/session-store";
import type { PreviousPerformanceMap, WorkoutExerciseWithDetails, WorkoutSessionWithDetails, WorkoutSet } from "@/types";

type ConfirmMode = "finish" | "cancel" | null;

interface LoggedSetSummary {
  setId: string;
  weight: number | null;
  reps: number;
  hasNextPlannedSet: boolean;
}

function completedCount(exercise: WorkoutExerciseWithDetails) {
  return exercise.sets.filter((set) => set.isCompleted).length;
}

function bestSet(sets: WorkoutSet[]) {
  return [...sets]
    .filter((set) => set.isCompleted && set.reps !== null)
    .sort((a, b) => ((b.weightKg ?? 0) * (b.reps ?? 0)) - ((a.weightKg ?? 0) * (a.reps ?? 0)))[0];
}

export default function GymModeScreen() {
  useKeepAwake("gym-crew-gym-mode");
  const { height } = useWindowDimensions();
  const compact = height < 735;
  const { sessionId, prepare } = useLocalSearchParams<{ sessionId: string; prepare?: string }>();
  const router = useRouter();
  const user = useSessionStore((state) => state.user);
  const settings = useSettingsStore();
  const timer = useRestTimerStore();
  const { colors } = useAppTheme();
  const { language, rowDirection, isRTL, t } = useTranslation();

  const [session, setSession] = useState<WorkoutSessionWithDetails | null>(null);
  const [previous, setPrevious] = useState<PreviousPerformanceMap>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [reps, setReps] = useState<number | null>(null);
  const [weightStep, setWeightStep] = useState(2.5);
  const [setNotes, setSetNotes] = useState("");
  const [lastLogged, setLastLogged] = useState<LoggedSetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const [preflightOpen, setPreflightOpen] = useState(false);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [orderDraft, setOrderDraft] = useState<string[]>([]);
  const [exerciseListOpen, setExerciseListOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState<"weight" | "reps" | null>(null);
  const [customValue, setCustomValue] = useState("");
  const [timerOpen, setTimerOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState<ConfirmMode>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preflightShown = useRef(false);
  const selectedIdRef = useRef<string | null>(null);

  const showError = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const selectExercise = useCallback((exercise: WorkoutExerciseWithDetails, performance: PreviousPerformanceMap, sourceSession: WorkoutSessionWithDetails) => {
    selectedIdRef.current = exercise.id;
    setSelectedId(exercise.id);
    setLastLogged(null);
    const pending = exercise.sets.find((set) => !set.isCompleted) ?? null;
    const previousSet = pending
      ? performance[exercise.exerciseId]?.sets.find((set) => set.setNumber === pending.setNumber)
        ?? performance[exercise.exerciseId]?.sets[pending.setNumber - 1]
      : undefined;
    const lastCompleted = exercise.sets.filter((set) => set.isCompleted).at(-1);
    setWeight(previousSet?.weightKg ?? lastCompleted?.weightKg ?? null);
    setReps(previousSet?.reps ?? lastCompleted?.reps ?? exercise.targetRepsMin);
    setSetNotes(pending?.notes ?? "");
    void AsyncStorage.getItem(`gym-crew:weight-step:${settings.weightUnit}:${exercise.exerciseId}`).then((stored) => {
      const parsed = Number(stored);
      if ([0.5, 1, 2, 2.5, 5, 10].includes(parsed)) setWeightStep(parsed);
    });
    if (!sourceSession.exercises.some((item) => item.id === exercise.id)) {
      selectedIdRef.current = null;
      setSelectedId(null);
    }
  }, [settings.weightUnit]);

  const load = useCallback(async () => {
    if (!sessionId || !user) return;
    setLoading(true);
    setError(null);
    try {
      const value = await fetchWorkoutSession(sessionId);
      if (!value) throw new Error(language === "ar" ? "التمرينة مش موجودة على الجهاز." : "Workout is not available on this device.");
      const performance = await fetchPreviousPerformances(user.id, value.exercises.map((exercise) => exercise.exerciseId), value.id);
      setSession(value);
      setPrevious(performance);
      const current = value.exercises.find((exercise) => exercise.id === selectedIdRef.current);
      const firstPending = value.exercises.find((exercise) => exercise.sets.some((set) => !set.isCompleted)) ?? value.exercises[0];
      const target = current ?? firstPending;
      if (target) selectExercise(target, performance, value);
      if (prepare === "1" && !preflightShown.current) {
        preflightShown.current = true;
        setPreflightOpen(true);
      }
    } catch (caught) {
      setError(friendlyError(caught));
    } finally {
      setLoading(false);
    }
  }, [language, prepare, selectExercise, sessionId, user]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const selected = useMemo(() => session?.exercises.find((exercise) => exercise.id === selectedId) ?? null, [selectedId, session]);
  const selectedIndex = useMemo(() => session && selected ? session.exercises.findIndex((exercise) => exercise.id === selected.id) : -1, [selected, session]);
  const pendingSet = useMemo(() => selected?.sets.find((set) => !set.isCompleted) ?? null, [selected]);
  const totalSets = useMemo(() => session?.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0) ?? 0, [session]);
  const completedSets = useMemo(() => session?.exercises.reduce((sum, exercise) => sum + completedCount(exercise), 0) ?? 0, [session]);
  const progress = completedSets / Math.max(1, totalSets) * 100;
  const past = selected ? previous[selected.exerciseId] : undefined;
  const previousTargetSet = pendingSet && past
    ? past.sets.find((set) => set.setNumber === pendingSet.setNumber) ?? past.sets[pendingSet.setNumber - 1]
    : undefined;

  function moveDraft(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= orderDraft.length) return;
    setOrderDraft((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function openReorder() {
    if (!session) return;
    setOrderDraft(session.exercises.map((exercise) => exercise.id));
    setPreflightOpen(false);
    setMoreOpen(false);
    setReorderOpen(true);
  }

  async function withSaving(action: () => Promise<void>) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try { await action(); } finally { savingRef.current = false; setSaving(false); }
  }

  async function saveOrder() {
    if (!session) return;
    await withSaving(async () => {
      try {
        const updated = await reorderWorkoutExercises(session.id, orderDraft);
        setSession(updated);
        setReorderOpen(false);
        const target = updated.exercises.find((exercise) => exercise.id === selectedId) ?? updated.exercises[0];
        if (target) selectExercise(target, previous, updated);
      } catch (caught) { showError(friendlyError(caught)); }
    });
  }

  async function logSet() {
    if (!session || !selected || !pendingSet || reps === null || savingRef.current) return;
    await withSaving(async () => {
      try {
        const result = await logWorkoutSet(session.id, pendingSet.id, { weightKg: weight, reps, notes: setNotes });
        const refreshedExercise = result.session.exercises.find((exercise) => exercise.id === selected.id);
        setSession(result.session);
        setLastLogged({
          setId: result.set.id,
          weight,
          reps,
          hasNextPlannedSet: Boolean(refreshedExercise?.sets.some((set) => !set.isCompleted)),
        });
        if (settings.hapticsEnabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (caught) { showError(friendlyError(caught)); }
    });
  }

  async function undoLastSet() {
    if (!session || !lastLogged || savingRef.current) return;
    await withSaving(async () => {
      try {
        const updated = await undoWorkoutSet(session.id, lastLogged.setId);
        setSession(updated);
        const exercise = updated.exercises.find((item) => item.id === selectedId);
        if (exercise) selectExercise(exercise, previous, updated);
        setLastLogged(null);
      } catch (caught) { showError(friendlyError(caught)); }
    });
  }

  function prepareSameExercise() {
    if (!session || !selected) return;
    const refreshed = session.exercises.find((exercise) => exercise.id === selected.id);
    if (!refreshed) return;
    selectExercise(refreshed, previous, session);
    setWeight(lastLogged?.weight ?? weight);
    setReps(lastLogged?.reps ?? reps);
    setSetNotes("");
  }

  async function addExtraSet() {
    if (!session || !selected || savingRef.current) return;
    await withSaving(async () => {
      try {
        const updated = await addWorkoutSet(session.id, selected.id);
        setSession(updated);
        const refreshed = updated.exercises.find((exercise) => exercise.id === selected.id);
        if (refreshed) selectExercise(refreshed, previous, updated);
        setWeight(lastLogged?.weight ?? weight);
        setReps(lastLogged?.reps ?? reps);
        setSetNotes("");
      } catch (caught) { showError(friendlyError(caught)); }
    });
  }

  function goToExercise(exercise: WorkoutExerciseWithDetails) {
    if (!session) return;
    setExerciseListOpen(false);
    setMoreOpen(false);
    selectExercise(exercise, previous, session);
  }

  function goNextExercise() {
    if (!session || selectedIndex < 0) return;
    const after = session.exercises.slice(selectedIndex + 1);
    const before = session.exercises.slice(0, selectedIndex);
    const next = after.find((exercise) => exercise.sets.some((set) => !set.isCompleted))
      ?? before.find((exercise) => exercise.sets.some((set) => !set.isCompleted));
    if (next) selectExercise(next, previous, session);
    else setConfirmMode("finish");
  }

  async function startOptionalTimer() {
    if (!session || !selected) return;
    setMoreOpen(false);
    if (!timer.active) await timer.start(settings.defaultRestSeconds, selected.exercise.name, `/workout/${session.id}`);
    setTimerOpen(true);
  }

  async function completeWorkout() {
    if (!session || savingRef.current) return;
    if (completedSets < 1) {
      setConfirmMode(null);
      showError(language === "ar" ? "سجّل سِت واحدة على الأقل الأول." : "Log at least one set first.");
      return;
    }
    await withSaving(async () => {
      try {
        const seconds = Math.max(1, Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000));
        await timer.stop();
        await finishWorkout(session.id, seconds);
        setConfirmMode(null);
        router.replace("/(tabs)/progress");
      } catch (caught) { showError(friendlyError(caught)); }
    });
  }

  async function discardWorkout() {
    if (!session || savingRef.current) return;
    await withSaving(async () => {
      try {
        await timer.stop();
        await cancelWorkout(session.id);
        setConfirmMode(null);
        router.replace("/(tabs)/home");
      } catch (caught) { showError(friendlyError(caught)); }
    });
  }

  function applyCustomValue() {
    const value = Number(customValue.trim().replace(",", "."));
    if (customOpen === "weight") {
      if (!Number.isFinite(value) || value < 0 || value > (settings.weightUnit === "lb" ? 11000 : 5000)) return showError(language === "ar" ? "اكتب وزن صحيح." : "Enter a valid weight.");
      setWeight(toKilograms(Math.round(value * 100) / 100, settings.weightUnit));
    } else {
      if (!Number.isInteger(value) || value < 1 || value > 1000) return showError(language === "ar" ? "اكتب عدد عدات صحيح." : "Enter valid reps.");
      setReps(value);
    }
    setCustomOpen(null);
  }

  if (loading) return <Screen scroll={false}><LoadingState /></Screen>;
  if (error || !session || !selected) return <Screen><ErrorState message={error ?? (language === "ar" ? "التمرينة فاضية." : "Workout is empty.")} onRetry={() => void load()} /></Screen>;

  const incompleteSets = totalSets - completedSets;
  const completedExercises = session.exercises.filter((exercise) => completedCount(exercise) > 0).length;
  const volume = session.exercises.flatMap((exercise) => exercise.sets).filter((set) => set.isCompleted).reduce((sum, set) => sum + (set.weightKg ?? 0) * (set.reps ?? 0), 0);
  const noteOptions = language === "ar"
    ? ["سهل", "مناسب", "صعب", "زوّد الوزن المرة الجاية", "خفف الوزن", "راجع التكنيك"]
    : ["Easy", "Good", "Hard", "Increase next time", "Reduce weight", "Review technique"];
  const strongestPast = past ? bestSet(past.sets) : undefined;

  return (
    <Screen
      scroll={false}
      showConnectivity={false}
      contentStyle={{ flex: 1, paddingTop: spacing.xs, paddingBottom: spacing.sm, gap: compact ? 10 : spacing.sm }}
    >
      <View style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.sm }}>
        <Pressable onPress={() => router.replace("/(tabs)/workout")} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
          {isRTL ? <ChevronLeft color={colors.text} size={21} /> : <ArrowLeft color={colors.text} size={21} />}
        </Pressable>
        <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
          <View style={{ flexDirection: rowDirection, alignItems: "center", justifyContent: "space-between" }}>
            <AppText variant="overline" color="primary">GYM MODE</AppText>
            <AppText variant="caption" color="muted">{completedSets}/{totalSets} {t("common.sets")}</AppText>
          </View>
          <ProgressBar value={progress} />
        </View>
        <Pressable onPress={() => setMoreOpen(true)} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
          <MoreHorizontal color={colors.text} size={22} />
        </Pressable>
      </View>

      <Card variant="dark" style={{ gap: compact ? 9 : 12, padding: compact ? 15 : 18, borderColor: colors.borderStrong }}>
        <View pointerEvents="none" style={{ position: "absolute", width: 170, height: 170, borderRadius: 85, backgroundColor: colors.glow, end: -70, top: -70 }} />
        <View style={{ flexDirection: rowDirection, alignItems: "flex-start", gap: spacing.sm }}>
          <View style={{ width: 48, height: 48, borderRadius: 17, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
            <Dumbbell color={colors.primaryInk} size={23} strokeWidth={2.6} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <AppText variant={compact ? "title3" : "title2"} style={{ color: colors.textOnDark }} numberOfLines={2}>{selected.exercise.name}</AppText>
            <AppText variant="small" style={{ color: colors.textMuted }} numberOfLines={1}>{selected.exercise.primaryMuscle} · {selectedIndex + 1}/{session.exercises.length}</AppText>
          </View>
          <Pressable onPress={() => setExerciseListOpen(true)} style={({ pressed }) => ({ width: 42, height: 42, borderRadius: 15, backgroundColor: colors.heroMuted, borderWidth: 1, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
            <ListChecks color={colors.textOnDark} size={19} />
          </Pressable>
        </View>

        <View style={{ flexDirection: rowDirection, gap: 8, flexWrap: "wrap" }}>
          <View style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.primary }}><AppText variant="caption" style={{ color: colors.primaryInk }}>{pendingSet ? (language === "ar" ? `سِت ${pendingSet.setNumber} من ${selected.sets.length}` : `Set ${pendingSet.setNumber}/${selected.sets.length}`) : (language === "ar" ? "اكتمل" : "Done")}</AppText></View>
          <View style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.heroMuted }}><AppText variant="caption" style={{ color: colors.textOnDark }}>{selected.targetRepsMin}–{selected.targetRepsMax} {language === "ar" ? "عدة" : "reps"}</AppText></View>
          {strongestPast ? <View style={{ borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.heroMuted, flexDirection: rowDirection, alignItems: "center", gap: 5 }}><History size={13} color={colors.primary} /><AppText variant="caption" style={{ color: colors.textOnDark }}>{formatWeight(strongestPast.weightKg, settings.weightUnit)} × {strongestPast.reps}</AppText></View> : null}
        </View>

        {previousTargetSet ? (
          <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 8 }}>
            <TrendingUp size={16} color={colors.primary} />
            <AppText variant="small" style={{ color: colors.textMuted }}>{language === "ar" ? "نفس السِت آخر مرة" : "Same set last time"}</AppText>
            <AppText variant="smallBold" style={{ color: colors.textOnDark }}>{formatWeight(previousTargetSet.weightKg, settings.weightUnit)} × {previousTargetSet.reps}</AppText>
            <Pressable onPress={() => { setWeight(previousTargetSet.weightKg); setReps(previousTargetSet.reps); }} style={({ pressed }) => ({ marginStart: "auto", opacity: pressed ? 0.65 : 1 })}><AppText variant="smallBold" color="primary">{language === "ar" ? "استخدم" : "Use"}</AppText></Pressable>
          </View>
        ) : null}
      </Card>

      <Card style={{ flex: 1, minHeight: 0, justifyContent: "space-between", gap: compact ? 10 : spacing.sm, padding: compact ? 14 : 16 }}>
        {lastLogged ? (
          <>
            <View style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.sm, backgroundColor: colors.successSoft, borderRadius: 17, padding: 12 }}>
              <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}><Check color={colors.success} size={21} /></View>
              <View style={{ flex: 1 }}><AppText variant="smallBold">{language === "ar" ? "اتسجلت" : "Logged"}</AppText><AppText variant="small" color="muted">{formatWeight(lastLogged.weight, settings.weightUnit)} × {lastLogged.reps}</AppText></View>
              <Pressable onPress={() => void undoLastSet()} style={({ pressed }) => ({ padding: 8, opacity: pressed ? 0.65 : 1 })}><RotateCcw size={18} color={colors.primaryStrong} /></Pressable>
            </View>

            <View style={{ flex: 1, justifyContent: "center" }}>
              <AppText variant="title2" align="center">{lastLogged.hasNextPlannedSet ? (language === "ar" ? "سِت كمان؟" : "Another set?") : (language === "ar" ? "خلصت المطلوب" : "Target complete")}</AppText>
            </View>

            <View style={{ gap: 8 }}>
              {lastLogged.hasNextPlannedSet ? <Button onPress={prepareSameExercise}>{language === "ar" ? "السِت اللي بعدها" : "Next set"}</Button> : <Button onPress={goNextExercise}>{selectedIndex === session.exercises.length - 1 ? (language === "ar" ? "إنهاء التمرينة" : "Finish workout") : (language === "ar" ? "التمرين التالي" : "Next exercise")}</Button>}
              {lastLogged.hasNextPlannedSet ? <Button compact variant="secondary" onPress={goNextExercise}>{language === "ar" ? "كفاية · التمرين التالي" : "Enough · next exercise"}</Button> : <Button compact variant="secondary" icon={<Plus size={17} color={colors.primaryStrong} />} onPress={() => void addExtraSet()}>{language === "ar" ? "سِت زيادة" : "Extra set"}</Button>}
            </View>
          </>
        ) : pendingSet ? (
          <>
            <View style={{ flex: 1, justifyContent: "center", gap: compact ? 9 : 13 }}>
              <View style={{ flexDirection: rowDirection, gap: 10 }}>
                <WorkoutValueControl label={language === "ar" ? "الوزن" : "Weight"} value={fromKilograms(weight, settings.weightUnit)} suffix={settings.weightUnit} step={weightStep} min={0} max={settings.weightUnit === "lb" ? 11000 : 5000} onChange={(value) => setWeight(toKilograms(value, settings.weightUnit))} onEdit={() => { setCustomValue(fromKilograms(weight, settings.weightUnit)?.toString() ?? ""); setCustomOpen("weight"); }} />
                <WorkoutValueControl label={language === "ar" ? "العدات" : "Reps"} value={reps} step={1} min={1} max={1000} onChange={setReps} onEdit={() => { setCustomValue(reps?.toString() ?? ""); setCustomOpen("reps"); }} />
              </View>

              <View style={{ flexDirection: rowDirection, gap: 7, alignItems: "center" }}>
                {(settings.weightUnit === "lb" ? [2.5, 5, 10] : [1, 2.5, 5]).map((step) => (
                  <Pressable key={step} onPress={() => { setWeightStep(step); void AsyncStorage.setItem(`gym-crew:weight-step:${settings.weightUnit}:${selected.exerciseId}`, String(step)); }} style={({ pressed }) => ({ minHeight: 38, paddingHorizontal: 11, borderRadius: 13, backgroundColor: weightStep === step ? colors.primarySoft : colors.surfaceMuted, borderWidth: 1, borderColor: weightStep === step ? colors.primary : colors.border, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.72 : 1 })}>
                    <AppText variant="caption" color={weightStep === step ? "primary" : "muted"}>±{step}</AppText>
                  </Pressable>
                ))}
                <Pressable onPress={() => setNotesOpen(true)} style={({ pressed }) => ({ flex: 1, minHeight: 38, borderRadius: 13, backgroundColor: setNotes ? colors.primarySoft : colors.surfaceMuted, borderWidth: 1, borderColor: setNotes ? colors.primary : colors.border, paddingHorizontal: 11, flexDirection: rowDirection, alignItems: "center", justifyContent: "center", gap: 6, opacity: pressed ? 0.72 : 1 })}>
                  <StickyNote color={setNotes ? colors.primaryStrong : colors.textMuted} size={15} />
                  <AppText variant="caption" color={setNotes ? "primary" : "muted"} numberOfLines={1}>{setNotes || (language === "ar" ? "نوتس اختيارية" : "Optional note")}</AppText>
                </Pressable>
              </View>
            </View>

            <Button disabled={reps === null} loading={saving} onPress={() => void logSet()} icon={<Check color={colors.primaryInk} size={22} />} style={{ minHeight: compact ? 60 : 66 }}>
              {language === "ar" ? "خلصت السِت" : "Set done"}
            </Button>
          </>
        ) : (
          <View style={{ flex: 1, justifyContent: "center", gap: spacing.md, alignItems: "center" }}>
            <View style={{ width: 62, height: 62, borderRadius: 22, backgroundColor: colors.successSoft, alignItems: "center", justifyContent: "center" }}><Check color={colors.success} size={32} /></View>
            <AppText variant="title2" align="center">{language === "ar" ? "التمرين ده خلص" : "Exercise complete"}</AppText>
            <Button style={{ alignSelf: "stretch" }} onPress={goNextExercise}>{selectedIndex === session.exercises.length - 1 ? (language === "ar" ? "إنهاء التمرينة" : "Finish workout") : (language === "ar" ? "التمرين التالي" : "Next exercise")}</Button>
            <Button style={{ alignSelf: "stretch" }} variant="secondary" onPress={() => void addExtraSet()}>{language === "ar" ? "سِت زيادة" : "Extra set"}</Button>
          </View>
        )}
      </Card>

      <ActionSheet visible={preflightOpen} title={language === "ar" ? "نبدأ زي ما هي؟" : "Start as planned?"} description={language === "ar" ? "لو جهاز مشغول غيّر الترتيب في ثواني." : "If a machine is busy, reorder in seconds."} onClose={() => setPreflightOpen(false)} dismissible={false}>
        <Button onPress={() => setPreflightOpen(false)} icon={<Check color={colors.primaryInk} size={20} />}>{language === "ar" ? "ابدأ بالترتيب الحالي" : "Use current order"}</Button>
        <Button variant="secondary" onPress={openReorder} icon={<Shuffle color={colors.primaryStrong} size={19} />}>{language === "ar" ? "رتّب تمرينة النهارده" : "Reorder today"}</Button>
      </ActionSheet>

      <ActionSheet visible={reorderOpen} title={language === "ar" ? "رتّب تمرينة النهارده" : "Today’s order"} onClose={() => setReorderOpen(false)} scroll>
        <View style={{ gap: 8 }}>
          {orderDraft.map((id, index) => {
            const exercise = session.exercises.find((item) => item.id === id);
            if (!exercise) return null;
            return (
              <View key={id} style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.sm, backgroundColor: colors.surfaceMuted, borderRadius: 17, padding: 10 }}>
                <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}><AppText variant="smallBold" color="primary">{index + 1}</AppText></View>
                <AppText variant="smallBold" style={{ flex: 1 }} numberOfLines={2}>{exercise.exercise.name}</AppText>
                <Pressable disabled={index === 0} onPress={() => moveDraft(index, -1)} style={{ padding: 8, opacity: index === 0 ? 0.25 : 1 }}><ChevronUp color={colors.text} size={19} /></Pressable>
                <Pressable disabled={index === orderDraft.length - 1} onPress={() => moveDraft(index, 1)} style={{ padding: 8, opacity: index === orderDraft.length - 1 ? 0.25 : 1 }}><ChevronDown color={colors.text} size={19} /></Pressable>
              </View>
            );
          })}
        </View>
        <Button loading={saving} onPress={() => void saveOrder()}>{language === "ar" ? "ثبّت الترتيب وابدأ" : "Save and start"}</Button>
      </ActionSheet>

      <ActionSheet visible={exerciseListOpen} title={language === "ar" ? "تمارين النهارده" : "Today’s exercises"} onClose={() => setExerciseListOpen(false)} scroll>
        <View style={{ gap: 8 }}>
          {session.exercises.map((exercise, index) => {
            const done = completedCount(exercise);
            const current = exercise.id === selected.id;
            const complete = done >= exercise.sets.length;
            return (
              <Pressable key={exercise.id} onPress={() => goToExercise(exercise)} style={({ pressed }) => ({ flexDirection: rowDirection, alignItems: "center", gap: spacing.sm, minHeight: 58, borderRadius: 17, paddingHorizontal: 12, backgroundColor: current ? colors.primarySoft : colors.surfaceMuted, borderWidth: 1, borderColor: current ? colors.primary : colors.border, opacity: pressed ? 0.72 : 1 })}>
                {complete ? <Check color={colors.success} size={20} /> : current ? <Dumbbell color={colors.primaryStrong} size={20} /> : <Circle color={colors.textFaint} size={18} />}
                <View style={{ flex: 1, minWidth: 0 }}><AppText variant="smallBold" numberOfLines={1}>{index + 1}. {exercise.exercise.name}</AppText><AppText variant="caption" color="muted">{done}/{exercise.sets.length} {t("common.sets")}</AppText></View>
              </Pressable>
            );
          })}
        </View>
      </ActionSheet>

      <ActionSheet visible={moreOpen} title={language === "ar" ? "اللي ممكن تحتاجه" : "Workout tools"} onClose={() => setMoreOpen(false)}>
        <Button variant="secondary" onPress={() => { setMoreOpen(false); setExerciseListOpen(true); }} icon={<ListChecks color={colors.primaryStrong} size={19} />}>{language === "ar" ? "قائمة التمارين" : "Exercise list"}</Button>
        <Button variant="secondary" onPress={openReorder} icon={<Shuffle color={colors.primaryStrong} size={19} />}>{language === "ar" ? "غيّر الترتيب" : "Reorder"}</Button>
        <Button variant="secondary" onPress={() => { setMoreOpen(false); router.push(`/exercise-picker?sessionId=${session.id}`); }} icon={<Plus color={colors.primaryStrong} size={19} />}>{language === "ar" ? "ضيف تمرين" : "Add exercise"}</Button>
        <Button variant="secondary" onPress={() => void startOptionalTimer()} icon={<TimerReset color={colors.primaryStrong} size={19} />}>{language === "ar" ? "مؤقت راحة" : "Rest timer"}</Button>
        <Button variant="secondary" onPress={() => { setMoreOpen(false); setConfirmMode("finish"); }} icon={<Flag color={colors.primaryStrong} size={19} />}>{language === "ar" ? "إنهاء التمرينة" : "Finish workout"}</Button>
        <Button variant="ghost" onPress={() => { setMoreOpen(false); setConfirmMode("cancel"); }} icon={<Trash2 color={colors.danger} size={19} />}><AppText color="danger" variant="bodyStrong">{language === "ar" ? "إلغاء التمرينة" : "Cancel workout"}</AppText></Button>
      </ActionSheet>

      <ActionSheet visible={notesOpen} title={language === "ar" ? `نوتس سِت ${pendingSet?.setNumber ?? ""}` : `Set ${pendingSet?.setNumber ?? ""} note`} onClose={() => setNotesOpen(false)}>
        <View style={{ flexDirection: rowDirection, flexWrap: "wrap", gap: 8 }}>
          {noteOptions.map((option) => <Pressable key={option} onPress={() => setSetNotes(option)} style={({ pressed }) => ({ paddingHorizontal: 12, minHeight: 38, borderRadius: 14, backgroundColor: setNotes === option ? colors.primarySoft : colors.surfaceMuted, borderWidth: 1, borderColor: setNotes === option ? colors.primary : colors.border, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}><AppText variant="smallBold" color={setNotes === option ? "primary" : "muted"}>{option}</AppText></Pressable>)}
        </View>
        <TextField value={setNotes} onChangeText={setSetNotes} maxLength={240} multiline style={{ minHeight: 90, textAlignVertical: "top" }} placeholder={language === "ar" ? "مثال: الكرسي رقم 4..." : "Example: seat 4..."} />
        <Button onPress={() => setNotesOpen(false)}>{language === "ar" ? "تمام" : "Done"}</Button>
      </ActionSheet>

      <ActionSheet visible={customOpen !== null} title={customOpen === "weight" ? (language === "ar" ? "اكتب الوزن" : "Enter weight") : (language === "ar" ? "اكتب العدات" : "Enter reps")} onClose={() => setCustomOpen(null)}>
        <TextField value={customValue} onChangeText={setCustomValue} keyboardType="decimal-pad" autoFocus />
        <Button onPress={applyCustomValue}>{language === "ar" ? "استخدم الرقم" : "Use value"}</Button>
      </ActionSheet>

      <ActionSheet visible={confirmMode === "finish"} title={language === "ar" ? "نقفل التمرينة؟" : "Finish workout?"} description={incompleteSets > 0 ? (language === "ar" ? `لسه ${incompleteSets} سِت، وتقدر تنهي عادي.` : `${incompleteSets} sets are still open.`) : undefined} onClose={() => setConfirmMode(null)}>
        <View style={{ flexDirection: rowDirection, gap: spacing.sm }}>
          <View style={{ flex: 1, backgroundColor: colors.surfaceMuted, borderRadius: 16, padding: 12 }}><AppText variant="caption" color="muted">{language === "ar" ? "تمارين" : "Exercises"}</AppText><AppText variant="title3">{completedExercises}</AppText></View>
          <View style={{ flex: 1, backgroundColor: colors.surfaceMuted, borderRadius: 16, padding: 12 }}><AppText variant="caption" color="muted">{language === "ar" ? "سِتات" : "Sets"}</AppText><AppText variant="title3">{completedSets}</AppText></View>
          <View style={{ flex: 1, backgroundColor: colors.surfaceMuted, borderRadius: 16, padding: 12 }}><AppText variant="caption" color="muted">{language === "ar" ? "فوليوم" : "Volume"}</AppText><AppText variant="smallBold">{Math.round(volume).toLocaleString()}</AppText></View>
        </View>
        <Button loading={saving} onPress={() => void completeWorkout()} icon={<Flag color={colors.primaryInk} size={19} />}>{language === "ar" ? "إنهاء وحفظ" : "Finish and save"}</Button>
        <Button variant="secondary" onPress={() => setConfirmMode(null)}>{language === "ar" ? "كمّل" : "Keep training"}</Button>
      </ActionSheet>

      <ActionSheet visible={confirmMode === "cancel"} title={language === "ar" ? "تلغي التمرينة؟" : "Cancel workout?"} description={language === "ar" ? "السِتات هتفضل في نسخة ملغية ومش هتتحسب كمكتملة." : "Logged sets stay in a cancelled copy."} onClose={() => setConfirmMode(null)}>
        <Button variant="secondary" onPress={() => setConfirmMode(null)}>{language === "ar" ? "لا، كمّل" : "Keep workout"}</Button>
        <Button variant="danger" loading={saving} onPress={() => void discardWorkout()}>{language === "ar" ? "إلغاء التمرينة" : "Cancel workout"}</Button>
      </ActionSheet>

      <RestTimerSheet visible={timerOpen && timer.active} onClose={() => setTimerOpen(false)} onContinue={() => setTimerOpen(false)} />
      <AppToast visible={Boolean(toast)} message={toast ?? ""} tone="danger" />
    </Screen>
  );
}
