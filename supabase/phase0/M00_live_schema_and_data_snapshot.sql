-- FACKTS Hoops Admin Rebuild - Phase 0 / M00
-- NON-PERSISTENT PRODUCTION INVENTORY. This file creates only a session-local
-- temporary table and changes no application data. PostgreSQL does not allow
-- CREATE TEMPORARY TABLE inside an explicitly read-only transaction, so this
-- transaction is read-write only for its temporary scratch table. The final
-- ROLLBACK removes that table and every scratch insert.
-- Run this against the exact production project before applying M01 or later.

begin;

create temporary table phase0_snapshot_counts (
  table_schema text not null,
  table_name text not null,
  row_count bigint,
  error text
) on commit drop;

do $$
declare
  table_record record;
  counted_rows bigint;
begin
  for table_record in
    select n.nspname as table_schema, c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r', 'p')
      and n.nspname in ('public', 'storage')
    order by n.nspname, c.relname
  loop
    begin
      execute format(
        'select count(*) from %I.%I',
        table_record.table_schema,
        table_record.table_name
      ) into counted_rows;

      insert into phase0_snapshot_counts(table_schema, table_name, row_count)
      values (table_record.table_schema, table_record.table_name, counted_rows);
    exception when others then
      insert into phase0_snapshot_counts(table_schema, table_name, error)
      values (table_record.table_schema, table_record.table_name, sqlerrm);
    end;
  end loop;
end;
$$;

with
columns_inventory as (
  select
    c.table_schema,
    c.table_name,
    c.ordinal_position,
    c.column_name,
    c.data_type,
    c.udt_name,
    c.is_nullable,
    c.column_default,
    c.is_identity,
    c.identity_generation,
    c.is_generated,
    c.generation_expression
  from information_schema.columns c
  where c.table_schema in ('public', 'storage')
),
constraints_inventory as (
  select
    n.nspname as table_schema,
    cls.relname as table_name,
    con.conname as constraint_name,
    con.contype as constraint_type,
    pg_get_constraintdef(con.oid, true) as definition
  from pg_constraint con
  join pg_class cls on cls.oid = con.conrelid
  join pg_namespace n on n.oid = cls.relnamespace
  where n.nspname in ('public', 'storage')
),
indexes_inventory as (
  select schemaname as table_schema, tablename as table_name, indexname, indexdef
  from pg_indexes
  where schemaname in ('public', 'storage')
),
policies_inventory as (
  select
    schemaname as table_schema,
    tablename as table_name,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
  from pg_policies
  where schemaname in ('public', 'storage')
),
functions_inventory as (
  select
    n.nspname as function_schema,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as identity_arguments,
    pg_get_functiondef(p.oid) as definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
),
triggers_inventory as (
  select
    event_object_schema as table_schema,
    event_object_table as table_name,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
  from information_schema.triggers
  where event_object_schema in ('public', 'storage')
),
rls_inventory as (
  select
    n.nspname as table_schema,
    c.relname as table_name,
    c.relrowsecurity as rls_enabled,
    c.relforcerowsecurity as rls_forced
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where c.relkind in ('r', 'p')
    and n.nspname in ('public', 'storage')
),
duplicate_people as (
  select normalized_name, count(*) as record_count, jsonb_agg(source_key order by source_key) as source_keys
  from (
    select
      'player:' || id::text as source_key,
      regexp_replace(lower(trim(coalesce(
        nullif(to_jsonb(p)->>'full_name', ''),
        nullif(to_jsonb(p)->>'name', ''),
        nullif(to_jsonb(p)->>'nickname', '')
      ))), '[^a-z0-9]+', '', 'g') as normalized_name
    from public.players p
    union all
    select
      'guest:' || id::text,
      regexp_replace(lower(trim(coalesce(
        nullif(to_jsonb(g)->>'full_name', ''),
        nullif(to_jsonb(g)->>'name', ''),
        nullif(to_jsonb(g)->>'nickname', '')
      ))), '[^a-z0-9]+', '', 'g')
    from public.guest_hoopers g
  ) identities
  where normalized_name <> ''
  group by normalized_name
  having count(*) > 1
),
orphan_checks as (
  select 'guest_without_source_player' as check_name, count(*)::bigint as issue_count
  from public.guest_hoopers g
  where g.source_player_id is null
  union all
  select 'guest_with_missing_source_player', count(*)::bigint
  from public.guest_hoopers g
  left join public.players p on p.id = g.source_player_id
  where g.source_player_id is not null and p.id is null
  union all
  select 'game_roster_missing_player', count(*)::bigint
  from public.game_rosters r
  left join public.players p on p.id = r.player_id
  where p.id is null
  union all
  select 'guest_roster_missing_guest', count(*)::bigint
  from public.game_guest_rosters r
  left join public.guest_hoopers g on g.id = r.guest_hooper_id
  where g.id is null
  union all
  select 'player_stats_missing_player', count(*)::bigint
  from public.player_game_stats s
  left join public.players p on p.id = s.player_id
  where p.id is null
  union all
  select 'guest_stats_missing_guest', count(*)::bigint
  from public.guest_game_stats s
  left join public.guest_hoopers g on g.id = s.guest_hooper_id
  where g.id is null
),
duplicate_game_people as (
  select 'game_rosters' as source_table, game_id::text, player_id::text, count(*)::bigint as duplicate_count
  from public.game_rosters
  group by game_id, player_id
  having count(*) > 1
  union all
  select 'player_game_stats', game_id::text, player_id::text, count(*)::bigint
  from public.player_game_stats
  group by game_id, player_id
  having count(*) > 1
)
select jsonb_pretty(
  jsonb_build_object(
    'snapshot_name', 'FACKTS Hoops Phase 0 M00',
    'captured_at', now(),
    'database_name', current_database(),
    'database_user', current_user,
    'server_version', version(),
    'row_counts', (select coalesce(jsonb_agg(to_jsonb(c) order by c.table_schema, c.table_name), '[]'::jsonb) from phase0_snapshot_counts c),
    'columns', (select coalesce(jsonb_agg(to_jsonb(c) order by c.table_schema, c.table_name, c.ordinal_position), '[]'::jsonb) from columns_inventory c),
    'constraints', (select coalesce(jsonb_agg(to_jsonb(c) order by c.table_schema, c.table_name, c.constraint_name), '[]'::jsonb) from constraints_inventory c),
    'indexes', (select coalesce(jsonb_agg(to_jsonb(i) order by i.table_schema, i.table_name, i.indexname), '[]'::jsonb) from indexes_inventory i),
    'row_level_security', (select coalesce(jsonb_agg(to_jsonb(r) order by r.table_schema, r.table_name), '[]'::jsonb) from rls_inventory r),
    'policies', (select coalesce(jsonb_agg(to_jsonb(p) order by p.table_schema, p.table_name, p.policyname), '[]'::jsonb) from policies_inventory p),
    'functions', (select coalesce(jsonb_agg(to_jsonb(f) order by f.function_schema, f.function_name, f.identity_arguments), '[]'::jsonb) from functions_inventory f),
    'triggers', (select coalesce(jsonb_agg(to_jsonb(t) order by t.table_schema, t.table_name, t.trigger_name), '[]'::jsonb) from triggers_inventory t),
    'duplicate_people_candidates', (select coalesce(jsonb_agg(to_jsonb(d) order by d.normalized_name), '[]'::jsonb) from duplicate_people d),
    'orphan_checks', (select coalesce(jsonb_agg(to_jsonb(o) order by o.check_name), '[]'::jsonb) from orphan_checks o),
    'duplicate_game_person_pairs', (select coalesce(jsonb_agg(to_jsonb(d) order by d.source_table, d.game_id, d.player_id), '[]'::jsonb) from duplicate_game_people d)
  )
) as phase0_snapshot;

rollback;
