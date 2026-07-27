import type { PropsWithChildren, ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import { Image, type ImageSource } from "expo-image";
import { radii } from "@/lib/theme/tokens";
import { useAppTheme } from "@/lib/theme/use-app-theme";

type OverlayTone = "soft" | "balanced" | "strong";

export function PhotoHero({ source, children, height = 220, style, topRight, tone = "balanced" }: PropsWithChildren<{ source: ImageSource; height?: number; style?: ViewStyle; topRight?: ReactNode; tone?: OverlayTone }>) {
  const { colors } = useAppTheme();
  const baseOverlay = tone === "soft" ? "rgba(4,5,7,0.12)" : tone === "strong" ? "rgba(4,5,7,0.36)" : "rgba(4,5,7,0.22)";
  const bottomOverlay = tone === "soft" ? "rgba(5,6,8,0.52)" : tone === "strong" ? "rgba(5,6,8,0.78)" : "rgba(5,6,8,0.64)";
  return (
    <View style={[{ height, borderRadius: radii.hero, overflow: "hidden", backgroundColor: colors.hero, borderWidth: 1, borderColor: colors.borderStrong, shadowColor: colors.shadow, shadowOpacity: 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: 13 }, elevation: 4 }, style]}>
      <Image source={source} contentFit="cover" transition={220} style={{ position: "absolute", inset: 0 }} />
      <View pointerEvents="none" style={{ position: "absolute", inset: 0, backgroundColor: baseOverlay }} />
      <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "72%", backgroundColor: bottomOverlay }} />
      <View pointerEvents="none" style={{ position: "absolute", width: 190, height: 190, borderRadius: 95, backgroundColor: colors.glow, end: -86, top: -88 }} />
      {topRight ? <View style={{ position: "absolute", top: 14, end: 14 }}>{topRight}</View> : null}
      <View style={{ flex: 1, justifyContent: "flex-end", padding: 18 }}>{children}</View>
    </View>
  );
}
