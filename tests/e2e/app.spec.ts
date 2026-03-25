import { expect, test } from "@playwright/test";

function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()} ${Math.floor(Math.random() * 1000)}`;
}

test("browser smoke covers bot, arena, and live match flows", async ({ page }) => {
  const alphaName = uniqueName("Browser Alpha");
  const betaName = uniqueName("Browser Beta");
  const arenaName = uniqueName("Browser Arena");
  const liveMatchName = uniqueName("Browser Live");

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "PCRobots Operations Deck" })).toBeVisible();
  await expect(page.getByText("Failed to fetch")).toHaveCount(0);

  const botSection = page.getByTestId("bot-panel");
  await botSection.getByLabel("Name").fill(alphaName);
  await botSection.getByRole("button", { name: "Save bot revision" }).click();
  await expect(page.getByText(`Saved ${alphaName}`)).toBeVisible();

  await botSection.getByLabel("Name").fill(betaName);
  await botSection.getByLabel("Language").selectOption("python");
  await botSection.getByRole("button", { name: "Save bot revision" }).click();
  await expect(page.getByText(`Saved ${betaName}`)).toBeVisible();

  const arenaSection = page.getByTestId("arena-panel");
  await arenaSection.getByLabel("Name").fill(arenaName);
  await arenaSection.getByRole("button", { name: "Save arena" }).click();
  await expect(page.getByText(`Saved arena ${arenaName}`)).toBeVisible();

  const matchSection = page.getByTestId("match-panel");
  await matchSection.getByLabel("Name").fill(liveMatchName);
  await matchSection.getByLabel("Arena").selectOption({ label: arenaName });
  await matchSection.getByLabel("Team A bot").selectOption({ label: `${alphaName} (javascript)` });
  await matchSection.getByLabel("Team B bot").selectOption({ label: `${betaName} (python)` });
  await matchSection.getByLabel("Seed").fill("21");
  await matchSection.getByLabel("Max ticks").fill("40");
  await matchSection.getByRole("button", { name: "Store and run now" }).click();
  await expect(page.getByText("Stored and ran match")).toBeVisible();

  const storedMatches = page.getByTestId("stored-matches-panel");
  const liveMatchButton = storedMatches.getByRole("button", { name: new RegExp(liveMatchName) });
  await expect(liveMatchButton).toBeVisible();
  await expect(liveMatchButton).toContainText(/completed|failed/);
  await expect(page.getByRole("heading", { name: "Replay Viewer" })).toBeVisible();
});
