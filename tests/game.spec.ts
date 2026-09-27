import { test, expect } from "@playwright/test";

test("account maakt spel, gast speelt mobiel, host vinkt live af", async ({
  browser,
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/login?next=/host");
  await page.getByRole("button", { name: "Account maken" }).click();
  await page.getByLabel("Gebruikersnaam").fill("Hosttest");
  await page.getByLabel("Wachtwoord").fill("veilig-testwachtwoord");
  await page.getByRole("button", { name: "Account maken" }).last().click();
  await expect(
    page.getByRole("heading", { name: "Jouw evenementen" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Nieuw evenement" }).click();
  await page.getByLabel("Naam evenement").fill("Het grote proefcollege");
  await page
    .getByLabel("Korte uitleg")
    .fill("Wie zag het als eerste aankomen?");
  await page.getByRole("button", { name: "Vul een voorbeeldpool in" }).click();
  await page.getByRole("button", { name: "Open de lobby" }).click();
  const playerHref = await page
    .getByRole("link", { name: "Open spelersomgeving" })
    .getAttribute("href");
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const player = await mobile.newPage();
  player.on("pageerror", (e) => errors.push(e.message));
  await player.goto(playerHref!);
  await player.getByLabel("Je spelersnaam").fill("Allard");
  for (let i = 0; i < 16; i++)
    await player.locator(".word-chip").nth(i).click();
  await player.getByRole("button", { name: "Dit wordt mijn kaart" }).click();
  await expect(
    player.getByText("Wachten op de host. Je kaart staat klaar."),
  ).toBeVisible();
  await player.reload();
  await expect(player.locator(".live-grid .bingo-cell")).toHaveCount(16);
  await page.getByRole("button", { name: "Start het spel" }).click();
  await expect(player.getByText("Jouw voorspellingen")).toBeVisible();
  for (let i = 0; i < 4; i++) {
    await page.locator(".admin-word").nth(i).click();
    await expect(page.locator(".admin-word").nth(i)).toHaveClass(/called/);
  }
  await expect(player.locator(".big-score")).toContainText("200");
  await expect(player.locator(".live-grid .hit")).toHaveCount(4);
  expect(
    await player.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await player.screenshot({
    path: "test-results/player-mobile.png",
    fullPage: true,
  });
  await page.locator(".admin-word").first().click();
  await expect(player.locator(".big-score")).toContainText("0");
  await expect(player.locator(".live-grid .hit")).toHaveCount(3);
  await page.locator(".admin-word").first().click();
  await expect(player.locator(".live-grid .hit")).toHaveCount(4);
  await mobile.setOffline(true);
  await page.locator(".admin-word").nth(4).click();
  await expect(page.locator(".admin-word").nth(4)).toHaveClass(/called/);
  await mobile.setOffline(false);
  await expect(player.locator(".live-grid .hit")).toHaveCount(5, {
    timeout: 20000,
  });
  for (let i = 5; i < 16; i++) {
    await page.locator(".admin-word").nth(i).click();
    await expect(page.locator(".admin-word").nth(i)).toHaveClass(/called/);
  }
  await expect(player.locator(".big-score")).toContainText("700");
  await page.getByRole("button", { name: "Spel afronden" }).click();
  await page.getByRole("button", { name: "Ja, afronden" }).click();
  await expect(player.getByText("Dit was jouw ronde.")).toBeVisible();
  await player.reload();
  await expect(player.locator(".big-score")).toContainText("700");
  expect(errors).toEqual([]);
  await mobile.close();
});

test("startpagina desktop en mobiel zonder horizontale overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Jij hoort het. Jij scoort." }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/home-mobile.png",
    fullPage: true,
  });
});

test("accountkaart op tweede browser en punten in profiel", async ({
  browser,
  page,
  request,
}) => {
  const host = await (
    await request.post("/api/auth/register", {
      data: { username: "AccountHost", password: "veilig-testwachtwoord" },
    })
  ).json();
  const game = await (
    await request.post("/api/host/games", {
      headers: { Authorization: `Bearer ${host.token}` },
      data: {
        title: "Accountcollege",
        words: Array.from({ length: 24 }, (_, i) => `Woord ${i}`),
      },
    })
  ).json();
  await page.goto("/login");
  await page.getByRole("button", { name: "Account maken" }).first().click();
  await page.getByLabel("Gebruikersnaam").fill("AccountSpeler");
  await page.getByLabel("Wachtwoord").fill("veilig-testwachtwoord");
  await page.getByRole("button", { name: "Account maken" }).last().click();
  await expect(
    page.getByRole("heading", { name: "Hoi, AccountSpeler." }),
  ).toBeVisible();
  await page.goto(`/g/${game.id}`);
  for (let i = 0; i < 16; i++) await page.locator(".word-chip").nth(i).click();
  await page.getByRole("button", { name: "Dit wordt mijn kaart" }).click();
  await expect(page.locator(".live-grid .bingo-cell")).toHaveCount(16);

  const second = await browser.newContext();
  const restored = await second.newPage();
  await restored.goto("/login");
  await restored.getByLabel("Gebruikersnaam").fill("AccountSpeler");
  await restored.getByLabel("Wachtwoord").fill("veilig-testwachtwoord");
  await restored.getByRole("button", { name: "Inloggen" }).last().click();
  await expect(
    restored.getByRole("heading", { name: "Hoi, AccountSpeler." }),
  ).toBeVisible();
  await restored.goto(`/g/${game.id}`);
  await expect(restored.locator(".live-grid .bingo-cell")).toHaveCount(16);

  const headers = { Authorization: `Bearer ${host.token}` };
  await request.put(`/api/host/games/${game.id}/status`, {
    headers,
    data: { status: "live" },
  });
  for (const item of game.items.slice(0, 16)) {
    await request.put(`/api/host/games/${game.id}/calls/${item.id}`, {
      headers,
      data: { active: true },
    });
  }
  await request.put(`/api/host/games/${game.id}/status`, {
    headers,
    data: { status: "finished" },
  });
  await restored.goto("/account");
  await expect(
    restored.getByRole("heading", { name: "Jouw geschiedenis" }),
  ).toBeVisible();
  await expect(restored.locator(".history-row")).toContainText(
    "Accountcollege",
  );
  await expect(restored.locator(".stat").first()).toContainText("700");
  await second.close();
});

test("50 spelers en live SSE ontvangen dezelfde bevestiging", async ({
  request,
}) => {
  const login = await (
    await request.post("/api/auth/register", {
      data: { username: "Capaciteit", password: "veilig-testwachtwoord" },
    })
  ).json();
  const headers = { Authorization: `Bearer ${login.token}` };
  const game = await (
    await request.post("/api/host/games", {
      headers,
      data: {
        title: "Capaciteitsproef",
        words: Array.from({ length: 24 }, (_, i) => `Item ${i}`),
      },
    })
  ).json();
  const card = game.items.slice(0, 16).map((w: { id: string }) => w.id);
  const joins = await Promise.all(
    Array.from({ length: 50 }, (_, i) =>
      request.put(`/api/games/${game.id}/card`, {
        data: { name: `Speler ${i}`, card },
      }),
    ),
  );
  expect(joins.every((r) => r.ok())).toBeTruthy();
  const start = await request.put(`/api/host/games/${game.id}/status`, {
    headers,
    data: { status: "live" },
  });
  expect(start.ok()).toBeTruthy();
  const controller = new AbortController();
  const listeners = await Promise.all(
    Array.from({ length: 50 }, async () => {
      const response = await fetch(
        `http://127.0.0.1:18080/api/games/${game.id}/events`,
        { signal: controller.signal },
      );
      const reader = response.body!.getReader();
      await reader.read();
      return reader;
    }),
  );
  const t = Date.now();
  try {
    const updates = listeners.map(async (reader) => {
      const next = await reader.read();
      expect(new TextDecoder().decode(next.value)).toContain("event: update");
    });
    await request.put(`/api/host/games/${game.id}/calls/${card[0]}`, {
      headers,
      data: { active: true },
    });
    await Promise.all(updates);
    const snapshots = await Promise.all(
      Array.from({ length: 50 }, () => request.get(`/api/games/${game.id}`)),
    );
    for (const r of snapshots) {
      const snapshot = await r.json();
      expect(snapshot.calls).toEqual([card[0]]);
      expect(snapshot.players).toBe(50);
    }
    console.log(`50 lokale SSE-clients + ophalen stand: ${Date.now() - t} ms`);
  } finally {
    controller.abort();
  }
});
