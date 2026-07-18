export function friendlyError(error: unknown, fallback = "حصلت مشكلة. جرّب تاني.") {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials")) return "الإيميل أو الباسورد مش صح.";
  if (lower.includes("email not confirmed")) return "فعّل الإيميل الأول وبعدها سجّل دخول.";
  if (lower.includes("user already registered")) return "الإيميل ده عليه حساب بالفعل.";
  if (lower.includes("network") || lower.includes("fetch")) return "النت مش ثابت. بيانات التمرين هتفضل محفوظة على الجهاز.";
  if (lower.includes("jwt") || lower.includes("session")) return "الجلسة انتهت. سجّل دخول تاني.";
  return message || fallback;
}
