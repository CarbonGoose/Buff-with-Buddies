-- ================================
-- BUFF WITH BUDDIES / TRANSFORMATION CHALLENGE
-- Supabase database setup
-- ================================

-- Needed for UUIDs and invite codes
create extension if not exists pgcrypto;


-- ================================
-- TABLES
-- ================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Ny deltager',
  created_at timestamptz not null default now()
);

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  invite_code text not null unique default upper(encode(gen_random_bytes(4), 'hex')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.challenge_members (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  unique (challenge_id, user_id)
);

create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  checked_values text[] not null default '{}',
  base_complete boolean not null default false,
  base_points integer not null default 0,
  bonus_points integer not null default 0,
  total_points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (challenge_id, user_id, log_date)
);

create table if not exists public.weekly_checkins (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  checkin_date date not null default current_date,
  weight numeric(5,2),
  waist numeric(5,2),
  weight_lost numeric(5,2) not null default 0,
  notes text,
  bonus_points integer not null default 0,
  created_at timestamptz not null default now()
);


-- ================================
-- INDEXES
-- ================================

create index if not exists idx_challenge_members_challenge_id
on public.challenge_members(challenge_id);

create index if not exists idx_challenge_members_user_id
on public.challenge_members(user_id);

create index if not exists idx_daily_logs_challenge_id
on public.daily_logs(challenge_id);

create index if not exists idx_daily_logs_user_id
on public.daily_logs(user_id);

create index if not exists idx_daily_logs_log_date
on public.daily_logs(log_date);

create index if not exists idx_weekly_checkins_challenge_id
on public.weekly_checkins(challenge_id);

create index if not exists idx_weekly_checkins_user_id
on public.weekly_checkins(user_id);


-- ================================
-- HELPER FUNCTIONS
-- ================================

-- Checks if the current logged-in user is a member of a challenge
create or replace function public.is_challenge_member(challenge_id_to_check uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.challenge_members cm
    where cm.challenge_id = challenge_id_to_check
      and cm.user_id = auth.uid()
  );
$$;

-- Checks if the current logged-in user owns a challenge
create or replace function public.is_challenge_owner(challenge_id_to_check uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.challenge_members cm
    where cm.challenge_id = challenge_id_to_check
      and cm.user_id = auth.uid()
      and cm.role = 'owner'
  );
$$;

-- Creates a profile automatically when someone signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(new.email, '@', 1),
      'Ny deltager'
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();


-- Updates updated_at automatically on daily_logs
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_daily_logs_updated_at on public.daily_logs;

create trigger set_daily_logs_updated_at
before update on public.daily_logs
for each row execute function public.set_updated_at();


-- Creates a challenge and makes current user owner
create or replace function public.create_challenge(challenge_title text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_challenge_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in to create a challenge.';
  end if;

  insert into public.challenges (title, created_by)
  values (challenge_title, auth.uid())
  returning id into new_challenge_id;

  insert into public.challenge_members (challenge_id, user_id, role)
  values (new_challenge_id, auth.uid(), 'owner');

  return new_challenge_id;
end;
$$;

-- Lets a user join a challenge with an invite code
create or replace function public.join_challenge_by_code(code_to_join text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  found_challenge_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in to join a challenge.';
  end if;

  select id
  into found_challenge_id
  from public.challenges
  where invite_code = upper(trim(code_to_join))
  limit 1;

  if found_challenge_id is null then
    raise exception 'No challenge found with that invite code.';
  end if;

  insert into public.challenge_members (challenge_id, user_id, role)
  values (found_challenge_id, auth.uid(), 'member')
  on conflict (challenge_id, user_id) do nothing;

  return found_challenge_id;
end;
$$;


-- Allow authenticated users to call these functions
grant execute on function public.is_challenge_member(uuid) to authenticated;
grant execute on function public.is_challenge_owner(uuid) to authenticated;
grant execute on function public.create_challenge(text) to authenticated;
grant execute on function public.join_challenge_by_code(text) to authenticated;


-- ================================
-- ROW LEVEL SECURITY
-- ================================

alter table public.profiles enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_members enable row level security;
alter table public.daily_logs enable row level security;
alter table public.weekly_checkins enable row level security;


-- ================================
-- DROP OLD POLICIES IF RE-RUNNING
-- ================================

drop policy if exists "Profiles are visible to logged in users" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

drop policy if exists "Members can view their challenges" on public.challenges;
drop policy if exists "Logged in users can create challenges" on public.challenges;
drop policy if exists "Owners can update challenges" on public.challenges;
drop policy if exists "Owners can delete challenges" on public.challenges;

drop policy if exists "Members can view challenge members" on public.challenge_members;
drop policy if exists "Owners can add challenge members" on public.challenge_members;
drop policy if exists "Owners can update challenge members" on public.challenge_members;
drop policy if exists "Owners or self can delete challenge members" on public.challenge_members;

drop policy if exists "Members can view daily logs" on public.daily_logs;
drop policy if exists "Users can insert own daily logs" on public.daily_logs;
drop policy if exists "Users can update own daily logs" on public.daily_logs;
drop policy if exists "Users can delete own daily logs" on public.daily_logs;

drop policy if exists "Members can view weekly checkins" on public.weekly_checkins;
drop policy if exists "Users can insert own weekly checkins" on public.weekly_checkins;
drop policy if exists "Users can update own weekly checkins" on public.weekly_checkins;
drop policy if exists "Users can delete own weekly checkins" on public.weekly_checkins;


-- ================================
-- PROFILES POLICIES
-- ================================

create policy "Profiles are visible to logged in users"
on public.profiles
for select
to authenticated
using (true);

create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());


-- ================================
-- CHALLENGES POLICIES
-- ================================

create policy "Members can view their challenges"
on public.challenges
for select
to authenticated
using (
  public.is_challenge_member(id)
  or created_by = auth.uid()
);

create policy "Logged in users can create challenges"
on public.challenges
for insert
to authenticated
with check (created_by = auth.uid());

create policy "Owners can update challenges"
on public.challenges
for update
to authenticated
using (public.is_challenge_owner(id))
with check (public.is_challenge_owner(id));

create policy "Owners can delete challenges"
on public.challenges
for delete
to authenticated
using (public.is_challenge_owner(id));


-- ================================
-- CHALLENGE MEMBERS POLICIES
-- ================================

create policy "Members can view challenge members"
on public.challenge_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_challenge_member(challenge_id)
);

create policy "Owners can add challenge members"
on public.challenge_members
for insert
to authenticated
with check (
  public.is_challenge_owner(challenge_id)
  or (
    user_id = auth.uid()
    and exists (
      select 1
      from public.challenges c
      where c.id = challenge_id
        and c.created_by = auth.uid()
    )
  )
);

create policy "Owners can update challenge members"
on public.challenge_members
for update
to authenticated
using (public.is_challenge_owner(challenge_id))
with check (public.is_challenge_owner(challenge_id));

create policy "Owners or self can delete challenge members"
on public.challenge_members
for delete
to authenticated
using (
  public.is_challenge_owner(challenge_id)
  or user_id = auth.uid()
);


-- ================================
-- DAILY LOGS POLICIES
-- ================================

create policy "Members can view daily logs"
on public.daily_logs
for select
to authenticated
using (public.is_challenge_member(challenge_id));

create policy "Users can insert own daily logs"
on public.daily_logs
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_challenge_member(challenge_id)
);

create policy "Users can update own daily logs"
on public.daily_logs
for update
to authenticated
using (
  user_id = auth.uid()
  and public.is_challenge_member(challenge_id)
)
with check (
  user_id = auth.uid()
  and public.is_challenge_member(challenge_id)
);

create policy "Users can delete own daily logs"
on public.daily_logs
for delete
to authenticated
using (
  user_id = auth.uid()
  and public.is_challenge_member(challenge_id)
);


-- ================================
-- WEEKLY CHECKINS POLICIES
-- ================================

create policy "Members can view weekly checkins"
on public.weekly_checkins
for select
to authenticated
using (public.is_challenge_member(challenge_id));

create policy "Users can insert own weekly checkins"
on public.weekly_checkins
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_challenge_member(challenge_id)
);

create policy "Users can update own weekly checkins"
on public.weekly_checkins
for update
to authenticated
using (
  user_id = auth.uid()
  and public.is_challenge_member(challenge_id)
)
with check (
  user_id = auth.uid()
  and public.is_challenge_member(challenge_id)
);

create policy "Users can delete own weekly checkins"
on public.weekly_checkins
for delete
to authenticated
using (
  user_id = auth.uid()
  and public.is_challenge_member(challenge_id)
);