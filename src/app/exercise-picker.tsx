import { useEffect, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Dumbbell, Plus, Search } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/app-text";
import { TextField } from "@/components/ui/text-field";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingState, EmptyState } from "@/components/ui/states";
import { fetchExercises } from "@/features/splits/exercise-service";
import { addSplitExercise } from "@/features/splits/split-service";
import { addSessionExercise } from "@/features/workouts/workout-service";
import { friendlyError } from "@/lib/supabase/errors";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { spacing } from "@/lib/theme/tokens";
import type { Exercise } from "@/types";

export default function ExercisePickerScreen() {
  const { dayId, sessionId } = useLocalSearchParams<{ dayId?: string; sessionId?: string }>();
  const router = useRouter();
  const { t, language, rowDirection } = useTranslation();
  const { colors } = useAppTheme();
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(true);
      setError(null);
      void fetchExercises(search)
        .then(setItems)
        .catch((caught) => setError(friendlyError(caught)))
        .finally(() => setLoading(false));
    }, 220);
    return () => clearTimeout(timeout);
  }, [search]);

  async function add(exercise: Exercise) {
    if (!dayId && !sessionId) return;
    setAdding(exercise.id);
    setError(null);
    try {
      if (sessionId) await addSessionExercise(sessionId, exercise);
      else if (dayId) await addSplitExercise({ splitDayId: dayId, exercise });
      router.back();
    } catch (caught) {
      setError(friendlyError(caught));
    } finally {
      setAdding(null);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: spacing.md, gap: spacing.md, flex: 1, width: "100%", maxWidth: 760, alignSelf: "center" }}>
        <View style={{ flexDirection: rowDirection, justifyContent: "space-between", alignItems: "center" }}>
          <Button compact variant="ghost" onPress={() => router.back()}>{t("common.close")}</Button>
          <View style={{ flex: 1 }}><AppText variant="title2" align="center">{sessionId ? (language === "ar" ? "ضيف تمرين" : "Add exercise") : t("split.addExercise")}</AppText></View>
          <View style={{ width: 70 }} />
        </View>
        <TextField value={search} onChangeText={setSearch} placeholder={language === "ar" ? "دور باسم التمرين" : "Search exercises"} autoFocus />
        {error ? <AppText variant="small" color="warning">{error}</AppText> : null}
        {loading ? <LoadingState /> : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: spacing.sm, paddingBottom: 40 }}
            ListEmptyComponent={<EmptyState title={t("common.noData")} description={language === "ar" ? "جرّب اسم تاني، أو اتصل بالنت مرة لتحميل المكتبة." : "Try another name, or connect once to cache the library."} />}
            renderItem={({ item }) => (
              <Pressable onPress={() => void add(item)} disabled={adding === item.id} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
                <Card elevated={false} style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md }}>
                  <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>{search ? <Search color={colors.primaryStrong} size={20} /> : <Dumbbell color={colors.primaryStrong} size={20} />}</View>
                  <View style={{ flex: 1, minWidth: 0 }}><AppText variant="bodyStrong">{item.name}</AppText><AppText variant="small" color="muted">{item.primaryMuscle}</AppText></View>
                  <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>{adding === item.id ? <AppText color="default">…</AppText> : <Plus color={colors.black} size={18} />}</View>
                </Card>
              </Pressable>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
