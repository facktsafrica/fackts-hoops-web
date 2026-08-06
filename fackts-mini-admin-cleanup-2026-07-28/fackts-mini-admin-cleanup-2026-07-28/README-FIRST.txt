FACKTS MINI ADMIN CLEANUP

This small correction changes only:

1. app\admin\mini-admins\page.tsx
2. app\api\admin\mini-admins\route.ts

It does not run SQL, touch player or match data, change notifications, push to
GitHub, or deploy to Vercel.

TO APPLY

1. Open this extracted folder.
2. Press Alt + D.
3. Type cmd and press Enter.
4. Type:

   APPLY-MINI-ADMIN-FIX.cmd

5. Wait for SUCCESS.
6. Refresh http://localhost:3000/admin/mini-admins with Ctrl + Shift + R.

EXPECTED RESULT

- Your Super Admin email is displayed.
- Blocked former admins are hidden by default.
- "Show blocked" makes old blocked accounts available when needed.
- The new-account form no longer autofills your own saved login.

TO UNDO

Run RESTORE-MINI-ADMIN-FIX.cmd from this same extracted folder.
