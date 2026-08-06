FACKTS HOOPS - NOTIFICATION SYSTEM FIX
28 July 2026

THIS PACKAGE ONLY CHANGES THE PUSH NOTIFICATION SYSTEM.
It does not change Player Activity, Mini Admins, SQL, Supabase data or public/sw.js.

APPLY
1. Keep this extracted folder inside your fackts-hoops-web project folder.
2. Double-click APPLY-NOTIFICATION-FIX.cmd.
3. Wait for SUCCESS.
4. In your project PowerShell, run: npm run build
5. Start the app with: npm run dev
6. Open /admin/notifications and select Repair Notifications if shown.
7. Send a test alert.

The installer checks the exact files from commit 5d27d2b before changing anything.
If a file has unexpected edits, it stops safely and changes nothing.
It creates a backup before applying the fix.

RESTORE
Double-click RESTORE-NOTIFICATION-FIX.cmd to restore the backup made by the
most recent successful installation.

DO NOT run SQL for this fix.
DO NOT paste VAPID or Supabase secret keys into chat.
