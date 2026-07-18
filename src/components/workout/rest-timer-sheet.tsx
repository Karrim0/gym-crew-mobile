import { Modal, Pressable, View } from "react-native";
import { Minus, Pause, Play, Plus, X } from "lucide-react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { useRestTimer } from "@/lib/notifications/use-rest-timer";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { radii, spacing } from "@/lib/theme/tokens";

function clock(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.max(0, seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function RestTimerSheet({ visible, onClose, onContinue }: { visible: boolean; onClose: () => void; onContinue: () => void }) {
  const timer = useRestTimer();
  const { colors } = useAppTheme();
  const { t, language, rowDirection } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: colors.overlay }}>
        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, borderColor: colors.border, padding: spacing.xl, paddingBottom: 34, gap: spacing.lg, maxHeight: "82%" }}>
          <View style={{ flexDirection: rowDirection, justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <AppText variant="title3">{t("workout.rest")}</AppText>
              {timer.nextLabel ? <AppText color="muted" variant="small">{timer.nextLabel}</AppText> : null}
            </View>
            <Pressable onPress={onClose} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: colors.surfaceMuted }}><X color={colors.text} /></Pressable>
          </View>
          <View style={{ alignItems: "center", gap: 8 }}>
            <View style={{ width: 190, height: 190, borderRadius: 95, borderWidth: 12, borderColor: colors.primarySoft, alignItems: "center", justifyContent: "center", backgroundColor: colors.backgroundElevated }}>
              <AppText variant="display" align="center" style={{ fontVariant: ["tabular-nums"] }}>{clock(timer.remaining)}</AppText>
              <AppText variant="small" color="muted" align="center">{language === "ar" ? "خد نفسك" : "Recover"}</AppText>
            </View>
          </View>
          <View style={{ flexDirection: rowDirection, justifyContent: "center", gap: 12 }}>
            <Pressable onPress={() => void timer.addSeconds(-15)} style={{ width: 62, height: 52, borderRadius: radii.lg, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center" }}><Minus color={colors.text} /><AppText variant="caption">15</AppText></Pressable>
            <Pressable onPress={() => void (timer.paused ? timer.resume() : timer.pause())} style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
              {timer.paused ? <Play fill={colors.white} color={colors.white} /> : <Pause fill={colors.white} color={colors.white} />}
            </Pressable>
            <Pressable onPress={() => void timer.addSeconds(15)} style={{ width: 62, height: 52, borderRadius: radii.lg, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center" }}><Plus color={colors.text} /><AppText variant="caption">15</AppText></Pressable>
          </View>
          <Button onPress={() => { void timer.stop(); onContinue(); }}>{t("workout.skipRest")}</Button>
        </View>
      </View>
    </Modal>
  );
}
