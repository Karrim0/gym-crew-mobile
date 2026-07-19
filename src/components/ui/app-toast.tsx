import { Pressable, View } from "react-native";
import { CheckCircle2, Info, TriangleAlert, XCircle } from "lucide-react-native";
import { AppText } from "./app-text";
import { spacing } from "@/lib/theme/tokens";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";

type ToastTone = "success" | "info" | "warning" | "danger";

interface AppToastProps {
  visible: boolean;
  message: string;
  tone?: ToastTone;
  actionLabel?: string;
  onAction?: () => void;
}

export function AppToast({ visible, message, tone = "success", actionLabel, onAction }: AppToastProps) {
  const { colors } = useAppTheme();
  const { rowDirection } = useTranslation();
  if (!visible) return null;

  const color = tone === "success" ? colors.success : tone === "warning" ? colors.warning : tone === "danger" ? colors.danger : colors.info;
  const background = tone === "success" ? colors.successSoft : tone === "warning" ? colors.warningSoft : tone === "danger" ? colors.dangerSoft : colors.infoSoft;
  const Icon = tone === "success" ? CheckCircle2 : tone === "warning" ? TriangleAlert : tone === "danger" ? XCircle : Info;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: spacing.md,
        right: spacing.md,
        bottom: spacing.lg,
        zIndex: 50,
      }}
    >
      <View style={{ flexDirection: rowDirection, alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md, minHeight: 54, borderRadius: 18, backgroundColor: background, borderWidth: 1, borderColor: color }}>
        <Icon color={color} size={21} />
        <AppText variant="smallBold" style={{ flex: 1 }}>{message}</AppText>
        {actionLabel && onAction ? (
          <Pressable onPress={onAction} style={({ pressed }) => ({ paddingHorizontal: 8, paddingVertical: 7, opacity: pressed ? 0.65 : 1 })}>
            <AppText variant="smallBold" style={{ color }}>{actionLabel}</AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
