import { useEffect, useState } from "react";
import { Alert, FlatList, Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Plus, Search } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/app-text";
import { TextField } from "@/components/ui/text-field";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingState, EmptyState } from "@/components/ui/states";
import { fetchExercises } from "@/features/splits/exercise-service";
import { addSplitExercise } from "@/features/splits/split-service";
import { friendlyError } from "@/lib/supabase/errors";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { spacing } from "@/lib/theme/tokens";
import type { Exercise } from "@/types";

export default function ExercisePickerScreen() {
  const { dayId } = useLocalSearchParams<{ dayId: string }>();
  const router = useRouter();
  const { t, rowDirection } = useTranslation();
  const { colors } = useAppTheme();
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(true);
      void fetchExercises(search).then(setItems).catch((error) => Alert.alert(t("common.error"), friendlyError(error))).finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timeout);
  }, [search, t]);

  async function add(exercise: Exercise) {
    if (!dayId) return;
    setAdding(exercise.id);
    try {
      await addSplitExercise({ splitDayId: dayId, exercise });
      router.back();
    } catch (error) {
      Alert.alert(t("common.error"), friendlyError(error));
    } finally {
      setAdding(null);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: spacing.md, gap: spacing.md, flex: 1 }}>
        <View style={{ flexDirection: rowDirection, justifyContent: "space-between", alignItems: "center" }}>
          <Button compact variant="ghost" onPress={() => router.back()}>{t("common.close")}</Button>
          <AppText variant="title2">{t("split.addExercise")}</AppText>
          <View style={{ width: 70 }} />
        </View>
        <TextField value={search} onChangeText={setSearch} placeholder={t("split.addExercise")} autoFocus />
        {loading ? <LoadingState /> : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.sm, paddingBottom: 40 }}
            ListEmptyComponent={<EmptyState title={t("common.noData")} />}
            renderItem={({ item }) => (
              <Pressable onPress={() => void add(item)} disabled={adding === item.id}>
                <Card style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md }}>
                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                    {search ? <Search color={colors.primary} size={20} /> : <Plus color={colors.primary} size={20} />}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText variant="bodyStrong">{item.name}</AppText>
                    <AppText variant="small" color="muted">{item.primaryMuscle}</AppText>
                  </View>
                  <AppText color="primary">{adding === item.id ? "..." : "+"}</AppText>
                </Card>
              </Pressable>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
