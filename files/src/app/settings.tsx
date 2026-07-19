import { useCallback, useState, type ReactNode } from "react";
import { Alert, Linking, Switch, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import {
  ArrowLeft,
  Bell,
  BellRing,
  ChevronLeft,
  Cloud,
  Languages,
  LogOut,
  Moon,
  RefreshCw,
  Scale,
  Smartphone,
  Sun,
  Vibrate,
  Volume2,
} from "lucide-react-native";
import { Screen } from "@/components/ui/screen";
import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { useTranslation } from "@/lib/localization/use-translation";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import {
  getNotificationPermissionState,
  requestNotificationPermission,
  sendTestNotification,
  type NotificationPermissionState,
} from "@/lib/notifications/rest-notifications";
import { useSettingsStore, type ColorMode, type Language, type WeightUnit } from "@/stores/settings-store";
import { useSessionStore } from "@/stores/session-store";
import { useConnectivityStore } from "@/stores/connectivity-store";
import { spacing } from "@/lib/theme/tokens";
import { friendlyError } from "@/lib/supabase/errors";

function SettingRow({ icon, title, description, children }: { icon: ReactNode; title: string; description?: string; children?: ReactNode }) {
  const { rowDirection } = useTranslation();
  const { colors } = useAppTheme();
  return (
    <View style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md, minHeight: 58 }}>
      <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }}>{icon}</View>
      <View style={{ flex: 1, minWidth: 0 }}><AppText variant="bodyStrong">{title}</AppText>{description ? <AppText variant="small" color="muted">{description}</AppText> : null}</View>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { t, language, rowDirection, isRTL } = useTranslation();
  const settings = useSettingsStore();
  const signOut = useSessionStore((state) => state.signOutLocal);
  const pending = useConnectivityStore((state) => state.pending);
  const syncing = useConnectivityStore((state) => state.syncing);
  const lastError = useConnectivityStore((state) => state.lastError);
  const isOnline = useConnectivityStore((state) => state.isConnected && state.isInternetReachable);
  const syncNow = useConnectivityStore((state) => state.syncNow);
  const [permission, setPermission] = useState<NotificationPermissionState>("undetermined");
  const [testing, setTesting] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);

  const refreshPermission = useCallback(async () => setPermission(await getNotificationPermissionState()), []);
  useFocusEffect(useCallback(() => { void refreshPermission(); }, [refreshPermission]));

  const themes: { value: ColorMode; label: string }[] = [
    { value: "system", label: t("settings.system") },
    { value: "light", label: t("settings.light") },
    { value: "dark", label: t("settings.dark") },
  ];

  async function toggleNotifications(enabled: boolean) {
    if (!enabled) {
      settings.setNotificationsEnabled(false);
      return;
    }
    const granted = await requestNotificationPermission();
    await refreshPermission();
    if (!granted) {
      settings.setNotificationsEnabled(false);
      setNotificationMessage(language === "ar" ? "الإشعارات مقفولة من إعدادات الموبايل." : "Notifications are blocked in system settings.");
      return;
    }
    settings.setNotificationsEnabled(true);
    setNotificationMessage(null);
  }

  async function testNotification() {
    setTesting(true);
    try {
      const granted = await requestNotificationPermission();
      await refreshPermission();
      if (!granted) {
        setNotificationMessage(language === "ar" ? "فعّل الإشعارات من إعدادات الموبايل الأول." : "Enable notifications in system settings first.");
        return;
      }
      await sendTestNotification(language, settings.soundEnabled, settings.hapticsEnabled);
      setNotificationMessage(language === "ar" ? "التنبيه التجريبي هيظهر خلال ثانيتين." : "A test notification will appear in two seconds.");
    } finally { setTesting(false); }
  }

  return (
    <Screen>
      <View style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.sm }}>
        <IconButton onPress={() => router.back()} icon={isRTL ? <ChevronLeft color={colors.text} /> : <ArrowLeft color={colors.text} />} />
        <View style={{ flex: 1 }}><AppText variant="title2">{t("settings.title")}</AppText><AppText variant="small" color="muted">{language === "ar" ? "ظبط التطبيق على طريقتك." : "Make the app work your way."}</AppText></View>
      </View>

      <Card style={{ gap: spacing.lg }}>
        <SettingRow icon={<Languages color={colors.primary} />} title={t("settings.language")} />
        <View style={{ flexDirection: rowDirection, flexWrap: "wrap", gap: 8 }}>{(["ar", "en"] as Language[]).map((value) => <Pill key={value} selected={language === value} onPress={() => settings.setLanguage(value)}>{value === "ar" ? t("settings.arabic") : t("settings.english")}</Pill>)}</View>
      </Card>

      <Card style={{ gap: spacing.lg }}>
        <SettingRow icon={settings.colorMode === "dark" ? <Moon color={colors.primary} /> : <Sun color={colors.primary} />} title={t("settings.appearance")} />
        <View style={{ flexDirection: rowDirection, flexWrap: "wrap", gap: 8 }}>{themes.map((item) => <Pill key={item.value} selected={settings.colorMode === item.value} onPress={() => settings.setColorMode(item.value)}>{item.label}</Pill>)}</View>
      </Card>

      <Card style={{ gap: spacing.lg }}>
        <SettingRow icon={<Bell color={colors.primary} />} title={language === "ar" ? "إشعارات الراحة" : "Rest notifications"} description={permission === "granted" ? (language === "ar" ? "الإذن متفعل" : "Permission granted") : permission === "denied" ? (language === "ar" ? "مقفولة من إعدادات الموبايل" : "Blocked in system settings") : (language === "ar" ? "هنطلب الإذن وقت التفعيل" : "Permission will be requested when enabled")}>
          <Switch value={settings.notificationsEnabled && permission !== "denied"} onValueChange={(value) => void toggleNotifications(value)} trackColor={{ false: colors.surfaceStrong, true: colors.primarySoft }} thumbColor={settings.notificationsEnabled ? colors.primary : colors.textFaint} />
        </SettingRow>
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <SettingRow icon={<Volume2 color={colors.primary} />} title={t("settings.sound")}><Switch value={settings.soundEnabled} onValueChange={settings.setSoundEnabled} trackColor={{ false: colors.surfaceStrong, true: colors.primarySoft }} thumbColor={settings.soundEnabled ? colors.primary : colors.textFaint} /></SettingRow>
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <SettingRow icon={<Vibrate color={colors.primary} />} title={t("settings.haptics")}><Switch value={settings.hapticsEnabled} onValueChange={settings.setHapticsEnabled} trackColor={{ false: colors.surfaceStrong, true: colors.primarySoft }} thumbColor={settings.hapticsEnabled ? colors.primary : colors.textFaint} /></SettingRow>
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <SettingRow icon={<Smartphone color={colors.primary} />} title={t("settings.restTimer")} />
        <View style={{ flexDirection: rowDirection, flexWrap: "wrap", gap: 8 }}>{[60, 90, 120, 180, 240, 300].map((seconds) => <Pill key={seconds} selected={settings.defaultRestSeconds === seconds} onPress={() => settings.setDefaultRestSeconds(seconds)}>{seconds < 60 ? `${seconds}s` : `${seconds / 60}m`}</Pill>)}</View>
        <Button variant="secondary" loading={testing} icon={<BellRing color={colors.primary} size={18} />} onPress={() => void testNotification()}>{language === "ar" ? "جرّب التنبيه" : "Test notification"}</Button>
        {notificationMessage ? <AppText variant="small" color={permission === "denied" ? "warning" : "muted"}>{notificationMessage}</AppText> : null}
        {permission === "denied" ? <Button variant="ghost" onPress={() => void Linking.openSettings()}>{language === "ar" ? "افتح إعدادات الموبايل" : "Open system settings"}</Button> : null}
      </Card>

      <Card style={{ gap: spacing.md }}>
        <SettingRow icon={<Cloud color={colors.primary} />} title={language === "ar" ? "المزامنة والأوفلاين" : "Sync & offline"} description={!isOnline ? (language === "ar" ? "أنت أوفلاين، كل حاجة محفوظة محليًا." : "You are offline; changes are saved locally.") : pending ? (language === "ar" ? `${pending} تعديل مستني المزامنة.` : `${pending} changes waiting to sync.`) : (language === "ar" ? "كل بياناتك متزامنة." : "All data is synced.")} />
        {lastError ? <AppText variant="small" color="danger">{friendlyError(new Error(lastError), language === "ar" ? "المزامنة متأخرة شوية. جرّب تاني لما النت يستقر." : "Sync is delayed. Try again when the connection is stable.")}</AppText> : null}
        <Button variant="secondary" disabled={!isOnline || syncing} loading={syncing} icon={<RefreshCw color={colors.primary} size={18} />} onPress={() => void syncNow()}>{language === "ar" ? "زامن دلوقتي" : "Sync now"}</Button>
      </Card>

      <Card style={{ gap: spacing.md }}>
        <SettingRow icon={<Scale color={colors.primary} />} title={t("settings.units")}>
          <View style={{ flexDirection: rowDirection, gap: 6 }}>{(["kg", "lb"] as WeightUnit[]).map((unit) => <Pill key={unit} selected={settings.weightUnit === unit} onPress={() => settings.setWeightUnit(unit)}>{unit}</Pill>)}</View>
        </SettingRow>
      </Card>

      <Button variant="danger" icon={<LogOut color={colors.white} />} onPress={() => Alert.alert(t("settings.signOut"), language === "ar" ? "متأكد إنك عايز تخرج؟" : "Are you sure?", [{ text: t("common.cancel"), style: "cancel" }, { text: t("settings.signOut"), style: "destructive", onPress: () => void signOut() }])}>{t("settings.signOut")}</Button>
      <AppText variant="caption" color="faint" align="center">Gym Crew Mobile · 0.5.0</AppText>
    </Screen>
  );
}
