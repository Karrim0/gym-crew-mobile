import type { SmartSetPresetKind } from "@/features/workouts/smart-presets";

export function setPraise(language: "ar" | "en", kind: SmartSetPresetKind | "manual" | null) {
  if (language === "en") {
    if (kind === "progress") return "Strong — you moved the number forward.";
    if (kind === "backoff") return "Smart work — the back-off set is saved.";
    if (kind === "repeat") return "Solid — you matched your last set.";
    return "Set saved.";
  }
  if (kind === "progress") return "جامد — الرقم اتحرك لقدام.";
  if (kind === "backoff") return "شغل محسوب — سِت التخفيف اتحفظت.";
  if (kind === "repeat") return "ثابت — نفس الأداء اتحفظ.";
  return "السِت اتحفظت.";
}

export function workoutPraise(language: "ar" | "en", completedSets: number, totalSets: number) {
  const percent = completedSets / Math.max(1, totalSets);
  if (language === "en") {
    if (percent >= 1) return "Workout complete.";
    if (percent >= 0.75) return "Almost there — finish strong.";
    if (percent >= 0.5) return "Strong pace — keep moving.";
    return "Good start — focus on the next set.";
  }
  if (percent >= 1) return "جلسة قوية — خلصت المطلوب.";
  if (percent >= 0.75) return "قربت — اقفلها صح.";
  if (percent >= 0.5) return "إيقاع كويس — كمّل.";
  return "بداية كويسة — ركّز في السِت الجاية.";
}

export function crewRankPraise(language: "ar" | "en", index: number, total: number) {
  if (language === "en") {
    if (index === 0) return "Leading the crew this week.";
    if (index === 1) return "One workout away from the lead.";
    if (index === total - 1 && total > 2) return "Start today and climb the board.";
    return "The race is still open.";
  }
  if (index === 0) return "متصدر الجروب الأسبوع ده.";
  if (index === 1) return "على بُعد تمرينة من الصدارة.";
  if (index === total - 1 && total > 2) return "ابدأ من النهارده واطلع فوق.";
  return "المنافسة لسه مفتوحة.";
}
