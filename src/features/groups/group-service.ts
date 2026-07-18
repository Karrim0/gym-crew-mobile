import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";
import type { CurrentGroupMembership, GroupMember, GroupMemberWeeklyStats, UUID, WorkoutGroup } from "@/types";

type GroupRow = Tables<"groups">;
type MemberRow = Tables<"group_members">;

function mapGroup(row: GroupRow): WorkoutGroup {
  return {
    id: row.id,
    name: row.name,
    inviteCode: row.invite_code,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isPersonal: row.is_personal,
    splitVersion: row.split_version,
    splitUpdatedAt: row.split_updated_at,
  };
}

function mapMember(row: MemberRow): GroupMember {
  return {
    id: row.id,
    groupId: row.group_id,
    userId: row.user_id,
    role: row.role,
    joinedAt: row.joined_at,
    seenSplitVersion: row.seen_split_version,
  };
}

export async function fetchCurrentMembership(userId: UUID): Promise<CurrentGroupMembership | null> {
  const { data: member, error } = await supabase.from("group_members").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!member) return null;
  const { data: group, error: groupError } = await supabase.from("groups").select("*").eq("id", member.group_id).single();
  if (groupError) throw new Error(groupError.message);
  return { member: mapMember(member), group: mapGroup(group) };
}

export async function createSoloWorkspace() {
  const { data, error } = await supabase.rpc("create_solo_workspace");
  if (error) throw new Error(error.message);
  if (!data) throw new Error("المساحة الشخصية اتعملت بس بياناتها مرجعتش.");
  return mapGroup(data);
}

export async function createGroup(name: string) {
  const { data, error } = await supabase.rpc("create_group_with_owner", { group_name: name.trim() });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("الجروب اتعمل بس بياناته مرجعتش.");
  return mapGroup(data);
}

export async function joinGroup(code: string) {
  const { data, error } = await supabase.rpc("join_group_by_invite_code", { raw_invite_code: code.trim().toUpperCase() });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("دخلت الجروب بس بياناته مرجعتش.");
  return mapGroup(data);
}

export async function fetchGroupWeeklyStats(groupId: UUID): Promise<GroupMemberWeeklyStats[]> {
  const { data, error } = await supabase.rpc("get_group_member_weekly_stats", { target_group_id: groupId });
  if (error) throw new Error(error.message);
  return data.map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    role: row.role,
    sessionsThisWeek: row.sessions_this_week,
    scheduledThisWeek: row.scheduled_this_week,
    adherencePercent: row.adherence_percent,
    personalRecordsCount: row.personal_records_count,
    lastWorkoutAt: row.last_workout_at,
    shareWorkoutSummary: row.share_workout_summary,
    sharePersonalRecords: row.share_personal_records,
    shareWeights: row.share_weights,
  }));
}
