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
  defaultRestSeconds: number;
  hapticsEnabled: boolean;
  soundEnabled: boolean;
  setLanguage: (language: Language) => void;
  setColorMode: (mode: ColorMode) => void;
  setWeightUnit: (unit: WeightUnit) => void;
  setDefaultRestSeconds: (seconds: number) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: deviceLanguage,
      colorMode: "system",
      weightUnit: "kg",
      defaultRestSeconds: 120,
      hapticsEnabled: true,
      soundEnabled: true,
      setLanguage: (language) => set({ language }),
      setColorMode: (colorMode) => set({ colorMode }),
      setWeightUnit: (weightUnit) => set({ weightUnit }),
      setDefaultRestSeconds: (defaultRestSeconds) => set({ defaultRestSeconds }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
    }),
    {
      name: "gym-crew:settings",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        language: state.language,
        colorMode: state.colorMode,
        weightUnit: state.weightUnit,
        defaultRestSeconds: state.defaultRestSeconds,
        hapticsEnabled: state.hapticsEnabled,
        soundEnabled: state.soundEnabled,
      }),
    },
  ),
);
