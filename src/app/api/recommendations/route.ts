import { NextRequest, NextResponse } from "next/server";

import {
  getBridgePickFromCatalog,
  getMockCatalog,
  getTopPicksFromCatalog,
  type MediaType,
  type TastePrefs,
  type TimeBudget,
} from "@/lib/recommendations";
import {
  fetchStreamingProvidersForTitles,
  fetchTmdbCatalog,
  fetchTrailersForTitles,
} from "@/lib/tmdb";

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
    let workingPrefs = prefs;
    let workingCatalog = await fetchTmdbCatalog(workingPrefs);
    let picks = getTopPicksFromCatalog(workingPrefs, workingCatalog);
    let notice: string | null = null;

    if (picks.length === 0 && prefs.language !== "Any") {
      const relaxedPrefs = { ...prefs, language: "Any" as const };
      const relaxedCatalog = await fetchTmdbCatalog(relaxedPrefs);
      const relaxedPicks = getTopPicksFromCatalog(relaxedPrefs, relaxedCatalog);

      if (relaxedPicks.length > 0) {
        workingPrefs = relaxedPrefs;
        workingCatalog = relaxedCatalog;
        picks = relaxedPicks;
        notice = `No exact ${prefs.language} results found for this filter. Showing closest matches across available languages.`;
      }
    }

    const bridgePick =
      picks.length > 0 ? getBridgePickFromCatalog(picks[0], workingPrefs, workingCatalog) : null;
    const titlesToEnrich = bridgePick ? [...picks, bridgePick] : picks;
    const enrichmentTargets = titlesToEnrich.map((title) => ({ id: title.id, type: title.type }));
    const trailerTargets = picks.slice(0, 3).map((title) => ({ id: title.id, type: title.type }));
    const [providerMap, trailerMap] = await Promise.all([
      fetchStreamingProvidersForTitles(enrichmentTargets, "US"),
      fetchTrailersForTitles(trailerTargets),
    ]);

    const enrichedPicks = picks.map((pick) => ({
      ...pick,
      streamingProviders: providerMap[pick.id] ?? [],
      trailer: trailerMap[pick.id] ?? null,
    }));
    const enrichedBridgePick = bridgePick
      ? { ...bridgePick, streamingProviders: providerMap[bridgePick.id] ?? [] }
      : null;
    const hasProviderData = [...enrichedPicks, ...(enrichedBridgePick ? [enrichedBridgePick] : [])].some(
      (item) => (item.streamingProviders?.length ?? 0) > 0
    );

    return NextResponse.json({
      source: "tmdb",
      picks: enrichedPicks,
      bridgePick: enrichedBridgePick,
      notice,
      providerCoverage: hasProviderData ? "partial" : "none",
    });
  } catch (e) {
    console.error("[recommendations] TMDB fetch failed, falling back to mock data:", e);
    const catalog = getMockCatalog();
    const picks = getTopPicksFromCatalog(prefs, catalog);
    const bridgePick = picks.length > 0 ? getBridgePickFromCatalog(picks[0], prefs, catalog) : null;

    return NextResponse.json({
      source: "mock",
      picks,
      bridgePick,
      notice: "Live data is limited for this filter right now. Showing curated fallback picks.",
      providerCoverage: "none",
    });
  }
}
