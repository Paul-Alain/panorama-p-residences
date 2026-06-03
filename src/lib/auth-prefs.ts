// Local-only auth preferences. We never store passwords ourselves —
// only the last email used and the "remember me" choice.
export const LAST_EMAIL_KEY = "panoramap-last-email";
export const REMEMBER_KEY = "panoramap-remember";
export const SESSION_MARKER_KEY = "panoramap-session-marker";

/**
 * When the user chose NOT to be remembered, the Supabase session is persisted
 * in localStorage (its default), so we enforce a tab-scoped lifetime ourselves:
 * if "remember" is off and the per-tab marker is missing (new tab / browser was
 * closed and reopened), the session is signed out on load.
 */
export function shouldClearEphemeralSession(): boolean {
  if (typeof window === "undefined") return false;
  const remember = window.localStorage.getItem(REMEMBER_KEY);
  if (remember !== "0") return false;
  return window.sessionStorage.getItem(SESSION_MARKER_KEY) !== "1";
}
