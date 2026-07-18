import { I18n } from "i18n-js";
import { useMemo } from "react";
import { useSettingsStore } from "@/stores/settings-store";
import { translations } from "./translations";

export function useTranslation() {
  const language = useSettingsStore((state) => state.language);
  const isRTL = language === "ar";

  return useMemo(() => {
    const instance = new I18n(translations);
    instance.enableFallback = true;
    instance.defaultLocale = "en";
    instance.locale = language;
    return {
      language,
      isRTL,
      t: (key: string, options?: Record<string, unknown>) => instance.t(key, options),
      textAlign: isRTL ? ("right" as const) : ("left" as const),
      rowDirection: isRTL ? ("row-reverse" as const) : ("row" as const),
    };
  }, [language, isRTL]);
}
