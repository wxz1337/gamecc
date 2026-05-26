-- This migration uses plain CREATE INDEX because it was applied on a small
-- dataset and has already been executed in the remote project. For future
-- index-only migrations on larger tables, consider CREATE INDEX CONCURRENTLY.
create index if not exists matches_source_display_date_begin_at_idx
  on public.matches (source, display_date, begin_at);

create index if not exists matches_source_game_display_date_begin_at_idx
  on public.matches (source, game, display_date, begin_at);

create index if not exists matches_source_game_status_display_date_begin_at_idx
  on public.matches (source, game, status, display_date, begin_at);

create index if not exists match_fetch_windows_fresh_lookup_idx
  on public.match_fetch_windows (source, game, from_date, to_date, status_group, expires_at);

create index if not exists sync_runs_source_game_started_at_idx
  on public.sync_runs (source, game, started_at desc);

create or replace function public.set_match_cache_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_matches_updated_at on public.matches;
create trigger set_matches_updated_at
  before update on public.matches
  for each row
  execute function public.set_match_cache_updated_at();

drop trigger if exists set_match_fetch_windows_updated_at on public.match_fetch_windows;
create trigger set_match_fetch_windows_updated_at
  before update on public.match_fetch_windows
  for each row
  execute function public.set_match_cache_updated_at();

drop function if exists public.set_updated_at();
