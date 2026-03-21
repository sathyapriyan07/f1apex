-- ============================================================
-- F1 Database - Supabase Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── User roles ────────────────────────────────────────────────
-- We use Supabase Auth for auth, and a profiles table for roles
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, role, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'user'),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Seasons ───────────────────────────────────────────────────
create table if not exists public.seasons (
  id uuid default uuid_generate_v4() primary key,
  year integer not null unique,
  rounds integer,
  champion_driver text,
  champion_team text,
  url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Circuits ──────────────────────────────────────────────────
create table if not exists public.circuits (
  id uuid default uuid_generate_v4() primary key,
  name text not null unique,
  locality text,
  country text,
  lat numeric(10,6),
  lng numeric(10,6),
  length_km numeric(6,3),
  wiki_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ensure unique constraint exists even if the table was created earlier
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'circuits_name_key'
      and conrelid = 'public.circuits'::regclass
  ) then
    alter table public.circuits add constraint circuits_name_key unique (name);
  end if;
end $$;

-- ── Teams ─────────────────────────────────────────────────────
create table if not exists public.teams (
  id uuid default uuid_generate_v4() primary key,
  name text not null unique,
  nationality text,
  base text,
  team_color text,
  championships integer default 0,
  first_entry integer,
  wiki_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Drivers ───────────────────────────────────────────────────
create table if not exists public.drivers (
  id uuid default uuid_generate_v4() primary key,
  first_name text not null,
  last_name text not null,
  code char(3),
  number integer,
  dob date,
  nationality text,
  team_id uuid references public.teams(id) on delete set null,
  past_team_ids uuid[] not null default '{}',
  active boolean default true,
  wiki_url text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.drivers
  add column if not exists past_team_ids uuid[] not null default '{}';

-- Ensure unique constraint exists even if the table was created earlier
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'drivers_wiki_url_key'
      and conrelid = 'public.drivers'::regclass
  ) then
    alter table public.drivers add constraint drivers_wiki_url_key unique (wiki_url);
  end if;
end $$;

-- ── Races ─────────────────────────────────────────────────────
create table if not exists public.races (
  id uuid default uuid_generate_v4() primary key,
  season_year integer not null,
  round integer not null,
  name text not null,
  circuit_id uuid references public.circuits(id) on delete set null,
  date date,
  time_utc time,
  sprint boolean default false,
  wiki_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(season_year, round)
);

-- ── Updated_at triggers ───────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger set_seasons_updated_at   before update on public.seasons   for each row execute procedure public.set_updated_at();
create trigger set_circuits_updated_at  before update on public.circuits  for each row execute procedure public.set_updated_at();
create trigger set_teams_updated_at     before update on public.teams     for each row execute procedure public.set_updated_at();
create trigger set_drivers_updated_at   before update on public.drivers   for each row execute procedure public.set_updated_at();
create trigger set_races_updated_at     before update on public.races     for each row execute procedure public.set_updated_at();

-- ── Row Level Security ────────────────────────────────────────
alter table public.profiles  enable row level security;
alter table public.seasons   enable row level security;
alter table public.circuits  enable row level security;
alter table public.teams     enable row level security;
alter table public.drivers   enable row level security;
alter table public.races     enable row level security;

-- Avoid RLS recursion when checking admin role
create or replace function public.is_admin(check_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = check_uid and role = 'admin'
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to anon, authenticated;

-- Profiles: users can read own, admins can read all
create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
  on public.profiles for select using (public.is_admin());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = 'user');

drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- Public read (guest browsing supported)
drop policy if exists "Authenticated users can read seasons"  on public.seasons;
drop policy if exists "Authenticated users can read circuits" on public.circuits;
drop policy if exists "Authenticated users can read teams"    on public.teams;
drop policy if exists "Authenticated users can read drivers"  on public.drivers;
drop policy if exists "Authenticated users can read races"    on public.races;

create policy "Public can read seasons"   on public.seasons   for select using (true);
create policy "Public can read circuits"  on public.circuits  for select using (true);
create policy "Public can read teams"     on public.teams     for select using (true);
create policy "Public can read drivers"   on public.drivers   for select using (true);
create policy "Public can read races"     on public.races     for select using (true);

-- Admin-only write
create policy "Admins can insert seasons"   on public.seasons   for insert with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "Admins can update seasons"   on public.seasons   for update using    ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "Admins can delete seasons"   on public.seasons   for delete using    ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "Admins can insert circuits"  on public.circuits  for insert with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "Admins can update circuits"  on public.circuits  for update using    ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "Admins can delete circuits"  on public.circuits  for delete using    ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "Admins can insert teams"     on public.teams     for insert with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "Admins can update teams"     on public.teams     for update using    ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "Admins can delete teams"     on public.teams     for delete using    ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "Admins can insert drivers"   on public.drivers   for insert with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "Admins can update drivers"   on public.drivers   for update using    ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "Admins can delete drivers"   on public.drivers   for delete using    ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "Admins can insert races"     on public.races     for insert with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "Admins can update races"     on public.races     for update using    ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "Admins can delete races"     on public.races     for delete using    ((select role from public.profiles where id = auth.uid()) = 'admin');
