// =============================================================================
// BMS Session KPI Dashboard - Cookie & URL Parameter Utilities (T019)
// =============================================================================

/** Cookie name used to persist the BMS session identifier */
export const BMS_SESSION_COOKIE_NAME = 'bms-session-id';

/** Number of days before the session cookie expires */
export const COOKIE_EXPIRY_DAYS = 7;

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

/**
 * Stores the BMS session ID in a cookie with a 7-day expiry.
 *
 * @param sessionId - The session identifier to persist.
 */
export function setSessionCookie(sessionId: string): void {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + COOKIE_EXPIRY_DAYS);

  document.cookie = [
    `${BMS_SESSION_COOKIE_NAME}=${encodeURIComponent(sessionId)}`,
    `expires=${expiryDate.toUTCString()}`,
    'path=/',
  ].join('; ');
}

/**
 * Reads the BMS session ID from cookies.
 *
 * @returns The session ID string, or `null` if not found.
 */
export function getSessionCookie(): string | null {
  const cookies = document.cookie.split('; ');

  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.split('=');
    if (name === BMS_SESSION_COOKIE_NAME) {
      const value = valueParts.join('=');
      return value ? decodeURIComponent(value) : null;
    }
  }

  return null;
}

/**
 * Removes the BMS session cookie by setting its expiry to the past.
 */
export function removeSessionCookie(): void {
  document.cookie = [
    `${BMS_SESSION_COOKIE_NAME}=`,
    'expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'path=/',
  ].join('; ');
}

// ---------------------------------------------------------------------------
// URL parameter helpers
// ---------------------------------------------------------------------------

/**
 * Reads the BMS session ID from the current URL's query parameters.
 *
 * @returns The session ID string, or `null` if the parameter is absent.
 */
export function getSessionFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get(BMS_SESSION_COOKIE_NAME);
}

/**
 * Removes the `bms-session-id` query parameter from the browser URL without
 * triggering a page reload (uses `history.replaceState`).
 */
export function removeSessionFromUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete(BMS_SESSION_COOKIE_NAME);

  window.history.replaceState(window.history.state, '', url.toString());
}

// ---------------------------------------------------------------------------
// Combined handler
// ---------------------------------------------------------------------------

/**
 * End-to-end handler that:
 * 1. Checks for a session ID in the URL query string.
 * 2. If found, persists it as a cookie and removes it from the URL.
 * 3. Returns the session ID (from URL or existing cookie), or `null`.
 */
export function handleUrlSession(): string | null {
  const urlSessionId = getSessionFromUrl();

  if (urlSessionId) {
    setSessionCookie(urlSessionId);
    removeSessionFromUrl();
    return urlSessionId;
  }

  return getSessionCookie();
}
