import type { PropsWithChildren, ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import { Image, type ImageSource } from "expo-image";
import { radii } from "@/lib/theme/tokens";
import { useAppTheme } from "@/lib/theme/use-app-theme";

export function PhotoHero({ source, children, height = 260, style, topRight }: PropsWithChildren<{ source: ImageSource; height?: number; style?: ViewStyle; topRight?: ReactNode }>) {
  const { colors } = useAppTheme();
  return (
    <View style={[{ height, borderRadius: radii.hero, overflow: "hidden", backgroundColor: colors.hero, borderWidth: 1, borderColor: colors.borderStrong }, style]}>
      <Image source={source} contentFit="cover" transition={220} style={{ position: "absolute", inset: 0 }} />
      <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(4,5,7,0.48)" }} />
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "72%", backgroundColor: "rgba(5,6,8,0.60)" }} />
      <View pointerEvents="none" style={{ position: "absolute", width: 190, height: 190, borderRadius: 95, backgroundColor: colors.glow, end: -70, top: -70 }} />
      {topRight ? <View style={{ position: "absolute", top: 16, end: 16 }}>{topRight}</View> : null}
      <View style={{ flex: 1, justifyContent: "flex-end", padding: 20 }}>{children}</View>
    </View>
  );
}
