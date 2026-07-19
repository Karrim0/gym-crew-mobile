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
      <AppText variant="smallBold" color="muted" align="center">{label}</AppText>
      <View style={{ backgroundColor: colors.surfaceMuted, borderRadius: 22, padding: 8, borderWidth: 1, borderColor: colors.border, gap: 8 }}>
        <Pressable onPress={onEdit} style={({ pressed }) => ({ minHeight: 68, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.72 : 1 })}>
          <AppText variant="display" align="center" numberOfLines={1}>{value ?? "—"}</AppText>
          {suffix ? <AppText variant="caption" color="muted" align="center">{suffix}</AppText> : null}
        </Pressable>
        <View style={{ flexDirection: rowDirection, gap: spacing.xs }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => change(-step)}
            style={({ pressed }) => ({ flex: 1, height: 44, borderRadius: 15, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.68 : 1 })}
          >
            <Minus color={colors.text} size={21} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => change(step)}
            style={({ pressed }) => ({ flex: 1, height: 44, borderRadius: 15, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.76 : 1 })}
          >
            <Plus color={colors.black} size={21} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
