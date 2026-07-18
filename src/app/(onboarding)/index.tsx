import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Dumbbell, UserRound, UsersRound } from "lucide-react-native";
import { Screen } from "@/components/ui/screen";
import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { createGroup, createSoloWorkspace, joinGroup } from "@/features/groups/group-service";
import { friendlyError } from "@/lib/supabase/errors";
import { useTranslation } from "@/lib/localization/use-translation";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { spacing } from "@/lib/theme/tokens";
import { useSessionStore } from "@/stores/session-store";

type Mode = "solo" | "create" | "join" | null;

export default function OnboardingScreen() {
  const { t, rowDirection } = useTranslation();
  const { colors } = useAppTheme();
  const router = useRouter();
  const refresh = useSessionStore((state) => state.refreshContext);
  const [mode, setMode] = useState<Mode>(null);
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function finish(action: () => Promise<unknown>) {
    setLoading(true);
    try {
      await action();
      await refresh();
      router.replace("/(tabs)/split");
    } catch (error) {
      Alert.alert(t("common.error"), friendlyError(error));
    } finally {
      setLoading(false);
    }
  }

  const options = [
    { key: "solo" as const, icon: UserRound, title: t("onboarding.solo"), desc: t("onboarding.soloDesc") },
    { key: "create" as const, icon: UsersRound, title: t("onboarding.createCrew"), desc: t("onboarding.createCrewDesc") },
    { key: "join" as const, icon: Dumbbell, title: t("onboarding.joinCrew"), desc: t("onboarding.joinCrewDesc") },
  ];

  return (
    <Screen contentStyle={{ justifyContent: "center", paddingVertical: spacing.xxl }}>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="title1">{t("onboarding.title")}</AppText>
        <AppText color="muted">{t("onboarding.subtitle")}</AppText>
      </View>
      <View style={{ gap: spacing.md }}>
        {options.map(({ key, icon: Icon, title, desc }) => (
          <Pressable key={key} onPress={() => setMode(key)}>
            <Card
              style={{
                flexDirection: rowDirection,
                alignItems: "center",
                gap: spacing.md,
                borderColor: mode === key ? colors.primary : colors.border,
                borderWidth: mode === key ? 2 : 1,
              }}
            >
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>
                <Icon color={colors.primary} size={24} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <AppText variant="bodyStrong">{title}</AppText>
                <AppText variant="small" color="muted">{desc}</AppText>
              </View>
            </Card>
          </Pressable>
        ))}
      </View>

      {mode === "create" ? <TextField label={t("onboarding.groupName")} value={groupName} onChangeText={setGroupName} /> : null}
      {mode === "join" ? <TextField label={t("onboarding.inviteCode")} value={inviteCode} onChangeText={setInviteCode} autoCapitalize="characters" /> : null}

      <Button
        disabled={!mode || (mode === "create" && groupName.trim().length < 2) || (mode === "join" && inviteCode.trim().length < 4)}
        loading={loading}
        onPress={() => {
          if (mode === "solo") void finish(createSoloWorkspace);
          if (mode === "create") void finish(() => createGroup(groupName));
          if (mode === "join") void finish(() => joinGroup(inviteCode));
        }}
      >
        {t("onboarding.continue")}
      </Button>
    </Screen>
  );
}
