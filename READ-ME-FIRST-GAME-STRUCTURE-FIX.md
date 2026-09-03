# FACKTS Hoops game structure and homepage feature fix

This package contains only the replacement and new files required for this fix. Extract it directly into the existing `fackts-hoops-web` root and allow Windows to replace matching files.

## What changes

- Court Takeover games inherit the year played when an old record has no season.
- Eagles report imports resolve to the registered KNBL/KBF league, season and division when the team's membership is unambiguous.
- The internal `team_report` value is repaired and is never shown as a public competition or format.
- Admin can create a game between two external, unregistered opponents. Team profiles are optional; both display names remain required.
- The public Games page is visibly separated by league/event/competition/team context instead of one continuous mixed grid.
- FACKTS 5v5, FACKTS Kings 1v1, league games and Court Takeovers have separate counts.
- Admin gets `/admin/homepage`, where the featured team, event, competition and player can be changed.
- The featured team card automatically displays that team's latest completed team game. A Kings 1v1 never becomes a team game.

## Required database step

After extracting the package, open the Supabase SQL Editor and run:

`supabase/migrations/20260903_002_context_backfill_and_homepage_features.sql`

Migration `20260903_001_game_context_separation.sql` must already have been run. If it has not, run `001` first, then `002`.

The migration does not delete games, teams, stats, media or historical records.

## Local checks and push

```powershell
npm run build
git status --short
git add .
git commit -m "Separate game contexts and add homepage features"
git push
```

If GitHub receives the push but Windows again reports that `refs/remotes/origin/main` is broken, repair only that local tracking reference and fetch it again:

```powershell
git update-ref -d refs/remotes/origin/main
git fetch origin main
```

## Admin verification

1. Open `/admin/games/editor` and create a league game using typed external team names, with no permanent team selected.
2. Open `/admin/homepage`, select the team, event, competition and player, then save.
3. Open `/games` and confirm separate headings for league seasons/divisions, FACKTS team games, Kings and Court Takeovers.
