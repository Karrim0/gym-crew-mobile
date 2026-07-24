import { Tabs } from "expo-router";
import { BarChart3, Dumbbell, House, UserRound, UsersRound, CalendarDays } from "lucide-react-native";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
          left: 14,
          right: 14,
          bottom,
          height: 64,
          paddingTop: 6,
          paddingBottom: 6,
          backgroundColor: colors.nav,
          borderColor: colors.borderStrong,
          borderWidth: 1,
          borderTopWidth: 1,
          borderRadius: 21,
          shadowColor: colors.shadow,
          shadowOpacity: 0.34,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 12,
        },
        tabBarItemStyle: { borderRadius: 15, marginHorizontal: 3 },
        tabBarLabelStyle: { fontSize: 10, lineHeight: 13, fontWeight: "800", marginTop: 1 },
        sceneStyle: { backgroundColor: colors.background, paddingBottom: 76 + bottom },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: language === "ar" ? "الرئيسية" : "Home",
          tabBarIcon: ({ color, focused }) => <House color={color} fill={focused ? color : "transparent"} size={22} strokeWidth={focused ? 2.6 : 2.1} />,
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: language === "ar" ? "التمرين" : "Workout",
          tabBarIcon: ({ color, focused }) => <Dumbbell color={color} size={focused ? 24 : 22} strokeWidth={focused ? 2.8 : 2.1} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: language === "ar" ? "التقدم" : "Progress",
          tabBarIcon: ({ color, focused }) => <BarChart3 color={color} size={22} strokeWidth={focused ? 2.8 : 2.1} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: language === "ar" ? "حسابي" : "Profile",
          tabBarIcon: ({ color, focused }) => <UserRound color={color} fill={focused ? color : "transparent"} size={22} strokeWidth={focused ? 2.6 : 2.1} />,
        }}
      />
      <Tabs.Screen name="split" options={{ href: null, tabBarIcon: ({ color }) => <CalendarDays color={color} /> }} />
      <Tabs.Screen name="crew" options={{ href: null, tabBarIcon: ({ color }) => <UsersRound color={color} /> }} />
    </Tabs>
  );
}
