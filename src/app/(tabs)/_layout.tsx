import type { ReactNode } from "react";
import { Tabs } from "expo-router";
import { BarChart3, CalendarDays, Dumbbell, House, UserRound, UsersRound } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";

function TabIcon({ focused, icon }: { focused: boolean; icon: (color: string) => ReactNode }) {
  const { colors } = useAppTheme();
  const color = focused ? colors.primary : colors.textFaint;
  return (
    <View style={{ width: 34, height: 30, borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
      {icon(color)}
      {focused ? <View style={{ position: "absolute", bottom: -4, width: 16, height: 3, borderRadius: 999, backgroundColor: colors.primary }} /> : null}
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
            <BlurView intensity={resolved === "dark" ? 34 : 54} tint={resolved} style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.nav }]} />
          </View>
        ),
        tabBarStyle: {
          position: "absolute",
          left: 12,
          right: 12,
          bottom,
          height: 66,
          paddingTop: 6,
          paddingBottom: 6,
          backgroundColor: "transparent",
          borderColor: colors.glassBorder,
          borderWidth: 1,
          borderTopWidth: 1,
          borderRadius: 24,
          shadowColor: colors.shadow,
          shadowOpacity: resolved === "dark" ? 0.46 : 0.12,
          shadowRadius: 26,
          shadowOffset: { width: 0, height: 13 },
          elevation: 16,
          overflow: "hidden",
        },
        tabBarItemStyle: { borderRadius: 16, marginHorizontal: 0 },
        tabBarLabelStyle: { fontFamily: "Alexandria_600SemiBold", fontSize: 9.5, lineHeight: 14, marginTop: 1 },
        sceneStyle: { backgroundColor: colors.background, paddingBottom: 80 + bottom },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: language === "ar" ? "النهارده" : "Today",
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={(color) => <House color={color} fill={focused ? color : "transparent"} size={19} strokeWidth={focused ? 2.5 : 2.1} />} />,
        }}
      />
      <Tabs.Screen
        name="split"
        options={{
          title: language === "ar" ? "الخطة" : "Plan",
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={(color) => <CalendarDays color={color} size={19} strokeWidth={focused ? 2.6 : 2.1} />} />,
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: language === "ar" ? "تمرّن" : "Train",
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={(color) => <Dumbbell color={color} size={20} strokeWidth={focused ? 2.8 : 2.1} />} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: language === "ar" ? "التقدم" : "Progress",
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={(color) => <BarChart3 color={color} size={19} strokeWidth={focused ? 2.7 : 2.1} />} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: language === "ar" ? "حسابي" : "Profile",
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} icon={(color) => <UserRound color={color} fill={focused ? color : "transparent"} size={19} strokeWidth={focused ? 2.5 : 2.1} />} />,
        }}
      />
      <Tabs.Screen name="crew" options={{ href: null, tabBarIcon: ({ color }) => <UsersRound color={color} /> }} />
    </Tabs>
  );
}
