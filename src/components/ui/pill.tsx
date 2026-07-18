import type { PropsWithChildren } from "react";
import { Pressable, type PressableProps } from "react-native";
import { AppText } from "./app-text";
import { radii, spacing } from "@/lib/theme/tokens";
import { useAppTheme } from "@/lib/theme/use-app-theme";

interface PillProps extends PressableProps {
  selected?: boolean;
}

export function Pill({ children, selected = false, style, ...props }: PropsWithChildren<PillProps>) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        {
          minHeight: 42,
          minWidth: 48,
          borderRadius: radii.pill,
          borderWidth: 1,
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.primarySoft : colors.surface,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: spacing.md,
          opacity: pressed ? 0.78 : 1,
        },
        typeof style === "function" ? style({ pressed }) : style,
      ]}
    >
      <AppText variant="smallBold" color={selected ? "primary" : "default"} align="center">
        {children}
      </AppText>
    </Pressable>
  );
}
