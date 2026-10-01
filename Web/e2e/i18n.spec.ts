import { test, expect } from '@playwright/test';

test('English is the default; language preview cancels and persists without resetting progress', async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('lexisnake:v2'))
      localStorage.setItem(
        'lexisnake:v2',
        JSON.stringify({
          version: 2,
          settings: { speed: 'fast' },
          bestScore: 4500,
          played: 12,
          learned: [{ word: 'CAT', meaningTh: 'แมว', level: 'A1' }],
        }),
      );
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await expect(page.getByText('4,500', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Gameplay', exact: true })).toBeVisible();
  await page.getByLabel('Language', { exact: false }).selectOption('th');
  await expect(page.getByRole('heading', { name: 'ตั้งค่า', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Language', { exact: false })).toHaveValue('en');
  await page.getByLabel('Language', { exact: false }).selectOption('th');
  await page.getByRole('button', { name: 'บันทึกการตั้งค่า' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'th');
  await expect(page.getByRole('button', { name: 'เข้าไปเล่นกัน' })).toBeVisible();
  await expect(page.getByText('4,500', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'ตั้งค่า', exact: true }).click();
  await expect(page.getByLabel('ความเร็วเจ้างู')).toHaveValue('fast');
  await page.getByLabel('ภาษา', { exact: false }).selectOption('en');
  await page.getByRole('button', { name: 'Apply Settings' }).click();
  await page.getByRole('button', { name: 'Word Journal', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('CAT');
  await expect(page.locator('p[lang="th"]')).toHaveText('แมว');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  for (const name of ['Maps & Board', 'Audio & Effects', 'Snake', 'Gameplay']) {
    await page.getByRole('tab', { name, exact: true }).click();
    expect(await page.getByRole('dialog').evaluate((d) => d.scrollWidth <= d.clientWidth)).toBe(
      true,
    );
  }
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('lexisnake:v2')!));
  expect(save.settings.language).toBe('en');
  expect(save.played).toBe(12);
  expect(save.learned).toHaveLength(1);
});

test('English input feedback reports missing letters and clears after a valid edit', async ({
  page,
}) => {
  await page.route('**/src/game/engine.ts*', async (route) => {
    const response = await route.fetch();
    const original = await response.text();
    const body = original.replace(
      /phase: tutorial \? "lesson" : "countdown",/,
      'phase: "challenge",',
    );
    expect(body !== original).toBe(true);
    await route.fulfill({ response, body });
  });
  await page.route('**/data/vocabulary.json', (route) => route.fulfill({ json: [] }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: /Returning Player/ }).click();
  const input = page.getByLabel('English word', { exact: true });
  await input.pressSequentially('cc');
  await expect(input).toHaveValue('C');
  await expect(page.getByTestId('word-feedback')).toHaveText(
    "You don't have the letters for this word. Missing: C.",
  );
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await input.press('Backspace');
  await expect(page.getByTestId('word-feedback')).toHaveText('');
  await input.pressSequentially('cat');
  await expect(input).toHaveValue('CAT');
  await expect(input).toHaveAttribute('aria-invalid', 'false');
  await input.fill('ACT');
  await page.getByRole('button', { name: 'Submit Word' }).click();
  await expect(page.getByTestId('word-feedback')).toHaveText(
    'Word not found in the dictionary. Try another word.',
  );
  await input.fill('CAT');
  await expect(page.getByTestId('word-feedback')).toHaveText('');
  await page.getByRole('button', { name: 'Submit Word' }).click();
  await expect(page.getByRole('heading', { name: 'Word Complete!' })).toBeVisible();
  await expect(page.getByTestId('score')).toHaveText('450');
  await expect(page.locator('.result-meaning[lang="th"]')).toHaveText('แมว');
});

test('revive, pause and game over use English game terms', async ({ page }) => {
  await page.route('**/src/game/engine.ts*', async (route) => {
    const response = await route.fetch();
    const original = await response.text();
    let body = original.replace(/phase: tutorial \? "lesson" : "countdown",/, 'phase: "revive",');
    body = body.replace(
      'reviveWord: null,',
      'reviveWord: { word: "CAT", meaningTh: "แมว", level: "A1" },',
    );
    expect(body !== original).toBe(true);
    await route.fulfill({ response, body });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: /Returning Player/ }).click();
  await expect(page.getByRole('heading', { name: 'Revive?', exact: true })).toBeVisible();
  await expect(page.getByText('Thai meaning:', { exact: false })).toBeVisible();
  await page.getByLabel('Revive answer').fill('DOG');
  await page.getByRole('button', { name: 'Revive →', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Not quite. Try spelling it again.');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Paused', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Resume →', exact: true }).click();
  await page.getByRole('button', { name: 'End Run', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Game Over', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to Home →', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
});

test('English tutorial covers every lesson, chest, inventory review and portal', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.clock.install();
  await page.getByRole('button', { name: 'Play' }).click();
  await page.getByRole('button', { name: /New Player/ }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Learn to Steer', exact: true })).toBeVisible();
  await expect(page.locator('.tutorial-modal').getByRole('img')).toHaveCount(1);
  await page.clock.runFor(2000);
  await expect(page.getByRole('heading', { name: 'Learn to Steer', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Practice Steering' }).click();
  await page.clock.runFor(3100);
  await page.keyboard.press('w');
  await page.clock.runFor(400);
  await expect(page.getByRole('complementary', { name: 'Tutorial objective' })).toBeVisible();
  await page.clock.runFor(250);
  for (const key of ['a', 's', 'd']) {
    await page.keyboard.press(key);
    await page.clock.runFor(650);
  }
  await expect(page.getByRole('heading', { name: 'All Four Directions Complete' })).toBeVisible();
  await page.clock.runFor(2000);
  await expect(page.getByRole('heading', { name: 'All Four Directions Complete' })).toBeVisible();
  await page.getByRole('button', { name: 'Ready — Learn to Boost' }).click();
  await expect(page.getByRole('heading', { name: 'Hold Shift to Boost' })).toBeVisible();
  await page.getByRole('button', { name: 'Practice Boosting' }).click();
  await page.clock.runFor(3100);
  await page.keyboard.down('Shift');
  await page.clock.runFor(650);
  await page.keyboard.up('Shift');
  await page.getByRole('button', { name: 'Ready — Collect a Letter' }).click();
  await expect(page.getByRole('heading', { name: 'Collect a Letter' })).toBeVisible();
  await page.getByRole('button', { name: 'Collect C' }).click();
  await page.clock.runFor(5300);
  await expect(page.getByRole('heading', { name: '↑ C Is in Your Inventory' })).toBeVisible();
  await expect(page.locator('.tutorial-bag-focus .letter-tile')).toHaveText(['C']);
  await page.clock.runFor(2000);
  await expect(page.getByRole('heading', { name: '↑ C Is in Your Inventory' })).toBeVisible();
  await page.getByRole('button', { name: 'I See C — Try a Chest' }).click();
  await expect(page.getByRole('heading', { name: 'Loot Chests' })).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Silver: 2, Gold: 3, Purple: 4, Red: 5 letters' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Try a Chest' }).click();
  await page.clock.runFor(5300);
  await expect(page.getByRole('heading', { name: 'Ready to Open?' })).toBeVisible();
  await page.clock.runFor(2000);
  await expect(page.getByRole('heading', { name: 'Ready to Open?' })).toBeVisible();
  await page.getByRole('button', { name: 'Open Silver Chest' }).click();
  await page.clock.runFor(1800);
  await expect(page.getByRole('heading', { name: 'Loot Revealed!' })).toBeVisible();
  await expect(page.locator('.reward-letters .letter-tile')).toHaveText(['A', 'T']);
  await page.getByRole('button', { name: 'Claim Loot +2' }).click();
  await expect(page.getByRole('heading', { name: '↑ A and T Added to Inventory' })).toBeVisible();
  await expect(page.locator('.tutorial-bag-focus .letter-tile')).toHaveText(['C', 'A', 'T']);
  await expect(page.locator('.tutorial-new-letter')).toHaveText(['A', 'T']);
  await page.clock.runFor(2000);
  await expect(page.getByRole('heading', { name: '↑ A and T Added to Inventory' })).toBeVisible();
  await page.getByRole('button', { name: 'I See C A T — Enter the Portal' }).click();
  await expect(page.getByRole('heading', { name: 'Enter the Green Portal' })).toBeVisible();
  await page.getByRole('button', { name: 'Enter the Portal' }).click();
  await expect(page.getByRole('complementary', { name: 'Tutorial objective' })).toContainText(
    'Move right into the green portal.',
  );
  await page.clock.runFor(3900);
  await expect(page.getByRole('heading', { name: 'Build the Word CAT' })).toBeVisible();
  await page.getByRole('button', { name: 'Build a Word' }).click();
  await page.getByLabel('English word', { exact: true }).fill('CA');
  await page.getByRole('button', { name: 'View Instructions', exact: true }).click();
  await page.clock.runFor(1000);
  await page.getByRole('button', { name: 'Build a Word' }).click();
  await expect(page.getByLabel('English word', { exact: true })).toHaveValue('CA');
  await page.getByLabel('English word', { exact: true }).fill('CAT');
  await page.keyboard.press('Enter');
  await expect(page.getByText('แมว', { exact: true })).toBeVisible();
  await expect(page.getByTestId('score')).toHaveText('450');
  await page.getByRole('button', { name: 'Try the Red Brick' }).click();
  await expect(page.getByRole('heading', { name: 'Watch Out for Red Bricks' })).toBeVisible();
  await page.getByRole('button', { name: 'Bump the Brick' }).click();
  await page.clock.runFor(3100 + 2200);
  await expect(
    page.getByRole('heading', { name: 'Brick Hit: −50 Points and One Letter' }),
  ).toBeVisible();
  await expect(page.getByTestId('score')).toHaveText('400');
  await page.getByRole('button', { name: 'Got It — Read the Rules' }).click();
  await expect(page.getByRole('heading', { name: 'Pause & Revive' })).toBeVisible();
  await page.getByRole('button', { name: 'Finish Tutorial' }).click();
  await expect(page.getByRole('heading', { name: 'Tutorial Complete!' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to Home →' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});
