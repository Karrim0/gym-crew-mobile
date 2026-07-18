import { Tabs } from "expo-router";
import { ChartNoAxesColumnIncreasing, Dumbbell, House, UsersRound, CalendarDays } from "lucide-react-native";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.nav,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 66 + Math.max(insets.bottom, 10),
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 10),
          shadowColor: colors.shadow,
          shadowOpacity: 0.1,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: -5 },
          elevation: 12,
        },
        tabBarItemStyle: { borderRadius: 16, marginHorizontal: 2 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "800", marginTop: 2 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="home" options={{ title: t("tabs.home"), tabBarIcon: ({ color, size, focused }) => <House color={color} size={focused ? size + 2 : size} strokeWidth={focused ? 2.7 : 2} /> }} />
      <Tabs.Screen name="split" options={{ title: t("tabs.split"), tabBarIcon: ({ color, size, focused }) => <CalendarDays color={color} size={focused ? size + 2 : size} strokeWidth={focused ? 2.7 : 2} /> }} />
      <Tabs.Screen name="workout" options={{ title: t("tabs.workout"), tabBarIcon: ({ color, size, focused }) => <Dumbbell color={color} size={focused ? size + 2 : size} strokeWidth={focused ? 2.7 : 2} /> }} />
      <Tabs.Screen name="crew" options={{ title: t("tabs.crew"), tabBarIcon: ({ color, size, focused }) => <UsersRound color={color} size={focused ? size + 2 : size} strokeWidth={focused ? 2.7 : 2} /> }} />
      <Tabs.Screen name="progress" options={{ title: t("tabs.progress"), tabBarIcon: ({ color, size, focused }) => <ChartNoAxesColumnIncreasing color={color} size={focused ? size + 2 : size} strokeWidth={focused ? 2.7 : 2} /> }} />
    </Tabs>
  );
}
