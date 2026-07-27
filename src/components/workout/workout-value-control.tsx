import { Pressable, View } from "react-native";
import { Minus, Plus } from "lucide-react-native";
import { AppText } from "@/components/ui/app-text";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { radii, spacing } from "@/lib/theme/tokens";

interface WorkoutValueControlProps {
  label: string;
  value: number | null;
  suffix?: string;
  step: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  onEdit: () => void;
}

export function WorkoutValueControl({ label, value, suffix, step, min, max, onChange, onEdit }: WorkoutValueControlProps) {
  const { colors } = useAppTheme();
  const { rowDirection } = useTranslation();
  const current = value ?? min;
  const change = (delta: number) => {
    const next = Math.min(max, Math.max(min, Math.round((current + delta) * 100) / 100));
    onChange(next);
  };

  return (
    <View style={{ flex: 1, minWidth: 0, gap: 7 }}>
      <AppText variant="overline" color="muted" align="center">{label}</AppText>
      <View style={{ backgroundColor: colors.surfaceGlass, borderRadius: radii.xl, padding: 7, borderWidth: 1, borderColor: colors.glassBorder, gap: 7 }}>
        <Pressable accessibilityRole="button" onPress={onEdit} style={({ pressed }) => ({ minHeight: 60, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.72 : 1 })}>
          <View style={{ flexDirection: rowDirection, alignItems: "flex-end", gap: 5 }}>
            <AppText variant="metricLarge" numeric align="center" numberOfLines={1}>{value ?? "—"}</AppText>
            {suffix ? <AppText variant="smallBold" color="muted" style={{ paddingBottom: 7 }}>{suffix}</AppText> : null}
          </View>
        </Pressable>
        <View style={{ flexDirection: rowDirection, gap: spacing.xs }}>
          <Pressable accessibilityRole="button" accessibilityLabel={`minus ${step}`} onPress={() => change(-step)} style={({ pressed }) => ({ flex: 1, height: 46, borderRadius: 15, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.68 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] })}>
            <Minus color={colors.text} size={21} strokeWidth={2.5} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`plus ${step}`} onPress={() => change(step)} style={({ pressed }) => ({ flex: 1, height: 46, borderRadius: 15, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.78 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] })}>
            <Plus color={colors.primaryInk} size={22} strokeWidth={2.8} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
