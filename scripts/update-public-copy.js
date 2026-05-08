const fs = require("fs");

const replacements = [
  {
    file: "app/admin/layout.tsx",
    rules: [
      [/FACKTS Control Panel/g, "Dashboard"],
      [/Control Panel/g, "Dashboard"],
    ],
  },

  {
    file: "app/admin/page.tsx",
    rules: [
      [
        /Manage FACKTS players, guest hoopers, games, rosters,\s*guest game appearances, stats, highlights,\s*leaderboards, and 1-on-1 matchups\./g,
        "Manage players, games, rosters, stats, highlights, leaderboards, guest hoopers, and 1-on-1 matchups.",
      ],
      [
        /Manage players, guest hoopers, games, rosters, stats, highlights,\s*leaderboards, and 1-on-1 matchups\./g,
        "Manage players, games, rosters, stats, highlights, leaderboards, guest hoopers, and 1-on-1 matchups.",
      ],
    ],
  },

  {
    file: "app/players/page.tsx",
    rules: [
      [
        /Compact FACKTS roster cards with player identity and key\s*performance numbers\./g,
        "Explore the roster, view player profiles, and follow each player’s performance numbers.",
      ],
      [
        /Tight roster board with player identity and key performance averages\./g,
        "Meet the players, follow their numbers, and track how they perform across every game.",
      ],
      [
        /FACKTS roster cards with player identity and simple basketball\s*stats fans can understand\./g,
        "Explore the roster, view player profiles, and follow each player’s performance numbers.",
      ],
      [
        /Player cards with enough detail, but without oversized spacing\./g,
        "A clean roster view showing player identity, role, and key performance numbers.",
      ],
      [
        /Player rows styled like a sports leaderboard, with full key data visible\./g,
        "A clean roster view showing player identity, role, and key performance numbers.",
      ],
      [
        /Player identity, game averages, and performance numbers in one place\./g,
        "Meet the players, follow their numbers, and track how they perform across every game.",
      ],
    ],
  },

  {
    file: "app/games/page.tsx",
    rules: [
      [
        /Browse upcoming matchups, completed games, final scores, posters,\s*venues, and full game pages\./g,
        "Follow upcoming matchups, past results, final scores, venues, and full game details.",
      ],
      [
        /All future games stay upcoming until you update the result\./g,
        "Follow every scheduled game before tip-off.",
      ],
      [
        /Completed matchups and final score history\./g,
        "Review completed games and final score history.",
      ],
      [
        /Game cards are shorter[\s\S]*?No 0 - 0 upcoming display/g,
        "Follow upcoming matchups, past results, final scores, venues, and full game details.",
      ],
    ],
  },

  {
    file: "app/leaderboards/page.tsx",
    rules: [
      [
        /Compact player rankings for total points, points per game,\s*threes, rebounds, blocks, steals, and games played\./g,
        "See who leads the court in scoring, shooting, rebounds, defense, and games played.",
      ],
      [
        /Compact player rankings for points, threes, blocks, steals, and games played\./g,
        "See who leads the court in scoring, shooting, rebounds, defense, and games played.",
      ],
      [
        /Compact rankings for points, threes, blocks, steals, and games played\./g,
        "See who leads the court in scoring, shooting, rebounds, defense, and games played.",
      ],
    ],
  },

  {
    file: "app/one-on-one/page.tsx",
    rules: [
      [
        /FACKTS players and guest hoopers going head-to-head\. Upcoming\s*battles, past results, rankings, and community bragging rights\./g,
        "Follow head-to-head battles, upcoming matchups, past results, and player rankings.",
      ],
      [
        /New matchups before the score is settled\./g,
        "Upcoming battles before the score is settled.",
      ],
      [
        /Ranked by wins, points scored, and games played\./g,
        "Track the strongest 1-on-1 performers by wins, points, and appearances.",
      ],
      [
        /Guest-only rankings for visiting ballers and challengers\./g,
        "Track visiting ballers, challengers, and community players making their mark on the court.",
      ],
      [
        /Completed battles and score history\./g,
        "Review completed battles and score history.",
      ],
    ],
  },
];

let totalChanges = 0;

for (const item of replacements) {
  if (!fs.existsSync(item.file)) {
    console.log(`Skipped missing file: ${item.file}`);
    continue;
  }

  let content = fs.readFileSync(item.file, "utf8");
  let fileChanges = 0;

  for (const [pattern, replacement] of item.rules) {
    const before = content;
    content = content.replace(pattern, replacement);

    if (content !== before) {
      fileChanges += 1;
      totalChanges += 1;
    }
  }

  fs.writeFileSync(item.file, content, "utf8");

  if (fileChanges > 0) {
    console.log(`Updated ${item.file} — ${fileChanges} replacement group(s) applied`);
  } else {
    console.log(`No public-copy matches found in ${item.file}`);
  }
}

console.log(`Done. Total replacement groups applied: ${totalChanges}`);