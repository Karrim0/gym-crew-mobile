import { View } from "react-native";
import { useAppTheme } from "@/lib/theme/use-app-theme";

export function ProgressBar({ value, height = 8, tone = "primary" }: { value: number; height?: number; tone?: "primary" | "success" | "warning" }) {
  const { colors } = useAppTheme();
  const foreground = tone === "success" ? colors.success : tone === "warning" ? colors.warning : colors.primary;
  return (
    <View style={{ height, borderRadius: height / 2, overflow: "hidden", backgroundColor: colors.surfaceStrong }}>
      <View style={{ height: "100%", width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: foreground, borderRadius: height / 2 }} />
    </View>
  );
}
