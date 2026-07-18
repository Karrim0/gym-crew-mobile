import { Alert, Pressable, Switch, View } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, ChevronLeft, LogOut, Moon, Smartphone, Sun, Volume2, Languages, Scale, Vibrate } from "lucide-react-native";
import { Screen } from "@/components/ui/screen";
import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/localization/use-translation";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useSettingsStore, type ColorMode, type Language, type WeightUnit } from "@/stores/settings-store";
import { useSessionStore } from "@/stores/session-store";
import { spacing } from "@/lib/theme/tokens";

function SettingRow({ icon, title, description, children }: { icon: React.ReactNode; title: string; description?: string; children?: React.ReactNode }) {
  const { rowDirection } = useTranslation();
  const { colors } = useAppTheme();
  return <View style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md, minHeight: 58 }}><View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>{icon}</View><View style={{ flex: 1, minWidth: 0 }}><AppText variant="bodyStrong">{title}</AppText>{description ? <AppText variant="small" color="muted">{description}</AppText> : null}</View>{children}</View>;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { t, language, rowDirection, isRTL } = useTranslation();
  const settings = useSettingsStore();
  const signOut = useSessionStore((s) => s.signOutLocal);
  const themes: { value: ColorMode; label: string; icon: React.ReactNode }[] = [
    { value: "system", label: t("settings.system"), icon: <Smartphone size={16} color={colors.text} /> },
    { value: "light", label: t("settings.light"), icon: <Sun size={16} color={colors.text} /> },
    { value: "dark", label: t("settings.dark"), icon: <Moon size={16} color={colors.text} /> },
  ];
  return (
    <Screen>
      <View style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.sm }}><Pressable onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>{isRTL ? <ChevronLeft color={colors.text} /> : <ArrowLeft color={colors.text} />}</Pressable><AppText variant="title2">{t("settings.title")}</AppText></View>
      <Card style={{ gap: spacing.lg }}>
        <SettingRow icon={<Languages color={colors.primary} />} title={t("settings.language")} />
        <View style={{ flexDirection: rowDirection, flexWrap: "wrap", gap: 8 }}>{(["ar", "en"] as Language[]).map((value) => <Pill key={value} selected={language === value} onPress={() => settings.setLanguage(value)}>{value === "ar" ? t("settings.arabic") : t("settings.english")}</Pill>)}</View>
      </Card>
      <Card style={{ gap: spacing.lg }}>
        <SettingRow icon={settings.colorMode === "dark" ? <Moon color={colors.primary} /> : <Sun color={colors.primary} />} title={t("settings.appearance")} />
        <View style={{ flexDirection: rowDirection, flexWrap: "wrap", gap: 8 }}>{themes.map((item) => <Pill key={item.value} selected={settings.colorMode === item.value} onPress={() => settings.setColorMode(item.value)}>{item.label}</Pill>)}</View>
      </Card>
      <Card style={{ gap: spacing.lg }}>
        <SettingRow icon={<Scale color={colors.primary} />} title={t("settings.units")}><View style={{ flexDirection: rowDirection, gap: 6 }}>{(["kg", "lb"] as WeightUnit[]).map((unit) => <Pill key={unit} selected={settings.weightUnit === unit} onPress={() => settings.setWeightUnit(unit)}>{unit}</Pill>)}</View></SettingRow>
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <SettingRow icon={<Volume2 color={colors.primary} />} title={t("settings.sound")}><Switch value={settings.soundEnabled} onValueChange={settings.setSoundEnabled} trackColor={{ false: colors.surfaceStrong, true: colors.primarySoft }} thumbColor={settings.soundEnabled ? colors.primary : colors.textFaint} /></SettingRow>
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <SettingRow icon={<Vibrate color={colors.primary} />} title={t("settings.haptics")}><Switch value={settings.hapticsEnabled} onValueChange={settings.setHapticsEnabled} trackColor={{ false: colors.surfaceStrong, true: colors.primarySoft }} thumbColor={settings.hapticsEnabled ? colors.primary : colors.textFaint} /></SettingRow>
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <SettingRow icon={<Smartphone color={colors.primary} />} title={t("settings.restTimer")} />
        <View style={{ flexDirection: rowDirection, flexWrap: "wrap", gap: 8 }}>{[60, 90, 120, 180].map((seconds) => <Pill key={seconds} selected={settings.defaultRestSeconds === seconds} onPress={() => settings.setDefaultRestSeconds(seconds)}>{seconds / 60 < 1 ? `${seconds}s` : `${seconds / 60}m`}</Pill>)}</View>
      </Card>
      <Button variant="danger" icon={<LogOut color={colors.white} />} onPress={() => Alert.alert(t("settings.signOut"), language === "ar" ? "متأكد إنك عايز تخرج؟" : "Are you sure?", [{ text: t("common.cancel"), style: "cancel" }, { text: t("settings.signOut"), style: "destructive", onPress: () => void signOut() }])}>{t("settings.signOut")}</Button>
      <AppText variant="caption" color="faint" align="center">Gym Crew Mobile · 0.1.0</AppText>
    </Screen>
  );
}
