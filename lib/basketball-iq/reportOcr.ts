export type OcrRosterMember = {
  id?: string;
  display_name?: string;
  nickname?: string | null;
  jersey_number?: string | null;
};

export type OcrStatRow = {
  player_name: string;
  jersey_number?: string;
  points: number;
  rebounds: number;
  offensive_rebounds: number;
  defensive_rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  minutes: number;
  two_made: number;
  two_attempted: number;
  three_made: number;
  three_attempted: number;
  ft_made: number;
  ft_attempted: number;
  plus_minus: number;
  extra_stats?: Record<
    string,
    number | string | boolean | null
  >;
};

export type OcrGameCandidate = {
  home_team_name: string;
  away_team_name: string;
  game_date: string;
  home_score: number;
  away_score: number;
  team_side: "home" | "away";
  period_scores: Array<{
    period: string;
    home: number;
    away: number;
  }>;

  league_name?: string;
  season_label?: string;
  venue?: string;
  game_time?: string;
};

export type BasketballReportOcrResult = {
  match: OcrGameCandidate | null;
  rows: OcrStatRow[];
  home_rows: OcrStatRow[];
  away_rows: OcrStatRow[];
  officials?: string[];
  warnings: string[];
};

export type BasketballReportPages =
  | string[]
  | Record<string, string>;

type ParsedScoreTeam = {
  name: string;
  total: number;
  periods: number[];
};

type ParsedMetadata = {
  league: string;
  season: string;
  venue: string;
  date: string;
  time: string;
  officials: string[];
};

function cleanLine(value: unknown) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function identity(value: unknown) {
  return cleanLine(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]/g, "");
}

function titleCase(value: string) {
  const source = cleanLine(value);
  if (!source) return "";

  const letters = source.replace(/[^A-Za-z]/g, "");
  const looksLikeInitials =
    letters.length <= 4 &&
    letters === letters.toUpperCase();

  if (looksLikeInitials) {
    return source;
  }

  return source
    .toLowerCase()
    .replace(
      /(^|\s|[-'])\p{L}/gu,
      (letter) => letter.toUpperCase(),
    )
    .trim();
}

function whole(value: unknown) {
  const parsed = Number(
    String(value ?? "").replace(
      /[^0-9+-]/g,
      "",
    ),
  );

  return Number.isFinite(parsed)
    ? Math.trunc(parsed)
    : 0;
}

function nonNegative(value: unknown) {
  return Math.max(
    0,
    whole(value),
  );
}

function numberValue(value: unknown) {
  const parsed = Number(
    String(value ?? "")
      .replace(/[()%]/g, "")
      .replace(",", ".")
      .trim(),
  );

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function parseMinutes(value: string) {
  const cleaned =
    cleanLine(value);

  const colon =
    cleaned.match(
      /^(\d{1,3}):(\d{2})$/,
    );

  if (colon) {
    const minutes =
      Number(colon[1]);

    const seconds =
      Math.min(
        59,
        Number(colon[2]),
      );

    return Math.round(
      (minutes +
        seconds / 60) *
        100,
    ) / 100;
  }

  const decimal =
    Number(cleaned);

  return Number.isFinite(decimal)
    ? Math.max(0, decimal)
    : 0;
}

function orderedPages(
  pages: BasketballReportPages,
) {
  if (Array.isArray(pages)) {
    return pages.map(
      (page) =>
        String(page || ""),
    );
  }

  return Object.entries(pages)
    .sort(
      ([left], [right]) => {
        const leftNumber =
          Number(
            left.match(/\d+/)?.[0] ||
              0,
          );

        const rightNumber =
          Number(
            right.match(/\d+/)?.[0] ||
              0,
          );

        return (
          leftNumber -
          rightNumber
        );
      },
    )
    .map(
      ([, value]) =>
        String(value || ""),
    );
}

function allLines(
  pages: BasketballReportPages,
) {
  return orderedPages(pages)
    .flatMap((page) =>
      page.split(/\r?\n/),
    )
    .map(cleanLine)
    .filter(Boolean);
}

function parseDate(
  value: string,
  fallback = "",
) {
  const monthNames:
    Record<string, string> = {
    jan: "01",
    feb: "02",
    mar: "03",
    apr: "04",
    may: "05",
    jun: "06",
    jul: "07",
    aug: "08",
    sep: "09",
    oct: "10",
    nov: "11",
    dec: "12",
  };

  const iso =
    value.match(
      /\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/,
    );

  if (iso) {
    return `${iso[1]}-${iso[2].padStart(
      2,
      "0",
    )}-${iso[3].padStart(
      2,
      "0",
    )}`;
  }

  const named =
    value.match(
      /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(20\d{2})\b/i,
    );

  if (named) {
    return `${named[3]}-${
      monthNames[
        named[1]
          .slice(0, 3)
          .toLowerCase()
      ]
    }-${named[2].padStart(
      2,
      "0",
    )}`;
  }

  const numeric =
    value.match(
      /\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/,
    );

  if (numeric) {
    const year =
      numeric[3].length === 2
        ? `20${numeric[3]}`
        : numeric[3];

    return `${year}-${numeric[2].padStart(
      2,
      "0",
    )}-${numeric[1].padStart(
      2,
      "0",
    )}`;
  }

  return fallback;
}

function filenameHints(
  fileName: string,
) {
  const cleaned =
    fileName.replace(
      /\.[^.]+$/,
      "",
    );

  const date =
    parseDate(cleaned);

  const oldStyle =
    cleaned.match(
      /^(.+?)_vs_(.+?)(?:_\(|_\d|$)/i,
    );

  if (oldStyle) {
    return {
      home:
        cleanLine(
          oldStyle[1].replace(
            /_/g,
            " ",
          ),
        ),
      away:
        cleanLine(
          oldStyle[2].replace(
            /_/g,
            " ",
          ),
        ),
      date,
    };
  }

  const shortMatch =
    cleaned.match(
      /(?:^|[_-])([A-Za-z0-9 ]{2,20})-vs-([A-Za-z0-9 ]{2,20})(?:[_-]|$)/i,
    );

  return {
    home:
      shortMatch?.[1]
        ? cleanLine(
            shortMatch[1],
          )
        : "",
    away:
      shortMatch?.[2]
        ? cleanLine(
            shortMatch[2],
          )
        : "",
    date,
  };
}

function valueAfterLabel(
  text: string,
  label: string,
) {
  const escaped =
    label.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );

  const pattern =
    new RegExp(
      `${escaped}\\s*:\\s*(.*?)(?=\\s+(?:League|Season|Venue|Date|Time|Crew Chief|Umpire(?:\\s*\\d+|\\(s\\))?|Referee(?:s|\\(s\\))?|Statistician)\\s*:|$)`,
      "i",
    );

  return cleanLine(
    text.match(pattern)?.[1] ||
      "",
  );
}

function parseOfficials(
  text: string,
) {
  const crewChief =
    valueAfterLabel(
      text,
      "Crew Chief",
    );

  const umpire1 =
    valueAfterLabel(
      text,
      "Umpire 1",
    );

  const umpire2 =
    valueAfterLabel(
      text,
      "Umpire 2",
    );

  const grouped =
    valueAfterLabel(
      text,
      "Umpire(s)",
    ) ||
    valueAfterLabel(
      text,
      "Referees",
    ) ||
    valueAfterLabel(
      text,
      "Referee(s)",
    ) ||
    valueAfterLabel(
      text,
      "Referee",
    );

  const valid =
    (value: string) =>
      Boolean(
        value &&
          !/^(?:n\/?a|none|null|-)\b/i.test(
            cleanLine(value),
          ),
      );

  const names:
    string[] = [];

  if (valid(crewChief)) {
    names.push(
      crewChief,
    );
  }

  const explicitOfficials =
    [umpire1, umpire2].filter(
      valid,
    );

  /*
   * Prefer explicit Umpire 1 / Umpire 2 fields.
   * Some reports also print an older grouped "Umpire(s)"
   * value on the Crew Chief line; counting both creates
   * duplicate/conflicting officials.
   *
   * If the explicit fields are N/A, use the grouped list.
   */
  if (
    explicitOfficials.length
  ) {
    names.push(
      ...explicitOfficials,
    );
  } else if (
    valid(grouped)
  ) {
    names.push(
      ...grouped.split(
        /\s*,\s*|\s*;\s*/,
      ),
    );
  }

  return Array.from(
    new Map(
      names
        .map(cleanLine)
        .filter(valid)
        .map((name) => [
          identity(name),
          titleCase(name),
        ]),
    ).values(),
  );
}

function parseMetadata(
  pages: BasketballReportPages,
) {
  const text =
    orderedPages(pages).join(
      "\n",
    );

  const dateLabel =
    valueAfterLabel(
      text,
      "Date",
    );

  return {
    league:
      valueAfterLabel(
        text,
        "League",
      ),

    season:
      valueAfterLabel(
        text,
        "Season",
      ),

    venue:
      valueAfterLabel(
        text,
        "Venue",
      ),

    date:
      parseDate(
        dateLabel ||
          text,
      ),

    time:
      valueAfterLabel(
        text,
        "Time",
      ),

    officials:
      parseOfficials(text),
  } satisfies ParsedMetadata;
}

function parseHeadlineScore(
  lines: string[],
) {
  for (
    const line of lines.slice(
      0,
      25,
    )
  ) {
    const reportMatch =
      line.match(
        /^(.+?)\s+(\d{1,3})\s+vs\.?\s+(\d{1,3})\s+(.+?)(?:\s+Game\s+report\b|\s+Report\b|$)/i,
      );

    if (reportMatch) {
      return [
        {
          name:
            cleanLine(
              reportMatch[1],
            ),
          total:
            Number(
              reportMatch[2],
            ),
          periods: [],
        },
        {
          name:
            cleanLine(
              reportMatch[4],
            ),
          total:
            Number(
              reportMatch[3],
            ),
          periods: [],
        },
      ] satisfies ParsedScoreTeam[];
    }

    const dashMatch =
      line.match(
        /^(.+?)\s+(\d{1,3})\s*[-–]\s*(\d{1,3})\s+(.+)$/,
      );

    if (dashMatch) {
      return [
        {
          name:
            cleanLine(
              dashMatch[1],
            ),
          total:
            Number(
              dashMatch[2],
            ),
          periods: [],
        },
        {
          name:
            cleanLine(
              dashMatch[4],
            ),
          total:
            Number(
              dashMatch[3],
            ),
          periods: [],
        },
      ] satisfies ParsedScoreTeam[];
    }
  }

  return [] as ParsedScoreTeam[];
}

function scoreRow(
  line: string,
  expectedPeriods:
    number | null,
) {
  const normalized =
    cleanLine(line);

  const minimumNumbers =
    expectedPeriods || 4;

  const suffixPattern =
    new RegExp(
      `((?:\\s+\\d{1,3}){${minimumNumbers},${minimumNumbers + 1}})\\s*$`,
    );

  const suffixMatch =
    normalized.match(
      suffixPattern,
    );

  if (!suffixMatch) {
    return null;
  }

  const name =
    cleanLine(
      normalized
        .slice(
          0,
          normalized.length -
            suffixMatch[1].length,
        )
        .replace(
          /[^A-Za-z0-9 &'().-]/g,
          " ",
        ),
    );

  if (
    !name ||
    /^(?:q\d|ot\d|final|teams?|per quarter summary)$/i.test(
      name,
    )
  ) {
    return null;
  }

  const numbers =
    (
      suffixMatch[1].match(
        /\d{1,3}/g,
      ) || []
    )
      .map(Number)
      .filter(
        (value) =>
          value >= 0 &&
          value <= 300,
      );

  if (
    numbers.length <
      minimumNumbers
  ) {
    return null;
  }

  return {
    name:
      titleCase(name),
    numbers,
  };
}

function parsePeriodSummary(
  lines: string[],
  headline:
    ParsedScoreTeam[],
) {
  for (
    let index = 0;
    index < lines.length;
    index += 1
  ) {
    const header =
      lines[index];

    if (
      !/\bQ1\b/i.test(
        header,
      ) ||
      !/\bQ2\b/i.test(
        header,
      )
    ) {
      continue;
    }

    const periodLabels =
      header.match(
        /\b(?:Q[1-4]|OT\d+)\b/gi,
      ) || [];

    const expectedPeriods =
      periodLabels.length ||
      null;

    const candidates:
      Array<{
        name: string;
        numbers: number[];
      }> = [];

    for (
      let offset = 1;
      offset <= 8;
      offset += 1
    ) {
      const line =
        lines[index + offset];

      if (!line) break;

      const candidate =
        scoreRow(
          line,
          expectedPeriods,
        );

      if (!candidate) {
        continue;
      }

      candidates.push(
        candidate,
      );

      if (
        candidates.length === 2
      ) {
        break;
      }
    }

    if (
      candidates.length !== 2
    ) {
      continue;
    }

    return candidates.map(
      (
        candidate,
        teamIndex,
      ): ParsedScoreTeam => {
        const headlineTeam =
          headline[teamIndex];

        let periods =
          candidate.numbers;

        let total =
          headlineTeam?.total ||
          0;

        if (
          expectedPeriods &&
          candidate.numbers.length >=
            expectedPeriods + 1
        ) {
          periods =
            candidate.numbers.slice(
              0,
              expectedPeriods,
            );

          total =
            candidate.numbers[
              expectedPeriods
            ];
        } else if (
          expectedPeriods
        ) {
          periods =
            candidate.numbers.slice(
              0,
              expectedPeriods,
            );

          if (!total) {
            total =
              periods.reduce(
                (sum, value) =>
                  sum + value,
                0,
              );
          }
        } else {
          total =
            candidate.numbers[
              candidate
                .numbers
                .length - 1
            ];

          periods =
            candidate.numbers.slice(
              0,
              -1,
            );
        }

        return {
          name:
            candidate.name ||
            headlineTeam?.name ||
            `Team ${
              teamIndex + 1
            }`,
          total,
          periods,
        };
      },
    );
  }

  return [] as ParsedScoreTeam[];
}

function distance(
  left: string,
  right: string,
) {
  const rows =
    Array.from(
      {
        length:
          right.length + 1,
      },
      (_, index) => index,
    );

  for (
    let leftIndex = 1;
    leftIndex <=
    left.length;
    leftIndex += 1
  ) {
    let diagonal =
      rows[0];

    rows[0] =
      leftIndex;

    for (
      let rightIndex = 1;
      rightIndex <=
      right.length;
      rightIndex += 1
    ) {
      const previous =
        rows[rightIndex];

      rows[rightIndex] =
        Math.min(
          rows[
            rightIndex
          ] + 1,
          rows[
            rightIndex -
              1
          ] + 1,
          diagonal +
            (left[
              leftIndex -
                1
            ] ===
            right[
              rightIndex -
                1
            ]
              ? 0
              : 1),
        );

      diagonal =
        previous;
    }
  }

  return rows[
    right.length
  ];
}

function rosterMatches(
  rows: OcrStatRow[],
  roster: OcrRosterMember[],
) {
  const rosterNames =
    roster.flatMap(
      (member) =>
        [
          member.display_name,
          member.nickname,
        ]
          .map(identity)
          .filter(Boolean),
    );

  return rows.reduce(
    (count, row) => {
      const candidate =
        identity(
          row.player_name,
        );

      const matched =
        rosterNames.some(
          (name) =>
            name === candidate ||
            name.includes(
              candidate,
            ) ||
            candidate.includes(
              name,
            ) ||
            distance(
              name,
              candidate,
            ) <= 2,
        );

      return (
        count +
        (matched ? 1 : 0)
      );
    },
    0,
  );
}

function parseDetailedLine(
  line: string,
) {
  const rowMatch =
    cleanLine(line).match(
      /^(\d{1,3})\s+(?:[*•]\s*)?(.+?)\s+(\d{1,3}:\d{2})\s+(.+)$/,
    );

  if (!rowMatch) {
    return null;
  }

  const jersey =
    rowMatch[1];

  const playerName =
    cleanLine(
      rowMatch[2],
    );

  if (
    !playerName ||
    /^(?:player|team|total|totals)$/i.test(
      playerName,
    )
  ) {
    return null;
  }

  const rawTokens =
    rowMatch[4].match(
      /[-+]?\d+(?:\.\d+)?%?/g,
    ) || [];

  if (
    rawTokens.length < 20
  ) {
    return null;
  }

  const values =
    rawTokens.map(
      numberValue,
    );

  /*
   * Layout:
   * PTS FGM FGA FG% 3PM 3PA 3P%
   * 2PM 2PA 2P% FTM FTA FT%
   * OREB DREB REB AST TOV STL BLK
   * SR PF PFD PIR EFF +/-
   */
  if (
    values.length >= 26
  ) {
    return {
      player_name:
        titleCase(
          playerName,
        ).slice(0, 180),

      jersey_number:
        jersey,

      points:
        nonNegative(
          values[0],
        ),

      rebounds:
        nonNegative(
          values[15],
        ) ||
        nonNegative(
          values[13],
        ) +
          nonNegative(
            values[14],
          ),

      offensive_rebounds:
        nonNegative(
          values[13],
        ),

      defensive_rebounds:
        nonNegative(
          values[14],
        ),

      assists:
        nonNegative(
          values[16],
        ),

      steals:
        nonNegative(
          values[18],
        ),

      blocks:
        nonNegative(
          values[19],
        ),

      turnovers:
        nonNegative(
          values[17],
        ),

      fouls:
        nonNegative(
          values[21],
        ),

      minutes:
        parseMinutes(
          rowMatch[3],
        ),

      two_made:
        nonNegative(
          values[7],
        ),

      two_attempted:
        nonNegative(
          values[8],
        ),

      three_made:
        nonNegative(
          values[4],
        ),

      three_attempted:
        nonNegative(
          values[5],
        ),

      ft_made:
        nonNegative(
          values[10],
        ),

      ft_attempted:
        nonNegative(
          values[11],
        ),

      plus_minus:
        whole(
          values[25],
        ),

      extra_stats: {
        shot_rejections:
          nonNegative(
            values[20],
          ),
        personal_fouls_drawn:
          nonNegative(
            values[22],
          ),
        pir:
          whole(
            values[23],
          ),
        efficiency:
          whole(
            values[24],
          ),
      },
    } satisfies OcrStatRow;
  }

  return null;
}

function parseFractionLine(
  line: string,
) {
  const normalized =
    cleanLine(line);

  const rowMatch =
    normalized.match(
      /^(\d{1,3})\s+(.+?)\s+(\d{1,3}:\d{2})\s+(-?\d+)\s+(\d+)\/(\d+)\s+\([^)]+\)\s+(\d+)\/(\d+)\s+\([^)]+\)\s+(\d+)\/(\d+)\s+\([^)]+\)\s+(.+)$/,
    );

  if (!rowMatch) {
    return null;
  }

  const tail =
    (
      rowMatch[11].match(
        /[-+]?\d+/g,
      ) || []
    ).map(Number);

  if (
    tail.length < 9
  ) {
    return null;
  }

  const fgMade =
    nonNegative(
      rowMatch[5],
    );

  const fgAttempted =
    Math.max(
      fgMade,
      nonNegative(
        rowMatch[6],
      ),
    );

  const threeMade =
    nonNegative(
      rowMatch[7],
    );

  const threeAttempted =
    Math.max(
      threeMade,
      nonNegative(
        rowMatch[8],
      ),
    );

  const ftMade =
    nonNegative(
      rowMatch[9],
    );

  const ftAttempted =
    Math.max(
      ftMade,
      nonNegative(
        rowMatch[10],
      ),
    );

  return {
    player_name:
      titleCase(
        rowMatch[2],
      ).slice(0, 180),

    jersey_number:
      rowMatch[1],

    points:
      nonNegative(
        rowMatch[4],
      ),

    rebounds:
      nonNegative(
        tail[2],
      ) ||
      nonNegative(
        tail[0],
      ) +
        nonNegative(
          tail[1],
        ),

    offensive_rebounds:
      nonNegative(
        tail[0],
      ),

    defensive_rebounds:
      nonNegative(
        tail[1],
      ),

    assists:
      nonNegative(
        tail[3],
      ),

    steals:
      nonNegative(
        tail[4],
      ),

    blocks:
      nonNegative(
        tail[5],
      ),

    turnovers:
      nonNegative(
        tail[6],
      ),

    fouls:
      nonNegative(
        tail[7],
      ),

    minutes:
      parseMinutes(
        rowMatch[3],
      ),

    two_made:
      Math.max(
        0,
        fgMade -
          threeMade,
      ),

    two_attempted:
      Math.max(
        0,
        fgAttempted -
          threeAttempted,
      ),

    three_made:
      threeMade,

    three_attempted:
      threeAttempted,

    ft_made:
      ftMade,

    ft_attempted:
      ftAttempted,

    plus_minus:
      whole(
        tail[8],
      ),
  } satisfies OcrStatRow;
}

function cleanNumberText(
  value: string,
) {
  return value
    .replace(/[()]/g, " ")
    .replace(
      /(\d)\s*&\s*(\d)/g,
      "$1$2",
    )
    .replace(
      /\b[oO]\b/g,
      "0",
    )
    .replace(
      /\b[e¢]\b/g,
      "0",
    )
    .replace(/\bi\b/g, "1")
    .replace(/[|]/g, "1")
    .replace(/,/g, ".");
}

/*
 * Older OCR fallback.
 * This keeps compatibility with the original
 * multi-page FIBA-style reports.
 */
function parseLegacyLine(
  line: string,
) {
  const rowMatch =
    cleanLine(line).match(
      /^\s*(\S{1,3})\)?\s+(?:[*•]\s*)?([A-Za-z0-9][A-Za-z0-9 .'-]{1,70}?)\s+((?:[0-5]?\d[:.][0-5]\d)|(?:[0-5]\d{3}\d?))\s+(.+)$/,
    );

  if (!rowMatch) {
    return null;
  }

  const playerName =
    cleanLine(
      rowMatch[2],
    );

  if (
    !playerName ||
    /^(?:player|team|total|totals)$/i.test(
      playerName,
    )
  ) {
    return null;
  }

  const tokens =
    cleanNumberText(
      rowMatch[4],
    ).match(
      /[-+]?\d+(?:\.\d+)?%?/g,
    ) || [];

  const percentages =
    tokens
      .map(
        (token, index) =>
          token.endsWith(
            "%",
          )
            ? index
            : -1,
      )
      .filter(
        (index) =>
          index >= 0,
      )
      .slice(0, 4);

  let points = 0;
  let threeMade = 0;
  let threeAttempted = 0;
  let twoMade = 0;
  let twoAttempted = 0;
  let ftMade = 0;
  let ftAttempted = 0;
  let tail: string[] = [];

  if (
    percentages.length === 4
  ) {
    const beforeFg =
      tokens.slice(
        0,
        percentages[0],
      );

    const three =
      tokens.slice(
        percentages[0] + 1,
        percentages[1],
      );

    const two =
      tokens.slice(
        percentages[1] + 1,
        percentages[2],
      );

    const freeThrows =
      tokens.slice(
        percentages[2] + 1,
        percentages[3],
      );

    points =
      nonNegative(
        beforeFg[0],
      );

    threeMade =
      nonNegative(
        three[0],
      );

    threeAttempted =
      Math.max(
        threeMade,
        nonNegative(
          three[1],
        ),
      );

    twoMade =
      nonNegative(
        two[0],
      );

    twoAttempted =
      Math.max(
        twoMade,
        nonNegative(
          two[1],
        ),
      );

    ftMade =
      nonNegative(
        freeThrows[0],
      );

    ftAttempted =
      Math.max(
        ftMade,
        nonNegative(
          freeThrows[1],
        ),
      );

    tail =
      tokens.slice(
        percentages[3] + 1,
      );
  } else {
    return null;
  }

  const minuteText =
    rowMatch[3]
      .replace(/[^0-9]/g, "")
      .slice(0, 4)
      .padStart(4, "0");

  const minuteValue =
    `${minuteText.slice(
      0,
      -2,
    )}:${minuteText.slice(
      -2,
    )}`;

  const offensiveRebounds =
    nonNegative(
      tail[0],
    );

  const defensiveRebounds =
    nonNegative(
      tail[1],
    );

  const reportedRebounds =
    nonNegative(
      tail[2],
    );

  return {
    player_name:
      titleCase(
        playerName,
      ).slice(0, 180),

    jersey_number:
      /^\d{1,3}$/.test(
        rowMatch[1],
      )
        ? rowMatch[1]
        : undefined,

    points,

    rebounds:
      offensiveRebounds +
        defensiveRebounds ||
      reportedRebounds,

    offensive_rebounds:
      offensiveRebounds,

    defensive_rebounds:
      defensiveRebounds,

    assists:
      nonNegative(
        tail[3],
      ),

    turnovers:
      nonNegative(
        tail[4],
      ),

    steals:
      nonNegative(
        tail[5],
      ),

    blocks:
      nonNegative(
        tail[6],
      ),

    fouls:
      nonNegative(
        tail[8],
      ),

    minutes:
      parseMinutes(
        minuteValue,
      ),

    two_made:
      twoMade,

    two_attempted:
      twoAttempted,

    three_made:
      threeMade,

    three_attempted:
      threeAttempted,

    ft_made:
      ftMade,

    ft_attempted:
      ftAttempted,

    plus_minus:
      whole(
        tail[
          tail.length - 1
        ],
      ),
  } satisfies OcrStatRow;
}

function parseStatLine(
  line: string,
): OcrStatRow | null {
  if (
    !line ||
    /^(?:team totals?|total|legend|# player|nº player|no player|player min)\b/i.test(
      cleanLine(line),
    )
  ) {
    return null;
  }

  return (
    parseFractionLine(
      line,
    ) ||
    parseDetailedLine(
      line,
    ) ||
    parseLegacyLine(
      line,
    )
  );
}

function joinWrappedPlayerLines(
  lines: string[],
) {
  const output:
    string[] = [];

  for (
    let index = 0;
    index < lines.length;
    index += 1
  ) {
    const current =
      cleanLine(
        lines[index],
      );

    const next =
      cleanLine(
        lines[
          index + 1
        ] || "",
      );

    if (
      /^\d{1,3}\s+(?:[*•]\s*)?[A-Za-z][A-Za-z .'-]{1,60}$/i.test(
        current,
      ) &&
      /^[A-Za-z][A-Za-z .'-]{1,60}\s+\d{1,3}:\d{2}\s+/.test(
        next,
      )
    ) {
      output.push(
        `${current} ${next}`,
      );

      index += 1;
      continue;
    }

    output.push(
      current,
    );
  }

  return output;
}

function teamNameMatches(
  line: string,
  teamName: string,
) {
  const left =
    identity(
      line
        .replace(
          /\bCoach\s*:.*$/i,
          "",
        )
        .replace(
          /\([A-Za-z0-9]+\)\s*$/,
          "",
        ),
    );

  const right =
    identity(teamName);

  if (
    !left ||
    !right
  ) {
    return false;
  }

  return (
    left === right ||
    left.startsWith(
      right,
    ) ||
    right.startsWith(
      left,
    )
  );
}

function extractTeamRows(
  lines: string[],
  teamName: string,
) {
  if (!teamName) {
    return [];
  }

  const joined =
    joinWrappedPlayerLines(
      lines,
    );

  let headingIndex =
    -1;

  for (
    let index = 0;
    index < joined.length;
    index += 1
  ) {
    if (
      !teamNameMatches(
        joined[index],
        teamName,
      )
    ) {
      continue;
    }

    const headingNumberCount =
      (
        joined[index].match(
          /\d+/g,
        ) || []
      ).length;

    /*
     * Score-summary lines can start with the same
     * team name. A real table heading may contain
     * a single digit inside a team name (e.g. 4life),
     * but it should not carry four quarter scores.
     */
    if (
      headingNumberCount >= 3
    ) {
      continue;
    }

    const nearby =
      joined
        .slice(
          index + 1,
          index + 5,
        )
        .join(" ");

    if (
      /\bPLAYER\b/i.test(
        nearby,
      ) &&
      /\bMIN\b/i.test(
        nearby,
      ) &&
      /\bPTS\b/i.test(
        nearby,
      )
    ) {
      headingIndex =
        index;
      break;
    }
  }

  if (
    headingIndex < 0
  ) {
    return [];
  }

  const rows:
    OcrStatRow[] = [];

  for (
    let index =
      headingIndex + 1;
    index < joined.length;
    index += 1
  ) {
    const line =
      joined[index];

    if (
      /^(?:TEAM\s+TOTALS?|[A-Z]\s+TOTAL)\b/i.test(
        line,
      )
    ) {
      break;
    }

    const parsed =
      parseStatLine(
        line,
      );

    if (parsed) {
      rows.push(
        parsed,
      );
    }

    if (
      rows.length >= 30
    ) {
      break;
    }
  }

  return rows;
}

function parseAnyRows(
  lines: string[],
): OcrStatRow[] {
  const rows: OcrStatRow[] = [];

  for (
    const line of joinWrappedPlayerLines(
      lines,
    )
  ) {
    const parsed =
      parseStatLine(line);

    if (parsed) {
      rows.push(
        parsed as OcrStatRow,
      );
    }
  }

  return rows;
}

function reconcilePoints(
  rows: OcrStatRow[],
  expectedTotal: number,
) {
  if (
    !expectedTotal ||
    !rows.length
  ) {
    return rows;
  }

  const currentTotal =
    rows.reduce(
      (sum, row) =>
        sum +
        row.points,
      0,
    );

  if (
    currentTotal ===
    expectedTotal
  ) {
    return rows;
  }

  /*
   * Never aggressively rewrite reported points.
   * Only use shooting arithmetic to repair a row
   * when it produces a clean team-total match.
   */
  const candidates =
    rows
      .map(
        (
          row,
          index,
        ) => ({
          index,
          calculated:
            row.two_made *
              2 +
            row.three_made *
              3 +
            row.ft_made,
          current:
            row.points,
        }),
      )
      .filter(
        (candidate) =>
          candidate.calculated !==
            candidate.current &&
          Math.abs(
            candidate.calculated -
              candidate.current,
          ) <= 30,
      );

  const required =
    expectedTotal -
    currentTotal;

  const choices =
    new Map<
      number,
      number[]
    >([[0, []]]);

  for (
    const candidate of
    candidates
  ) {
    for (
      const [
        delta,
        selected,
      ] of Array.from(
        choices.entries(),
      )
    ) {
      const nextDelta =
        delta +
        candidate.calculated -
        candidate.current;

      const nextSelected = [
        ...selected,
        candidate.index,
      ];

      if (
        !choices.has(
          nextDelta,
        ) ||
        nextSelected.length <
          (
            choices.get(
              nextDelta,
            ) || []
          ).length
      ) {
        choices.set(
          nextDelta,
          nextSelected,
        );
      }
    }
  }

  const selected =
    choices.get(
      required,
    );

  if (!selected) {
    return rows;
  }

  const selectedSet =
    new Set(selected);

  return rows.map(
    (row, index) =>
      selectedSet.has(
        index,
      )
        ? {
            ...row,
            points:
              row.two_made *
                2 +
              row.three_made *
                3 +
              row.ft_made,
          }
        : row,
  );
}

function trustworthyPeriods(
  teams:
    ParsedScoreTeam[],
) {
  if (
    teams.length !== 2
  ) {
    return [];
  }

  const count =
    Math.min(
      teams[0]
        .periods.length,
      teams[1]
        .periods.length,
      8,
    );

  if (!count) {
    return [];
  }

  const periods =
    Array.from(
      {
        length: count,
      },
      (_, index) => ({
        period:
          index < 4
            ? `Q${index + 1}`
            : `OT${index - 3}`,
        home:
          teams[0]
            .periods[index],
        away:
          teams[1]
            .periods[index],
      }),
    );

  const homeTotal =
    periods.reduce(
      (sum, period) =>
        sum +
        period.home,
      0,
    );

  const awayTotal =
    periods.reduce(
      (sum, period) =>
        sum +
        period.away,
      0,
    );

  return homeTotal ===
      teams[0].total &&
    awayTotal ===
      teams[1].total
    ? periods
    : [];
}

export function parseBasketballReportOcr(
  pages: BasketballReportPages,
  roster: OcrRosterMember[],
  fileName: string,
): BasketballReportOcrResult {
  const lines =
    allLines(pages);

  const text =
    lines.join("\n");

  const warnings:
    string[] = [];

  const metadata =
    parseMetadata(pages);

  const fileHints =
    filenameHints(
      fileName,
    );

  const headline =
    parseHeadlineScore(
      lines,
    );

  const periodSummary =
    parsePeriodSummary(
      lines,
      headline,
    );

  const scoreTeams =
    periodSummary.length ===
    2
      ? periodSummary
      : headline;

  let homeName =
    scoreTeams[0]?.name ||
    fileHints.home ||
    "";

  let awayName =
    scoreTeams[1]?.name ||
    fileHints.away ||
    "";

  let homeScore =
    scoreTeams[0]?.total ||
    0;

  let awayScore =
    scoreTeams[1]?.total ||
    0;

  let homeRows =
    extractTeamRows(
      lines,
      homeName,
    );

  let awayRows =
    extractTeamRows(
      lines,
      awayName,
    );

  /*
   * If a report did not expose clean team headings,
   * keep useful parsed rows visible for manual review
   * rather than failing the whole import.
   */
  if (
    !homeRows.length &&
    !awayRows.length
  ) {
    const genericRows =
      parseAnyRows(lines);

    if (
      genericRows.length
    ) {
      warnings.push(
        "Player rows were detected, but the two team tables could not be separated confidently. Review the import before submission.",
      );

      const midpoint =
        Math.ceil(
          genericRows.length /
            2,
        );

      homeRows =
        genericRows.slice(
          0,
          midpoint,
        );

      awayRows =
        genericRows.slice(
          midpoint,
        );
    }
  }

  if (
    !homeScore &&
    homeRows.length
  ) {
    homeScore =
      homeRows.reduce(
        (sum, row) =>
          sum +
          row.points,
        0,
      );
  }

  if (
    !awayScore &&
    awayRows.length
  ) {
    awayScore =
      awayRows.reduce(
        (sum, row) =>
          sum +
          row.points,
        0,
      );
  }

  homeRows =
    reconcilePoints(
      homeRows,
      homeScore,
    );

  awayRows =
    reconcilePoints(
      awayRows,
      awayScore,
    );

  const homeMatches =
    rosterMatches(
      homeRows,
      roster,
    );

  const awayMatches =
    rosterMatches(
      awayRows,
      roster,
    );

  const fileHintsHome =
    /(?:^|[_ -])home(?:[_ .-]|$)/i.test(
      fileName,
    );

  const teamSide:
    "home" | "away" =
    awayMatches >
    homeMatches
      ? "away"
      : fileHintsHome ||
          homeMatches >=
            awayMatches
        ? "home"
        : "away";

  const selectedRows =
    teamSide === "home"
      ? homeRows
      : awayRows;

  if (
    !selectedRows.length
  ) {
    warnings.push(
      "No safe player table was detected for this team. Keep the uploaded file as evidence and use the manual review grid.",
    );
  }

  if (
    selectedRows.length &&
    !Math.max(
      homeMatches,
      awayMatches,
    )
  ) {
    warnings.push(
      "Player names were read, but none matched the current roster automatically. Match them manually before saving.",
    );
  }

  const selectedScore =
    teamSide === "home"
      ? homeScore
      : awayScore;

  const selectedTotal =
    selectedRows.reduce(
      (sum, row) =>
        sum +
        row.points,
      0,
    );

  if (
    selectedRows.length &&
    selectedScore &&
    selectedTotal !==
      selectedScore
  ) {
    warnings.push(
      `Player points total ${selectedTotal}, but the detected final score is ${selectedScore}. Review the affected rows before submission.`,
    );
  }

  if (
    homeRows.length &&
    homeScore &&
    homeRows.reduce(
      (sum, row) =>
        sum +
        row.points,
      0,
    ) !== homeScore
  ) {
    warnings.push(
      `${homeName || "Home team"} player points do not currently add up to the detected final score.`,
    );
  }

  if (
    awayRows.length &&
    awayScore &&
    awayRows.reduce(
      (sum, row) =>
        sum +
        row.points,
      0,
    ) !== awayScore
  ) {
    warnings.push(
      `${awayName || "Away team"} player points do not currently add up to the detected final score.`,
    );
  }

  const gameDate =
    metadata.date ||
    fileHints.date ||
    parseDate(text);

  const periodScores =
    trustworthyPeriods(
      scoreTeams,
    );

  const validGame =
    Boolean(
      homeName &&
        awayName &&
        gameDate &&
        Number.isFinite(
          homeScore,
        ) &&
        Number.isFinite(
          awayScore,
        ) &&
        homeScore >= 0 &&
        awayScore >= 0 &&
        homeScore !==
          awayScore,
    );

  if (!validGame) {
    warnings.push(
      "The matchup could not be identified completely. Review the team names, date and final score before creating the game.",
    );
  }

  if (
    metadata.officials.length
  ) {
    warnings.push(
      `${metadata.officials.length} match official${metadata.officials.length === 1 ? "" : "s"} detected from the report.`,
    );
  }

  return {
    match: validGame
      ? {
          home_team_name:
            titleCase(
              homeName,
            ),

          away_team_name:
            titleCase(
              awayName,
            ),

          game_date:
            gameDate,

          home_score:
            homeScore,

          away_score:
            awayScore,

          team_side:
            teamSide,

          period_scores:
            periodScores,

          league_name:
            metadata.league ||
            undefined,

          season_label:
            metadata.season ||
            undefined,

          venue:
            metadata.venue ||
            undefined,

          game_time:
            metadata.time ||
            undefined,
        }
      : null,

    rows:
      selectedRows,

    home_rows:
      homeRows,

    away_rows:
      awayRows,

    officials:
      metadata.officials,

    warnings,
  };
}