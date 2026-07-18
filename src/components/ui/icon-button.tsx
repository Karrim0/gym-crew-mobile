import type { ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import { useAppTheme } from "@/lib/theme/use-app-theme";

interface IconButtonProps extends PressableProps {
  icon: ReactNode;
  size?: number;
  tone?: "default" | "primary" | "danger";
}

export function IconButton({ icon, size = 44, tone = "default", style, ...props }: IconButtonProps) {
  const { colors } = useAppTheme();
  const backgroundColor = tone === "primary" ? colors.primarySoft : tone === "danger" ? colors.dangerSoft : colors.surface;
  const borderColor = tone === "default" ? colors.border : "transparent";
  return (
    <Pressable
      accessibilityRole="button"
      {...props}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
          borderWidth: tone === "default" ? 1 : 0,
          borderColor,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.72 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
        typeof style === "function" ? style({ pressed }) : style,
      ]}
    >
      {icon}
    </Pressable>
  );
}
