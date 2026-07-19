import { useEffect, useState } from "react";
import { Animated, View, type ViewStyle } from "react-native";
import { useAppTheme } from "@/lib/theme/use-app-theme";

export function Skeleton({ style }: { style?: ViewStyle }) {
  const { colors } = useAppTheme();
  const [opacity] = useState(() => new Animated.Value(0.45));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[{ backgroundColor: colors.surfaceStrong, borderRadius: 12, opacity }, style]} />;
}

export function ScreenSkeleton() {
  return (
    <View style={{ gap: 16, paddingTop: 8 }}>
      <Skeleton style={{ width: "54%", height: 30 }} />
      <Skeleton style={{ width: "78%", height: 18 }} />
      <Skeleton style={{ width: "100%", height: 188, borderRadius: 24 }} />
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Skeleton style={{ flex: 1, height: 112, borderRadius: 22 }} />
        <Skeleton style={{ flex: 1, height: 112, borderRadius: 22 }} />
      </View>
      <Skeleton style={{ width: "100%", height: 96, borderRadius: 22 }} />
    </View>
  );
}
