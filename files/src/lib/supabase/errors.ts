function hasArabic(value: string) {
  return /[\u0600-\u06FF]/.test(value);
}

function looksTechnical(value: string) {
  return [
    "postgres",
    "postgrest",
    "sqlstate",
    "column reference",
    "relation ",
    "function ",
    "schema cache",
    "row-level security",
    "violates",
    "duplicate key",
    "foreign key",
    "null value in column",
    "pgrst",
    "42p",
    "22p",
    "2350",
    "syntax error",
    "unexpected token",
    "cannot read properties",
    "undefined is not",
  ].some((token) => value.includes(token));
}

export function friendlyError(error: unknown, fallback = "حصلت مشكلة مؤقتة. جرّب تاني.") {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const lower = message.toLowerCase().trim();

  if (!lower) return fallback;
  if (lower.includes("invalid login credentials")) return "الإيميل أو الباسورد مش صح.";
  if (lower.includes("email not confirmed")) return "فعّل الإيميل الأول وبعدها سجّل دخول.";
  if (lower.includes("user already registered")) return "الإيميل ده عليه حساب بالفعل.";
  if (lower.includes("network") || lower.includes("fetch") || lower.includes("timeout") || lower.includes("offline")) {
    return "النت مش ثابت. بيانات تمرينك محفوظة على الجهاز، وهنزامنها لما الاتصال يرجع.";
  }
  if (lower.includes("jwt") || lower.includes("refresh token") || lower.includes("session")) return "الجلسة انتهت. سجّل دخول تاني.";
  if (lower.includes("permission") || lower.includes("not authorized") || lower.includes("row-level security")) {
    return "الحساب الحالي مش مسموح له يعمل الخطوة دي.";
  }
  if (lower.includes("duplicate key") || lower.includes("already exists")) return "العنصر ده موجود بالفعل.";
  if (lower.includes("apply_girls_strength_4") || lower.includes("schema cache") || lower.includes("function does not exist")) {
    return "تحديث قاعدة البيانات المطلوب للنسخة دي لسه ما اتطبقش.";
  }
  if (lower.includes("column reference") || lower.includes("ambiguous")) {
    return "بيانات الجروب محتاجة تحديث قاعدة البيانات المرفق مع النسخة.";
  }

  // Keep intentional, user-facing Arabic validation messages from services,
  // but never surface database/runtime internals to the UI.
  if (hasArabic(message) && !looksTechnical(lower)) return message;
  if (looksTechnical(lower)) return fallback;
  return message.length <= 160 ? message : fallback;
}
