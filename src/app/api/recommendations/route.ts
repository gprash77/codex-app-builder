import { NextRequest, NextResponse } from "next/server";

import {
  getBridgePickFromCatalog,
  getMockCatalog,
  getTopPicksFromCatalog,
  type MediaType,
  type TastePrefs,
  type TimeBudget,
} from "@/lib/recommendations";
import { fetchTmdbCatalog } from "@/lib/tmdb";

const VALID_BUDGETS = new Set<TimeBudget>(["quick", "feature", "binge"]);
const VALID_MEDIA_TYPES = new Set<"All" | MediaType>(["All", "Movie", "Series"]);

function parsePrefs(request: NextRequest): TastePrefs {
  const { searchParams } = new URL(request.url);

  const budgetParam = searchParams.get("budget") ?? "quick";
  const hiddenGemParam = searchParams.get("hiddenGemMode") ?? "true";
  const mediaTypeParam = searchParams.get("mediaType") ?? "All";

  const budget = VALID_BUDGETS.has(budgetParam as TimeBudget)
    ? (budgetParam as TimeBudget)
    : "quick";
  const mediaType = VALID_MEDIA_TYPES.has(mediaTypeParam as "All" | MediaType)
    ? (mediaTypeParam as "All" | MediaType)
    : "All";

  return {
    genre: searchParams.get("genre") ?? "Thriller",
    language: searchParams.get("language") ?? "Any",
    mood: searchParams.get("mood") ?? "Mind-Bending",
    budget,
    hiddenGemMode: hiddenGemParam === "true",
    mediaType,
  };
}

export async function GET(request: NextRequest) {
  const prefs = parsePrefs(request);

  try {
    const catalog = await fetchTmdbCatalog(prefs);
    const picks = getTopPicksFromCatalog(prefs, catalog);
    const bridgePick = picks.length > 0 ? getBridgePickFromCatalog(picks[0], prefs, catalog) : null;

    return NextResponse.json({
      source: "tmdb",
      picks,
      bridgePick,
    });
  } catch {
    const catalog = getMockCatalog();
    const picks = getTopPicksFromCatalog(prefs, catalog);
    const bridgePick = picks.length > 0 ? getBridgePickFromCatalog(picks[0], prefs, catalog) : null;

    return NextResponse.json({
      source: "mock",
      picks,
      bridgePick,
    });
  }
}
