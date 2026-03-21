-- ============================================================
-- F1DB — Schema Extension
-- Run this AFTER the original supabase_schema.sql
-- ============================================================

-- ── Race Results ─────────────────────────────────────────────
create table if not exists public.race_results (
  id             uuid default uuid_generate_v4() primary key,
  race_id        uuid references public.races(id) on delete cascade not null,
  driver_id      uuid references public.drivers(id) on delete cascade not null,
  team_id        uuid references public.teams(id) on delete set null,
  position       integer,          -- finishing position (null = DNF/DNS)
  grid_position  integer,          -- starting grid
  points         numeric(5,2) default 0,
  status         text default 'Finished',  -- 'Finished', '+1 Lap', 'DNF', 'DNS', etc.
  fastest_lap    boolean default false,
  fastest_lap_time text,           -- e.g. "1:23.456"
  laps_completed integer,
  time_or_gap    text,             -- e.g. "+5.234s" or "1:32:05.123"
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  unique(race_id, driver_id)
);

-- ── Driver Championship Standings ─────────────────────────────
create table if not exists public.driver_standings (
  id           uuid default uuid_generate_v4() primary key,
  season_year  integer not null,
  driver_id    uuid references public.drivers(id) on delete cascade not null,
  team_id      uuid references public.teams(id) on delete set null,
  position     integer,
  points       numeric(7,2) default 0,
  wins         integer default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique(season_year, driver_id)
);

-- ── Constructor Championship Standings ────────────────────────
create table if not exists public.constructor_standings (
  id           uuid default uuid_generate_v4() primary key,
  season_year  integer not null,
  team_id      uuid references public.teams(id) on delete cascade not null,
  position     integer,
  points       numeric(7,2) default 0,
  wins         integer default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique(season_year, team_id)
);

-- ── Lap Times (from OpenF1 telemetry) ─────────────────────────
create table if not exists public.lap_times (
  id               uuid default uuid_generate_v4() primary key,
  race_id          uuid references public.races(id) on delete cascade not null,
  driver_id        uuid references public.drivers(id) on delete cascade not null,
  lap_number       integer not null,
  lap_duration_ms  integer,         -- lap time in milliseconds
  sector1_ms       integer,
  sector2_ms       integer,
  sector3_ms       integer,
  is_pit_out_lap   boolean default false,
  created_at       timestamptz default now(),
  unique(race_id, driver_id, lap_number)
);

-- ── Updated_at triggers ───────────────────────────────────────
create trigger set_race_results_updated_at
  before update on public.race_results
  for each row execute procedure public.set_updated_at();

create trigger set_driver_standings_updated_at
  before update on public.driver_standings
  for each row execute procedure public.set_updated_at();

create trigger set_constructor_standings_updated_at
  before update on public.constructor_standings
  for each row execute procedure public.set_updated_at();

-- ── Row Level Security ────────────────────────────────────────
alter table public.race_results          enable row level security;
alter table public.driver_standings      enable row level security;
alter table public.constructor_standings enable row level security;
alter table public.lap_times             enable row level security;

-- Read: public (guest browsing supported)
drop policy if exists "Auth read race_results"          on public.race_results;
drop policy if exists "Auth read driver_standings"      on public.driver_standings;
drop policy if exists "Auth read constructor_standings" on public.constructor_standings;
drop policy if exists "Auth read lap_times"             on public.lap_times;

create policy "Public read race_results"          on public.race_results          for select using (true);
create policy "Public read driver_standings"      on public.driver_standings      for select using (true);
create policy "Public read constructor_standings" on public.constructor_standings for select using (true);
create policy "Public read lap_times"             on public.lap_times             for select using (true);

-- Write: admin only
create policy "Admin insert race_results"   on public.race_results   for insert with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "Admin update race_results"   on public.race_results   for update using    ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "Admin delete race_results"   on public.race_results   for delete using    ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "Admin insert driver_standings"   on public.driver_standings   for insert with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "Admin update driver_standings"   on public.driver_standings   for update using    ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "Admin delete driver_standings"   on public.driver_standings   for delete using    ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "Admin insert constructor_standings" on public.constructor_standings for insert with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "Admin update constructor_standings" on public.constructor_standings for update using    ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "Admin delete constructor_standings" on public.constructor_standings for delete using    ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "Admin insert lap_times"   on public.lap_times   for insert with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "Admin update lap_times"   on public.lap_times   for update using    ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "Admin delete lap_times"   on public.lap_times   for delete using    ((select role from public.profiles where id = auth.uid()) = 'admin');

-- ── Useful indexes ─────────────────────────────────────────────
create index if not exists idx_race_results_race_id     on public.race_results(race_id);
create index if not exists idx_race_results_driver_id   on public.race_results(driver_id);
create index if not exists idx_driver_standings_season  on public.driver_standings(season_year);
create index if not exists idx_constructor_standings_season on public.constructor_standings(season_year);
create index if not exists idx_lap_times_race_driver    on public.lap_times(race_id, driver_id);
create index if not exists idx_lap_times_race_lap       on public.lap_times(race_id, lap_number);
