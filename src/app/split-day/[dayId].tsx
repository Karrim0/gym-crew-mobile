import { useCallback, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ChevronDown, ChevronUp, Minus, Plus, Trash2 } from "lucide-react-native";
import { Screen } from "@/components/ui/screen";
import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { Pill } from "@/components/ui/pill";
import { LoadingState, ErrorState } from "@/components/ui/states";
import {
  fetchPersonalSplit,
  removeSplitExercise,
  reorderSplitExercises,
  updateSplitDay,
  updateSplitExerciseTargets,
} from "@/features/splits/split-service";
import { friendlyError } from "@/lib/supabase/errors";
import { spacing } from "@/lib/theme/tokens";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { useSessionStore } from "@/stores/session-store";
import type { SplitDayWithDetails, WorkoutType } from "@/types";

export default function SplitDayScreen() {
  const { dayId } = useLocalSearchParams<{ dayId: string }>();
  const router = useRouter();
  const user = useSessionStore((state) => state.user);
  const { t, rowDirection, language } = useTranslation();
  const { colors } = useAppTheme();
  const [day, setDay] = useState<SplitDayWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [focus, setFocus] = useState("");
  const [notes, setNotes] = useState("");
  const [type, setType] = useState<WorkoutType>("custom");

  const load = useCallback(async () => {
    if (!user || !dayId) return;
    setLoading(true);
    try {
      const split = await fetchPersonalSplit(user.id);
      const found = split.find((item) => item.id === dayId) ?? null;
      setDay(found);
      if (found) {
        setName(found.displayName ?? "");
        setFocus(found.focusLabel ?? "");
        setNotes(found.dayNotes);
        setType(found.workoutType);
      }
    } catch (caught) {
      setError(friendlyError(caught));
    } finally {
      setLoading(false);
    }
  }, [dayId, user]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function saveDay() {
    if (!day) return;
    setSaving(true);
    try {
      await updateSplitDay({
        splitDayId: day.id,
        workoutType: type,
        displayName: name || (type === "rest" ? (language === "ar" ? "راحة" : "Rest") : "Workout"),
        focusLabel: focus,
        iconKey: type === "rest" ? "moon" : day.iconKey,
        colorKey: day.colorKey,
        dayNotes: notes,
      });
      await load();
      Alert.alert(t("common.done"), language === "ar" ? "اليوم اتحدّث." : "Day updated.");
    } catch (caught) {
      Alert.alert(t("common.error"), friendlyError(caught));
    } finally {
      setSaving(false);
    }
  }

  async function changeTarget(exerciseId: string, sets: number, min: number, max: number) {
    try {
      await updateSplitExerciseTargets(exerciseId, Math.max(1, sets), Math.max(1, min), Math.max(Math.max(1, min), max));
      await load();
    } catch (caught) {
      Alert.alert(t("common.error"), friendlyError(caught));
    }
  }

  async function move(index: number, direction: -1 | 1) {
    if (!day) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= day.exercises.length) return;
    const ids = day.exercises.map((item) => item.id);
    [ids[index], ids[nextIndex]] = [ids[nextIndex], ids[index]];
    try {
      await reorderSplitExercises(day.id, ids);
      await load();
    } catch (caught) {
      Alert.alert(t("common.error"), friendlyError(caught));
    }
  }

  if (loading) return <Screen><LoadingState /></Screen>;
  if (error || !day) return <Screen><ErrorState message={error ?? "Day not found"} onRetry={() => void load()} /></Screen>;

  const types: WorkoutType[] = ["push", "pull", "legs", "custom", "rest"];
  const typeLabels: Record<WorkoutType, string> = language === "ar"
    ? { push: "بوش", pull: "بول", legs: "ليجز", custom: "مخصص", rest: "راحة" }
    : { push: "Push", pull: "Pull", legs: "Legs", custom: "Custom", rest: "Rest" };

  return (
    <Screen>
      <View style={{ flexDirection: rowDirection, alignItems: "center", justifyContent: "space-between" }}>
        <Button compact variant="ghost" onPress={() => router.back()}>{t("common.back")}</Button>
        <AppText variant="title2">{day.displayName || typeLabels[day.workoutType]}</AppText>
        <View style={{ width: 70 }} />
      </View>

      <Card style={{ gap: spacing.md }}>
        <AppText variant="title3">{language === "ar" ? "شكل اليوم" : "Day setup"}</AppText>
        <View style={{ flexDirection: rowDirection, flexWrap: "wrap", gap: spacing.xs }}>
          {types.map((item) => <Pill key={item} selected={type === item} onPress={() => setType(item)}>{typeLabels[item]}</Pill>)}
        </View>
        <TextField label={t("split.dayName")} value={name} onChangeText={setName} />
        <TextField label={t("split.focus")} value={focus} onChangeText={setFocus} />
        <TextField label={t("split.notes")} value={notes} onChangeText={setNotes} multiline style={{ minHeight: 92, textAlignVertical: "top" }} />
        <Button loading={saving} onPress={() => void saveDay()}>{t("common.save")}</Button>
      </Card>

      {type !== "rest" ? (
        <>
          <View style={{ flexDirection: rowDirection, justifyContent: "space-between", alignItems: "center", gap: spacing.sm }}>
            <AppText variant="title3">{t("common.exercises")}</AppText>
            <Button compact variant="secondary" icon={<Plus color={colors.primary} size={18} />} onPress={() => router.push(`/exercise-picker?dayId=${day.id}`)}>{t("split.addExercise")}</Button>
          </View>
          <View style={{ gap: spacing.sm }}>
            {day.exercises.length === 0 ? <Card><AppText color="muted">{t("split.noExercises")}</AppText></Card> : null}
            {day.exercises.map((item, index) => (
              <Card key={item.id} style={{ gap: spacing.md }}>
                <View style={{ flexDirection: rowDirection, justifyContent: "space-between", alignItems: "center", gap: spacing.sm }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText variant="bodyStrong" numberOfLines={2}>{item.exercise.name}</AppText>
                    <AppText variant="small" color="muted">{t("split.target", { sets: item.targetSets, min: item.targetRepsMin, max: item.targetRepsMax })}</AppText>
                  </View>
                  <View style={{ flexDirection: rowDirection, gap: 4 }}>
                    <Pressable onPress={() => void move(index, -1)} disabled={index === 0} style={{ padding: 9, opacity: index === 0 ? 0.3 : 1 }}><ChevronUp color={colors.text} size={20} /></Pressable>
                    <Pressable onPress={() => void move(index, 1)} disabled={index === day.exercises.length - 1} style={{ padding: 9, opacity: index === day.exercises.length - 1 ? 0.3 : 1 }}><ChevronDown color={colors.text} size={20} /></Pressable>
                    <Pressable onPress={() => Alert.alert(t("common.delete"), item.exercise.name, [
                      { text: t("common.cancel"), style: "cancel" },
                      { text: t("common.delete"), style: "destructive", onPress: () => void removeSplitExercise(item.id).then(load) },
                    ])} style={{ padding: 9 }}><Trash2 color={colors.danger} size={20} /></Pressable>
                  </View>
                </View>

                <View style={{ flexDirection: rowDirection, flexWrap: "wrap", gap: spacing.sm }}>
                  {[
                    { label: t("common.sets"), value: item.targetSets, dec: () => changeTarget(item.id, item.targetSets - 1, item.targetRepsMin, item.targetRepsMax), inc: () => changeTarget(item.id, item.targetSets + 1, item.targetRepsMin, item.targetRepsMax) },
                    { label: language === "ar" ? "أقل عدات" : "Min reps", value: item.targetRepsMin, dec: () => changeTarget(item.id, item.targetSets, item.targetRepsMin - 1, item.targetRepsMax), inc: () => changeTarget(item.id, item.targetSets, item.targetRepsMin + 1, item.targetRepsMax) },
                    { label: language === "ar" ? "أعلى عدات" : "Max reps", value: item.targetRepsMax, dec: () => changeTarget(item.id, item.targetSets, item.targetRepsMin, item.targetRepsMax - 1), inc: () => changeTarget(item.id, item.targetSets, item.targetRepsMin, item.targetRepsMax + 1) },
                  ].map((control) => (
                    <View key={control.label} style={{ flexGrow: 1, flexBasis: 95, backgroundColor: colors.surfaceMuted, borderRadius: 14, padding: 10, gap: 8 }}>
                      <AppText variant="caption" color="muted" align="center">{control.label}</AppText>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Pressable onPress={() => void control.dec()} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}><Minus color={colors.text} size={16} /></Pressable>
                        <AppText variant="bodyStrong" align="center">{control.value}</AppText>
                        <Pressable onPress={() => void control.inc()} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}><Plus color={colors.text} size={16} /></Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              </Card>
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}
