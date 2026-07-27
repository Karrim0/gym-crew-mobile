import type { PropsWithChildren, ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import { Image, type ImageSource } from "expo-image";
import { radii } from "@/lib/theme/tokens";
import { useAppTheme } from "@/lib/theme/use-app-theme";

export function PhotoHero({ source, children, height = 248, style, topRight }: PropsWithChildren<{ source: ImageSource; height?: number; style?: ViewStyle; topRight?: ReactNode }>) {
  const { colors } = useAppTheme();
  return (
    <View style={[{ height, borderRadius: radii.hero, overflow: "hidden", backgroundColor: colors.hero, borderWidth: 1, borderColor: colors.borderStrong, shadowColor: colors.shadow, shadowOpacity: 0.18, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 3 }, style]}>
      <Image source={source} contentFit="cover" transition={220} style={{ position: "absolute", inset: 0 }} />
      <View pointerEvents="none" style={{ position: "absolute", inset: 0, backgroundColor: "rgba(4,5,7,0.29)" }} />
      <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "78%", backgroundColor: "rgba(5,6,8,0.68)" }} />
      <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, height: "28%", backgroundColor: "rgba(5,6,8,0.16)" }} />
      <View pointerEvents="none" style={{ position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: colors.glow, end: -74, top: -76 }} />
      {topRight ? <View style={{ position: "absolute", top: 14, end: 14 }}>{topRight}</View> : null}
      <View style={{ flex: 1, justifyContent: "flex-end", padding: 18 }}>{children}</View>
    </View>
  );
}
