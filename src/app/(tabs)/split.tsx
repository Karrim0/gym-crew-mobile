import { useCallback, useState } from "react";
import { Alert, Modal, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { AppHeader } from "@/components/layout/app-header";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { SetupChooser } from "@/components/split/setup-chooser";
import { DayCard } from "@/components/split/day-card";
import { applySplitTemplate, fetchPersonalSplit } from "@/features/splits/split-service";
import { friendlyError } from "@/lib/supabase/errors";
import { spacing } from "@/lib/theme/tokens";
import { useTranslation } from "@/lib/localization/use-translation";
import { useSessionStore } from "@/stores/session-store";
import type { SplitDayWithDetails } from "@/types";

export default function SplitScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useSessionStore((state) => state.user);
  const profile = useSessionStore((state) => state.profile);
  const refreshContext = useSessionStore((state) => state.refreshContext);
  const [split, setSplit] = useState<SplitDayWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      setSplit(await fetchPersonalSplit(user.id));
    } catch (caught) {
      setError(friendlyError(caught));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function apply(template: "manual" | "full_body_3" | "upper_lower_4" | "ppl_ul_5" | "ppl_6") {
    setWorking(true);
    try {
      await applySplitTemplate(template);
      await Promise.all([load(), refreshContext()]);
      setTemplatesOpen(false);
    } catch (caught) {
      Alert.alert(t("common.error"), friendlyError(caught));
    } finally {
      setWorking(false);
    }
  }

  if (loading) return <Screen><LoadingState /></Screen>;
  if (error && !split.length) return <Screen><ErrorState message={error} onRetry={() => void load()} /></Screen>;

  const needsSetup = !profile?.splitSetupCompletedAt || split.every((day) => day.exercises.length === 0);
  const templates = ["full_body_3", "upper_lower_4", "ppl_ul_5", "ppl_6"] as const;

  return (
    <Screen>
      <AppHeader title={t("split.title")} subtitle={t("split.subtitle")} />
      {needsSetup ? (
        <SetupChooser onManual={() => void apply("manual")} onStarter={() => setTemplatesOpen(true)} loading={working} />
      ) : (
        <>
          <SectionHeader title={t("split.basePlan")} action={<Button compact variant="secondary" onPress={() => setTemplatesOpen(true)}>{t("split.starterPlan")}</Button>} />
          <View style={{ gap: spacing.sm }}>
            {split.map((day) => <DayCard key={day.id} day={day} onPress={() => router.push(`/split-day/${day.id}`)} />)}
          </View>
        </>
      )}

      <Modal transparent visible={templatesOpen} animationType="fade" onRequestClose={() => setTemplatesOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" }}>
          <Card style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, gap: spacing.md, paddingBottom: 36 }}>
            <AppText variant="title2">{t("split.starterPlan")}</AppText>
            {templates.map((template) => (
              <Button key={template} variant="secondary" loading={working} onPress={() => void apply(template)}>
                {t(`split.templates.${template}`)}
              </Button>
            ))}
            <Button variant="ghost" onPress={() => setTemplatesOpen(false)}>{t("common.cancel")}</Button>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}
