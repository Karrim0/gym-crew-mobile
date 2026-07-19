import { View } from "react-native";
import type { ReactNode } from "react";
import { AppText } from "./app-text";
import { useTranslation } from "@/lib/localization/use-translation";

export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  const { rowDirection } = useTranslation();
  return (
    <View style={{ flexDirection: rowDirection, justifyContent: "space-between", alignItems: "flex-end", gap: 12, minWidth: 0 }}>
      <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
        <AppText variant="title3">{title}</AppText>
        {subtitle ? <AppText variant="small" color="muted">{subtitle}</AppText> : null}
      </View>
      {action}
    </View>
  );
}
