FACKTS HOOPS - 1V1 DATE + PLAYER NAME SIZE 9 V2

This replaces the earlier installer that stopped because its exact class-string
safety check no longer matched the already-polished 1v1 page.

INSTALL
1. Put this extracted folder anywhere inside fackts-hoops-web.
2. Double-click APPLY-1V1-DATE-NAME-SIZE-9-V2.cmd.
3. Wait for the green success message.
4. Run npm run dev.
5. Open http://localhost:3000/one-on-one in phone view.
6. Hard-refresh with Ctrl + Shift + R and check the page before pushing.

CHANGES
- Mobile match date/time text renders at exactly 9px.
- Mobile player-name text renders at exactly 9px.
- Both use span elements so the global mobile paragraph rule cannot enlarge them.

PRESERVED
- Player-position sentence case, size and boldness.
- COMPLETED badge.
- Cards, photos, scores, spacing and desktop styling.

The installer changes only app\one-on-one\page.tsx and creates a timestamped
backup before writing.
