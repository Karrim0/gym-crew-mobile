import { Tabs } from "expo-router";
import { BarChart3, Dumbbell, House, UserRound, UsersRound, CalendarDays } from "lucide-react-native";
import { View } from "react-native";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function ActiveDot({ focused }: { focused: boolean }) {
  const { colors } = useAppTheme();
  return focused ? <View style={{ position: "absolute", top: -3, width: 18, height: 3, borderRadius: 2, backgroundColor: colors.primary }} /> : null;
}

export default function TabsLayout() {
  const { colors } = useAppTheme();
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
        tabBarStyle: {
          position: "absolute",
          left: 16,
          right: 16,
          bottom,
          height: 68,
          paddingTop: 8,
          paddingBottom: 6,
          backgroundColor: colors.nav,
          borderColor: colors.borderStrong,
          borderWidth: 1,
          borderTopWidth: 1,
          borderRadius: 23,
          shadowColor: colors.shadow,
          shadowOpacity: 0.42,
          shadowRadius: 22,
          shadowOffset: { width: 0, height: 11 },
          elevation: 14,
        },
        tabBarItemStyle: { borderRadius: 17, marginHorizontal: 3 },
        tabBarLabelStyle: { fontFamily: "Alexandria_600SemiBold", fontSize: 10, lineHeight: 14, marginTop: 1 },
        sceneStyle: { backgroundColor: colors.background, paddingBottom: 80 + bottom },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: language === "ar" ? "الرئيسية" : "Home",
          tabBarIcon: ({ color, focused }) => <View style={{ alignItems: "center", justifyContent: "center" }}><ActiveDot focused={focused} /><House color={color} fill={focused ? color : "transparent"} size={22} strokeWidth={focused ? 2.6 : 2.1} /></View>,
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: language === "ar" ? "التمرين" : "Workout",
          tabBarIcon: ({ color, focused }) => <View style={{ alignItems: "center", justifyContent: "center" }}><ActiveDot focused={focused} /><Dumbbell color={color} size={focused ? 24 : 22} strokeWidth={focused ? 2.8 : 2.1} /></View>,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: language === "ar" ? "التقدم" : "Progress",
          tabBarIcon: ({ color, focused }) => <View style={{ alignItems: "center", justifyContent: "center" }}><ActiveDot focused={focused} /><BarChart3 color={color} size={22} strokeWidth={focused ? 2.8 : 2.1} /></View>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: language === "ar" ? "حسابي" : "Profile",
          tabBarIcon: ({ color, focused }) => <View style={{ alignItems: "center", justifyContent: "center" }}><ActiveDot focused={focused} /><UserRound color={color} fill={focused ? color : "transparent"} size={22} strokeWidth={focused ? 2.6 : 2.1} /></View>,
        }}
      />
      <Tabs.Screen name="split" options={{ href: null, tabBarIcon: ({ color }) => <CalendarDays color={color} /> }} />
      <Tabs.Screen name="crew" options={{ href: null, tabBarIcon: ({ color }) => <UsersRound color={color} /> }} />
    </Tabs>
  );
}
