import type { PropsWithChildren, ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  View,
  type ScrollViewProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { spacing } from "@/lib/theme/tokens";
import { useAppTheme } from "@/lib/theme/use-app-theme";

interface ScreenProps extends ScrollViewProps {
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  footer?: ReactNode;
  contentStyle?: ViewStyle;
  safeBottom?: boolean;
}

export function Screen({
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  footer,
  contentStyle,
  safeBottom = true,
  ...props
}: PropsWithChildren<ScreenProps>) {
  const { colors } = useAppTheme();
  const body = (
    <View
      style={[
        {
          flexGrow: 1,
          width: "100%",
          maxWidth: 760,
          alignSelf: "center",
          paddingHorizontal: spacing.md,
          paddingTop: spacing.md,
          paddingBottom: footer ? 120 : spacing.xxl,
          gap: spacing.lg,
          minWidth: 0,
        },
        contentStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView edges={["top", ...(safeBottom ? (["bottom"] as const) : [])]} style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
            {...props}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            {body}
          </ScrollView>
        ) : (
          body
        )}
        {footer}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
