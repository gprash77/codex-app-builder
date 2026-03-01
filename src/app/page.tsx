"use client";

import { useMemo, useState } from "react";
import { Sparkles, Film, Clapperboard, Languages, Shuffle } from "lucide-react";

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
  MOODS,
  TIME_BUDGETS,
  getBridgePick,
  getTopPicks,
  type TimeBudget,
} from "@/lib/recommendations";
import { trackUiEvent } from "@/lib/analytics";

const BUDGET_KEYS = Object.keys(TIME_BUDGETS) as TimeBudget[];

function randomOf<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export default function Home() {
  const [genre, setGenre] = useState<string>(GENRES[0]);
  const [language, setLanguage] = useState<string>(LANGUAGES[0]);
  const [mood, setMood] = useState<string>(MOODS[0]);
  const [budget, setBudget] = useState<TimeBudget>(BUDGET_KEYS[0]);
  const [hiddenGemMode, setHiddenGemMode] = useState<boolean>(true);

  const picks = useMemo(
    () => getTopPicks({ genre, language, mood, budget, hiddenGemMode }),
    [genre, language, mood, budget, hiddenGemMode]
  );

  const bridgePick = useMemo(() => {
    if (picks.length === 0) {
      return null;
    }
    return getBridgePick(picks[0], { genre, language, mood, budget, hiddenGemMode });
  }, [picks, genre, language, mood, budget, hiddenGemMode]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#183a4a_0%,_#09161f_45%,_#050a0f_100%)] text-zinc-100">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
        <section className="rounded-2xl border border-white/15 bg-white/5 p-6 backdrop-blur-sm sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="bg-emerald-500/20 text-emerald-200">Taste Engine</Badge>
            <Badge variant="outline" className="border-cyan-300/30 bg-cyan-300/10 text-cyan-100">
              Top 3, Not Top 300
            </Badge>
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Find your next movie or series across languages.
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-zinc-300 sm:text-base">
            Choose mood, genre, language, and watch-time. The app gives three precise picks with a reason for each,
            plus a cross-language bridge recommendation.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <FilterSelect
              label="Genre"
              value={genre}
              options={GENRES}
              onValueChange={(value) => {
                setGenre(value);
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
            <FilterSelect
              label="Mood"
              value={mood}
              options={MOODS}
              onValueChange={(value) => {
                setMood(value);
                trackUiEvent("filter_mood_changed", { value });
              }}
            />
            <FilterSelect
              label="Time"
              value={budget}
              options={BUDGET_KEYS}
              onValueChange={(value) => {
                setBudget(value as TimeBudget);
                trackUiEvent("filter_budget_changed", { value });
              }}
              formatter={(value) => TIME_BUDGETS[value as TimeBudget]}
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
          </div>

          <div className="mt-3 flex justify-end">
            <Button
              variant="outline"
              className="border-zinc-300/30 bg-transparent text-zinc-100 hover:bg-zinc-100/10"
              onClick={() => {
                const nextGenre = randomOf(GENRES);
                const nextLanguage = randomOf(LANGUAGES);
                const nextMood = randomOf(MOODS);
                const nextBudget = randomOf(BUDGET_KEYS);

                setGenre(nextGenre);
                setLanguage(nextLanguage);
                setMood(nextMood);
                setBudget(nextBudget);
                trackUiEvent("surprise_clicked", {
                  genre: nextGenre,
                  language: nextLanguage,
                  mood: nextMood,
                  budget: nextBudget,
                });
              }}
            >
              <Shuffle className="size-4" />
              Surprise Me
            </Button>
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
                  {pick.type === "Movie" ? <Film className="size-4 text-cyan-300" /> : <Clapperboard className="size-4 text-cyan-300" />}
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
                  Taste DNA: {mood.toLowerCase()} tone + {genre.toLowerCase()} structure + {budget === "binge" ? "serial commitment" : "single-session payoff"}.
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
  formatter?: (value: string) => string;
};

function FilterSelect({ label, value, options, onValueChange, formatter }: FilterSelectProps) {
  return (
    <div className="grid gap-1.5">
      <label className="text-xs font-medium uppercase tracking-wide text-zinc-300">{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full border-white/20 bg-zinc-900/50 text-zinc-100">
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent className="border-zinc-700 bg-zinc-900 text-zinc-100">
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {formatter ? formatter(option) : option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
