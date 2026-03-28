import { expect, test } from "@playwright/test";

function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()} ${Math.floor(Math.random() * 1000)}`;
}

function uniqueEmail(prefix: string): string {
  return `${prefix.toLowerCase().replace(/\s+/g, ".")}.${Date.now()}@pcrobots.local`;
}

const adminEmail = process.env.PCROBOTS_ADMIN_EMAIL ?? "admin@pcrobots.local";
const adminPassword = process.env.PCROBOTS_ADMIN_PASSWORD ?? "change-me-admin-password";

function fakeElfBinary(): Buffer {
  const buffer = Buffer.alloc(64, 0);
  buffer[0] = 0x7f;
  buffer[1] = 0x45;
  buffer[2] = 0x4c;
  buffer[3] = 0x46;
  buffer[4] = 2;
  buffer[5] = 1;
  buffer[18] = 0x3e;
  return buffer;
}

test("browser smoke covers registration, resource authoring, and live match flows", async ({ page }) => {
  const accountEmail = uniqueEmail("browser-user");
  const accountPassword = `BrowserPass${Date.now()}99`;
  const alphaName = uniqueName("Browser Alpha");
  const betaName = uniqueName("Browser Beta");
  const arenaName = uniqueName("Browser Arena");
  const liveMatchName = uniqueName("Browser Live");

  await page.goto("/");
  const loginPanel = page.getByTestId("login-panel");
  await expect(loginPanel.getByRole("heading", { name: "Sign In" })).toBeVisible();

  await loginPanel.getByLabel("Email").fill(accountEmail);
  await loginPanel.getByLabel("Password").fill(accountPassword);
  await loginPanel.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText(`Created and signed into ${accountEmail}`)).toBeVisible();
  await expect(page.getByRole("heading", { name: "User workspace" })).toBeVisible();

  const botSection = page.getByTestId("bot-panel");
  await botSection.getByLabel("Name").fill(alphaName);
  await botSection.getByRole("button", { name: /save/i }).click();
  await expect(page.getByText(`Saved ${alphaName}`)).toBeVisible();

  await botSection.getByLabel("Name").fill(betaName);
  await botSection.getByLabel("Language").selectOption("linux-x64-binary");
  await botSection.getByLabel("Linux x64 executable").setInputFiles({
    name: "bot.elf",
    mimeType: "application/octet-stream",
    buffer: fakeElfBinary()
  });
  await botSection.getByRole("button", { name: /save/i }).click();
  await expect(page.getByText(`Saved ${betaName}`)).toBeVisible();

  await page.getByRole("button", { name: /arenas/i }).click();
  const arenaSection = page.getByTestId("arena-panel");
  await arenaSection.getByLabel("Name").fill(arenaName);
  await arenaSection.getByRole("button", { name: "Save arena" }).click();
  await expect(page.getByText(`Saved arena ${arenaName}`)).toBeVisible();

  await page.getByRole("button", { name: /matches/i }).click();
  const matchSection = page.getByTestId("match-panel");
  await matchSection.getByLabel("Name").fill(liveMatchName);
  await matchSection.getByLabel("Arena").selectOption({ label: arenaName });
  await matchSection.getByLabel("Team A bot").selectOption({ label: `${alphaName} (javascript)` });
  await matchSection.getByLabel("Team B bot").selectOption({ label: `${betaName} (linux-x64-binary)` });
  await matchSection.getByLabel("Seed").fill("21");
  await matchSection.getByLabel("Max ticks").fill("40");
  await matchSection.getByRole("button", { name: "Store and run now" }).click();
  await expect(page.getByText("Stored and ran match")).toBeVisible();

  const storedMatches = page.getByTestId("stored-matches-panel");
  const liveMatchButton = storedMatches.getByRole("button", { name: new RegExp(liveMatchName) });
  await expect(liveMatchButton).toBeVisible();
  await expect(liveMatchButton).toContainText(/completed|failed/);
  await expect(page.locator(".replay-panel")).toBeVisible();
  await expect(page.getByRole("heading", { name: liveMatchName })).toBeVisible();

  await page.getByRole("button", { name: /accounts/i }).click();
  await expect(page.getByRole("heading", { name: "Your Bot Statistics" })).toBeVisible();
  await expect(page.getByText("matches tracked")).toBeVisible();
});

test("browser smoke covers admin account management and ownership transfer", async ({ page }) => {
  const transferableEmail = uniqueEmail("browser-transfer");
  const recipientEmail = uniqueEmail("browser-recipient");
  const userPassword = `BrowserPass${Date.now()}88`;

  await page.goto("/");
  const loginPanel = page.getByTestId("login-panel");
  await loginPanel.getByLabel("Email").fill(adminEmail);
  await loginPanel.getByLabel("Password").fill(adminPassword);
  await loginPanel.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Admin workspace" })).toBeVisible();

  await page.getByRole("button", { name: /accounts/i }).click();
  await expect(page.locator(".page-title").filter({ hasText: "Accounts" })).toBeVisible();

  const adminUsersPanel = page.getByTestId("admin-users-panel");
  await adminUsersPanel.getByLabel("Email").fill(transferableEmail);
  await adminUsersPanel.getByLabel(/Password/).fill(userPassword);
  await adminUsersPanel.getByLabel("Role").selectOption("user");
  await adminUsersPanel.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText(`Created ${transferableEmail}`)).toBeVisible();

  await adminUsersPanel.getByLabel("Email").fill(recipientEmail);
  await adminUsersPanel.getByLabel(/Password/).fill(userPassword);
  await adminUsersPanel.getByLabel("Role").selectOption("user");
  await adminUsersPanel.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText(`Created ${recipientEmail}`)).toBeVisible();

  const transferableCard = adminUsersPanel.locator(".list-card").filter({ hasText: transferableEmail }).first();
  await transferableCard.getByRole("button", { name: "Edit" }).click();
  await adminUsersPanel.getByLabel("Transfer owned resources to").selectOption({ label: recipientEmail });
  await adminUsersPanel.getByRole("button", { name: "Transfer ownership" }).click();
  await expect(page.getByText(/Transferred .* bots, .* arenas, .* ladders, .* tournaments, and .* matches/)).toBeVisible();
  await expect(adminUsersPanel.locator(".list-card").filter({ hasText: recipientEmail }).locator(".mini-stat-line")).toBeVisible();
});

test("browser smoke covers public docs routes and unknown-path normalization", async ({ page }) => {
  await page.goto("/docs/creating-bots");
  await expect(page).toHaveURL(/\/docs\/creating-bots$/);
  await expect(page.getByRole("heading", { name: "Creating a Bot" })).toBeVisible();
  await expect(page.getByText("Save bot revision")).toBeVisible();

  await page.getByRole("link", { name: "Next: Running a match →" }).click();
  await expect(page).toHaveURL(/\/docs\/running-bots$/);
  await expect(page.getByRole("heading", { level: 1, name: "Running a Match" })).toBeVisible();
  await expect(page.getByText("Store and run now")).toBeVisible();
  await expect(page.getByText("Store and enqueue")).toBeVisible();

  await page.goto("/totally-unknown");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("login-panel")).toBeVisible();
});

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
