import { View } from "react-native";
import { Image } from "expo-image";
import { UserRound } from "lucide-react-native";
import { AppText } from "@/components/ui/app-text";
import { useAppTheme } from "@/lib/theme/use-app-theme";

export function Avatar({ name, url, size = 48, ring = false }: { name?: string | null; url?: string | null; size?: number; ring?: boolean }) {
  const { colors } = useAppTheme();
  const initial = name?.trim().slice(0, 1).toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.primarySoft,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        borderWidth: ring ? 2 : 0,
        borderColor: ring ? colors.primary : "transparent",
      }}
    >
      {url ? (
        <Image source={{ uri: url }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={180} cachePolicy="memory-disk" />
      ) : initial ? (
        <AppText variant={size >= 72 ? "title1" : "bodyStrong"} color="primary" align="center">{initial}</AppText>
      ) : (
        <UserRound size={Math.max(20, size * 0.46)} color={colors.primary} />
      )}
    </View>
  );
}
