create table if not exists public.teams (
  id text not null,
  name text not null,
  acronym text,
  image_url text,
  dark_image_url text,
  cached_image_url text,
  cached_dark_image_url text,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teams_pkey primary key (id)
);

create index if not exists teams_last_seen_at_idx
  on public.teams (last_seen_at desc);

create index if not exists teams_cached_image_url_idx
  on public.teams (cached_image_url)
  where cached_image_url is not null;

create index if not exists teams_cached_dark_image_url_idx
  on public.teams (cached_dark_image_url)
  where cached_dark_image_url is not null;

create or replace function public.set_match_cache_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_teams_updated_at on public.teams;
create trigger set_teams_updated_at
  before update on public.teams
  for each row
  execute function public.set_match_cache_updated_at();

alter table public.teams enable row level security;
