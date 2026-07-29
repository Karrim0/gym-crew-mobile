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
import { ConnectivityBanner } from "@/components/layout/connectivity-banner";
import { spacing } from "@/lib/theme/tokens";
import { useAppTheme } from "@/lib/theme/use-app-theme";

interface ScreenProps extends ScrollViewProps {
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  footer?: ReactNode;
  contentStyle?: ViewStyle;
  safeBottom?: boolean;
  showConnectivity?: boolean;
  horizontalPadding?: number;
  ambient?: boolean;
}

export function Screen({
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  footer,
  contentStyle,
  safeBottom = true,
  showConnectivity = true,
  horizontalPadding = spacing.md,
  ambient = true,
  contentContainerStyle,
  ...props
}: PropsWithChildren<ScreenProps>) {
  const { colors } = useAppTheme();
  const body = (
    <View
      style={[
        {
          flexGrow: 1,
          width: "100%",
          maxWidth: 720,
          alignSelf: "center",
          paddingHorizontal: horizontalPadding,
          paddingTop: spacing.xs,
          paddingBottom: footer ? 128 : spacing.xxl,
          gap: 12,
          minWidth: 0,
        },
        contentStyle,
      ]}
    >
      {showConnectivity ? <ConnectivityBanner /> : null}
      {children}
    </View>
  );

  return (
    <SafeAreaView edges={["top", ...(safeBottom ? (["bottom"] as const) : [])]} style={{ flex: 1, backgroundColor: colors.background }}>
      {ambient ? (
        <>
          <View pointerEvents="none" style={{ position: "absolute", width: 250, height: 250, borderRadius: 125, backgroundColor: colors.ambient, top: -150, end: -100 }} />
          <View pointerEvents="none" style={{ position: "absolute", width: 190, height: 190, borderRadius: 95, backgroundColor: colors.ambient, bottom: 80, start: -130, opacity: 0.5 }} />
        </>
      ) : null}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
            contentInsetAdjustmentBehavior="never"
            showsVerticalScrollIndicator={false}
            refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.surface} /> : undefined}
            {...props}
            contentContainerStyle={[{ flexGrow: 1 }, contentContainerStyle]}
          >
            {body}
          </ScrollView>
        ) : body}
        {footer}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
