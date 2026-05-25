create extension if not exists pgcrypto;

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  game text not null,
  provider_match_id text not null,
  name text not null,
  begin_at timestamptz not null,
  end_at timestamptz,
  display_date date not null,
  status text not null,
  league text,
  league_image_url text,
  tournament text,
  tournament_type text,
  tournament_country text,
  tournament_region text,
  tournament_tier text,
  tournament_prizepool text,
  has_bracket boolean,
  best_of integer,
  match_type text,
  rescheduled boolean,
  detailed_stats_available boolean,
  draw boolean,
  forfeit boolean,
  winner_team_id text,
  winner_name text,
  teams jsonb not null default '[]'::jsonb,
  score jsonb not null default '[]'::jsonb,
  games jsonb not null default '[]'::jsonb,
  stream_url text,
  replay_url text,
  serie text,
  stage text,
  raw_payload jsonb,
  provider_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matches_source_game_provider_match_id_key unique (source, game, provider_match_id)
);

create index if not exists matches_game_display_date_idx
  on public.matches (game, display_date);

create index if not exists matches_game_begin_at_idx
  on public.matches (game, begin_at);

create index if not exists matches_status_begin_at_idx
  on public.matches (status, begin_at);

create index if not exists matches_tournament_tier_idx
  on public.matches (tournament_tier);

create index if not exists matches_tournament_region_idx
  on public.matches (tournament_region);

create table if not exists public.match_fetch_windows (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  game text not null,
  from_date date not null,
  to_date date not null,
  status_group text not null,
  last_synced_at timestamptz,
  expires_at timestamptz,
  last_error_code text,
  last_error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint match_fetch_windows_source_game_from_date_to_date_status_group_key unique (source, game, from_date, to_date, status_group)
);

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  game text not null,
  from_date date not null,
  to_date date not null,
  status_group text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  success boolean not null default false,
  fetched_count integer not null default 0,
  upserted_count integer not null default 0,
  error_code text,
  error_message text
);

alter table public.matches enable row level security;
alter table public.match_fetch_windows enable row level security;
alter table public.sync_runs enable row level security;
