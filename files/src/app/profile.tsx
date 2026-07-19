import { useCallback, useMemo, useState } from "react";
import { Pressable, Switch, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { ArrowLeft, Camera, ChevronLeft, Dumbbell, LockKeyhole, Settings, ShieldCheck, Trophy } from "lucide-react-native";
import { Screen } from "@/components/ui/screen";
import { AppText } from "@/components/ui/app-text";
import { Avatar } from "@/components/profile/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { IconButton } from "@/components/ui/icon-button";
import { ScreenSkeleton } from "@/components/ui/skeleton";
import { fetchWorkoutHistory } from "@/features/workouts/workout-service";
import { updateProfile, uploadAvatar } from "@/features/profile/profile-service";
import { friendlyError } from "@/lib/supabase/errors";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { spacing } from "@/lib/theme/tokens";
import { useSessionStore } from "@/stores/session-store";
import type { WorkoutSessionWithDetails } from "@/types";

function PrivacyRow({ title, description, value, disabled, onChange }: { title: string; description: string; value: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  const { colors } = useAppTheme();
  const { rowDirection } = useTranslation();
  return (
    <View style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.md, minHeight: 64 }}>
      <View style={{ flex: 1, minWidth: 0 }}><AppText variant="bodyStrong">{title}</AppText><AppText variant="small" color="muted">{description}</AppText></View>
      <Switch value={value} disabled={disabled} onValueChange={onChange} trackColor={{ false: colors.surfaceStrong, true: colors.primarySoft }} thumbColor={value ? colors.primary : colors.textFaint} />
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { language, rowDirection, isRTL, t } = useTranslation();
  const user = useSessionStore((state) => state.user);
  const profile = useSessionStore((state) => state.profile);
  const setProfile = useSessionStore((state) => state.setProfile);
  const [history, setHistory] = useState<WorkoutSessionWithDetails[]>([]);
  const [name, setName] = useState(profile?.displayName ?? "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try { setHistory(await fetchWorkoutHistory(user.id, 100)); } finally { setLoading(false); }
  }, [user]);
  useFocusEffect(useCallback(() => { setName(profile?.displayName ?? ""); void load(); }, [load, profile?.displayName]));

  const stats = useMemo(() => {
    const completedSets = history.flatMap((session) => session.exercises.flatMap((exercise) => exercise.sets)).filter((set) => set.isCompleted);
    const bestExercises = new Set(history.flatMap((session) => session.exercises.filter((exercise) => exercise.sets.some((set) => set.isCompleted)).map((exercise) => exercise.exerciseId)));
    return { sessions: history.length, sets: completedSets.length, exercises: bestExercises.size };
  }, [history]);

  async function save(values: Parameters<typeof updateProfile>[1]) {
    if (!user || !profile) return;
    setSaving(true);
    setFeedback(null);
    try {
      const updated = await updateProfile(user.id, values);
      setProfile(updated);
      setFeedback(null);
    } catch (error) { setFeedback(friendlyError(error)); }
    finally { setSaving(false); }
  }

  async function pickAvatar() {
    if (!user) return;
    const result = await DocumentPicker.getDocumentAsync({ type: ["image/jpeg", "image/png", "image/webp"], copyToCacheDirectory: true, multiple: false });
    if (result.canceled) return;
    const asset = result.assets[0];
    setUploading(true);
    setFeedback(null);
    try {
      const url = await uploadAvatar(user.id, asset);
      await save({ avatarUrl: url });
    } catch (error) { setFeedback(friendlyError(error)); }
    finally { setUploading(false); }
  }

  if (loading && !profile) return <Screen><ScreenSkeleton /></Screen>;
  if (!profile) return <Screen><AppText color="muted">Profile unavailable.</AppText></Screen>;

  return (
    <Screen>
      <View style={{ flexDirection: rowDirection, alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
        <IconButton onPress={() => router.back()} icon={isRTL ? <ChevronLeft color={colors.text} /> : <ArrowLeft color={colors.text} />} />
        <AppText variant="title2">{language === "ar" ? "حسابي" : "My profile"}</AppText>
        <IconButton onPress={() => router.push("/settings")} icon={<Settings color={colors.text} size={20} />} />
      </View>

      <Card variant="dark" style={{ alignItems: "center", gap: spacing.md, paddingVertical: spacing.xxl, borderRadius: 30 }}>
        <View pointerEvents="none" style={{ position: "absolute", width: 210, height: 210, borderRadius: 105, backgroundColor: colors.glow, end: -90, top: -115 }} />
        <Pressable onPress={() => void pickAvatar()} disabled={uploading} style={{ position: "relative" }}>
          <Avatar name={profile.displayName} url={profile.avatarUrl} size={104} ring />
          <View style={{ position: "absolute", bottom: 0, right: 0, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, borderWidth: 3, borderColor: colors.hero, alignItems: "center", justifyContent: "center" }}><Camera size={16} color={colors.primaryInk} /></View>
        </Pressable>
        <View style={{ alignItems: "center", gap: 2 }}><AppText variant="title2" style={{ color: colors.textOnDark }} align="center">{profile.displayName}</AppText><AppText style={{ color: colors.textMuted }} align="center">{user?.email}</AppText></View>
        <Button compact variant="dark" loading={uploading} onPress={() => void pickAvatar()}>{language === "ar" ? "غيّر الصورة" : "Change photo"}</Button>
      </Card>

      <View style={{ flexDirection: rowDirection, flexWrap: "wrap", gap: spacing.sm }}>
        {[
          { icon: Dumbbell, value: stats.sessions, label: language === "ar" ? "تمرينة" : "Workouts" },
          { icon: Trophy, value: stats.sets, label: language === "ar" ? "سِت" : "Sets" },
          { icon: ShieldCheck, value: stats.exercises, label: language === "ar" ? "تمرين مختلف" : "Exercises" },
        ].map(({ icon: Icon, value, label }) => (
          <Card key={label} style={{ flexGrow: 1, flexBasis: 96, alignItems: "center", gap: 6, padding: spacing.md }}>
            <Icon size={20} color={colors.primary} /><AppText variant="title2" align="center">{value}</AppText><AppText variant="caption" color="muted" align="center">{label}</AppText>
          </Card>
        ))}
      </View>

      <Card style={{ gap: spacing.md }}>
        <AppText variant="title3">{language === "ar" ? "بيانات الحساب" : "Account details"}</AppText>
        <TextField label={t("auth.displayName")} value={name} onChangeText={setName} maxLength={50} />
        <Button loading={saving} disabled={name.trim() === profile.displayName || name.trim().length < 2} onPress={() => void save({ displayName: name })}>{t("common.save")}</Button>
        {feedback ? <AppText variant="small" color="danger">{feedback}</AppText> : null}
      </Card>

      <Card style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.sm }}><LockKeyhole color={colors.primary} /><View style={{ flex: 1 }}><AppText variant="title3">{language === "ar" ? "الخصوصية داخل الجروب" : "Crew privacy"}</AppText><AppText variant="small" color="muted">{language === "ar" ? "اختار الأرقام اللي أصحابك يقدروا يشوفوها." : "Choose what your crew can see."}</AppText></View></View>
        <PrivacyRow title={language === "ar" ? "ملخص التمرينات" : "Workout summary"} description={language === "ar" ? "عدد التمرينات ونسبة الالتزام." : "Session count and adherence."} value={profile.shareWorkoutSummary} disabled={saving} onChange={(value) => void save({ shareWorkoutSummary: value })} />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <PrivacyRow title={language === "ar" ? "الأرقام القياسية" : "Personal records"} description={language === "ar" ? "عدد الـPRs من غير تفاصيل حساسة." : "PR count without sensitive details."} value={profile.sharePersonalRecords} disabled={saving} onChange={(value) => void save({ sharePersonalRecords: value })} />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <PrivacyRow title={language === "ar" ? "الأوزان" : "Weights"} description={language === "ar" ? "السماح بعرض أوزانك داخل نشاط الجروب." : "Allow weights to appear in crew activity."} value={profile.shareWeights} disabled={saving} onChange={(value) => void save({ shareWeights: value })} />
      </Card>
    </Screen>
  );
}
