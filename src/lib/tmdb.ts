import type { CatalogTitle, MediaType, TastePrefs } from "@/lib/recommendations";

type TmdbDiscoverResult = {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  genre_ids: number[];
  original_language: string;
  popularity: number;
  vote_average: number;
  vote_count: number;
};

type TmdbDiscoverResponse = {
  results: TmdbDiscoverResult[];
};

type TmdbWatchProviderResponse = {
  results?: Record<
    string,
    {
      flatrate?: Array<{ provider_name: string }>;
      rent?: Array<{ provider_name: string }>;
      buy?: Array<{ provider_name: string }>;
    }
  >;
};

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

const LANGUAGE_TO_CODE: Record<string, string | null> = {
  Any: null,
  English: "en",
  Korean: "ko",
  Spanish: "es",
  Japanese: "ja",
  Hindi: "hi",
  Tamil: "ta",
  French: "fr",
  German: "de",
  Italian: "it",
  Portuguese: "pt",
  Turkish: "tr",
  Arabic: "ar",
  Chinese: "zh",
  Telugu: "te",
  Malayalam: "ml",
  Kannada: "kn",
  Bengali: "bn",
  Marathi: "mr",
  Russian: "ru",
  Thai: "th",
};

const LANGUAGE_NAME_BY_CODE: Record<string, string> = {
  en: "English",
  ko: "Korean",
  es: "Spanish",
  ja: "Japanese",
  hi: "Hindi",
  ta: "Tamil",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  tr: "Turkish",
  ar: "Arabic",
  zh: "Chinese",
  te: "Telugu",
  ml: "Malayalam",
  kn: "Kannada",
  bn: "Bengali",
  mr: "Marathi",
  ru: "Russian",
  th: "Thai",
};

const LANGUAGE_ORIGIN_BY_CODE: Record<string, string> = {
  en: "United States",
  ko: "South Korea",
  es: "Spain",
  ja: "Japan",
  hi: "India",
  ta: "India",
  fr: "France",
  de: "Germany",
  it: "Italy",
  pt: "Portugal",
  tr: "Turkey",
  ar: "Middle East",
  zh: "China",
  te: "India",
  ml: "India",
  kn: "India",
  bn: "India",
  mr: "India",
  ru: "Russia",
  th: "Thailand",
};

const MOVIE_GENRE_TO_ID: Record<string, number | null> = {
  Action: 28,
  Thriller: 53,
  Mystery: 9648,
  "Sci-Fi": 878,
  Drama: 18,
  Comedy: 35,
  Crime: 80,
  Fantasy: 14,
  Romance: 10749,
};

const TV_GENRE_TO_ID: Record<string, number | null> = {
  Action: 10759,
  Thriller: 9648,
  Mystery: 9648,
  "Sci-Fi": 10765,
  Drama: 18,
  Comedy: 35,
  Crime: 80,
  Fantasy: 10765,
  Romance: 10766,
};

const MOVIE_ID_TO_GENRE: Record<number, string> = {
  28: "Action",
  53: "Thriller",
  9648: "Mystery",
  878: "Sci-Fi",
  18: "Drama",
  35: "Comedy",
  80: "Crime",
  14: "Fantasy",
  10749: "Romance",
};

const TV_ID_TO_GENRE: Record<number, string> = {
  10759: "Action",
  9648: "Mystery",
  10765: "Fantasy",
  18: "Drama",
  35: "Comedy",
  80: "Crime",
  10766: "Romance",
};

function inferMoods(genres: string[]): string[] {
  const moods = new Set<string>();

  if (genres.includes("Thriller") || genres.includes("Crime")) {
    moods.add("Intense");
    moods.add("Dark");
  }

  if (genres.includes("Sci-Fi") || genres.includes("Fantasy")) {
    moods.add("Mind-Bending");
    moods.add("Cerebral");
  }

  if (genres.includes("Drama")) {
    moods.add("Cerebral");
    moods.add("Hopeful");
  }

  if (genres.includes("Comedy") || genres.includes("Romance")) {
    moods.add("Comfort");
    moods.add("Hopeful");
  }

  if (moods.size === 0) {
    moods.add("Cerebral");
  }

  return Array.from(moods);
}

function makeHook(overview: string): string {
  const cleaned = overview.replace(/\s+/g, " ").trim();

  if (!cleaned) {
    return "Distinctive tone and strong audience reception make this worth trying.";
  }

  if (cleaned.length <= 220) {
    return cleaned;
  }

  const sentenceMatch = cleaned.match(/^(.{80,220}?[.!?])(\s|$)/);
  if (sentenceMatch?.[1]) {
    return sentenceMatch[1].trim();
  }

  const softCut = cleaned.slice(0, 210);
  const lastBreak = Math.max(
    softCut.lastIndexOf(". "),
    softCut.lastIndexOf("! "),
    softCut.lastIndexOf("? "),
    softCut.lastIndexOf(", ")
  );

  if (lastBreak > 120) {
    return `${softCut.slice(0, lastBreak + 1).trim()}...`;
  }

  return `${softCut.trim()}...`;
}

function toGemScore(popularity: number, voteAverage: number, voteCount: number): number {
  const mainstream = Math.min(popularity / 100, 1) * 0.6 + Math.min(voteCount / 5000, 1) * 0.4;
  const gem = voteAverage / 2 + (1 - mainstream) * 5;
  return Math.max(1, Math.min(10, Math.round(gem)));
}

async function tmdbFetch(path: string, params: Record<string, string>): Promise<TmdbDiscoverResponse> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error("TMDB_API_KEY is not set");
  }

  const search = new URLSearchParams({
    api_key: apiKey,
    include_adult: "false",
    include_null_first_air_dates: "false",
    page: "1",
    sort_by: "popularity.desc",
    ...params,
  });

  const response = await fetch(`${TMDB_BASE_URL}${path}?${search.toString()}`, {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`TMDB request failed: ${response.status}`);
  }

  return (await response.json()) as TmdbDiscoverResponse;
}

async function tmdbFetchByPath(path: string): Promise<unknown> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error("TMDB_API_KEY is not set");
  }

  const response = await fetch(`${TMDB_BASE_URL}${path}${path.includes("?") ? "&" : "?"}api_key=${apiKey}`, {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`TMDB request failed: ${response.status}`);
  }

  return response.json();
}

function mapResultsToCatalog(
  results: TmdbDiscoverResult[],
  type: "Movie" | "Series",
  idToGenre: Record<number, string>,
  fallbackLanguageCode: string | null
): CatalogTitle[] {
  return results
    .filter((item) => Boolean(item.title ?? item.name))
    .map((item) => {
      const languageCode = item.original_language || fallbackLanguageCode || "en";
      const languageName = LANGUAGE_NAME_BY_CODE[languageCode] ?? languageCode.toUpperCase();
      const origin = LANGUAGE_ORIGIN_BY_CODE[languageCode] ?? "Global";
      const genres = item.genre_ids.map((id) => idToGenre[id]).filter(Boolean);

      return {
        id: `${type.toLowerCase()}-${item.id}`,
        title: item.title ?? item.name ?? "Untitled",
        type,
        origin,
        languages: [languageName],
        genres: genres.length > 0 ? genres : ["Drama"],
        moods: inferMoods(genres),
        runtimeMinutes: type === "Movie" ? 120 : 50,
        gemScore: toGemScore(item.popularity, item.vote_average, item.vote_count),
        hook: makeHook(item.overview),
      } satisfies CatalogTitle;
    });
}

export async function fetchTmdbCatalog(prefs: TastePrefs): Promise<CatalogTitle[]> {
  const languageCode = LANGUAGE_TO_CODE[prefs.language] ?? null;
  const movieGenre = MOVIE_GENRE_TO_ID[prefs.genre] ?? null;
  const tvGenre = TV_GENRE_TO_ID[prefs.genre] ?? null;
  const today = new Date().toISOString().slice(0, 10);

  const [movies, series] = await Promise.all([
    tmdbFetch("/discover/movie", {
      with_genres: movieGenre ? String(movieGenre) : "",
      with_original_language: languageCode ?? "",
      "vote_count.gte": "40",
      "primary_release_date.lte": today,
    }),
    tmdbFetch("/discover/tv", {
      with_genres: tvGenre ? String(tvGenre) : "",
      with_original_language: languageCode ?? "",
      "vote_count.gte": "20",
      "first_air_date.lte": today,
    }),
  ]);

  const mappedMovies = mapResultsToCatalog(movies.results, "Movie", MOVIE_ID_TO_GENRE, languageCode);
  const mappedSeries = mapResultsToCatalog(series.results, "Series", TV_ID_TO_GENRE, languageCode);

  return [...mappedMovies, ...mappedSeries];
}

function parseTmdbScopedId(id: string): { tmdbType: "movie" | "tv"; tmdbId: string } | null {
  const match = id.match(/^(movie|series)-(\d+)$/);
  if (!match) {
    return null;
  }

  const tmdbType = match[1] === "movie" ? "movie" : "tv";
  return { tmdbType, tmdbId: match[2] };
}

function dedupeProviderNames(names: string[]): string[] {
  return Array.from(new Set(names)).slice(0, 4);
}

export async function fetchStreamingProvidersForTitles(
  titles: Array<{ id: string; type: MediaType }>,
  region = "US"
): Promise<Record<string, string[]>> {
  const results = await Promise.all(
    titles.map(async (title) => {
      const parsed = parseTmdbScopedId(title.id);
      if (!parsed) {
        return { id: title.id, providers: [] as string[] };
      }

      try {
        const data = (await tmdbFetchByPath(
          `/${parsed.tmdbType}/${parsed.tmdbId}/watch/providers`
        )) as TmdbWatchProviderResponse;
        const regionProviders = data.results?.[region];
        const providers = dedupeProviderNames([
          ...(regionProviders?.flatrate?.map((p) => p.provider_name) ?? []),
          ...(regionProviders?.rent?.map((p) => `${p.provider_name} (Rent)`) ?? []),
          ...(regionProviders?.buy?.map((p) => `${p.provider_name} (Buy)`) ?? []),
        ]);

        return { id: title.id, providers };
      } catch {
        return { id: title.id, providers: [] as string[] };
      }
    })
  );

  return Object.fromEntries(results.map((entry) => [entry.id, entry.providers]));
}
