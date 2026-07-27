import type { SmartSetPresetKind } from "@/features/workouts/smart-presets";

export function setPraise(language: "ar" | "en", kind: SmartSetPresetKind | "manual" | null) {
  if (language === "en") {
    if (kind === "progress") return "Strong — you moved the number forward.";
    if (kind === "backoff") return "Smart work — the back-off set is locked in.";
    if (kind === "repeat") return "Solid — you matched your last set.";
    return "Nice work — set saved.";
  }
  if (kind === "progress") return "جامد — زوّدت رقمك.";
  if (kind === "backoff") return "شغل ذكي — سِت التخفيف اتحسبت.";
  if (kind === "repeat") return "ثابت يا بطل — نفس الأداء اتحفظ.";
  return "عاش يا فحل — السِت اتحفظت.";
}

export function workoutPraise(language: "ar" | "en", completedSets: number, totalSets: number) {
  const percent = completedSets / Math.max(1, totalSets);
  if (language === "en") {
    if (percent >= 1) return "Beast mode — workout complete.";
    if (percent >= 0.75) return "Almost there — finish strong.";
    if (percent >= 0.5) return "Strong pace — keep it moving.";
    return "Good start — own the next set.";
  }
  if (percent >= 1) return "دبابة — خلّصت التمرينة.";
  if (percent >= 0.75) return "قربت يا وحش — اقفلها صح.";
  if (percent >= 0.5) return "جامد — إنت في نص الطريق.";
  return "بداية فحل — ركّز في السِت الجاية.";
}

export function crewRankPraise(language: "ar" | "en", index: number, total: number) {
  if (language === "en") {
    if (index === 0) return "Crew leader — setting the pace.";
    if (index === 1) return "One strong workout from the top.";
    if (index === total - 1 && total > 2) return "Time to warm up and get back in it.";
    return "Still in the race — keep showing up.";
  }
  if (index === 0) return "فحل الجروب — مولّع المنافسة.";
  if (index === 1) return "على بُعد تمرينة من الصدارة.";
  if (index === total - 1 && total > 2) return "محتاج تسخّن شوية يا بطل.";
  return "لسه في السباق — كمّل حضورك.";
}
