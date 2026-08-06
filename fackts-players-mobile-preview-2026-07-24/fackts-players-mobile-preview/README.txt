FACKTS PLAYERS MOBILE PREVIEW

This preview changes only:
app\players\page.tsx

It does not change:
- desktop or laptop player-card design
- animations
- Supabase tables or migrations
- players, games, or one-on-one matches
- GitHub or the live site

APPLY
1. Extract this ZIP.
2. Open PowerShell inside the extracted fackts-players-mobile-preview folder.
3. Run:

powershell -ExecutionPolicy Bypass -File ".\apply-preview.ps1"

4. Return to your normal FACKTS project and run:

cd "C:\Users\user\Documents\APPS\FACKTS\hoops stat app\fackts-hoops-web"
npm run dev

5. Open http://localhost:3000/players
6. Use Chrome phone view to inspect the mobile rows.

RESTORE
If you do not like the preview, open PowerShell inside this extracted folder and run:

powershell -ExecutionPolicy Bypass -File ".\restore-original.ps1"

Then restart npm run dev.
