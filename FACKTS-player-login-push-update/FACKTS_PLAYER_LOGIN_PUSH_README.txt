FACKTS PLAYER LOGIN + PUSH UPDATE

FILES
- fackts-player-login-push-core.patch
- fackts-calendar-push-hooks.patch

SAFE INSTALL ORDER

1. Put both patch files in the root of the FACKTS project.

2. Apply the core update first:
   git apply --3way .\fackts-player-login-push-core.patch

3. Because your two calendar files already contain separate local work, do not
   overwrite them. In the VS Code Agent, use this instruction:

   Read fackts-calendar-push-hooks.patch and merge its changes semantically into
   only app/calendar/page.tsx and app/admin/calendar/page.tsx. Preserve every
   existing local calendar feature and do not replace either full file. The goal
   is to add sendAppEvent/sendAdminAppEvent and call the notification-events API
   after player availability, challenge, game/event response, and admin matchup
   approval/rejection actions. Run npm run build afterward.

4. Run the new Supabase migration:
   supabase/migrations/20260721_push_notifications.sql

5. Generate VAPID keys locally:
   npx web-push generate-vapid-keys

6. Add the generated keys to Vercel:
   NEXT_PUBLIC_VAPID_PUBLIC_KEY
   VAPID_PRIVATE_KEY
   VAPID_SUBJECT=mailto:facktsafrica@gmail.com

7. Redeploy, log in, and enable notifications once on each phone or laptop.

Do not stage unrelated local files or the two downloaded patch files.
