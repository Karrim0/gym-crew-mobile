import { useColorScheme } from "react-native";
import { themes, type AppTheme } from "./tokens";
import { useSettingsStore } from "@/stores/settings-store";

export function useAppTheme() {
  const system = useColorScheme();
  const mode = useSettingsStore((state) => state.colorMode);
  const resolved: AppTheme = mode === "system" ? (system === "dark" ? "dark" : "light") : mode;
  return { mode, resolved, colors: themes[resolved] };
}
