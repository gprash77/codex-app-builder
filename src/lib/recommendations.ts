export type MediaType = "Movie" | "Series";

export type TimeBudget = "quick" | "feature" | "binge";

export type TastePrefs = {
  genre: string;
  language: string;
  mood: string;
  budget: TimeBudget;
  hiddenGemMode: boolean;
  mediaType: "All" | MediaType;
};

export type CatalogTitle = {
  id: string;
  title: string;
  type: MediaType;
  origin: string;
  languages: string[];
  genres: string[];
  moods: string[];
  runtimeMinutes: number;
  gemScore: number;
  hook: string;
};

export type RankedPick = CatalogTitle & {
  score: number;
  reasons: string[];
};

export const GENRES = [
  "Thriller",
  "Sci-Fi",
  "Drama",
  "Comedy",
  "Crime",
  "Fantasy",
  "Romance",
] as const;

export const LANGUAGES = [
  "Any",
  "English",
  "Korean",
  "Spanish",
  "Japanese",
  "Hindi",
  "Tamil",
  "French",
  "German",
  "Italian",
  "Portuguese",
  "Turkish",
  "Arabic",
  "Chinese",
  "Telugu",
  "Malayalam",
  "Kannada",
  "Bengali",
  "Marathi",
  "Russian",
  "Thai",
] as const;

export const MOODS = [
  "Mind-Bending",
  "Comfort",
  "Dark",
  "Hopeful",
  "Intense",
  "Cerebral",
] as const;

export const TIME_BUDGETS: Record<TimeBudget, string> = {
  quick: "Quick Night (under 2h 15m)",
  feature: "Feature-Length Session",
  binge: "Weekend Binge",
};

const CATALOG: CatalogTitle[] = [
  {
    id: "burning",
    title: "Burning",
    type: "Movie",
    origin: "South Korea",
    languages: ["Korean"],
    genres: ["Thriller", "Drama"],
    moods: ["Cerebral", "Dark", "Mind-Bending"],
    runtimeMinutes: 148,
    gemScore: 9,
    hook: "A slow-burn mystery where every scene shifts what you think is true.",
  },
  {
    id: "dark",
    title: "Dark",
    type: "Series",
    origin: "Germany",
    languages: ["German", "English"],
    genres: ["Sci-Fi", "Thriller", "Drama"],
    moods: ["Mind-Bending", "Intense", "Dark"],
    runtimeMinutes: 60,
    gemScore: 7,
    hook: "Time travel puzzle box with emotional stakes, not just brain games.",
  },
  {
    id: "super-deluxe",
    title: "Super Deluxe",
    type: "Movie",
    origin: "India",
    languages: ["Tamil"],
    genres: ["Drama", "Crime", "Comedy"],
    moods: ["Dark", "Cerebral"],
    runtimeMinutes: 176,
    gemScore: 8,
    hook: "A wild multi-story narrative that balances absurdity and pain.",
  },
  {
    id: "my-mister",
    title: "My Mister",
    type: "Series",
    origin: "South Korea",
    languages: ["Korean"],
    genres: ["Drama"],
    moods: ["Comfort", "Hopeful", "Cerebral"],
    runtimeMinutes: 75,
    gemScore: 9,
    hook: "Quiet but devastating storytelling about empathy and survival.",
  },
  {
    id: "andhadhun",
    title: "Andhadhun",
    type: "Movie",
    origin: "India",
    languages: ["Hindi"],
    genres: ["Thriller", "Crime", "Comedy"],
    moods: ["Intense", "Dark", "Mind-Bending"],
    runtimeMinutes: 139,
    gemScore: 7,
    hook: "A tightly written thriller where each twist feels earned.",
  },
  {
    id: "midnight-diner",
    title: "Midnight Diner",
    type: "Series",
    origin: "Japan",
    languages: ["Japanese"],
    genres: ["Drama", "Comedy"],
    moods: ["Comfort", "Hopeful"],
    runtimeMinutes: 24,
    gemScore: 8,
    hook: "Low-stakes, warm episodes that feel like late-night conversations.",
  },
  {
    id: "the-invisible-guest",
    title: "The Invisible Guest",
    type: "Movie",
    origin: "Spain",
    languages: ["Spanish"],
    genres: ["Thriller", "Crime"],
    moods: ["Intense", "Mind-Bending"],
    runtimeMinutes: 107,
    gemScore: 8,
    hook: "A courtroom-style unraveling built on precise misdirection.",
  },
  {
    id: "panchayat",
    title: "Panchayat",
    type: "Series",
    origin: "India",
    languages: ["Hindi"],
    genres: ["Comedy", "Drama"],
    moods: ["Comfort", "Hopeful"],
    runtimeMinutes: 35,
    gemScore: 6,
    hook: "A grounded rural dramedy with deceptively sharp character writing.",
  },
  {
    id: "moving",
    title: "Moving",
    type: "Series",
    origin: "South Korea",
    languages: ["Korean"],
    genres: ["Fantasy", "Drama", "Thriller"],
    moods: ["Intense", "Hopeful"],
    runtimeMinutes: 55,
    gemScore: 6,
    hook: "Superpower story that prioritizes family bonds and sacrifice.",
  },
  {
    id: "call-my-agent",
    title: "Call My Agent!",
    type: "Series",
    origin: "France",
    languages: ["French"],
    genres: ["Comedy", "Drama"],
    moods: ["Comfort", "Cerebral"],
    runtimeMinutes: 52,
    gemScore: 8,
    hook: "Fast, witty workplace chaos with emotionally honest arcs.",
  },
  {
    id: "tokyo-sonata",
    title: "Tokyo Sonata",
    type: "Movie",
    origin: "Japan",
    languages: ["Japanese"],
    genres: ["Drama"],
    moods: ["Cerebral", "Hopeful"],
    runtimeMinutes: 120,
    gemScore: 9,
    hook: "A family drama that quietly reveals social and personal fractures.",
  },
  {
    id: "money-heist",
    title: "Money Heist",
    type: "Series",
    origin: "Spain",
    languages: ["Spanish", "English"],
    genres: ["Crime", "Thriller"],
    moods: ["Intense"],
    runtimeMinutes: 50,
    gemScore: 5,
    hook: "High-energy heist momentum with big emotional swings.",
  },
  {
    id: "arrival",
    title: "Arrival",
    type: "Movie",
    origin: "United States",
    languages: ["English"],
    genres: ["Sci-Fi", "Drama"],
    moods: ["Cerebral", "Hopeful"],
    runtimeMinutes: 116,
    gemScore: 5,
    hook: "Sci-fi built around language, grief, and nonlinear memory.",
  },
  {
    id: "the-bear",
    title: "The Bear",
    type: "Series",
    origin: "United States",
    languages: ["English"],
    genres: ["Drama", "Comedy"],
    moods: ["Intense", "Hopeful"],
    runtimeMinutes: 33,
    gemScore: 6,
    hook: "High-anxiety character drama with grounded emotional payoffs.",
  },
];

function scorePick(prefs: TastePrefs, item: CatalogTitle): RankedPick {
  let score = 0;
  const reasons: string[] = [];

  if (item.genres.includes(prefs.genre)) {
    score += 35;
    reasons.push(`Strong ${prefs.genre} match`);
  }

  if (prefs.language === "Any") {
    score += 12;
  } else if (item.languages.includes(prefs.language)) {
    score += 30;
    reasons.push(`Available in ${prefs.language}`);
  }

  if (item.moods.includes(prefs.mood)) {
    score += 22;
    reasons.push(`Fits your ${prefs.mood.toLowerCase()} mood`);
  }

  if (prefs.budget === "quick" && item.type === "Movie" && item.runtimeMinutes <= 135) {
    score += 18;
    reasons.push("Great for a one-night watch");
  }

  if (prefs.budget === "feature" && item.type === "Movie" && item.runtimeMinutes > 100) {
    score += 14;
  }

  if (prefs.budget === "binge" && item.type === "Series") {
    score += 24;
    reasons.push("Built for a binge session");
  }

  if (prefs.hiddenGemMode) {
    score += item.gemScore * 2;
    if (item.gemScore >= 8) {
      reasons.push("Hidden-gem priority");
    }
  } else {
    score += (10 - Math.abs(6 - item.gemScore)) * 1.2;
  }

  return { ...item, score, reasons };
}

function diversify(sorted: RankedPick[]): RankedPick[] {
  const picks: RankedPick[] = [];
  const languages = new Set<string>();

  for (const item of sorted) {
    if (picks.length === 0) {
      picks.push(item);
      languages.add(item.languages[0]);
      continue;
    }

    const primaryLanguage = item.languages[0];
    const sameGenreAsExisting = picks.some((p) => p.genres.some((g) => item.genres.includes(g)));

    if (!languages.has(primaryLanguage) || !sameGenreAsExisting) {
      picks.push(item);
      languages.add(primaryLanguage);
    }

    if (picks.length === 3) {
      break;
    }
  }

  if (picks.length < 3) {
    for (const item of sorted) {
      if (!picks.find((pick) => pick.id === item.id)) {
        picks.push(item);
      }
      if (picks.length === 3) {
        break;
      }
    }
  }

  return picks;
}

export function getTopPicksFromCatalog(prefs: TastePrefs, catalog: CatalogTitle[]): RankedPick[] {
  const filtered =
    prefs.mediaType === "All" ? catalog : catalog.filter((item) => item.type === prefs.mediaType);
  const ranked = filtered.map((item) => scorePick(prefs, item)).sort((a, b) => b.score - a.score);
  return diversify(ranked);
}

export function getBridgePickFromCatalog(
  primary: RankedPick,
  prefs: TastePrefs,
  catalog: CatalogTitle[]
): RankedPick | null {
  const bridge = catalog
    .filter((item) => item.id !== primary.id)
    .map((item) => scorePick({ ...prefs, language: "Any" }, item))
    .filter(
      (item) =>
        item.languages[0] !== primary.languages[0] &&
        item.moods.some((mood) => primary.moods.includes(mood)) &&
        item.genres.some((genre) => primary.genres.includes(genre))
    )
    .sort((a, b) => b.score - a.score)[0];

  return bridge ?? null;
}

export function getTopPicks(prefs: TastePrefs): RankedPick[] {
  return getTopPicksFromCatalog(prefs, CATALOG);
}

export function getBridgePick(primary: RankedPick, prefs: TastePrefs): RankedPick | null {
  return getBridgePickFromCatalog(primary, prefs, CATALOG);
}

export function getMockCatalog(): CatalogTitle[] {
  return CATALOG;
}
