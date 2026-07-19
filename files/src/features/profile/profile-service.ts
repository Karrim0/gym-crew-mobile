import { supabase } from "@/lib/supabase/client";
import type { Database, Tables } from "@/lib/supabase/database.types";
import { cacheValue, readCachedValue } from "@/lib/offline/database";
import type { UserProfile, UUID } from "@/types";

type ProfileRow = Tables<"profiles">;

export function mapProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    additionalRestDays: row.additional_rest_days,
    shareWorkoutSummary: row.share_workout_summary,
    sharePersonalRecords: row.share_personal_records,
    shareWeights: row.share_weights,
    splitSetupMethod: row.split_setup_method as UserProfile["splitSetupMethod"],
    splitSetupCompletedAt: row.split_setup_completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchProfile(userId: UUID) {
  const cacheKey = `profile:${userId}`;
  try {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) throw error;
    const profile = data ? mapProfile(data) : null;
    if (profile) await cacheValue(cacheKey, profile);
    return profile;
  } catch (caught) {
    const cached = await readCachedValue<UserProfile>(cacheKey);
    if (cached) return cached;
    throw caught;
  }
}

export async function updateProfile(
  userId: UUID,
  values: {
    displayName?: string;
    avatarUrl?: string | null;
    shareWorkoutSummary?: boolean;
    sharePersonalRecords?: boolean;
    shareWeights?: boolean;
  },
) {
  const patch: Database["public"]["Tables"]["profiles"]["Update"] = {};
  if (values.displayName !== undefined) {
    const name = values.displayName.trim();
    if (name.length < 2 || name.length > 50) throw new Error("الاسم لازم يكون من حرفين لـ 50 حرف.");
    patch.display_name = name;
  }
  if (values.avatarUrl !== undefined) patch.avatar_url = values.avatarUrl;
  if (values.shareWorkoutSummary !== undefined) patch.share_workout_summary = values.shareWorkoutSummary;
  if (values.sharePersonalRecords !== undefined) patch.share_personal_records = values.sharePersonalRecords;
  if (values.shareWeights !== undefined) patch.share_weights = values.shareWeights;
  const { data, error } = await supabase.from("profiles").update(patch).eq("id", userId).select("*").single();
  if (error) throw new Error(error.message);
  const profile = mapProfile(data);
  await cacheValue(`profile:${userId}`, profile);
  return profile;
}

function extensionFrom(name?: string | null, mimeType?: string | null) {
  const fromName = name?.split(".").pop()?.toLowerCase();
  if (fromName && ["jpg", "jpeg", "png", "webp"].includes(fromName)) return fromName === "jpeg" ? "jpg" : fromName;
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

export async function uploadAvatar(userId: UUID, asset: { uri: string; name?: string | null; mimeType?: string | null; size?: number | null }) {
  if (asset.size && asset.size > 5 * 1024 * 1024) throw new Error("الصورة لازم تكون أقل من 5 ميجا.");
  const response = await fetch(asset.uri);
  if (!response.ok) throw new Error("مقدرناش نقرأ الصورة من الجهاز.");
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > 5 * 1024 * 1024) throw new Error("الصورة لازم تكون أقل من 5 ميجا.");
  const extension = extensionFrom(asset.name, asset.mimeType);
  const path = `${userId}/avatar-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from("avatars").upload(path, bytes, {
    contentType: asset.mimeType ?? `image/${extension === "jpg" ? "jpeg" : extension}`,
    upsert: true,
    cacheControl: "3600",
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}
