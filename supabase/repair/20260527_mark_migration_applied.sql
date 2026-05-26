-- Repair script for the current v0.6.0 migration history mismatch.
--
-- Use this only after the matching SQL has already been applied manually to
-- the remote database. It removes the known stale remote history entry and
-- restores the local pair of migration versions so `supabase db push` can
-- compare history against the checked-in files again.
begin;

delete from supabase_migrations.schema_migrations
where version = '20260525204141';

insert into supabase_migrations.schema_migrations (version)
values ('20260526'), ('20260527')
on conflict (version) do nothing;

commit;
