-- ============================================================
-- F1DB Schema v5 — Race Highlights (YouTube, multiple per race)
-- Run in Supabase SQL Editor
-- ============================================================

-- Remove old single-url column if it exists
alter table public.races drop column if exists highlight_url;

create table if not exists public.race_highlights (
  id uuid default uuid_generate_v4() primary key,
  race_id uuid not null references public.races(id) on delete cascade,
  title text not null default '',
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

alter table public.race_highlights enable row level security;

create policy "Public read race_highlights" on public.race_highlights for select using (true);
create policy "Admin insert race_highlights" on public.race_highlights
  for insert with check ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "Admin update race_highlights" on public.race_highlights
  for update using ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "Admin delete race_highlights" on public.race_highlights
  for delete using ((select role from public.profiles where id = auth.uid()) = 'admin');
