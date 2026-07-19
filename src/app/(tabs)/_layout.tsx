import { Tabs } from "expo-router";
import { ChartNoAxesColumnIncreasing, Dumbbell, House, UsersRound, CalendarDays } from "lucide-react-native";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
  const { colors, resolved } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.primaryStrong,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarActiveBackgroundColor: colors.primarySofter,
        tabBarStyle: {
          position: "absolute",
          left: 14,
          right: 14,
          bottom: Math.max(insets.bottom, 10),
          backgroundColor: colors.nav,
          borderColor: colors.border,
          borderWidth: 1,
          borderTopWidth: 1,
          height: 68,
          paddingTop: 7,
          paddingBottom: 7,
          borderRadius: 24,
          shadowColor: colors.shadow,
          shadowOpacity: resolved === "dark" ? 0.42 : 0.12,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 10 },
          elevation: 14,
        },
        tabBarItemStyle: { borderRadius: 17, marginHorizontal: 2, marginVertical: 1 },
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: "800", marginTop: 1 },
        sceneStyle: { backgroundColor: colors.background, paddingBottom: 84 + Math.max(insets.bottom, 10) },
      }}
    >
      <Tabs.Screen name="home" options={{ title: t("tabs.home"), tabBarIcon: ({ color, size, focused }) => <House color={color} fill={focused ? color : "transparent"} size={focused ? size + 1 : size} strokeWidth={focused ? 2.6 : 2} /> }} />
      <Tabs.Screen name="split" options={{ title: t("tabs.split"), tabBarIcon: ({ color, size, focused }) => <CalendarDays color={color} size={focused ? size + 1 : size} strokeWidth={focused ? 2.6 : 2} /> }} />
      <Tabs.Screen name="workout" options={{ title: t("tabs.workout"), tabBarIcon: ({ color, size, focused }) => <Dumbbell color={color} size={focused ? size + 1 : size} strokeWidth={focused ? 2.6 : 2} /> }} />
      <Tabs.Screen name="crew" options={{ title: t("tabs.crew"), tabBarIcon: ({ color, size, focused }) => <UsersRound color={color} size={focused ? size + 1 : size} strokeWidth={focused ? 2.6 : 2} /> }} />
      <Tabs.Screen name="progress" options={{ title: t("tabs.progress"), tabBarIcon: ({ color, size, focused }) => <ChartNoAxesColumnIncreasing color={color} size={focused ? size + 1 : size} strokeWidth={focused ? 2.6 : 2} /> }} />
    </Tabs>
  );
}
