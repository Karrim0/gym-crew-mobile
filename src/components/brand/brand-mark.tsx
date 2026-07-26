import Svg, { Circle, Line, Path, Polygon } from "react-native-svg";
import { View, type ViewStyle } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { useAppTheme } from "@/lib/theme/use-app-theme";

export function BrandMark({ size = 42, monochrome = false, style }: { size?: number; monochrome?: boolean; style?: ViewStyle }) {
  const { colors } = useAppTheme();
  const mark = monochrome ? colors.text : colors.primary;
  return (
    <View style={[{ width: size, height: size }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d="M73.8 19.2A35 35 0 1 0 83.2 70" fill="none" stroke={mark} strokeWidth={12} strokeLinecap="round" />
        <Path d="M68 27A24 24 0 1 0 76 67" fill="none" stroke={colors.textOnDark} strokeWidth={4} strokeLinecap="round" opacity={monochrome ? 1 : 0.95} />
        <Line x1="35" y1="66" x2="66" y2="35" stroke={mark} strokeWidth={10} strokeLinecap="round" />
        <Polygon points="73,22 57,26 69,38" fill={mark} />
        <Circle cx="50" cy="50" r="5" fill={colors.hero} />
      </Svg>
    </View>
  );
}

export function BrandWordmark({ compact = false, onDark = false }: { compact?: boolean; onDark?: boolean }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: compact ? 8 : 10 }}>
      <BrandMark size={compact ? 30 : 38} />
      <AppText
        variant={compact ? "bodyStrong" : "title3"}
        numeric
        style={{ letterSpacing: compact ? 2.2 : 3.2, color: onDark ? colors.textOnDark : colors.text }}
      >
        OVRLD
      </AppText>
    </View>
  );
}
