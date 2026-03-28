# Stay Logged In Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `sessionStorage` Bearer-token auth model with httpOnly cookies, add a "Stay logged in" checkbox to the login form, and tighten the default session TTL to 24 hours.

**Architecture:** The server gains a `parseCookies` helper and a `buildSessionCookie` helper. The login and register routes set a `pcrobots-session` httpOnly cookie instead of returning the token in the response body. `requireUser` reads the token from the cookie header. The client removes all token-storage logic and adds `credentials: "include"` to every fetch call.

**Tech Stack:** Node.js raw HTTP server (no framework), React 19, TypeScript, Playwright e2e tests. No new npm dependencies.

---

## File Map

| File | Action | What changes |
|---|---|---|
| `packages/platform/src/db.ts` | Modify | `createSession` ignores env-var TTL — caller's `ttlDays` is authoritative |
| `apps/api/src/server.ts` | Modify | `parseCookies` + `buildSessionCookie` helpers; `requireUser` reads cookie; login/register/logout routes updated |
| `apps/web/src/api.ts` | Modify | Remove token-storage functions; remove `Authorization` header; add `credentials: "include"`; update `login` signature and `AuthSession` type |
| `apps/web/src/App.tsx` | Modify | Session restore drops `getAuthToken`; `loginForm` gains `rememberMe`; `handleLogin`/`handleRegister` drop `setAuthToken`; checkbox added to form |
| `tests/e2e/mock-api.mjs` | Modify | Cookie-based auth matching server.ts changes (parseCookies, buildSessionCookie, getSessionUser, login/register/logout routes) |
| `tests/e2e/app.spec.ts` | Modify | Add "stay logged in" persistence test (new `context` fixture) |

---

## Task 1: Make `db.createSession` TTL authoritative

**Files:**
- Modify: `packages/platform/src/db.ts:865-891`

The current implementation checks `PCROBOTS_SESSION_TTL_DAYS` env var and lets it override the `ttlDays` parameter (lines 873-875). After this change, the caller is always authoritative.

- [ ] **Step 1: Replace the TTL resolution logic**

  In `packages/platform/src/db.ts`, find the `createSession` function (line 865). Replace lines 873-876:

  ```ts
  // BEFORE (lines 873-876):
  const configuredTtl = Number(process.env.PCROBOTS_SESSION_TTL_DAYS ?? "");
  const effectiveTtl =
    Number.isFinite(configuredTtl) && configuredTtl > 0 ? configuredTtl : ttlDays;
  const expiresAt = createSessionExpiry(effectiveTtl);

  // AFTER:
  const expiresAt = createSessionExpiry(ttlDays);
  ```

  The `DEFAULT_SESSION_TTL_DAYS` constant and the parameter default can be removed now that callers always pass an explicit value — but leave the default in the signature (`ttlDays = 1`) as a safe fallback rather than breaking any call sites that omit it.

- [ ] **Step 2: Update the function signature default**

  Change the function signature at line 865 from:
  ```ts
  async createSession(userId: string, ttlDays = DEFAULT_SESSION_TTL_DAYS): Promise<AuthSessionRecord> {
  ```
  to:
  ```ts
  async createSession(userId: string, ttlDays = 1): Promise<AuthSessionRecord> {
  ```

  The `DEFAULT_SESSION_TTL_DAYS` constant (and its import of `process.env.PCROBOTS_SESSION_TTL_DAYS`) can be left in place or removed — it is no longer load-bearing.

- [ ] **Step 3: Typecheck**

  ```bash
  cd packages/platform && npm run check 2>&1 || npx tsc --noEmit
  ```
  Expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  git add packages/platform/src/db.ts
  git commit -m "feat: make createSession ttlDays authoritative, ignore env-var override"
  ```

---

## Task 2: Add cookie helpers and update `requireUser` in server.ts

**Files:**
- Modify: `apps/api/src/server.ts` (near line 700)

- [ ] **Step 1: Add `parseCookies` helper**

  Find the `extractBearerToken` function (line 700). Immediately **before** it, insert:

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

  function buildSessionCookie(token: string, rememberMe: boolean): string {
    const isProduction = process.env.NODE_ENV === "production";
    const base = `pcrobots-session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/`;
    const secure = isProduction ? "; Secure" : "";
    const maxAge = rememberMe ? "; Max-Age=2592000" : "";
    return `${base}${secure}${maxAge}`;
  }

  function clearSessionCookie(): string {
    const isProduction = process.env.NODE_ENV === "production";
    const secure = isProduction ? "; Secure" : "";
    return `pcrobots-session=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/${secure}`;
  }
  ```

- [ ] **Step 2: Replace `extractBearerToken` + `requireUser` with cookie-reading versions**

  Replace the entire `extractBearerToken` function (lines 700-712) and the `requireUser` function (lines 714-730) with:

  ```ts
  async function requireUser(request: IncomingMessage): Promise<{ token: string; user: UserRecord; scope: AccessScope }> {
    const cookies = parseCookies(request.headers["cookie"]);
    const token = cookies["pcrobots-session"];
    if (!token) {
      unauthorized("authentication required");
    }

    const user = await db.getUserBySessionToken(token);
    if (!user) {
      unauthorized("invalid or expired session");
    }

    return {
      token,
      user,
      scope: toScope(user)
    };
  }
  ```

  The `extractBearerToken` function is no longer needed and can be deleted entirely.

- [ ] **Step 3: Typecheck**

  ```bash
  cd apps/api && npm run check 2>&1 || npx tsc --noEmit -p tsconfig.json
  ```
  Expected: no errors. (The `authorization` header reference is gone; TypeScript may complain about unused imports if `extractBearerToken` was referenced elsewhere — fix those.)

- [ ] **Step 4: Commit**

  ```bash
  git add apps/api/src/server.ts
  git commit -m "feat: add parseCookies/buildSessionCookie helpers, read auth token from cookie"
  ```

---

## Task 3: Update the login route to accept `rememberMe` and set a cookie

**Files:**
- Modify: `apps/api/src/server.ts` (login route ~line 973, `parseLoginRequest` nearby)

- [ ] **Step 1: Update `parseLoginRequest` to accept `rememberMe`**

  Find `parseLoginRequest` in `server.ts` (search for `function parseLoginRequest`). It currently parses `email` and `password`. Add `rememberMe`:

  ```ts
  function parseLoginRequest(body: unknown): { email: string; password: string; rememberMe: boolean } {
    // ... existing email/password validation unchanged ...
    const rememberMe = typeof (body as Record<string, unknown>).rememberMe === "boolean"
      ? (body as Record<string, unknown>).rememberMe as boolean
      : false;
    return { email, password, rememberMe };
  }
  ```

  (Adapt to fit the existing validation style in `parseLoginRequest`.)

- [ ] **Step 2: Update the login route handler**

  Replace the login route body (lines 973-987):

  ```ts
  if (method === "POST" && path === "/api/auth/login") {
    const body = await readJsonBody(request);
    const credentials = parseLoginRequest(body);
    const rateLimitKey = getAuthAttemptKey(request, credentials.email);
    consumeAuthAttempt(rateLimitKey);
    const user = await db.authenticateUser(credentials.email, credentials.password);
    if (!user) {
      unauthorized("invalid email or password");
    }

    const ttlDays = credentials.rememberMe ? 30 : 1;
    const session = await db.createSession(user.id, ttlDays);
    clearAuthAttempts(rateLimitKey);
    response.setHeader("Set-Cookie", buildSessionCookie(session.token, credentials.rememberMe));
    sendJson(response, 200, { user: session.user });
    return;
  }
  ```

- [ ] **Step 3: Typecheck**

  ```bash
  cd apps/api && npm run check 2>&1 || npx tsc --noEmit -p tsconfig.json
  ```
  Expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  git add apps/api/src/server.ts
  git commit -m "feat: login route accepts rememberMe, sets httpOnly cookie, omits token from body"
  ```

---

## Task 4: Update the register and logout routes

**Files:**
- Modify: `apps/api/src/server.ts` (register ~line 989, logout ~line 1025)

- [ ] **Step 1: Update the register route**

  Replace the `db.createSession(user.id)` call and `sendJson` in the register route (lines 1002-1004):

  ```ts
  const session = await db.createSession(user.id, 1);  // always regular (24h) session
  clearAuthAttempts(rateLimitKey);
  response.setHeader("Set-Cookie", buildSessionCookie(session.token, false));
  sendJson(response, 201, { user: session.user });
  ```

- [ ] **Step 2: Update the logout route**

  Replace the logout route body (lines 1025-1029):

  ```ts
  if (method === "POST" && path === "/api/auth/logout") {
    await db.deleteSession(auth.token);
    response.setHeader("Set-Cookie", clearSessionCookie());
    sendJson(response, 200, { ok: true });
    return;
  }
  ```

- [ ] **Step 3: Typecheck**

  ```bash
  cd apps/api && npm run check 2>&1 || npx tsc --noEmit -p tsconfig.json
  ```
  Expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  git add apps/api/src/server.ts
  git commit -m "feat: register sets httpOnly cookie; logout clears cookie and deletes session"
  ```

---

## Task 5: Update `apps/web/src/api.ts`

**Files:**
- Modify: `apps/web/src/api.ts`

- [ ] **Step 1: Update the `AuthSession` type**

  Find the `AuthSession` interface (lines 42-46):

  ```ts
  // BEFORE:
  export interface AuthSession {
    token: string;
    expiresAt: string;
    user: UserRecord;
  }

  // AFTER:
  export interface AuthSession {
    user: UserRecord;
  }
  ```

  The server no longer returns `token` or `expiresAt` in the login/register response body.

- [ ] **Step 2: Remove token-storage functions and constants**

  Delete the following (lines 7 and ~267-290):
  - `const authStorageKey = "pcrobots-auth-token";`
  - `export function getAuthToken(): string | null { ... }` (lines 267-280)
  - `export function setAuthToken(token: string): void { ... }` (lines 282-285)
  - `export function clearAuthToken(): void { ... }` (lines 287-290)

  Also remove the `readStorage`, `writeStorage`, `removeStorage` helpers if they are **only** used by the above three functions. If they are used elsewhere, leave them.

- [ ] **Step 3: Update `requestJson` to use cookies**

  Find `requestJson` (line 330). Replace the fetch call:

  ```ts
  // BEFORE:
  async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const authToken = getAuthToken();
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: options.method ?? "GET",
      headers: {
        ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
        "content-type": "application/json"
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    // ...

  // AFTER:
  async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: options.method ?? "GET",
      credentials: "include",
      headers: {
        "content-type": "application/json"
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    // ... rest unchanged
  ```

- [ ] **Step 4: Update the `login` function signature**

  ```ts
  // BEFORE:
  export function login(input: { email: string; password: string }): Promise<AuthSession> {
    return requestJson<AuthSession>("/api/auth/login", {
      method: "POST",
      body: input
    });
  }

  // AFTER:
  export function login(input: { email: string; password: string; rememberMe: boolean }): Promise<AuthSession> {
    return requestJson<AuthSession>("/api/auth/login", {
      method: "POST",
      body: input
    });
  }
  ```

- [ ] **Step 5: Note — do NOT commit yet**

  `App.tsx` still imports `getAuthToken`, `setAuthToken`, and `clearAuthToken` and references `session.token`. TypeScript will error. Complete Task 6 first, then commit both files together in Task 6 Step 9.

---

## Task 6: Update `apps/web/src/App.tsx`

**Files:**
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Update the session-restore `useEffect`**

  Find the session-restore `useEffect` (lines 478-499). It currently calls `getAuthToken()` before deciding whether to call `/api/auth/me`. Remove that check — always attempt to restore, because the browser sends the cookie automatically:

  ```ts
  // BEFORE (lines 478-499):
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    void getCurrentUser()
      .then(async (user) => {
        await refreshData(undefined, user);
      })
      .catch((err: unknown) => {
        const status = err instanceof Error && 'status' in err ? (err as { status: number }).status : 0;
        if (status >= 400 && status < 500) {
          clearAuthToken();
        } else {
          setError("Failed to restore session. Please reload or sign in again.");
        }
        setCurrentUser(null);
        setLoading(false);
      });
  }, []);

  // AFTER:
  useEffect(() => {
    void getCurrentUser()
      .then(async (user) => {
        await refreshData(undefined, user);
      })
      .catch((err: unknown) => {
        const status = err instanceof Error && 'status' in err ? (err as { status: number }).status : 0;
        if (status < 400 || status >= 500) {
          setError("Failed to restore session. Please reload or sign in again.");
        }
        // 401/403 = no valid session; just fall through to landing page
        setCurrentUser(null);
        setLoading(false);
      });
  }, []);
  ```

- [ ] **Step 2: Update `createInitialLoginState` to include `rememberMe`**

  Find `createInitialLoginState` (line 170):

  ```ts
  // BEFORE:
  function createInitialLoginState() {
    return {
      email: "",
      password: ""
    };
  }

  // AFTER:
  function createInitialLoginState() {
    return {
      email: "",
      password: "",
      rememberMe: false
    };
  }
  ```

- [ ] **Step 3: Update `handleLogin`**

  Find `handleLogin` (line 657). Remove `setAuthToken` and `clearAuthToken`, and pass `rememberMe`:

  ```ts
  // BEFORE:
  async function handleLogin(): Promise<void> {
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const session = await login(loginForm);
      setAuthToken(session.token);
      setCurrentUser(session.user);
      await refreshData(undefined, session.user);
      setMessage(`Signed in as ${session.user.email}`);
    } catch (loginError) {
      clearAuthToken();
      setCurrentUser(null);
      setError(loginError instanceof Error ? loginError.message : String(loginError));
    } finally {
      setSubmitting(false);
    }
  }

  // AFTER:
  async function handleLogin(): Promise<void> {
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const session = await login(loginForm);
      setCurrentUser(session.user);
      await refreshData(undefined, session.user);
      setMessage(`Signed in as ${session.user.email}`);
    } catch (loginError) {
      setCurrentUser(null);
      setError(loginError instanceof Error ? loginError.message : String(loginError));
    } finally {
      setSubmitting(false);
    }
  }
  ```

- [ ] **Step 4: Update `handleRegister` the same way**

  Find `handleRegister` (search for `async function handleRegister`). Apply the same pattern: remove `setAuthToken(session.token)` and remove `clearAuthToken()` from the catch block.

- [ ] **Step 5: Update `handleLogout`**

  Find `handleLogout` (search for `async function handleLogout`). Remove the `clearAuthToken()` call from its body — the cookie is cleared server-side by the logout API call, so no client-side storage cleanup is needed.

- [ ] **Step 6: Add the "Stay logged in" checkbox to the login form**

  Find the login form JSX in the landing page (around line 1141). The form has a `<div className="form-grid two-up">` with email and password fields, followed by a `<div className="button-cluster">`. Insert the checkbox between these two divs:

  ```tsx
  </div>  {/* closes form-grid two-up */}

  <label className="checkbox-label">
    <input
      type="checkbox"
      checked={loginForm.rememberMe}
      onChange={(e) => setLoginForm((current) => ({ ...current, rememberMe: e.target.checked }))}
    />
    Stay logged in
  </label>

  <div className="button-cluster">
  ```

- [ ] **Step 7: Remove imports of deleted functions**

  Find any `import` line in `App.tsx` that imports `getAuthToken`, `setAuthToken`, or `clearAuthToken` from `./api.js`. Remove those identifiers from the import.

- [ ] **Step 8: Typecheck**

  ```bash
  cd apps/web && npm run check
  ```
  Expected: no errors.

- [ ] **Step 9: Build**

  ```bash
  cd apps/web && npm run build
  ```
  Expected: build succeeds.

- [ ] **Step 10: Commit both `api.ts` and `App.tsx` together**

  (Task 5 deferred its commit here — stage both files now.)

  ```bash
  git add apps/web/src/api.ts apps/web/src/App.tsx
  git commit -m "feat: update client for cookie auth — remove token storage, add Stay logged in checkbox"
  ```

---

## Task 7: Add `.checkbox-label` CSS

**Files:**
- Modify: `apps/web/src/styles.css`

- [ ] **Step 1: Add the checkbox label style**

  Append to `apps/web/src/styles.css` (after the existing rules, before or alongside the landing page section):

  ```css
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--text-dim);
    cursor: pointer;
    margin: 4px 0;
  }

  .checkbox-label input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: var(--accent2);
    cursor: pointer;
    flex-shrink: 0;
  }
  ```

- [ ] **Step 2: Typecheck + build**

  ```bash
  cd apps/web && npm run build 2>&1 | tail -5
  ```
  Expected: build succeeds, no CSS errors.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/web/src/styles.css
  git commit -m "feat: add .checkbox-label style for Stay logged in checkbox"
  ```

---

## Task 8: Update `tests/e2e/mock-api.mjs` to cookie-based auth

**Files:**
- Modify: `tests/e2e/mock-api.mjs`

The mock API is used by all e2e tests. It currently uses `Authorization: Bearer` header auth and returns `{token, expiresAt, user}` from login/register. This task makes it match the server's new cookie model so e2e tests pass.

- [ ] **Step 1: Add cookie helpers**

  After the `createSession` function (line 55) and before `sendJson`, insert:

  ```js
  function parseCookies(cookieHeader) {
    if (!cookieHeader) return {};
    return Object.fromEntries(
      cookieHeader.split(";").map((pair) => {
        const [k, ...v] = pair.trim().split("=");
        return [k.trim(), decodeURIComponent(v.join("="))];
      })
    );
  }

  function buildSessionCookie(token, rememberMe) {
    const base = `pcrobots-session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/`;
    const maxAge = rememberMe ? "; Max-Age=2592000" : "";
    return `${base}${maxAge}`;
  }

  function clearSessionCookie() {
    return "pcrobots-session=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/";
  }
  ```

  Note: The `Secure` attribute is omitted in the mock API (it always runs in dev/test mode).

- [ ] **Step 2: Replace `getSessionUser` to read from cookie**

  Replace the entire `getSessionUser` function (lines 87-100):

  ```js
  function getSessionUser(request) {
    const cookies = parseCookies(request.headers["cookie"]);
    const token = cookies["pcrobots-session"];
    if (!token) {
      return null;
    }

    const userId = sessions.get(token);
    if (!userId) {
      return null;
    }

    return users.find((user) => user.id === userId) ?? null;
  }
  ```

- [ ] **Step 3: Update the register route**

  Replace the `sendJson(response, 201, createSession(user))` line in the register route (line 267) with:

  ```js
  const session = createSession(user);
  response.setHeader("Set-Cookie", buildSessionCookie(session.token, false));
  sendJson(response, 201, { user: session.user });
  ```

- [ ] **Step 4: Update the login route**

  Replace the `sendJson(response, 200, createSession(user))` line in the login route (line 281) with:

  ```js
  const rememberMe = body.rememberMe === true;
  const session = createSession(user);
  response.setHeader("Set-Cookie", buildSessionCookie(session.token, rememberMe));
  sendJson(response, 200, { user: session.user });
  ```

- [ ] **Step 5: Update the logout route**

  Replace the logout route body (lines 285-292):

  ```js
  if (request.method === "POST" && path === "/api/auth/logout") {
    const cookies = parseCookies(request.headers["cookie"]);
    const token = cookies["pcrobots-session"];
    if (token) {
      sessions.delete(token);
    }
    response.setHeader("Set-Cookie", clearSessionCookie());
    sendJson(response, 200, { ok: true });
    return;
  }
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add tests/e2e/mock-api.mjs
  git commit -m "feat: update mock-api to cookie-based auth matching server.ts changes"
  ```

---

## Task 9: Update e2e tests

**Files:**
- Modify: `tests/e2e/app.spec.ts`

The existing three tests (`"Admin can log in and see admin panel"`, `"User can register, create bot, run match"`, `"Admin can create user and transfer ownership"`) use `{ page }` fixtures only and have no `sessionStorage` references — they do **not** need changes. Only a new test needs to be added.

After the cookie migration, session state is in cookies not sessionStorage. Add a new test verifying the persistence behaviour.

- [ ] **Step 1: Add the "stay logged in" persistence test** (new test only — existing tests need no changes)

  Append to the end of `tests/e2e/app.spec.ts`:

  ```ts
  test("stay logged in persists session across browser restart simulation", async ({ page, context }) => {
    const email = uniqueEmail("stay-logged-in");
    const password = `StayLoggedIn${Date.now()}99`;

    // Register (creates a regular 24h session — no rememberMe)
    await page.goto("/");
    const loginPanel = page.getByTestId("login-panel");
    await loginPanel.getByLabel("Email").fill(email);
    await loginPanel.getByLabel("Password").fill(password);
    await loginPanel.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("heading", { name: "User workspace" })).toBeVisible();

    // Simulate browser restart by clearing cookies
    await context.clearCookies();
    await page.reload();
    await expect(page.getByTestId("login-panel")).toBeVisible();

    // Log in WITH "Stay logged in"
    await loginPanel.getByLabel("Email").fill(email);
    await loginPanel.getByLabel("Password").fill(password);
    await page.getByLabel("Stay logged in").check();
    await loginPanel.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: "User workspace" })).toBeVisible();

    // Simulate browser restart — persistent session cookie should survive
    await page.reload();
    await expect(page.getByRole("heading", { name: "User workspace" })).toBeVisible();

    // Explicitly clear the persistent cookie and confirm logout
    await context.clearCookies();
    await page.reload();
    await expect(page.getByTestId("login-panel")).toBeVisible();
  });
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add tests/e2e/app.spec.ts
  git commit -m "test: add stay-logged-in persistence e2e test"
  ```

---

---

## Task 10: Create PR

- [ ] **Step 1: Push and open PR**

  ```bash
  git push -u origin feat/stay-logged-in
  gh pr create \
    --title "feat: httpOnly cookie auth with Stay logged in" \
    --body "$(cat <<'EOF'
  ## Summary

  - Replaces \`sessionStorage\` Bearer-token auth with an \`HttpOnly; SameSite=Lax\` cookie (\`pcrobots-session\`)
  - Adds "Stay logged in" checkbox to the login form
  - Regular sessions: browser-session cookie + 24h server TTL
  - Persistent sessions: 30-day \`Max-Age\` cookie + 30-day server TTL
  - Register always creates a regular (24h) session
  - Logout clears the cookie and deletes the server-side session

  ## Test Plan
  - [ ] Login without checkbox: session lost on tab close / cookie clear
  - [ ] Login with checkbox: session survives page reload
  - [ ] Logout clears cookie and returns to landing page
  - [ ] Register creates a regular session (no persistent cookie)
  - [ ] E2e: `stay logged in persists session across browser restart simulation` passes

  🤖 Generated with [Claude Code](https://claude.com/claude-code)
  EOF
  )"
  ```
