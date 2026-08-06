FACKTS 1V1 HIGHLIGHTS + GUEST HOOPER PROFILES V2
29 July 2026

WHY V2

The current Guest Hoopers page combines:
- records from guest_hoopers
- former Players marked as Guest Hooper

The first installer expected an older single-source list and stopped safely.
V2 preserves the current list and supports both guest-* and player-* profiles.

WHAT THIS UPDATE DOES

1. Shows a saved 1v1 highlight separately from a full game video.
2. Adds an Open Match Highlight button when a platform blocks embedding.
3. Makes the existing Guest Hooper cards clickable without replacing the list.
4. Adds full profiles with identity, averages, 1v1 record and match history.
5. Combines linked Guest Hooper and former Player stats where appropriate.

FILES CHANGED

- app/one-on-one/[id]/page.tsx
- app/guest-hoopers/page.tsx (patched in place)
- app/guest-hoopers/[id]/page.tsx

HOW TO INSTALL

1. Move this extracted folder inside fackts-hoops-web.
2. Double-click APPLY-HIGHLIGHT-GUEST-PROFILES-V2.cmd.
3. Wait for SUCCESS.
4. Run npm run dev.

TEST BEFORE PUSHING

1. Open /one-on-one and click Hanss vs Hussein.
2. Confirm Match Highlight appears or Open Match Highlight works.
3. Open /guest-hoopers.
4. Click at least two cards, including different profile sources if available.
5. Confirm their complete profiles open.

Do not push until these localhost tests pass.
