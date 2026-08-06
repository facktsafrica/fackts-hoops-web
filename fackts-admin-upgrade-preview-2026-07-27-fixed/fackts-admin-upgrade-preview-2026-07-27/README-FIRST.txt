FACKTS ADMIN UPGRADE - LOCAL PREVIEW

This package repairs and adds:
- The SQL notification-table error.
- A real device push test with delivery diagnostics.
- Player activity on the super-admin dashboard.
- Mini admins with selectable access rights.

It does NOT change:
- The public players page or player-card redesign.
- The public 1v1 page or rankings design.
- Existing player, match, game or stats records.
- GitHub, Vercel or the live website.

APPLY IN THIS ORDER

1. Open 01-RUN-IN-SUPABASE.sql.
2. Copy all its contents into the Supabase SQL Editor and click Run.
3. Confirm the result says:
   FACKTS admin upgrade installed successfully
4. Return to this extracted folder.
5. Press Alt + D, type cmd, then press Enter.
6. In the black window type:

   APPLY-ADMIN-UPGRADE.cmd

7. Wait for SUCCESS.
8. Start the normal app from fackts-hoops-web:

   npm run dev

9. Test:
   http://localhost:3000/admin
   http://localhost:3000/admin/notifications
   http://localhost:3000/admin/mini-admins
   http://localhost:3000/player

PHONE NOTIFICATION REQUIREMENTS

The app still needs these valid variables in .env.local and Vercel:
- NEXT_PUBLIC_VAPID_PUBLIC_KEY
- VAPID_PRIVATE_KEY
- VAPID_SUBJECT

The new Send Test Alert button confirms whether the push provider accepted a
real test for the signed-in phone. Popup, sound and vibration also depend on
the phone browser's notification permissions and silent-mode settings.

SAFETY

The installer checks every existing file before it changes anything. If a file
contains other local work, it stops with "STOPPED SAFELY" and changes nothing.
It also creates a timestamped backup before applying the upgrade.

To restore the local files, run:

   RESTORE-ADMIN-UPGRADE.cmd

The restore command does not reverse SQL that was already run in Supabase.
