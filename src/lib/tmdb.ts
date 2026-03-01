import type { CatalogTitle, TastePrefs } from "@/lib/recommendations";

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
};

const LANGUAGE_NAME_BY_CODE: Record<string, string> = {
  en: "English",
  ko: "Korean",
  es: "Spanish",
  ja: "Japanese",
  hi: "Hindi",
  ta: "Tamil",
  fr: "French",
};

const LANGUAGE_ORIGIN_BY_CODE: Record<string, string> = {
  en: "United States",
  ko: "South Korea",
  es: "Spain",
  ja: "Japan",
  hi: "India",
  ta: "India",
  fr: "France",
};

const MOVIE_GENRE_TO_ID: Record<string, number | null> = {
  Thriller: 53,
  "Sci-Fi": 878,
  Drama: 18,
  Comedy: 35,
  Crime: 80,
  Fantasy: 14,
  Romance: 10749,
};

const TV_GENRE_TO_ID: Record<string, number | null> = {
  Thriller: 9648,
  "Sci-Fi": 10765,
  Drama: 18,
  Comedy: 35,
  Crime: 80,
  Fantasy: 10765,
  Romance: 10766,
};

const MOVIE_ID_TO_GENRE: Record<number, string> = {
  53: "Thriller",
  878: "Sci-Fi",
  18: "Drama",
  35: "Comedy",
  80: "Crime",
  14: "Fantasy",
  10749: "Romance",
};

const TV_ID_TO_GENRE: Record<number, string> = {
  9648: "Thriller",
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

  if (cleaned.length <= 140) {
    return cleaned;
  }

  return `${cleaned.slice(0, 137)}...`;
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

  const [movies, series] = await Promise.all([
    tmdbFetch("/discover/movie", {
      with_genres: movieGenre ? String(movieGenre) : "",
      with_original_language: languageCode ?? "",
      "vote_count.gte": "40",
    }),
    tmdbFetch("/discover/tv", {
      with_genres: tvGenre ? String(tvGenre) : "",
      with_original_language: languageCode ?? "",
      "vote_count.gte": "20",
    }),
  ]);

  const mappedMovies = mapResultsToCatalog(movies.results, "Movie", MOVIE_ID_TO_GENRE, languageCode);
  const mappedSeries = mapResultsToCatalog(series.results, "Series", TV_ID_TO_GENRE, languageCode);

  return [...mappedMovies, ...mappedSeries];
}
