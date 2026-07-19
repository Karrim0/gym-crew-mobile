import { Pressable, View } from "react-native";
import { Minus, Plus } from "lucide-react-native";
import { AppText } from "@/components/ui/app-text";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { spacing } from "@/lib/theme/tokens";

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
      <AppText variant="caption" color="muted" align="center">{label}</AppText>
      <View style={{ flexDirection: rowDirection, alignItems: "center", gap: 7, backgroundColor: colors.surfaceMuted, borderRadius: 18, padding: 6, borderWidth: 1, borderColor: colors.border }}>
        <Pressable
          accessibilityRole="button"
          onPress={() => change(-step)}
          style={({ pressed }) => ({ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}
        >
          <Minus color={colors.text} size={19} />
        </Pressable>
        <Pressable onPress={onEdit} style={({ pressed }) => ({ flex: 1, minWidth: 0, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.72 : 1, paddingHorizontal: spacing.xxs })}>
          <AppText variant="title2" align="center" numberOfLines={1}>{value ?? "—"}</AppText>
          {suffix ? <AppText variant="caption" color="muted" align="center">{suffix}</AppText> : null}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => change(step)}
          style={({ pressed }) => ({ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.7 : 1 })}
        >
          <Plus color={colors.text} size={19} />
        </Pressable>
      </View>
    </View>
  );
}
