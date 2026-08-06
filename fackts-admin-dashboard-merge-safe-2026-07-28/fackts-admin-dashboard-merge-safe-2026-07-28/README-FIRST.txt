FACKTS ADMIN DASHBOARD - MERGE-SAFE INSTALLER

The Supabase SQL is already installed. Do not run it again.

This installer provisions the Mini Admin management screen in your Super Admin
dashboard and merges the rest of the verified admin upgrade into your newer
local files.

It does not create a new person now. Later, you can open:

Admin > Mini Admins

Then enter the person's name and email, choose their exact rights, and activate
the account.

TO APPLY

1. Open this extracted folder.
2. Press Alt + D.
3. Type cmd and press Enter.
4. In the black window, type:

   APPLY-DASHBOARD-UPGRADE.cmd

5. Press Enter.

If it says SUCCESS, start the normal app and open /admin.

SAFETY

- Your current local files are backed up before any change.
- Line-ending differences are handled automatically.
- New code is merged with your local edits instead of replacing whole files.
- If a real code conflict exists, it stops before changing any FACKTS file.
- It does not run SQL, push Git, deploy, or create a Mini Admin account.
