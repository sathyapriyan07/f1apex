-- ============================================================
-- F1DB Schema v3 — Add image/media URL columns
-- Run in Supabase SQL Editor after v1 and v2
-- ============================================================

-- Drivers: photo URL
alter table public.drivers
  add column if not exists image_url text;

-- Teams: logo URL
alter table public.teams
  add column if not exists logo_url text;

-- Teams: primary color (hex string, e.g. #3671c6)
alter table public.teams
  add column if not exists team_color text;

-- Circuits: track layout image URL
alter table public.circuits
  add column if not exists layout_url text;

-- Races: podium / hero image URL (optional)
alter table public.races
  add column if not exists image_url text;
