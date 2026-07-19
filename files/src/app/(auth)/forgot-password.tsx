import { useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { AuthShell } from "@/components/layout/auth-shell";
import { TextField } from "@/components/ui/text-field";
import { Button } from "@/components/ui/button";
import { sendPasswordReset } from "@/features/auth/auth-service";
import { friendlyError } from "@/lib/supabase/errors";
import { useTranslation } from "@/lib/localization/use-translation";

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit() {
    setLoading(true);
    try {
      await sendPasswordReset(email);
      Alert.alert(t("common.done"), t("auth.resetSent"));
      router.back();
    } catch (error) {
      Alert.alert(t("common.error"), friendlyError(error));
    } finally {
      setLoading(false);
    }
  }
  return (
    <AuthShell>
      <TextField label={t("auth.email")} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Button loading={loading} onPress={submit}>{t("auth.reset")}</Button>
      <Button variant="ghost" onPress={() => router.back()}>{t("common.back")}</Button>
    </AuthShell>
  );
}
