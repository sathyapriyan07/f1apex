// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  },
});

// ── Auth helpers ──────────────────────────────────────────────────────────────
export const signUp = (email, password, displayName) =>
  supabase.auth.signUp({
    email, password,
    options: { data: { display_name: displayName, role: 'user' } },
  });

export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password });

export const signOut = () => supabase.auth.signOut();

export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { data, error };
};

// ── CRUD factories ────────────────────────────────────────────────────────────
export const db = {
  // Seasons
  seasons: {
    list:   ()     => supabase.from('seasons').select('*').order('year', { ascending: false }),
    insert: (row)  => supabase.from('seasons').insert(row).select().single(),
    update: (id, row) => supabase.from('seasons').update(row).eq('id', id).select().single(),
    remove: (id)   => supabase.from('seasons').delete().eq('id', id),
  },
  // Circuits
  circuits: {
    list:   ()     => supabase.from('circuits').select('*').order('name'),
    byId:   (id)   => supabase.from('circuits').select('*').eq('id', id).single(),
    insert: (row)  => supabase.from('circuits').insert(row).select().single(),
    update: (id, row) => supabase.from('circuits').update(row).eq('id', id).select().single(),
    remove: (id)   => supabase.from('circuits').delete().eq('id', id),
  },
  // Teams
  teams: {
    list:   ()     => supabase.from('teams').select('*').order('name'),
    byId:   (id)   => supabase.from('teams').select('*').eq('id', id).single(),
    insert: (row)  => supabase.from('teams').insert(row).select().single(),
    update: (id, row) => supabase.from('teams').update(row).eq('id', id).select().single(),
    remove: (id)   => supabase.from('teams').delete().eq('id', id),
  },
  // Drivers
  drivers: {
    list:   ()     => supabase.from('drivers').select('*, teams(id, name)').order('last_name'),
    byId:   (id)   => supabase.from('drivers').select('*, teams(id, name, logo_url, base, nationality, championships, first_entry, team_color)').eq('id', id).single(),
    insert: (row)  => supabase.from('drivers').insert(row).select('*, teams(id, name)').single(),
    update: (id, row) => supabase.from('drivers').update(row).eq('id', id).select('*, teams(id, name)').single(),
    remove: (id)   => supabase.from('drivers').delete().eq('id', id),
  },
  // Races
  races: {
    list:   ()     => supabase.from('races').select('*, circuits(id, name, country, locality, layout_url)').order('season_year', { ascending: false }).order('round'),
    insert: (row)  => supabase.from('races').insert(row).select('*, circuits(id, name, country)').single(),
    update: (id, row) => supabase.from('races').update(row).eq('id', id).select('*, circuits(id, name, country)').single(),
    remove: (id)   => supabase.from('races').delete().eq('id', id),
  },
  // Race Highlights
  race_highlights: {
    listByRace: (raceId) =>
      supabase.from('race_highlights').select('*').eq('race_id', raceId).order('sort_order').order('created_at'),
    insert: (row) => supabase.from('race_highlights').insert(row).select().single(),
    update: (id, row) => supabase.from('race_highlights').update(row).eq('id', id).select().single(),
    remove: (id) => supabase.from('race_highlights').delete().eq('id', id),
  },
  // Race Results
  race_results: {
    listByRace: (raceId) =>
      supabase.from('race_results')
        .select('*, drivers(id, first_name, last_name, code, number, image_url), teams(id, name, logo_url, team_color)')
        .eq('race_id', raceId)
        .order('position', { nullsFirst: false }),
    listBySeason: (year) =>
      supabase.from('race_results')
        .select('driver_id, team_id, points, position, drivers(id, first_name, last_name, code, image_url), teams(id, name, logo_url, team_color), races!inner(season_year)')
        .eq('races.season_year', year),
    insert: (row)         => supabase.from('race_results').insert(row).select('*, drivers(id,first_name,last_name,code,number,image_url), teams(id,name,logo_url,team_color)').single(),
    update: (id, row)     => supabase.from('race_results').update(row).eq('id', id).select('*, drivers(id,first_name,last_name,code,number,image_url), teams(id,name,logo_url,team_color)').single(),
    remove: (id)          => supabase.from('race_results').delete().eq('id', id),
  },

  // Driver Standings
  driver_standings: {
    listBySeason: (year) =>
      supabase.from('driver_standings')
        .select('*, drivers(id, first_name, last_name, code, number, image_url), teams(id, name, logo_url, team_color)')
        .eq('season_year', year)
        .order('position'),
    upsert: (rows) => supabase.from('driver_standings').upsert(rows, { onConflict: 'season_year,driver_id' }),
    remove: (id)   => supabase.from('driver_standings').delete().eq('id', id),
  },

  // Constructor Standings
  constructor_standings: {
    listBySeason: (year) =>
      supabase.from('constructor_standings')
        .select('*, teams(id, name, nationality, logo_url, team_color)')
        .eq('season_year', year)
        .order('position'),
    upsert: (rows) => supabase.from('constructor_standings').upsert(rows, { onConflict: 'season_year,team_id' }),
    remove: (id)   => supabase.from('constructor_standings').delete().eq('id', id),
  },

  // Lap Times
  lap_times: {
    listByRace: (raceId) =>
      supabase.from('lap_times')
        .select('*, drivers(id, first_name, last_name, code)')
        .eq('race_id', raceId)
        .order('lap_number')
        .order('lap_duration_ms'),
    listByRaceDriver: (raceId, driverId) =>
      supabase.from('lap_times')
        .select('*')
        .eq('race_id', raceId)
        .eq('driver_id', driverId)
        .order('lap_number'),
    upsert: (rows) => supabase.from('lap_times').upsert(rows, { onConflict: 'race_id,driver_id,lap_number' }),
    remove: (id)   => supabase.from('lap_times').delete().eq('id', id),
  },

  // Admin: list users
  profiles: {
    list: () => supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    updateRole: (id, role) => supabase.from('profiles').update({ role }).eq('id', id),
  },
};

// ── Import helpers ────────────────────────────────────────────────────────────
export async function upsertMany(table, rows, conflictCol) {
  // If a row exists (matches the unique constraint in `onConflict`), update it; otherwise insert.
  return supabase.from(table).upsert(rows, { onConflict: conflictCol });
}

export const driver_career = {
  results: (driverId) =>
    supabase.from('race_results')
      .select(`
        id, position, grid_position, points, status, fastest_lap, fastest_lap_time, laps_completed, time_or_gap, race_id, team_id,
        races ( id, name, season_year, round, date, sprint, circuit_id, circuits ( id, name, locality, country, layout_url ) ),
        teams ( id, name, logo_url, team_color )
      `)
      .eq('driver_id', driverId)
      .order('season_year', { foreignTable: 'races', ascending: false })
      .order('round', { foreignTable: 'races', ascending: false }),

  standings: (driverId) =>
    supabase.from('driver_standings')
      .select(`season_year, position, points, wins, team_id, teams ( id, name, logo_url, team_color )`)
      .eq('driver_id', driverId)
      .order('season_year', { ascending: false }),
};

export const circuit_detail = {
  races: (circuitId) =>
    supabase.from('races')
      .select(`
        id, name, season_year, round, date, sprint,
        circuits ( id, name, locality, country, layout_url )
      `)
      .eq('circuit_id', circuitId)
      .order('season_year', { ascending: false })
      .order('round', { ascending: false }),

  raceWinners: (circuitId) =>
    supabase.from('race_results')
      .select(`
        race_id,
        races ( id, season_year, round ),
        drivers ( id, first_name, last_name, image_url ),
        teams ( id, name )
      `)
      .eq('position', 1)
      .eq('races.circuit_id', circuitId),

  lapRecords: (circuitId) =>
    supabase.from('lap_times')
      .select(`
        lap_duration_ms, driver_id,
        races ( id, season_year ),
        drivers ( id, first_name, last_name )
      `)
      .eq('races.circuit_id', circuitId)
      .not('lap_duration_ms', 'is', null)
      .order('lap_duration_ms', { ascending: true })
      .limit(10),

  mostWins: (circuitId) =>
    supabase.from('race_results')
      .select(`
        driver_id,
        drivers ( id, first_name, last_name, image_url ),
        teams ( id, name )
      `)
      .eq('position', 1)
      .eq('races.circuit_id', circuitId),

  mostAppearances: (circuitId) =>
    supabase.from('race_results')
      .select(`
        driver_id,
        drivers ( id, first_name, last_name, image_url )
      `)
      .eq('races.circuit_id', circuitId),
};

export const team_detail = {
  results: (teamId) =>
    supabase.from('race_results')
      .select(`
        id, position, grid_position, points, status, fastest_lap, race_id, driver_id,
        races ( id, name, season_year, round, date ),
        drivers ( id, first_name, last_name, image_url, code )
      `)
      .eq('team_id', teamId)
      .order('season_year', { foreignTable: 'races', ascending: false })
      .order('round', { foreignTable: 'races', ascending: false }),

  standings: (teamId) =>
    supabase.from('constructor_standings')
      .select(`
        season_year, position, points, wins
      `)
      .eq('team_id', teamId)
      .order('season_year', { ascending: false }),

  drivers: (teamId) =>
    supabase.from('drivers')
      .select(`
        id, first_name, last_name, number, nationality, active, image_url
      `)
      .eq('team_id', teamId)
      .order('last_name'),
};
