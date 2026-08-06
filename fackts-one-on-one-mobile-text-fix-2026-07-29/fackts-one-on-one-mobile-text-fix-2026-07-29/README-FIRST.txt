FACKTS 1V1 MOBILE CARD TEXT FIX
29 July 2026

This repair changes only:
app\one-on-one\page.tsx

It fixes the phone layout shown in the screenshot:
- keeps COMPLETED, UPCOMING and CANCELLED on one line
- gives the status badge priority instead of crushing it
- makes the match number and date/time fit the header
- slightly reduces mobile player names, positions, centre labels and scores
- gives both player columns more usable room
- keeps the existing card size and desktop styling

INSTALL
1. Put this extracted folder inside fackts-hoops-web.
2. Double-click APPLY-1V1-MOBILE-TEXT-FIX.cmd.
3. Run npm run dev.
4. Check http://localhost:3000/one-on-one in a phone-size preview.

The installer creates a timestamped backup before changing the page.
Do not push until the local preview is correct.
