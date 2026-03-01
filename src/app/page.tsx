"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles, Film, Clapperboard, Languages, Shuffle, Mic, Send } from "lucide-react";

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
import { Separator } from "@/components/ui/separator";
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
  Thriller: "Intense",
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
  const [providerCoverage, setProviderCoverage] = useState<"none">("none");
  const [isListening, setIsListening] = useState<boolean>(false);
  const [mood, setMood] = useState<string>(DEFAULT_MOOD_BY_GENRE[GENRES[0]]);
  const [budget, setBudget] = useState<TimeBudget>("feature");
  const [mediaType, setMediaType] = useState<"All" | MediaType>("All");

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
          providerCoverage?: "none";
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

    trackUiEvent("prompt_submitted", {
      prompt: value.slice(0, 80),
      genre: nextGenre,
      language: nextLanguage,
      mediaType: nextMediaType,
    });
  }

  function startVoiceInput() {
    const ctor = (window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor })
      .SpeechRecognition
      ??
      (window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor })
        .webkitSpeechRecognition;

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#183a4a_0%,_#09161f_45%,_#050a0f_100%)] text-zinc-100">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
        <section className="rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur-sm sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-emerald-500/20 text-emerald-200">Taste Engine</Badge>
            <Badge variant="outline" className="border-cyan-300/30 bg-cyan-300/10 text-cyan-100">
              Keep it simple: tell us what you want
            </Badge>
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Describe your vibe and get 3 picks.
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-zinc-300 sm:text-base">
            Type or speak what you want. You can still fine-tune with just two filters: genre and language.
          </p>
          <p className="mt-2 text-xs text-zinc-400">
            Data source: {source === "tmdb" ? "TMDB live data" : "Local mock fallback"}
            {isLoading ? " • refreshing..." : ""}
          </p>
          {availabilityNotice && (
            <p className="mt-2 rounded-md border border-amber-300/30 bg-amber-200/10 px-3 py-2 text-xs text-amber-100">
              {availabilityNotice}
            </p>
          )}
          {providerCoverage === "none" && (
            <p className="mt-2 text-xs text-zinc-400">
              Streaming platform availability (Netflix, Prime Video, etc.) is not included yet.
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Try: A dark Korean thriller series or a feel-good Spanish comedy"
              className="h-11 w-full rounded-md border border-white/20 bg-zinc-900/50 px-3 text-sm text-zinc-100 outline-none ring-0 placeholder:text-zinc-400 focus:border-cyan-300/70"
            />
            <Button
              className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
              onClick={() => applyPrompt(prompt)}
            >
              <Send className="size-4" />
              Search
            </Button>
            <Button
              variant="outline"
              className="border-zinc-300/30 bg-transparent text-zinc-100 hover:bg-zinc-100/10"
              onClick={startVoiceInput}
            >
              <Mic className="size-4" />
              {isListening ? "Listening..." : "Speak"}
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-300">Type</span>
            {(["All", "Movie", "Series"] as const).map((option) => (
              <Button
                key={option}
                variant={mediaType === option ? "default" : "outline"}
                className={
                  mediaType === option
                    ? "bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                    : "border-zinc-300/30 bg-transparent text-zinc-100 hover:bg-zinc-100/10"
                }
                onClick={() => {
                  setMediaType(option);
                  trackUiEvent("filter_media_type_changed", { value: option });
                }}
              >
                {option === "All" ? "All" : option === "Movie" ? "Movies" : "Series"}
              </Button>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FilterSelect
              label="Genre"
              value={genre}
              options={GENRES}
              onValueChange={(value) => {
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
                setLanguage(value);
                trackUiEvent("filter_language_changed", { value });
              }}
            />
            <div className="flex items-end gap-2">
              <Button
                className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                onClick={() =>
                  setHiddenGemMode((state) => {
                    const next = !state;
                    trackUiEvent("hidden_gem_toggled", { enabled: next });
                    return next;
                  })
                }
              >
                <Sparkles className="size-4" />
                {hiddenGemMode ? "Hidden Gem: On" : "Hidden Gem: Off"}
              </Button>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full border-zinc-300/30 bg-transparent text-zinc-100 hover:bg-zinc-100/10"
                onClick={() => {
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
                Surprise Me
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {picks.map((pick, idx) => (
            <Card key={pick.id} className="border-white/10 bg-white/5 text-zinc-100 shadow-xl">
              <CardHeader className="gap-3">
                <div className="flex items-center justify-between">
                  <Badge className="bg-amber-400/20 text-amber-100">#{idx + 1} Pick</Badge>
                  <span className="text-xs text-zinc-300">Score {pick.score.toFixed(1)}</span>
                </div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  {pick.type === "Movie" ? (
                    <Film className="size-4 text-cyan-300" />
                  ) : (
                    <Clapperboard className="size-4 text-cyan-300" />
                  )}
                  {pick.title}
                </CardTitle>
                <CardDescription className="text-zinc-300">
                  {pick.type} • {pick.origin} • {pick.runtimeMinutes} min
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-zinc-200">{pick.hook}</p>
                <div className="flex flex-wrap gap-2">
                  {pick.genres.map((item) => (
                    <Badge key={item} variant="secondary" className="bg-white/10 text-zinc-100">
                      {item}
                    </Badge>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex-col items-start gap-2">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Why this pick</p>
                {pick.reasons.slice(0, 3).map((reason) => (
                  <p key={reason} className="text-sm text-zinc-200">
                    • {reason}
                  </p>
                ))}
              </CardFooter>
            </Card>
          ))}
        </section>

        {bridgePick && (
          <section>
            <Card className="border-cyan-300/25 bg-cyan-100/5 text-zinc-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Languages className="size-4 text-cyan-300" />
                  Cross-language bridge pick
                </CardTitle>
                <CardDescription className="text-zinc-300">
                  If you like your #1 choice, jump to this in another language with a similar vibe.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xl font-semibold">{bridgePick.title}</p>
                  <Badge variant="outline" className="border-white/20 text-zinc-200">
                    {bridgePick.languages[0]}
                  </Badge>
                </div>
                <p className="text-sm text-zinc-200">{bridgePick.hook}</p>
                <Separator className="bg-white/20" />
                <p className="text-sm text-zinc-300">
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
    <div className="grid gap-1.5">
      <label className="text-xs font-medium uppercase tracking-wide text-zinc-300">{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full border-white/20 bg-zinc-900/50 text-zinc-100">
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent className="max-h-72 border-zinc-700 bg-zinc-900 text-zinc-100">
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
