FACKTS 1V1 POSITION SIZE CORRECTION
===================================

This corrects only the player-position text below each player name.

WHY THE LAST FIX STILL LOOKED TOO LARGE
---------------------------------------
The position already had the same 7px Tailwind size as COMPLETED, but a global
mobile rule was forcing all paragraph text to roughly 14px. COMPLETED is a span,
so that global paragraph rule did not affect it.

THIS CORRECTION
---------------
- keeps the position at the same actual 7px mobile size as COMPLETED
- keeps the same font-black weight as COMPLETED
- keeps sentence case: Small forward, Shooting guard, Center
- prevents the global paragraph rule from enlarging it
- does not change names, cards, photos, scores, dates or spacing

INSTALL
-------
1. Put this extracted folder inside fackts-hoops-web.
2. Double-click APPLY-1V1-POSITION-SIZE-CORRECTION.cmd.
3. Wait for the green success message.
4. Run npm run dev.
5. Open http://localhost:3000/one-on-one in phone view.
6. Hard-refresh with Ctrl + Shift + R and check the position text.

Do not push until the localhost result has been checked.
