import { Tabs } from "expo-router";
import { ChartNoAxesColumnIncreasing, Dumbbell, House, UsersRound, CalendarDays } from "lucide-react-native";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
  const { colors, resolved } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const bottom = Math.max(insets.bottom, 10);
  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.primaryStrong,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          position: "absolute",
          left: 12,
          right: 12,
          bottom,
          backgroundColor: colors.nav,
          borderColor: colors.borderStrong,
          borderWidth: 1,
          borderTopWidth: 1,
          height: 72,
          paddingTop: 7,
          paddingBottom: 7,
          borderRadius: 25,
          shadowColor: colors.shadow,
          shadowOpacity: resolved === "dark" ? 0.5 : 0.14,
          shadowRadius: 28,
          shadowOffset: { width: 0, height: 12 },
          elevation: 18,
        },
        tabBarItemStyle: { borderRadius: 18, marginHorizontal: 1, marginVertical: 0 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "800", marginTop: 2 },
        sceneStyle: { backgroundColor: colors.background, paddingBottom: 88 + bottom },
      }}
    >
      <Tabs.Screen name="home" options={{ title: t("tabs.home"), tabBarIcon: ({ color, size, focused }) => <House color={color} fill={focused ? color : "transparent"} size={focused ? size + 2 : size} strokeWidth={focused ? 2.6 : 2} /> }} />
      <Tabs.Screen name="split" options={{ title: t("tabs.split"), tabBarIcon: ({ color, size, focused }) => <CalendarDays color={color} size={focused ? size + 2 : size} strokeWidth={focused ? 2.6 : 2} /> }} />
      <Tabs.Screen name="workout" options={{ title: t("tabs.workout"), tabBarIcon: ({ color, size, focused }) => <Dumbbell color={color} size={focused ? size + 3 : size + 1} strokeWidth={focused ? 2.8 : 2.1} /> }} />
      <Tabs.Screen name="crew" options={{ title: t("tabs.crew"), tabBarIcon: ({ color, size, focused }) => <UsersRound color={color} size={focused ? size + 2 : size} strokeWidth={focused ? 2.6 : 2} /> }} />
      <Tabs.Screen name="progress" options={{ title: t("tabs.progress"), tabBarIcon: ({ color, size, focused }) => <ChartNoAxesColumnIncreasing color={color} size={focused ? size + 2 : size} strokeWidth={focused ? 2.6 : 2} /> }} />
    </Tabs>
  );
}
