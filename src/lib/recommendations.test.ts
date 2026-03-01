import { describe, expect, it } from "vitest";

import { getBridgePick, getTopPicks } from "@/lib/recommendations";

describe("recommendations engine", () => {
  it("returns exactly three picks", () => {
    const picks = getTopPicks({
      genre: "Thriller",
      language: "Korean",
      mood: "Mind-Bending",
      budget: "quick",
      hiddenGemMode: true,
    });

    expect(picks).toHaveLength(3);
  });

  it("prioritizes language matches when a language is selected", () => {
    const picks = getTopPicks({
      genre: "Drama",
      language: "Japanese",
      mood: "Comfort",
      budget: "binge",
      hiddenGemMode: true,
    });

    expect(picks.some((pick) => pick.languages.includes("Japanese"))).toBe(true);
  });

  it("shifts ranking when hidden gem mode is toggled", () => {
    const hiddenGemOn = getTopPicks({
      genre: "Drama",
      language: "Any",
      mood: "Cerebral",
      budget: "feature",
      hiddenGemMode: true,
    });

    const hiddenGemOff = getTopPicks({
      genre: "Drama",
      language: "Any",
      mood: "Cerebral",
      budget: "feature",
      hiddenGemMode: false,
    });

    expect(hiddenGemOn[0]?.id).not.toBe(hiddenGemOff[0]?.id);
  });

  it("returns a bridge pick in a different language for the top result", () => {
    const prefs = {
      genre: "Thriller",
      language: "Spanish",
      mood: "Intense",
      budget: "feature" as const,
      hiddenGemMode: true,
    };

    const picks = getTopPicks(prefs);
    const bridge = getBridgePick(picks[0], prefs);

    expect(bridge).not.toBeNull();
    if (bridge) {
      expect(bridge.languages[0]).not.toBe(picks[0].languages[0]);
    }
  });
});
