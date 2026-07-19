import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { AuthShell } from "@/components/layout/auth-shell";
import { TextField } from "@/components/ui/text-field";
import { Button } from "@/components/ui/button";
import { AppText } from "@/components/ui/app-text";
import { signIn } from "@/features/auth/auth-service";
import { friendlyError } from "@/lib/supabase/errors";
import { env } from "@/config/app";
import { useTranslation } from "@/lib/localization/use-translation";
import { useSettingsStore } from "@/stores/settings-store";

export default function LoginScreen() {
  const { t, rowDirection } = useTranslation();
  const language = useSettingsStore((state) => state.language);
  const setLanguage = useSettingsStore((state) => state.setLanguage);
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!env.isConfigured()) {
      Alert.alert(t("common.error"), t("auth.invalidConfig"));
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace("/");
    } catch (error) {
      Alert.alert(t("common.error"), friendlyError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <View style={{ flexDirection: rowDirection, justifyContent: "flex-end" }}>
        <Pressable onPress={() => setLanguage(language === "ar" ? "en" : "ar")}>
          <AppText variant="smallBold" color="primary">{language === "ar" ? "English" : "العربية"}</AppText>
        </Pressable>
      </View>
      <TextField label={t("auth.email")} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <TextField label={t("auth.password")} value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />
      <Button loading={loading} onPress={submit}>{t("auth.login")}</Button>
      <Link href="/(auth)/forgot-password" asChild>
        <Pressable><AppText color="primary" align="center">{t("auth.forgot")}</AppText></Pressable>
      </Link>
      <View style={{ flexDirection: rowDirection, justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
        <AppText color="muted">{t("auth.noAccount")}</AppText>
        <Link href="/(auth)/register" asChild><Pressable><AppText variant="bodyStrong" color="primary">{t("auth.register")}</AppText></Pressable></Link>
      </View>
    </AuthShell>
  );
}
