import type { PropsWithChildren, ReactNode } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { X } from "lucide-react-native";
import { AppText } from "./app-text";
import { Card } from "./card";
import { IconButton } from "./icon-button";
import { spacing } from "@/lib/theme/tokens";
import { useAppTheme } from "@/lib/theme/use-app-theme";
import { useTranslation } from "@/lib/localization/use-translation";

interface ActionSheetProps {
  visible: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  footer?: ReactNode;
  dismissible?: boolean;
  scroll?: boolean;
}

export function ActionSheet({
  visible,
  title,
  description,
  onClose,
  footer,
  dismissible = true,
  scroll = false,
  children,
}: PropsWithChildren<ActionSheetProps>) {
  const { colors } = useAppTheme();
  const { rowDirection } = useTranslation();
  const content = (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: rowDirection, alignItems: "flex-start", gap: spacing.sm }}>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <AppText variant="title2">{title}</AppText>
          {description ? <AppText color="muted">{description}</AppText> : null}
        </View>
        {dismissible ? <IconButton onPress={onClose} icon={<X color={colors.text} size={20} />} /> : null}
      </View>
      {children}
    </View>
  );

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={() => { if (dismissible) onClose(); }}>
      <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" }}>
        <Pressable accessibilityRole="button" onPress={() => { if (dismissible) onClose(); }} style={{ flex: 1 }} />
        <Card
          style={{
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            borderColor: colors.borderStrong,
            gap: spacing.md,
            paddingBottom: 34,
            maxHeight: "90%",
          }}
        >
          <View style={{ width: 52, height: 5, borderRadius: 999, backgroundColor: colors.surfaceStrong, alignSelf: "center" }} />
          {scroll ? (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 4 }}>
              {content}
            </ScrollView>
          ) : content}
          {footer}
        </Card>
      </View>
    </Modal>
  );
}
