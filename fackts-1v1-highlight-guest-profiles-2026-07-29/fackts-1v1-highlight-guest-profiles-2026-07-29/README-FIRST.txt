FACKTS 1V1 HIGHLIGHTS + GUEST HOOPER PROFILES

WHAT THIS FIXES

1. 1V1 MATCH MEDIA
- Clicking a 1v1 battle still opens its match page.
- Full-game video and match highlight are now shown separately.
- A saved highlight is no longer hidden behind the full-game link.
- YouTube, Vimeo and direct video links can play in the app.
- Links that cannot be embedded still show a working Open Match Highlight button.

2. GUEST HOOPER PROFILES
- Every Guest Hooper card is now clickable.
- Each Guest Hooper gets a full individual profile page.
- The profile shows photo, identity, position, role, career averages,
  covered-game history and 1v1 record/history.

WHAT THIS DOES NOT CHANGE
- app\one-on-one\page.tsx
- Today's mobile battle-card typography
- Today's Rankings scrolling update
- Notifications
- Admin forms or database structure

HOW TO INSTALL
1. Move this extracted folder inside fackts-hoops-web.
2. Double-click APPLY-HIGHLIGHT-GUEST-PROFILES.cmd.
3. After SUCCESS, run npm run dev.
4. Open http://localhost:3000/one-on-one and click Hanss vs Hussein.
5. Confirm Match Highlight is visible or the Open Match Highlight button works.
6. Open http://localhost:3000/guest-hoopers.
7. Click at least two Guest Hooper cards and confirm their profiles open.

The installer creates a timestamped backup inside this extracted folder.
Do not push until both localhost checks pass.
