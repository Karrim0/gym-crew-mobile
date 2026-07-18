import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { AuthShell } from "@/components/layout/auth-shell";
import { TextField } from "@/components/ui/text-field";
import { Button } from "@/components/ui/button";
import { AppText } from "@/components/ui/app-text";
import { signUp } from "@/features/auth/auth-service";
import { friendlyError } from "@/lib/supabase/errors";
import { useTranslation } from "@/lib/localization/use-translation";

export default function RegisterScreen() {
  const { t, rowDirection } = useTranslation();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (name.trim().length < 2 || password.length < 6) {
      Alert.alert(t("common.error"), "راجع الاسم والباسورد. الباسورد لازم يبقى 6 حروف على الأقل.");
      return;
    }
    setLoading(true);
    try {
      const result = await signUp(name, email, password);
      if (!result.session) {
        Alert.alert(t("common.done"), "راجع إيميلك وفعّل الحساب، وبعدها سجّل دخول.");
        router.replace("/(auth)/login");
      } else {
        router.replace("/");
      }
    } catch (error) {
      Alert.alert(t("common.error"), friendlyError(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <TextField label={t("auth.displayName")} value={name} onChangeText={setName} autoComplete="name" />
      <TextField label={t("auth.email")} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <TextField label={t("auth.password")} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
      <Button loading={loading} onPress={submit}>{t("auth.register")}</Button>
      <View style={{ flexDirection: rowDirection, justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
        <AppText color="muted">{t("auth.hasAccount")}</AppText>
        <Link href="/(auth)/login" asChild><Pressable><AppText variant="bodyStrong" color="primary">{t("auth.login")}</AppText></Pressable></Link>
      </View>
    </AuthShell>
  );
}
