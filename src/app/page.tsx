"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Film,
  Clapperboard,
  Languages,
  Mic,
  Play,
  Send,
  Shuffle,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GENRES,
  LANGUAGES,
  getBridgePick,
  getTopPicks,
  type MediaType,
  type RankedPick,
  type TimeBudget,
} from "@/lib/recommendations";
import { trackUiEvent } from "@/lib/analytics";

type RecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
};

const DEFAULT_MOOD_BY_GENRE: Record<string, string> = {
  Action: "Intense",
  Thriller: "Intense",
  Mystery: "Cerebral",
  "Sci-Fi": "Mind-Bending",
  Drama: "Cerebral",
  Comedy: "Comfort",
  Crime: "Dark",
  Fantasy: "Hopeful",
  Romance: "Comfort",
};

function randomOf<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function inferMood(prompt: string, genre: string): string {
  const text = prompt.toLowerCase();

  if (text.includes("mind") || text.includes("twist")) return "Mind-Bending";
  if (text.includes("comfort") || text.includes("feel good")) return "Comfort";
  if (text.includes("dark") || text.includes("gritty")) return "Dark";
  if (text.includes("hope") || text.includes("uplift")) return "Hopeful";
  if (text.includes("intense") || text.includes("edge")) return "Intense";
  if (text.includes("smart") || text.includes("cerebral")) return "Cerebral";

  return DEFAULT_MOOD_BY_GENRE[genre] ?? "Cerebral";
}

function inferBudget(prompt: string): TimeBudget {
  const text = prompt.toLowerCase();
  if (text.includes("binge") || text.includes("series")) return "binge";
  if (text.includes("quick") || text.includes("short") || text.includes("tonight")) return "quick";
  return "feature";
}

function extractGenre(prompt: string, currentGenre: string): string {
  const text = prompt.toLowerCase();
  const sciFiAliases = ["sci-fi", "sci fi", "science fiction"];

  for (const alias of sciFiAliases) {
    if (text.includes(alias)) return "Sci-Fi";
  }

  for (const genre of GENRES) {
    if (text.includes(genre.toLowerCase())) return genre;
  }

  return currentGenre;
}

function extractLanguage(prompt: string, currentLanguage: string): string {
  const text = prompt.toLowerCase();
  for (const language of LANGUAGES) {
    if (language === "Any") continue;
    if (text.includes(language.toLowerCase())) return language;
  }
  return currentLanguage;
}

function extractMediaType(prompt: string, current: "All" | MediaType): "All" | MediaType {
  const text = prompt.toLowerCase();
  if (text.includes("movie") || text.includes("film")) return "Movie";
  if (text.includes("series") || text.includes("show") || text.includes("tv")) return "Series";
  return current;
}

export default function Home() {
  const [genre, setGenre] = useState<string>(GENRES[0]);
  const [language, setLanguage] = useState<string>(LANGUAGES[0]);
  const [prompt, setPrompt] = useState<string>("");
  const [hiddenGemMode, setHiddenGemMode] = useState<boolean>(true);
  const [picks, setPicks] = useState<RankedPick[]>([]);
  const [bridgePick, setBridgePick] = useState<RankedPick | null>(null);
  const [source, setSource] = useState<"tmdb" | "mock">("mock");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [availabilityNotice, setAvailabilityNotice] = useState<string | null>(null);
  const [providerCoverage, setProviderCoverage] = useState<"none" | "partial">("none");
  const [providersOnly, setProvidersOnly] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [mood, setMood] = useState<string>(DEFAULT_MOOD_BY_GENRE[GENRES[0]]);
  const [budget, setBudget] = useState<TimeBudget>("feature");
  const [mediaType, setMediaType] = useState<"All" | MediaType>("All");
  const [expandedTrailerId, setExpandedTrailerId] = useState<string | null>(null);
  const [scrollToResultsPending, setScrollToResultsPending] = useState<boolean>(false);
  const topPicksRef = useRef<HTMLElement | null>(null);

  const prefs = useMemo(
    () => ({ genre, language, mood, budget, hiddenGemMode, mediaType }),
    [genre, language, mood, budget, hiddenGemMode, mediaType]
  );

  useEffect(() => {
    const fallbackPicks = getTopPicks(prefs);
    const fallbackBridge = fallbackPicks.length > 0 ? getBridgePick(fallbackPicks[0], prefs) : null;

    let cancelled = false;
    const controller = new AbortController();

    async function loadRecommendations() {
      setIsLoading(true);

      const query = new URLSearchParams({
        genre: prefs.genre,
        language: prefs.language,
        mood: prefs.mood,
        budget: prefs.budget,
        hiddenGemMode: String(prefs.hiddenGemMode),
        mediaType: prefs.mediaType,
      });

      try {
        const response = await fetch(`/api/recommendations?${query.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load recommendations");
        }

        const data = (await response.json()) as {
          source: "tmdb" | "mock";
          picks: RankedPick[];
          bridgePick: RankedPick | null;
          notice?: string | null;
          providerCoverage?: "none" | "partial";
        };

        if (!cancelled) {
          setPicks(data.picks);
          setBridgePick(data.bridgePick);
          setSource(data.source);
          setAvailabilityNotice(data.notice ?? null);
          setProviderCoverage(data.providerCoverage ?? "none");
        }
      } catch {
        if (!cancelled) {
          setPicks(fallbackPicks);
          setBridgePick(fallbackBridge);
          setSource("mock");
          setAvailabilityNotice("Unable to load live data right now. Showing local fallback picks.");
          setProviderCoverage("none");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadRecommendations();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [prefs]);

  const visiblePicks = useMemo(
    () => (providersOnly ? picks.filter((pick) => (pick.streamingProviders?.length ?? 0) > 0) : picks),
    [picks, providersOnly]
  );

  const visibleBridgePick = useMemo(() => {
    if (!bridgePick) return null;
    if (!providersOnly) return bridgePick;
    return (bridgePick.streamingProviders?.length ?? 0) > 0 ? bridgePick : null;
  }, [bridgePick, providersOnly]);

  useEffect(() => {
    if (!expandedTrailerId) {
      return;
    }
    if (!visiblePicks.some((pick) => pick.id === expandedTrailerId && Boolean(pick.trailer?.youtubeKey))) {
      setExpandedTrailerId(null);
    }
  }, [visiblePicks, expandedTrailerId]);

  useEffect(() => {
    if (!scrollToResultsPending || isLoading) {
      return;
    }

    topPicksRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setScrollToResultsPending(false);
  }, [scrollToResultsPending, isLoading, visiblePicks]);

  function queueResultsScroll() {
    setScrollToResultsPending(true);
  }

  function applyPrompt(value: string) {
    const nextGenre = extractGenre(value, genre);
    const nextLanguage = extractLanguage(value, language);
    const nextMood = inferMood(value, nextGenre);
    const nextBudget = inferBudget(value);
    const nextMediaType = extractMediaType(value, mediaType);
    const wantsHiddenGems = value.toLowerCase().includes("hidden gem") || value.toLowerCase().includes("underrated");

    setGenre(nextGenre);
    setLanguage(nextLanguage);
    setMood(nextMood);
    setBudget(nextBudget);
    setMediaType(nextMediaType);
    if (wantsHiddenGems) {
      setHiddenGemMode(true);
    }
    queueResultsScroll();

    trackUiEvent("prompt_submitted", {
      prompt: value.slice(0, 80),
      genre: nextGenre,
      language: nextLanguage,
      mediaType: nextMediaType,
    });
  }

  function startVoiceInput() {
    const ctor = (
      window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
    ).SpeechRecognition ?? (
      window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
    ).webkitSpeechRecognition;

    if (!ctor) {
      return;
    }

    const recognition = new ctor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      setPrompt(transcript);
      applyPrompt(transcript);
    };

    recognition.onend = () => setIsListening(false);

    setIsListening(true);
    trackUiEvent("voice_input_started", {});
    recognition.start();
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#040507_0%,#090b11_34%,#f3f3f4_34%,#f8f8f8_100%)] text-zinc-900">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-zinc-950/75 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <div className="text-lg font-semibold tracking-tight text-white">What to Watch</div>
          <p className="text-sm text-zinc-400">Find your next movie or series in seconds</p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 py-8 sm:px-8 sm:py-14">
        <section className="rounded-3xl border border-white/12 bg-[radial-gradient(circle_at_0%_0%,rgba(255,255,255,0.10),transparent_40%),linear-gradient(150deg,#141821_0%,#0b0e15_48%,#07090f_100%)] p-6 shadow-[0_40px_110px_-55px_rgba(0,0,0,0.9)] sm:p-10">
          <div className="max-w-3xl space-y-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">Personalized picks</p>
            <h1 className="text-4xl leading-tight font-semibold tracking-tight text-zinc-100 sm:text-6xl">
              What to watch, curated for now.
            </h1>
            <p className="text-base text-zinc-300 sm:text-lg">
              Minimal input, useful output. Tell us your vibe and get three strong choices with platform info and trailer previews.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <input
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  applyPrompt(prompt);
                }
              }}
              placeholder="Try: intense Korean thriller series or comfort Spanish movie"
              className="h-12 w-full rounded-2xl border border-white/18 bg-white/8 px-4 text-[15px] text-zinc-100 outline-none transition-all placeholder:text-zinc-400 focus:border-white/45 focus:bg-white/14"
            />
            <Button
              className="h-12 rounded-2xl bg-white px-6 text-[15px] text-zinc-900 transition-all hover:-translate-y-0.5 hover:bg-zinc-100"
              onClick={() => applyPrompt(prompt)}
            >
              <Send className="size-4" />
              Search
            </Button>
            <Button
              variant="outline"
              className="h-12 rounded-2xl border-white/18 bg-white/5 px-6 text-[15px] text-zinc-100 transition-all hover:-translate-y-0.5 hover:bg-white/10"
              onClick={startVoiceInput}
            >
              <Mic className="size-4" />
              {isListening ? "Listening..." : "Speak"}
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-400">
            <span>{source === "tmdb" ? "Live TMDB data" : "Local fallback data"}</span>
            <span>{isLoading ? "Refreshing recommendations" : "Ready"}</span>
            <span>
              {providerCoverage === "partial"
                ? "Platform availability included"
                : "Platform availability limited for current results"}
            </span>
          </div>

          {availabilityNotice && <p className="mt-4 rounded-xl border border-amber-300/35 bg-amber-200/12 px-4 py-3 text-sm text-amber-100">{availabilityNotice}</p>}

          <div className="mt-7 flex flex-wrap items-center gap-2">
            {(["All", "Movie", "Series"] as const).map((option) => (
              <Button
                key={option}
                variant={mediaType === option ? "default" : "outline"}
                className={
                  mediaType === option
                    ? "h-10 rounded-full bg-white px-4 text-sm text-zinc-900 hover:bg-zinc-200"
                    : "h-10 rounded-full border-white/22 bg-white/5 px-4 text-sm text-zinc-200 hover:bg-white/12"
                }
                onClick={() => {
                  queueResultsScroll();
                  setMediaType(option);
                  trackUiEvent("filter_media_type_changed", { value: option });
                }}
              >
                {option === "All" ? "All" : option === "Movie" ? "Movies" : "Series"}
              </Button>
            ))}
            <Button
              variant={providersOnly ? "default" : "outline"}
              className={
                providersOnly
                  ? "h-10 rounded-full bg-white px-4 text-sm text-zinc-900 hover:bg-zinc-200"
                  : "h-10 rounded-full border-white/22 bg-white/5 px-4 text-sm text-zinc-200 hover:bg-white/12"
              }
              onClick={() => {
                queueResultsScroll();
                setProvidersOnly((state) => {
                  const next = !state;
                  trackUiEvent("filter_providers_only_toggled", { enabled: next });
                  return next;
                });
              }}
            >
              Providers only
            </Button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FilterSelect
              label="Genre"
              value={genre}
              options={GENRES}
              onValueChange={(value) => {
                queueResultsScroll();
                setGenre(value);
                setMood(DEFAULT_MOOD_BY_GENRE[value] ?? "Cerebral");
                trackUiEvent("filter_genre_changed", { value });
              }}
            />
            <FilterSelect
              label="Language"
              value={language}
              options={LANGUAGES}
              onValueChange={(value) => {
                queueResultsScroll();
                setLanguage(value);
                trackUiEvent("filter_language_changed", { value });
              }}
            />
            <Button
              className="h-11 self-end rounded-xl bg-white text-sm text-zinc-900 transition-all hover:-translate-y-0.5 hover:bg-zinc-100"
              onClick={() => {
                queueResultsScroll();
                setHiddenGemMode((state) => {
                  const next = !state;
                  trackUiEvent("hidden_gem_toggled", { enabled: next });
                  return next;
                });
              }}
            >
              <Sparkles className="size-4" />
              {hiddenGemMode ? "Hidden Gem: On" : "Hidden Gem: Off"}
            </Button>
            <Button
              variant="outline"
              className="h-11 self-end rounded-xl border-white/22 bg-white/5 text-sm text-zinc-200 transition-all hover:-translate-y-0.5 hover:bg-white/12"
              onClick={() => {
                queueResultsScroll();
                const nextGenre = randomOf(GENRES);
                const nextLanguage = randomOf(LANGUAGES);

                setGenre(nextGenre);
                setLanguage(nextLanguage);
                setMood(DEFAULT_MOOD_BY_GENRE[nextGenre] ?? "Cerebral");
                setBudget(randomOf(["quick", "feature", "binge"] as const));
                setMediaType(randomOf(["All", "Movie", "Series"] as const));
                trackUiEvent("surprise_clicked", {
                  genre: nextGenre,
                  language: nextLanguage,
                });
              }}
            >
              <Shuffle className="size-4" />
              Surprise me
            </Button>
          </div>
        </section>

        <section ref={topPicksRef} className="relative grid gap-5 lg:grid-cols-3">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(0,0,0,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.045)_1px,transparent_1px)] bg-[size:72px_72px] opacity-60" />
          {visiblePicks.map((pick, idx) => (
            <Card
              key={pick.id}
              className="group rounded-2xl border-zinc-200/90 bg-white/92 shadow-[0_26px_56px_-40px_rgba(15,23,42,0.5)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_34px_70px_-38px_rgba(15,23,42,0.55)]"
            >
              <CardHeader className="gap-3">
                <div className="flex items-center justify-between">
                  <Badge className="bg-zinc-900 px-2.5 py-1 text-xs text-white">#{idx + 1} Pick</Badge>
                  <span className="text-sm text-zinc-500">Score {pick.score.toFixed(1)}</span>
                </div>
                <CardTitle className="flex items-center gap-2 text-2xl text-zinc-900">
                  {pick.type === "Movie" ? (
                    <Film className="size-4 text-zinc-500" />
                  ) : (
                    <Clapperboard className="size-4 text-zinc-500" />
                  )}
                  {pick.title}
                </CardTitle>
                <CardDescription className="text-sm text-zinc-500">
                  {pick.type} • {pick.origin} • {pick.runtimeMinutes} min
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-[15px] leading-relaxed text-zinc-700">{pick.hook}</p>
                {pick.trailer?.youtubeKey && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 rounded-full border-zinc-300 bg-white px-3 text-xs text-zinc-700 hover:bg-zinc-100"
                        onClick={() =>
                          setExpandedTrailerId((current) => (current === pick.id ? null : pick.id))
                        }
                      >
                        <Play className="size-3.5" />
                        {expandedTrailerId === pick.id ? "Hide trailer" : "Play trailer"}
                      </Button>
                      <a
                        className="text-xs text-zinc-500 underline-offset-4 hover:underline"
                        href={`https://www.youtube.com/watch?v=${pick.trailer.youtubeKey}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open on YouTube
                      </a>
                    </div>
                    {expandedTrailerId === pick.id && (
                      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-950">
                        <iframe
                          title={`${pick.title} trailer`}
                          src={`https://www.youtube-nocookie.com/embed/${pick.trailer.youtubeKey}`}
                          className="aspect-video w-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          referrerPolicy="strict-origin-when-cross-origin"
                          allowFullScreen
                        />
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Where to watch</p>
                  <div className="flex flex-wrap gap-2">
                    {(pick.streamingProviders?.length ?? 0) > 0 ? (
                      pick.streamingProviders?.map((provider) => (
                        <Badge
                          key={`${pick.id}-${provider}`}
                          variant="outline"
                          className="border-zinc-300 bg-zinc-50 text-xs text-zinc-700"
                        >
                          {provider}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-zinc-500">Provider data unavailable for this title.</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {pick.genres.map((item) => (
                    <Badge key={item} variant="secondary" className="bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700">
                      {item}
                    </Badge>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex-col items-start gap-2 border-t border-zinc-100 pt-4">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Why this pick</p>
                {pick.reasons.slice(0, 3).map((reason) => (
                  <p key={reason} className="text-sm text-zinc-700">
                    {reason}
                  </p>
                ))}
              </CardFooter>
            </Card>
          ))}
          {providersOnly && visiblePicks.length === 0 && (
            <Card className="rounded-2xl border-zinc-200 bg-white lg:col-span-3">
              <CardContent className="py-10">
                <p className="text-center text-base text-zinc-600">
                  No titles with provider data for this filter. Try another language, genre, or disable Providers only.
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {visibleBridgePick && (
          <section>
            <Card className="rounded-2xl border-zinc-200 bg-zinc-50/70 text-zinc-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Languages className="size-4 text-zinc-500" />
                  Cross-language bridge pick
                </CardTitle>
                <CardDescription className="text-sm text-zinc-600">
                  If you like your #1 choice, jump to this in another language with a similar vibe.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xl font-semibold">{visibleBridgePick.title}</p>
                  <Badge variant="outline" className="border-zinc-300 px-2.5 py-1 text-xs text-zinc-600">
                    {visibleBridgePick.languages[0]}
                  </Badge>
                </div>
                <p className="text-[15px] text-zinc-700">{visibleBridgePick.hook}</p>
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Where to watch</p>
                  <div className="flex flex-wrap gap-2">
                    {(visibleBridgePick.streamingProviders?.length ?? 0) > 0 ? (
                      visibleBridgePick.streamingProviders?.map((provider) => (
                        <Badge
                          key={`${visibleBridgePick.id}-${provider}`}
                          variant="outline"
                          className="border-zinc-300 bg-white text-xs text-zinc-700"
                        >
                          {provider}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-zinc-500">Provider data unavailable for this title.</span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-zinc-600">
                  Taste DNA: {mood.toLowerCase()} tone + {genre.toLowerCase()} structure.
                </p>
              </CardContent>
            </Card>
          </section>
        )}
      </main>
    </div>
  );
}

type FilterSelectProps = {
  label: string;
  value: string;
  options: readonly string[];
  onValueChange: (value: string) => void;
};

function FilterSelect({ label, value, options, onValueChange }: FilterSelectProps) {
  return (
    <div className="grid gap-2">
      <label className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-300">{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-11 w-full rounded-xl border-white/20 bg-white/8 text-sm text-zinc-100">
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent className="max-h-72 border-zinc-200 bg-white text-sm text-zinc-700">
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
