# Stay Logged In Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Stay logged in" checkbox to the login form that persists the session across browser restarts using an httpOnly cookie, while tightening regular (non-persistent) session lifetime to 24 hours.

---

## Current State

- Auth token stored in `sessionStorage` under key `pcrobots-auth-token`
- All requests send `Authorization: Bearer <token>` header
- Server reads token from `Authorization` header
- All sessions expire after 30 days (server TTL via `PCROBOTS_SESSION_TTL_DAYS` env var), regardless of "remember me" intent
- Token never exposed to cookies

---

## Cookie Format

A single `pcrobots-session` cookie, set by the server at login:

| Attribute | Value |
|---|---|
| Name | `pcrobots-session` |
| `HttpOnly` | yes — JavaScript cannot read it |
| `SameSite` | `Lax` — CSRF protection for cross-site navigations |
| `Secure` | yes in production (`NODE_ENV=production`), omitted in dev |
| `Path` | `/` — sent on all requests |
| `Max-Age` | omitted for regular sessions; `2592000` (30 days) for persistent sessions |

---

## Session Lifetimes

| Mode | Cookie expiry | Server TTL |
|---|---|---|
| Regular (no checkbox) | Browser session (no `Max-Age`) | 24 hours |
| Stay logged in | 30 days (`Max-Age=2592000`) | 30 days |

A regular session ends when the browser closes **or** after 24 hours server-side, whichever comes first. A persistent session survives browser restarts and expires after 30 days.

---

## Server Changes

### Cookie parsing

No new npm dependency. Parse the `Cookie` request header manually using a small inline helper:

```ts
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(";").map((pair) => {
      const [k, ...v] = pair.trim().split("=");
      return [k.trim(), decodeURIComponent(v.join("="))];
    })
  );
}
```

### `POST /api/auth/login`

Accepts `{ email: string; password: string; rememberMe?: boolean }`.

On success:
- Creates session with `ttlDays = rememberMe ? 30 : 1`
- Sets `Set-Cookie` header:
  - Regular: `pcrobots-session=<token>; HttpOnly; SameSite=Lax; Path=/` (+ `; Secure` in production)
  - Persistent: same + `; Max-Age=2592000`
- Returns `{ user }` in the response body — **no token in the response body**

### `POST /api/auth/register`

The register handler also calls `db.createSession`. It does **not** offer "Stay logged in" — pass `ttlDays: 1` explicitly to `createSession` so the register flow creates a regular (24h) session, consistent with the tightened default.

### Auth middleware

Currently reads `Authorization: Bearer <token>`. Replace with:

```ts
const cookies = parseCookies(req.headers["cookie"]);
const token = cookies["pcrobots-session"];
```

The rest of the middleware (hash lookup, expiry check, last_seen_at update) is unchanged.

### `POST /api/auth/logout`

Two actions required:
1. Call `db.deleteSession(token)` to invalidate the server-side session record immediately (do not rely solely on TTL expiry).
2. Set `Set-Cookie: pcrobots-session=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/` to clear the cookie from the browser.

### `db.createSession(userId, ttlDays)`

Add an explicit `ttlDays: number` parameter. The `PCROBOTS_SESSION_TTL_DAYS` environment variable is **ignored** once this parameter is wired in — the caller (login/register handler) is the source of truth for TTL. Pass `1` for regular sessions, `30` for persistent. Remove or deprecate the env-var TTL fallback.

---

## Client Changes

### `apps/web/src/api.ts`

- Remove `getAuthToken`, `setAuthToken`, `clearAuthToken`, the legacy `localStorage` migration, and `authStorageKey`.
- Remove the `Authorization: Bearer` header from all fetch calls.
- Add `credentials: "include"` to all fetch calls. This is a no-op for same-origin requests (the default `credentials: "same-origin"` already sends cookies), but becomes load-bearing if `VITE_API_BASE_URL` is ever set to an explicit cross-origin URL in development.
- The login function accepts `rememberMe: boolean` and includes it in the request body.
- The logout function no longer needs to clear client storage.
- The `AuthSessionRecord` type (client-side, in `api.ts`) loses the `token` field — the server no longer returns the token in the response body. The `db.ts` `AuthSessionRecord` type retains its `token` field because the server still needs it internally when writing the cookie value.

### `apps/web/src/App.tsx`

- Add `rememberMe` boolean state (default `false`) to the login form state.
- Add a "Stay logged in" checkbox to the login form, bound to `rememberMe`.
- Pass `rememberMe` in the `handleLogin` call.
- Remove the `sessionStorage` token restore logic on mount — the browser sends the cookie automatically; the app still calls `GET /api/auth/me` on load to confirm the session is valid and get the user object.

### Login form UI

The "Stay logged in" checkbox sits below the password field, above the buttons:

```
[ ] Stay logged in
```

Label text: `Stay logged in`. Default: unchecked.

The register ("Create account") flow does **not** get a "Stay logged in" option — new registrations always create a regular session. Users can log out and log back in with the checkbox if they want a persistent session.

---

## E2E Test Updates

`tests/e2e/app.spec.ts` currently uses `sessionStorage` for auth state. Update as follows:

- Replace any `page.evaluate(() => sessionStorage.removeItem("pcrobots-auth-token"))` calls with `context.clearCookies()` to clear the session cookie.
- `context` must be destructured from the Playwright test fixture alongside `page`: `test("...", async ({ page, context }) => { ... })`.
- Update any assertions that check for the token in storage (there should be none after this change — the cookie is httpOnly and not inspectable via JS).
- Add a test for the "Stay logged in" behavior: log in with `rememberMe: true`, call `context.clearCookies({ name: "pcrobots-session" })` to selectively clear only the session cookie, navigate to `/`, and verify the login panel is shown (session was lost). Separately, log in with `rememberMe: false` to verify regular sessions work the same way.

---

## Out of Scope

- "Forget this device" / session management UI
- Multiple concurrent persistent sessions per device
- Session listing or revocation UI
