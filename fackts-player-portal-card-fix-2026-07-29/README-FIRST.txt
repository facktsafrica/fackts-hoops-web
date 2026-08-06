FACKTS PLAYER PORTAL CARD FIX
29 July 2026

This repair changes only:
app\player\page.tsx

It fixes the phone layout shown in the screenshot:
- restores safe inner padding
- stops section labels and descriptions touching the rounded border
- reduces the oversized empty space inside each card
- keeps the player photo background, arrow, links, notifications and portal actions
- keeps the original desktop card height

INSTALL
1. Put this extracted folder inside fackts-hoops-web.
2. Double-click APPLY-PLAYER-CARD-FIX.cmd.
3. Run npm run dev.
4. Check http://localhost:3000/player in a phone-size preview.

The installer creates a timestamped backup before changing the page.
Do not push until the local preview is correct.
