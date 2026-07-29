import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type Language = "ar" | "en";
export type ColorMode = "system" | "light" | "dark";
export type WeightUnit = "kg" | "lb";

const deviceLanguage: Language = getLocales()[0]?.languageCode === "ar" ? "ar" : "en";

interface SettingsState {
  language: Language;
  colorMode: ColorMode;
  weightUnit: WeightUnit;
  defaultWeightStepKg: 2.5 | 5;
  defaultRestSeconds: number;
  hapticsEnabled: boolean;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  oneTapLoggingEnabled: boolean;
  autoStartRestTimerEnabled: boolean;
  setLanguage: (language: Language) => void;
  setColorMode: (mode: ColorMode) => void;
  setWeightUnit: (unit: WeightUnit) => void;
  setDefaultWeightStepKg: (step: 2.5 | 5) => void;
  setDefaultRestSeconds: (seconds: number) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setOneTapLoggingEnabled: (enabled: boolean) => void;
  setAutoStartRestTimerEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: deviceLanguage,
      colorMode: "dark",
      weightUnit: "kg",
      defaultWeightStepKg: 2.5,
      defaultRestSeconds: 120,
      hapticsEnabled: true,
      soundEnabled: true,
      notificationsEnabled: true,
      oneTapLoggingEnabled: true,
      autoStartRestTimerEnabled: true,
      setLanguage: (language) => set({ language }),
      setColorMode: (colorMode) => set({ colorMode }),
      setWeightUnit: (weightUnit) => set({ weightUnit }),
      setDefaultWeightStepKg: (defaultWeightStepKg) => set({ defaultWeightStepKg }),
      setDefaultRestSeconds: (defaultRestSeconds) => set({ defaultRestSeconds }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setOneTapLoggingEnabled: (oneTapLoggingEnabled) => set({ oneTapLoggingEnabled }),
      setAutoStartRestTimerEnabled: (autoStartRestTimerEnabled) => set({ autoStartRestTimerEnabled }),
    }),
    {
      name: "gym-crew:settings",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        language: state.language,
        colorMode: state.colorMode,
        weightUnit: state.weightUnit,
        defaultWeightStepKg: state.defaultWeightStepKg,
        defaultRestSeconds: state.defaultRestSeconds,
        hapticsEnabled: state.hapticsEnabled,
        soundEnabled: state.soundEnabled,
        notificationsEnabled: state.notificationsEnabled,
        oneTapLoggingEnabled: state.oneTapLoggingEnabled,
        autoStartRestTimerEnabled: state.autoStartRestTimerEnabled,
      }),
    },
  ),
);
