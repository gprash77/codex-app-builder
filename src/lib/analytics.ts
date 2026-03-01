export type UiEventName =
  | "filter_genre_changed"
  | "filter_language_changed"
  | "filter_media_type_changed"
  | "hidden_gem_toggled"
  | "surprise_clicked"
  | "prompt_submitted"
  | "voice_input_started";

export function trackUiEvent(name: UiEventName, payload: Record<string, string | boolean>) {
  if (typeof window === "undefined") {
    return;
  }

  const event = {
    name,
    payload,
    at: new Date().toISOString(),
  };

  const key = "what-to-watch.events";
  const existing = window.localStorage.getItem(key);
  const history = existing ? (JSON.parse(existing) as typeof event[]) : [];

  history.push(event);
  const recent = history.slice(-25);
  window.localStorage.setItem(key, JSON.stringify(recent));

  if (process.env.NODE_ENV !== "production") {
    // Lightweight debug signal until a real analytics provider is integrated.
    console.debug("[event]", event);
  }
}
