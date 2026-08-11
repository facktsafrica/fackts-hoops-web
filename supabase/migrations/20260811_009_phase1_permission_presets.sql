-- FACKTS Hoops Admin Rebuild - Phase 1 / M09.1
-- Keeps database authorization presets aligned with the Phase 1 server and
-- navigation model. Existing profiles and explicit overrides are preserved.

begin;

insert into public.admin_role_presets
  (role_key, label, description, permissions, read_only, requires_scope)
values
  (
    'director',
    'Director',
    'Full operational authority across FACKTS Hoops Admin.',
    array[
      'ticker','players','teams','team_members','applications','player_access',
      'games','stats','calendar','events','one_on_one','match_previews',
      'highlights','media','media_stories','guest_hoopers','game_guests',
      'guest_game_stats','guest_one_on_one_stats','rosters',
      'roster_announcements','notifications','partners','email','activity',
      'audit','consents','corrections','reports','admin_users'
    ],
    false,
    false
  ),
  (
    'event_manager',
    'Event Manager',
    'Operates events, games, rosters, consent and delivery reports.',
    array['calendar','events','games','rosters','game_guests','teams','notifications','reports','consents'],
    false,
    false
  ),
  (
    'statistician',
    'Statistician',
    'Manages canonical participation and shared game statistics.',
    array['games','rosters','game_guests','stats','guest_game_stats','one_on_one','guest_one_on_one_stats','highlights','corrections'],
    false,
    false
  ),
  (
    'media_editor',
    'Media Editor',
    'Manages governed media, highlights and public stories.',
    array['media','media_stories','highlights','players','teams','games'],
    false,
    false
  ),
  (
    'team_manager',
    'Team Manager',
    'Manages explicitly assigned teams and their roster records.',
    array['teams','rosters','players','games'],
    false,
    true
  ),
  (
    'organizer_viewer',
    'Organizer Viewer',
    'Reads explicitly assigned event operations and reports.',
    array['calendar','events','games','rosters','stats','media','reports'],
    true,
    true
  ),
  (
    'read_only_partner',
    'Read-only Partner',
    'Reads explicitly assigned partner delivery and reporting records.',
    array['media','reports'],
    true,
    true
  )
on conflict (role_key) do update
set label = excluded.label,
    description = excluded.description,
    permissions = excluded.permissions,
    read_only = excluded.read_only,
    requires_scope = excluded.requires_scope,
    updated_at = now();

comment on table public.admin_role_presets is
  'Database-enforced Admin role presets synchronized with the Phase 1 server permission model.';

commit;
