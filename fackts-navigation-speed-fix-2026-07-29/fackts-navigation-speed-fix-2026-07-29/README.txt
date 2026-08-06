FACKTS NAVIGATION SPEED FIX - 29 JULY 2026

This installer changes one thing only:
Public pages use a 60-second cache instead of rebuilding from Supabase for
every visitor and every click.

It does not change designs, cards, profiles, highlights, notifications,
rankings, admin pages, or the private Player Portal.

HOW TO INSTALL
1. Put this extracted folder anywhere inside fackts-hoops-web.
2. Double-click APPLY-NAVIGATION-SPEED-FIX.cmd.
3. After SUCCESS, run: npm run build
4. Do not push until the build passes.

The installer checks every target before editing and creates a timestamped
backup inside fackts-navigation-speed-fix-backups.
