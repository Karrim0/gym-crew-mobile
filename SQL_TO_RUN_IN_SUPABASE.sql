-- ============================================================================
-- 202607180001_fix_group_member_weekly_stats.sql
-- ============================================================================

-- Fixes PostgreSQL's "column reference user_id is ambiguous" error by
-- qualifying every user_id reference and by isolating each aggregate in a
-- named CTE. RLS remains enabled; this SECURITY DEFINER function performs an
-- explicit membership check before returning any group data.

DROP FUNCTION IF EXISTS public.get_group_member_weekly_stats(uuid);

CREATE FUNCTION public.get_group_member_weekly_stats(target_group_id uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  role public.group_role,
  sessions_this_week bigint,
  scheduled_this_week bigint,
  adherence_percent integer,
  personal_records_count bigint,
  last_workout_at timestamptz,
  share_workout_summary boolean,
  share_personal_records boolean,
  share_weights boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cairo_today date := (timezone('Africa/Cairo', now()))::date;
  week_start date;
  week_end date;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.group_members AS requesting_member
    WHERE requesting_member.group_id = target_group_id
      AND requesting_member.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You are not a member of this group'
      USING ERRCODE = '42501';
  END IF;

  -- PostgreSQL DOW: Sunday=0 ... Saturday=6.
  week_start := cairo_today - ((extract(dow FROM cairo_today)::integer + 1) % 7);
  week_end := week_start + 6;

  RETURN QUERY
  WITH member_base AS (
    SELECT
      member.user_id AS member_user_id,
      member.role AS member_role,
      profile.display_name AS member_display_name,
      profile.avatar_url AS member_avatar_url,
      profile.share_workout_summary AS member_share_workout_summary,
      profile.share_personal_records AS member_share_personal_records,
      profile.share_weights AS member_share_weights
    FROM public.group_members AS member
    INNER JOIN public.profiles AS profile
      ON profile.id = member.user_id
    WHERE member.group_id = target_group_id
  ),
  scheduled AS (
    SELECT
      schedule.user_id AS scheduled_user_id,
      count(*)::bigint AS scheduled_count
    FROM public.weekly_schedule_days AS schedule
    WHERE schedule.group_id = target_group_id
      AND schedule.schedule_date BETWEEN week_start AND week_end
      AND schedule.workout_type <> 'rest'::public.workout_type
    GROUP BY schedule.user_id
  ),
  completed AS (
    SELECT
      session.user_id AS completed_user_id,
      count(*)::bigint AS completed_count
    FROM public.workout_sessions AS session
    WHERE session.group_id = target_group_id
      AND session.status = 'completed'::public.workout_session_status
      AND session.scheduled_date BETWEEN week_start AND week_end
    GROUP BY session.user_id
  ),
  records AS (
    SELECT
      record.user_id AS record_user_id,
      count(*)::bigint AS record_count
    FROM public.personal_records AS record
    WHERE (timezone('Africa/Cairo', record.achieved_at))::date
      BETWEEN week_start AND week_end
    GROUP BY record.user_id
  ),
  last_workouts AS (
    SELECT
      session.user_id AS last_workout_user_id,
      max(session.completed_at) AS latest_completed_at
    FROM public.workout_sessions AS session
    WHERE session.group_id = target_group_id
      AND session.status = 'completed'::public.workout_session_status
    GROUP BY session.user_id
  )
  SELECT
    base.member_user_id AS user_id,
    base.member_display_name AS display_name,
    base.member_avatar_url AS avatar_url,
    base.member_role AS role,
    CASE
      WHEN base.member_user_id = auth.uid() OR base.member_share_workout_summary
        THEN coalesce(done.completed_count, 0)::bigint
      ELSE 0::bigint
    END AS sessions_this_week,
    CASE
      WHEN base.member_user_id = auth.uid() OR base.member_share_workout_summary
        THEN coalesce(plan.scheduled_count, 0)::bigint
      ELSE 0::bigint
    END AS scheduled_this_week,
    CASE
      WHEN NOT (base.member_user_id = auth.uid() OR base.member_share_workout_summary) THEN 0
      WHEN coalesce(plan.scheduled_count, 0) = 0 THEN 0
      ELSE least(
        100,
        round(
          (coalesce(done.completed_count, 0)::numeric / plan.scheduled_count::numeric) * 100
        )::integer
      )
    END AS adherence_percent,
    CASE
      WHEN base.member_user_id = auth.uid() OR base.member_share_personal_records
        THEN coalesce(pr.record_count, 0)::bigint
      ELSE 0::bigint
    END AS personal_records_count,
    CASE
      WHEN base.member_user_id = auth.uid() OR base.member_share_workout_summary
        THEN latest.latest_completed_at
      ELSE NULL::timestamptz
    END AS last_workout_at,
    base.member_share_workout_summary AS share_workout_summary,
    base.member_share_personal_records AS share_personal_records,
    base.member_share_weights AS share_weights
  FROM member_base AS base
  LEFT JOIN scheduled AS plan
    ON plan.scheduled_user_id = base.member_user_id
  LEFT JOIN completed AS done
    ON done.completed_user_id = base.member_user_id
  LEFT JOIN records AS pr
    ON pr.record_user_id = base.member_user_id
  LEFT JOIN last_workouts AS latest
    ON latest.last_workout_user_id = base.member_user_id
  ORDER BY
    adherence_percent DESC,
    sessions_this_week DESC,
    display_name ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_group_member_weekly_stats(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_group_member_weekly_stats(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_group_member_weekly_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_group_member_weekly_stats(uuid) TO service_role;

-- ============================================================================
-- 202607180002_profile_avatars.sql
-- ============================================================================

-- Public avatars bucket with per-user write access.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars_public_read') then
    create policy avatars_public_read on storage.objects for select using (bucket_id = 'avatars');
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars_user_insert') then
    create policy avatars_user_insert on storage.objects for insert to authenticated
      with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars_user_update') then
    create policy avatars_user_update on storage.objects for update to authenticated
      using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
      with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars_user_delete') then
    create policy avatars_user_delete on storage.objects for delete to authenticated
      using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
end $$;

-- ============================================================================
-- 202607190001_gym_mode_focus_v030.sql
-- ============================================================================

-- Gym Crew Mobile v0.3.0
-- Focused gym mode metadata, optional set notes, Girls 4-Day Strength preset,
-- and safe personal-week reordering without changing historical day ids.

alter table public.workout_exercises
  add column if not exists target_reps_min integer not null default 8,
  add column if not exists target_reps_max integer not null default 12;

alter table public.workout_sets
  add column if not exists notes text not null default '';

alter table public.workout_exercises
  drop constraint if exists workout_exercises_target_reps_range_check;

alter table public.workout_exercises
  add constraint workout_exercises_target_reps_range_check
  check (
    target_reps_min between 1 and 1000
    and target_reps_max between target_reps_min and 1000
  );

create or replace function public.apply_girls_strength_4_template()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  week_start date;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  perform public.ensure_personal_split();

  insert into public.exercises (
    name,
    primary_muscle,
    secondary_muscles,
    workout_type,
    is_custom,
    created_by
  )
  select catalog.name,
         catalog.primary_muscle,
         catalog.secondary_muscles,
         catalog.workout_type,
         false,
         null
  from (
    values
      ('Kickback', 'glutes'::public.muscle_group, array['hamstrings'::public.muscle_group], 'legs'::public.workout_type),
      ('Leg Extension', 'quads'::public.muscle_group, array[]::public.muscle_group[], 'legs'::public.workout_type),
      ('Chest Press Machine', 'chest'::public.muscle_group, array['triceps'::public.muscle_group, 'shoulders'::public.muscle_group], 'push'::public.workout_type),
      ('Machine Lateral Raise', 'shoulders'::public.muscle_group, array[]::public.muscle_group[], 'push'::public.workout_type),
      ('Single-Arm Triceps Pushdown', 'triceps'::public.muscle_group, array[]::public.muscle_group[], 'push'::public.workout_type),
      ('Hip Abduction', 'glutes'::public.muscle_group, array[]::public.muscle_group[], 'legs'::public.workout_type),
      ('Lat Pulldown Crunch', 'core'::public.muscle_group, array[]::public.muscle_group[], 'custom'::public.workout_type),
      ('Hip Thrust', 'glutes'::public.muscle_group, array['hamstrings'::public.muscle_group], 'legs'::public.workout_type),
      ('Lying Leg Curl', 'hamstrings'::public.muscle_group, array['calves'::public.muscle_group], 'legs'::public.workout_type),
      ('T-Bar Row', 'back'::public.muscle_group, array['biceps'::public.muscle_group], 'pull'::public.workout_type),
      ('Wide-Grip Lat Pulldown Machine', 'back'::public.muscle_group, array['biceps'::public.muscle_group], 'pull'::public.workout_type),
      ('Face-Away Curl', 'biceps'::public.muscle_group, array[]::public.muscle_group[], 'pull'::public.workout_type),
      ('Leg Press Calf Raise', 'calves'::public.muscle_group, array[]::public.muscle_group[], 'legs'::public.workout_type),
      ('Hack Squat', 'quads'::public.muscle_group, array['glutes'::public.muscle_group], 'legs'::public.workout_type),
      ('Incline Chest Press Machine', 'chest'::public.muscle_group, array['triceps'::public.muscle_group, 'shoulders'::public.muscle_group], 'push'::public.workout_type),
      ('Overhead Triceps Extension', 'triceps'::public.muscle_group, array[]::public.muscle_group[], 'push'::public.workout_type),
      ('Romanian Deadlift', 'hamstrings'::public.muscle_group, array['glutes'::public.muscle_group, 'back'::public.muscle_group], 'legs'::public.workout_type),
      ('Contralateral Split Squat', 'quads'::public.muscle_group, array['glutes'::public.muscle_group], 'legs'::public.workout_type),
      ('Single-Arm Lat Row', 'back'::public.muscle_group, array['biceps'::public.muscle_group], 'pull'::public.workout_type),
      ('Dumbbell Preacher Curl', 'biceps'::public.muscle_group, array[]::public.muscle_group[], 'pull'::public.workout_type)
  ) as catalog(name, primary_muscle, secondary_muscles, workout_type)
  where not exists (
    select 1
    from public.exercises existing
    where lower(existing.name) = lower(catalog.name)
  );

  update public.split_days as day
  set workout_type = config.workout_type,
      display_name = config.display_name,
      focus_label = config.focus_label,
      icon_key = config.icon_key,
      color_key = config.color_key,
      day_notes = config.day_notes,
      updated_at = now()
  from (
    values
      ('saturday'::public.weekday, 'custom'::public.workout_type, 'Girls Day 1', 'Glutes · Push · Core', 'heart', 'rose', 'Balanced full-body day with glute priority.'),
      ('sunday'::public.weekday, 'custom'::public.workout_type, 'Girls Day 2', 'Glutes · Back · Calves', 'flame', 'violet', 'Posterior chain and back focus.'),
      ('monday'::public.weekday, 'rest'::public.workout_type, 'Rest', 'Recovery', 'moon', 'blue', ''),
      ('tuesday'::public.weekday, 'custom'::public.workout_type, 'Girls Day 3', 'Glutes · Quads · Push', 'heart', 'rose', 'Lower-body strength with push accessories.'),
      ('wednesday'::public.weekday, 'rest'::public.workout_type, 'Rest', 'Recovery', 'moon', 'blue', ''),
      ('thursday'::public.weekday, 'custom'::public.workout_type, 'Girls Day 4', 'Lower · Pull · Core', 'target', 'emerald', 'Lower and pull day with unilateral work.'),
      ('friday'::public.weekday, 'rest'::public.workout_type, 'Rest', 'Recovery', 'moon', 'blue', '')
  ) as config(weekday, workout_type, display_name, focus_label, icon_key, color_key, day_notes)
  where day.owner_user_id = current_user_id
    and day.weekday = config.weekday;

  delete from public.split_exercises exercise
  using public.split_days day
  where exercise.split_day_id = day.id
    and day.owner_user_id = current_user_id;

  with plan(day_weekday, position, exercise_name, target_sets, target_reps_min, target_reps_max) as (
    values
      ('saturday'::public.weekday, 0, 'Kickback', 2, 10, 15),
      ('saturday'::public.weekday, 1, 'Leg Extension', 2, 8, 12),
      ('saturday'::public.weekday, 2, 'Chest Press Machine', 2, 8, 12),
      ('saturday'::public.weekday, 3, 'Machine Lateral Raise', 2, 10, 15),
      ('saturday'::public.weekday, 4, 'Single-Arm Triceps Pushdown', 2, 8, 12),
      ('saturday'::public.weekday, 5, 'Hip Abduction', 2, 12, 20),
      ('saturday'::public.weekday, 6, 'Lat Pulldown Crunch', 2, 10, 15),

      ('sunday'::public.weekday, 0, 'Hip Thrust', 2, 8, 12),
      ('sunday'::public.weekday, 1, 'Lying Leg Curl', 2, 8, 12),
      ('sunday'::public.weekday, 2, 'T-Bar Row', 2, 8, 12),
      ('sunday'::public.weekday, 3, 'Wide-Grip Lat Pulldown Machine', 2, 8, 12),
      ('sunday'::public.weekday, 4, 'Face-Away Curl', 2, 8, 12),
      ('sunday'::public.weekday, 5, 'Leg Press Calf Raise', 2, 10, 15),

      ('tuesday'::public.weekday, 0, 'Hip Thrust', 2, 8, 12),
      ('tuesday'::public.weekday, 1, 'Hack Squat', 2, 8, 12),
      ('tuesday'::public.weekday, 2, 'Incline Chest Press Machine', 2, 8, 12),
      ('tuesday'::public.weekday, 3, 'Overhead Triceps Extension', 2, 8, 12),
      ('tuesday'::public.weekday, 4, 'Lat Pulldown Crunch', 2, 10, 15),

      ('thursday'::public.weekday, 0, 'Romanian Deadlift', 2, 8, 12),
      ('thursday'::public.weekday, 1, 'Contralateral Split Squat', 2, 8, 12),
      ('thursday'::public.weekday, 2, 'Single-Arm Lat Row', 2, 8, 12),
      ('thursday'::public.weekday, 3, 'T-Bar Row', 2, 8, 12),
      ('thursday'::public.weekday, 4, 'Dumbbell Preacher Curl', 2, 8, 12),
      ('thursday'::public.weekday, 5, 'Leg Extension', 2, 8, 12),
      ('thursday'::public.weekday, 6, 'Lat Pulldown Crunch', 2, 10, 15)
  )
  insert into public.split_exercises (
    split_day_id,
    exercise_id,
    position,
    target_sets,
    target_reps_min,
    target_reps_max,
    is_personal_addition
  )
  select day.id,
         exercise.id,
         plan.position,
         plan.target_sets,
         plan.target_reps_min,
         plan.target_reps_max,
         false
  from plan
  join public.split_days day
    on day.owner_user_id = current_user_id
   and day.weekday = plan.day_weekday
  join lateral (
    select catalog.id
    from public.exercises catalog
    where lower(catalog.name) = lower(plan.exercise_name)
    order by (catalog.created_by is null) desc, catalog.created_at asc
    limit 1
  ) exercise on true;

  update public.profiles
  set split_setup_method = 'starter',
      split_setup_completed_at = coalesce(split_setup_completed_at, now()),
      updated_at = now()
  where id = current_user_id;

  week_start := current_date - ((extract(dow from current_date)::integer + 1) % 7);
  delete from public.weekly_schedule_days
  where user_id = current_user_id
    and schedule_date >= week_start;

  perform public.ensure_week_schedule(current_date);
end;
$$;

create or replace function public.reorder_personal_split_days(target_ordered_day_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  ordered_weekdays public.weekday[] := array[
    'saturday'::public.weekday,
    'sunday'::public.weekday,
    'monday'::public.weekday,
    'tuesday'::public.weekday,
    'wednesday'::public.weekday,
    'thursday'::public.weekday,
    'friday'::public.weekday
  ];
  snapshots jsonb;
  source_snapshot jsonb;
  target_day_id uuid;
  unique_count integer;
  owned_count integer;
  week_start date;
  index_value integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if coalesce(array_length(target_ordered_day_ids, 1), 0) <> 7 then
    raise exception 'Exactly seven personal split days are required';
  end if;

  select count(distinct value)
  into unique_count
  from unnest(target_ordered_day_ids) as value;

  select count(*)
  into owned_count
  from public.split_days
  where owner_user_id = current_user_id
    and id = any(target_ordered_day_ids);

  if unique_count <> 7 or owned_count <> 7 then
    raise exception 'The requested split order is invalid';
  end if;

  if not exists (
    select 1
    from public.split_days
    where owner_user_id = current_user_id
      and id = target_ordered_day_ids[7]
      and workout_type = 'rest'::public.workout_type
  ) then
    raise exception 'Friday must remain a rest day';
  end if;

  select jsonb_object_agg(
    day.id::text,
    jsonb_build_object(
      'workout_type', day.workout_type,
      'display_name', day.display_name,
      'focus_label', day.focus_label,
      'icon_key', day.icon_key,
      'color_key', day.color_key,
      'day_notes', day.day_notes,
      'exercises', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'exercise_id', split_exercise.exercise_id,
            'position', split_exercise.position,
            'target_sets', split_exercise.target_sets,
            'target_reps_min', split_exercise.target_reps_min,
            'target_reps_max', split_exercise.target_reps_max,
            'is_personal_addition', split_exercise.is_personal_addition
          )
          order by split_exercise.position
        )
        from public.split_exercises split_exercise
        where split_exercise.split_day_id = day.id
      ), '[]'::jsonb)
    )
  )
  into snapshots
  from public.split_days day
  where day.owner_user_id = current_user_id;

  for index_value in 1..7 loop
    source_snapshot := snapshots -> target_ordered_day_ids[index_value]::text;

    select id
    into target_day_id
    from public.split_days
    where owner_user_id = current_user_id
      and weekday = ordered_weekdays[index_value]
    limit 1;

    update public.split_days
    set workout_type = (source_snapshot ->> 'workout_type')::public.workout_type,
        display_name = source_snapshot ->> 'display_name',
        focus_label = source_snapshot ->> 'focus_label',
        icon_key = coalesce(source_snapshot ->> 'icon_key', 'dumbbell'),
        color_key = coalesce(source_snapshot ->> 'color_key', 'indigo'),
        day_notes = coalesce(source_snapshot ->> 'day_notes', ''),
        updated_at = now()
    where id = target_day_id;

    delete from public.split_exercises
    where split_day_id = target_day_id;

    insert into public.split_exercises (
      split_day_id,
      exercise_id,
      position,
      target_sets,
      target_reps_min,
      target_reps_max,
      is_personal_addition
    )
    select target_day_id,
           (exercise_item ->> 'exercise_id')::uuid,
           (exercise_item ->> 'position')::integer,
           (exercise_item ->> 'target_sets')::integer,
           (exercise_item ->> 'target_reps_min')::integer,
           (exercise_item ->> 'target_reps_max')::integer,
           (exercise_item ->> 'is_personal_addition')::boolean
    from jsonb_array_elements(source_snapshot -> 'exercises') as exercise_item;
  end loop;

  week_start := current_date - ((extract(dow from current_date)::integer + 1) % 7);
  delete from public.weekly_schedule_days
  where user_id = current_user_id
    and schedule_date >= week_start;

  perform public.ensure_week_schedule(current_date);
end;
$$;

grant execute on function public.apply_girls_strength_4_template() to authenticated;
grant execute on function public.reorder_personal_split_days(uuid[]) to authenticated;

notify pgrst, 'reload schema';

-- ============================================================================
-- 202607190002_offline_theme_split_fix_v040.sql
-- ============================================================================

-- Gym Crew Mobile v0.4.0
-- Verifies that the Girls 4-Day preset is fully applied and rebuilds the
-- current/future weekly schedule using Cairo's local date.

create or replace function public.apply_girls_strength_4_template_v2()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  cairo_today date := (timezone('Africa/Cairo', now()))::date;
  week_start date;
  applied_days integer;
  applied_exercises integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  perform public.apply_girls_strength_4_template();

  select count(*)
  into applied_days
  from public.split_days as day
  where day.owner_user_id = current_user_id
    and day.display_name in ('Girls Day 1', 'Girls Day 2', 'Girls Day 3', 'Girls Day 4')
    and day.workout_type <> 'rest'::public.workout_type;

  select count(*)
  into applied_exercises
  from public.split_exercises as item
  inner join public.split_days as day on day.id = item.split_day_id
  where day.owner_user_id = current_user_id
    and day.display_name in ('Girls Day 1', 'Girls Day 2', 'Girls Day 3', 'Girls Day 4');

  if applied_days <> 4 or applied_exercises < 25 then
    raise exception 'Girls 4-Day template was not fully applied (days %, exercises %)', applied_days, applied_exercises;
  end if;

  week_start := cairo_today - ((extract(dow from cairo_today)::integer + 1) % 7);

  delete from public.weekly_schedule_days as schedule
  where schedule.user_id = current_user_id
    and schedule.schedule_date >= week_start;

  perform public.ensure_week_schedule(cairo_today);

  return jsonb_build_object(
    'ok', true,
    'training_days', applied_days,
    'exercise_count', applied_exercises,
    'week_start', week_start
  );
end;
$$;

grant execute on function public.apply_girls_strength_4_template_v2() to authenticated;

notify pgrst, 'reload schema';

-- ============================================================================
-- 202607190003_rescue_offline_split_v050.sql
-- ============================================================================

-- Gym Crew Mobile v0.5.0 rescue migration
-- Makes the Girls 4-Day preset verifiable and rebuilds the active week using
-- Cairo's local date. This wrapper is idempotent and keeps RLS untouched.

create or replace function public.apply_girls_strength_4_template_v3()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  cairo_today date := (timezone('Africa/Cairo', now()))::date;
  week_start date;
  applied_days integer;
  applied_exercises integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  perform public.apply_girls_strength_4_template_v2();

  select count(*)
    into applied_days
  from public.split_days as d
  where d.owner_user_id = current_user_id
    and d.display_name in ('Girls Day 1', 'Girls Day 2', 'Girls Day 3', 'Girls Day 4')
    and d.workout_type <> 'rest'::public.workout_type;

  select count(*)
    into applied_exercises
  from public.split_exercises as se
  inner join public.split_days as d on d.id = se.split_day_id
  where d.owner_user_id = current_user_id
    and d.display_name in ('Girls Day 1', 'Girls Day 2', 'Girls Day 3', 'Girls Day 4');

  if applied_days <> 4 or applied_exercises <> 25 then
    raise exception 'Girls 4-Day template verification failed (days %, exercises %)', applied_days, applied_exercises;
  end if;

  week_start := cairo_today - ((extract(dow from cairo_today)::integer + 1) % 7);

  delete from public.weekly_schedule_days as w
  where w.user_id = current_user_id
    and w.schedule_date >= week_start;

  perform public.ensure_week_schedule(cairo_today);

  return jsonb_build_object(
    'ok', true,
    'training_days', applied_days,
    'exercise_count', applied_exercises,
    'week_start', week_start,
    'timezone', 'Africa/Cairo'
  );
end;
$$;

grant execute on function public.apply_girls_strength_4_template_v3() to authenticated;

notify pgrst, 'reload schema';

