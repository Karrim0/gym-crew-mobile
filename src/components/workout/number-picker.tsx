import { Pressable, ScrollView, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { radii, spacing } from "@/lib/theme/tokens";

export function NumberPicker({ values, value, onChange, suffix, horizontal = false, lastValue }: {
  values: number[]; value: number | null; onChange: (value: number) => void; suffix?: string; horizontal?: boolean; lastValue?: number | null;
}) {
  const { colors } = useAppTheme();
  const content = values.map((item) => {
    const selected = value === item;
    const previous = lastValue === item;
    return (
      <Pressable
        key={item}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={() => onChange(item)}
        style={({ pressed }) => ({
          minWidth: horizontal ? 76 : 58,
          minHeight: 58,
          paddingHorizontal: 12,
          paddingVertical: 9,
          borderRadius: radii.lg,
          borderWidth: 1.5,
          borderColor: selected ? colors.primary : previous ? colors.primaryStrong : colors.border,
          backgroundColor: selected ? colors.primary : previous ? colors.primarySoft : colors.surface,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? .78 : 1,
          gap: 2,
        })}
      >
        <AppText variant="bodyStrong" align="center" style={{ color: selected ? colors.white : colors.text }}>{item}</AppText>
        {suffix ? <AppText variant="caption" align="center" style={{ color: selected ? colors.white : colors.textMuted }}>{suffix}</AppText> : null}
        {previous ? <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: selected ? colors.white : colors.primary }} /> : null}
      </Pressable>
    );
  });

  if (horizontal) {
    return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: 1 }}>{content}</ScrollView>;
  }
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center" }}>{content}</View>;
}
