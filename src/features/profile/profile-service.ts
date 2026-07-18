import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";
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
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapProfile(data) : null;
}

export async function updateProfile(userId: UUID, values: { displayName: string; avatarUrl?: string | null }) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: values.displayName.trim(), ...(values.avatarUrl !== undefined ? { avatar_url: values.avatarUrl } : {}) })
    .eq("id", userId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapProfile(data);
}
