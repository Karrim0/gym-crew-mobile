import type { ReactNode } from "react";
import { Tabs } from "expo-router";
import { BarChart3, Dumbbell, House, UserRound, UsersRound, CalendarDays } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function TabIcon({ focused, icon }: { focused: boolean; icon: (color: string) => ReactNode }) {
  const { colors } = useAppTheme();
  const color = focused ? colors.primary : colors.textFaint;
  return (
    <View style={{ width: 34, height: 28, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: focused ? colors.primaryMuted : "transparent" }}>
      {icon(color)}
      {focused ? <View style={{ position: "absolute", bottom: -5, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary }} /> : null}
    </View>
  );
}

export default function TabsLayout() {
  const { colors, resolved } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { language } = useTranslation();
  const bottom = Math.max(insets.bottom, 8);

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            <BlurView intensity={resolved === "dark" ? 30 : 52} tint={resolved} style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.nav }]} />
          </View>
        ),
        tabBarStyle: {
          position: "absolute",
          left: 18,
          right: 18,
          bottom,
          height: 62,
          paddingTop: 5,
          paddingBottom: 5,
          backgroundColor: "transparent",
          borderColor: colors.glassBorder,
          borderWidth: 1,
          borderTopWidth: 1,
          borderRadius: 24,
          shadowColor: colors.shadow,
          shadowOpacity: resolved === "dark" ? 0.42 : 0.12,
          shadowRadius: 26,
          shadowOffset: { width: 0, height: 13 },
          elevation: 16,
          overflow: "hidden",
        },
        tabBarItemStyle: { borderRadius: 16, marginHorizontal: 2 },
        tabBarLabelStyle: { fontFamily: "Alexandria_600SemiBold", fontSize: 10, lineHeight: 14, marginTop: 1 },
        sceneStyle: { backgroundColor: colors.background, paddingBottom: 76 + bottom },
      }}
    >
      <Tabs.Screen name="home" options={{ title: language === "ar" ? "الرئيسية" : "Home", tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={(color) => <House color={color} fill={focused ? color : "transparent"} size={19} strokeWidth={focused ? 2.5 : 2.1} />} /> }} />
      <Tabs.Screen name="workout" options={{ title: language === "ar" ? "التمرين" : "Workout", tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={(color) => <Dumbbell color={color} size={20} strokeWidth={focused ? 2.7 : 2.1} />} /> }} />
      <Tabs.Screen name="progress" options={{ title: language === "ar" ? "تطوري" : "Progress", tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={(color) => <BarChart3 color={color} size={19} strokeWidth={focused ? 2.7 : 2.1} />} /> }} />
      <Tabs.Screen name="profile" options={{ title: language === "ar" ? "حسابي" : "Profile", tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={(color) => <UserRound color={color} fill={focused ? color : "transparent"} size={19} strokeWidth={focused ? 2.5 : 2.1} />} /> }} />
      <Tabs.Screen name="split" options={{ href: null, tabBarIcon: ({ color }) => <CalendarDays color={color} /> }} />
      <Tabs.Screen name="crew" options={{ href: null, tabBarIcon: ({ color }) => <UsersRound color={color} /> }} />
    </Tabs>
  );
}
