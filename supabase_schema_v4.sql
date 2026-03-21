-- ============================================================
-- F1DB Schema v4 — Public read (guest browsing) policies
-- Run in Supabase SQL Editor (safe to re-run)
-- ============================================================

-- Ensure RLS enabled for all data tables used by the app
alter table public.race_results          enable row level security;
alter table public.driver_standings      enable row level security;
alter table public.constructor_standings enable row level security;
alter table public.lap_times             enable row level security;

-- Public read policies (anon + authenticated)
drop policy if exists "Public read race_results"          on public.race_results;
drop policy if exists "Public read driver_standings"      on public.driver_standings;
drop policy if exists "Public read constructor_standings" on public.constructor_standings;
drop policy if exists "Public read lap_times"             on public.lap_times;

create policy "Public read race_results"          on public.race_results          for select using (true);
create policy "Public read driver_standings"      on public.driver_standings      for select using (true);
create policy "Public read constructor_standings" on public.constructor_standings for select using (true);
create policy "Public read lap_times"             on public.lap_times             for select using (true);

-- Admin-only write policies (insert/update/delete)
drop policy if exists "Admin insert race_results" on public.race_results;
drop policy if exists "Admin update race_results" on public.race_results;
drop policy if exists "Admin delete race_results" on public.race_results;

drop policy if exists "Admin insert driver_standings" on public.driver_standings;
drop policy if exists "Admin update driver_standings" on public.driver_standings;
drop policy if exists "Admin delete driver_standings" on public.driver_standings;

drop policy if exists "Admin insert constructor_standings" on public.constructor_standings;
drop policy if exists "Admin update constructor_standings" on public.constructor_standings;
drop policy if exists "Admin delete constructor_standings" on public.constructor_standings;

drop policy if exists "Admin insert lap_times" on public.lap_times;
drop policy if exists "Admin update lap_times" on public.lap_times;
drop policy if exists "Admin delete lap_times" on public.lap_times;

create policy "Admin insert race_results" on public.race_results
  for insert with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "Admin update race_results" on public.race_results
  for update using ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "Admin delete race_results" on public.race_results
  for delete using ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "Admin insert driver_standings" on public.driver_standings
  for insert with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "Admin update driver_standings" on public.driver_standings
  for update using ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "Admin delete driver_standings" on public.driver_standings
  for delete using ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "Admin insert constructor_standings" on public.constructor_standings
  for insert with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "Admin update constructor_standings" on public.constructor_standings
  for update using ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "Admin delete constructor_standings" on public.constructor_standings
  for delete using ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "Admin insert lap_times" on public.lap_times
  for insert with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "Admin update lap_times" on public.lap_times
  for update using ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "Admin delete lap_times" on public.lap_times
  for delete using ((select role from public.profiles where id = auth.uid()) = 'admin');

