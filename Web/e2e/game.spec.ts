import { test, expect, Page } from '@playwright/test';

// Helper function to interact with CustomSelect component
async function selectCustom(page: Page, label: string, optionText: string) {
  const labelLoc = page.locator('label').filter({ hasText: label });
  await labelLoc.locator('.custom-select-trigger').click();
  await page.locator('.custom-select-option').filter({ hasText: optionText }).click();
}

async function expectCustomValue(page: Page, label: string, expectedText: string) {
  const labelLoc = page.locator('label').filter({ hasText: label });
  await expect(labelLoc.locator('.custom-select-trigger')).toContainText(expectedText);
}

// Keep the original full gameplay suite as Thai-language coverage.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('lexisnake:v2'))
      localStorage.setItem(
        'lexisnake:v2',
        JSON.stringify({ version: 2, settings: { language: 'th' } }),
      );
  });
});
test('Home, settings, returning-player flow, and wide board', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('lexisnake');
  await page.getByRole('button', { name: 'ตั้งค่า', exact: true }).click();
  await expectCustomValue(page, 'ความเร็วเจ้างู', 'ช้า');
  await expectCustomValue(page, 'เวลาในประตูมิติต่างโลก', '1 นาที');
  await selectCustom(page, 'เวลาในประตูมิติต่างโลก', '1 นาที 30 วินาที');
  await page.getByRole('button', { name: 'บันทึกการตั้งค่า' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'ตั้งค่า', exact: true }).click();
  await expectCustomValue(page, 'เวลาในประตูมิติต่างโลก', '1 นาที 30 วินาที');
  await page.getByRole('button', { name: 'ปิด', exact: true }).click();
  await page.getByRole('button', { name: 'เข้าไปเล่นกัน' }).click();
  await expect(page.getByRole('heading', { name: 'เคยมาเดินเล่นที่นี่หรือยัง?' })).toBeVisible();
  await page.getByRole('button', { name: /เคยเล่นแล้ว พร้อมเลย/ }).click();
  await expect(page.locator('canvas')).toBeVisible();
  const box = await page.getByTestId('game-board').boundingBox();
  expect(box!.width).toBeGreaterThan(1300);
  await expect(page.getByRole('img', { name: 'ฟื้นคืนชีพได้อีก 3 ครั้ง' })).toBeVisible();
  await page.getByRole('button', { name: 'พักเกม', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'พักในสวนสักครู่' })).toBeVisible();
  expect(errors).toEqual([]);
});
test('a beginner learns steering, Shift, letters, chests and the portal with illustrated popups', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.clock.install();
  await page.getByRole('button', { name: 'เข้าไปเล่นกัน' }).click();
  await page.getByRole('button', { name: /มือใหม่ ขอฝึกก่อน/ }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ลองบังคับเจ้างู', exact: true })).toBeVisible();
  await expect(page.locator('.tutorial-modal').getByRole('img')).toHaveCount(1);
  await page.clock.runFor(2000);
  await expect(page.getByRole('heading', { name: 'ลองบังคับเจ้างู', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'เริ่มฝึกเลี้ยว' }).click();
  await page.clock.runFor(3100);
  await page.keyboard.press('w');
  await page.clock.runFor(400);
  await expect(page.getByRole('complementary', { name: 'เป้าหมายบทสอน' })).toBeVisible();
  await page.clock.runFor(250);
  for (const key of ['a', 's', 'd']) {
    await page.keyboard.press(key);
    await page.clock.runFor(650);
  }
  await expect(page.getByRole('heading', { name: 'ลองครบทั้ง 4 ทิศแล้ว' })).toBeVisible();
  await page.clock.runFor(2000);
  await expect(page.getByRole('heading', { name: 'ลองครบทั้ง 4 ทิศแล้ว' })).toBeVisible();
  await page.getByRole('button', { name: 'พร้อมแล้ว ไปฝึกเร่งความเร็ว' }).click();
  await expect(page.getByRole('heading', { name: 'กด Shift เพื่อเร่งความเร็ว' })).toBeVisible();
  await page.getByRole('button', { name: 'ลองเร่งความเร็ว' }).click();
  await page.clock.runFor(3100);
  await page.keyboard.down('Shift');
  await page.clock.runFor(650);
  await page.keyboard.up('Shift');
  await page.getByRole('button', { name: 'พร้อมแล้ว ไปฝึกเก็บอักษร' }).click();
  await expect(page.getByRole('heading', { name: 'เก็บอักษรใส่กระเป๋า' })).toBeVisible();
  await page.getByRole('button', { name: 'เริ่มเก็บตัวอักษร' }).click();
  await page.clock.runFor(5300);
  await expect(page.getByRole('heading', { name: '↑ ตัว C อยู่ในกระเป๋าตรงนี้' })).toBeVisible();
  await expect(page.locator('.tutorial-bag-focus .letter-tile')).toHaveText(['C']);
  await page.clock.runFor(2000);
  await expect(page.getByRole('heading', { name: '↑ ตัว C อยู่ในกระเป๋าตรงนี้' })).toBeVisible();
  await page.getByRole('button', { name: 'เห็น C ในกระเป๋าแล้ว ไปฝึกเปิดกล่อง' }).click();
  await expect(page.getByRole('heading', { name: 'กล่องสุ่มตัวอักษร' })).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'กล่องเงิน 2 ทอง 3 ม่วง 4 แดง 5 ตัวอักษร' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'ลองเปิดกล่อง' }).click();
  await page.clock.runFor(5300);
  await expect(page.getByRole('heading', { name: 'ลองเปิดกล่องเงิน' })).toBeVisible();
  await page.clock.runFor(2000);
  await expect(page.getByRole('heading', { name: 'ลองเปิดกล่องเงิน' })).toBeVisible();
  await page.getByRole('button', { name: 'เริ่มเปิดกล่องเงิน' }).click();
  await page.clock.runFor(1800);
  await expect(page.getByRole('heading', { name: 'ของขวัญของคุณมาแล้ว!' })).toBeVisible();
  await expect(page.locator('.reward-letters .letter-tile')).toHaveText(['A', 'T']);
  await page.getByRole('button', { name: 'เก็บใส่กระเป๋า +2' }).click();
  await expect(page.getByRole('heading', { name: '↑ A และ T เพิ่มในกระเป๋าแล้ว' })).toBeVisible();
  await expect(page.locator('.tutorial-bag-focus .letter-tile')).toHaveText(['C', 'A', 'T']);
  await expect(page.locator('.tutorial-new-letter')).toHaveText(['A', 'T']);
  await page.clock.runFor(2000);
  await expect(page.getByRole('heading', { name: '↑ A และ T เพิ่มในกระเป๋าแล้ว' })).toBeVisible();
  await page.getByRole('button', { name: 'เห็น C A T ครบแล้ว ไปฝึกเข้าประตู' }).click();
  await expect(page.getByRole('heading', { name: 'เข้าประตูสีเขียว' })).toBeVisible();
  await page.getByRole('button', { name: 'ลองเข้าประตูกัน' }).click();
  await expect(page.getByRole('complementary', { name: 'เป้าหมายบทสอน' })).toContainText(
    'เดินไปทางขวาเข้าประตูสีเขียว',
  );
  await page.clock.runFor(3900);
  await expect(page.getByRole('heading', { name: 'เรียง CAT ให้เป็นคำ' })).toBeVisible();
  await page.getByRole('button', { name: 'ลองเรียงคำ' }).click();
  await page.getByLabel('คำศัพท์ภาษาอังกฤษ', { exact: true }).fill('CA');
  await page.getByRole('button', { name: 'ดูคำอธิบาย', exact: true }).click();
  await page.clock.runFor(1000);
  await page.getByRole('button', { name: 'ลองเรียงคำ' }).click();
  await expect(page.getByLabel('คำศัพท์ภาษาอังกฤษ', { exact: true })).toHaveValue('CA');
  await page.getByLabel('คำศัพท์ภาษาอังกฤษ', { exact: true }).fill('CAT');
  await page.keyboard.press('Enter');
  await expect(page.getByText('แมว', { exact: true })).toBeVisible();
  await expect(page.getByTestId('score')).toHaveText('450');
  await page.getByRole('button', { name: 'ไปลองชนอิฐแดง' }).click();
  await expect(page.getByRole('heading', { name: 'ระวังกล่องอิฐสีแดง' })).toBeVisible();
  await page.getByRole('button', { name: 'ลองชนอิฐ' }).click();
  await page.clock.runFor(3100 + 2200);
  await expect(
    page.getByRole('heading', { name: 'ชนอิฐ: เสีย 50 คะแนนและอักษร 1 ตัว' }),
  ).toBeVisible();
  await expect(page.getByTestId('score')).toHaveText('400');
  await page.getByRole('button', { name: 'เข้าใจแล้ว ไปอ่านกติกา' }).click();
  await expect(page.getByRole('heading', { name: 'พักเกมและใช้หัวใจ' })).toBeVisible();
  await page.getByRole('button', { name: 'จบบทเรียน' }).click();
  await expect(page.getByRole('heading', { name: 'พร้อมออกผจญภัยแล้ว!' })).toBeVisible();
  await page.getByRole('button', { name: 'กลับ Home แล้วเริ่มเล่นกัน' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});
test('mobile tutorial can turn and hold the on-screen boost button', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.clock.install();
  await page.getByRole('button', { name: 'ลองฝึกก่อน' }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ลองบังคับเจ้างู', exact: true })).toBeVisible();
  const dialog = page.getByRole('dialog');
  expect(await dialog.evaluate((d) => d.scrollWidth <= d.clientWidth)).toBe(true);
  await page.getByRole('button', { name: 'ปิด', exact: true }).click();
  await page.clock.runFor(3100);
  for (const name of ['เลี้ยวขึ้น', 'เลี้ยวซ้าย', 'เลี้ยวลง', 'เลี้ยวขวา']) {
    await page.getByRole('button', { name, exact: true }).click();
    await page.clock.runFor(650);
  }
  await page.getByRole('button', { name: 'พร้อมแล้ว ไปฝึกเร่งความเร็ว' }).click();
  await page.getByRole('button', { name: 'ลองเร่งความเร็ว' }).click();
  await page.clock.runFor(3100);
  const boost = page.getByRole('button', { name: 'เร่ง ↗', exact: true });
  const box = await boost.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.clock.runFor(650);
  await page.mouse.up();
  await page.getByRole('button', { name: 'พร้อมแล้ว ไปฝึกเก็บอักษร' }).click();
  await expect(page.getByRole('heading', { name: 'เก็บอักษรใส่กระเป๋า' })).toBeVisible();
  await page.getByRole('button', { name: 'เริ่มเก็บตัวอักษร' }).click();
  await page.clock.runFor(5300);
  const bag = page.getByRole('contentinfo', { name: 'กระเป๋าอักษร' });
  await expect(bag).toHaveClass(/tutorial-bag-focus/);
  await expect(bag).toBeInViewport();
  await expect(
    page.getByRole('button', { name: 'เห็น C ในกระเป๋าแล้ว ไปฝึกเปิดกล่อง' }),
  ).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('mobile Home and play controls fit the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'เข้าไปเล่นกัน' }).click();
  await page.getByRole('button', { name: /เคยเล่นแล้ว พร้อมเลย/ }).click();
  await expect(page.getByRole('button', { name: 'เลี้ยวขึ้น' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'เลี้ยวขวา' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('revival spends one heart, clamps the score, and preserves its timer on pause', async ({
  page,
}) => {
  await page.route('**/src/game/engine.ts', async (route) => {
    const response = await route.fetch();
    const original = await response.text();
    const body = original.replace('random = Math.random', 'random = () => 0');
    expect(body).not.toBe(original);
    await route.fulfill({ response, body });
  });
  await page.goto('/');
  await page.clock.install();
  await page.getByRole('button', { name: 'เข้าไปเล่นกัน' }).click();
  await page.getByRole('button', { name: /เคยเล่นแล้ว พร้อมเลย/ }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await page.clock.runFor(10500);
  await expect(page.getByRole('heading', { name: 'ให้เจ้างูลองอีกครั้งไหม?' })).toBeVisible();
  await page.getByLabel('คำตอบฟื้นคืนชีพ').fill('wrong');
  await page.getByRole('button', { name: 'ตอบเพื่อฟื้นคืนชีพ' }).click();
  await expect(page.getByText('ยังไม่ถูก ลองสะกดอีกครั้งได้เลย')).toBeVisible();
  await expect(page.getByRole('img', { name: 'ฟื้นคืนชีพได้อีก 3 ครั้ง' })).toBeVisible();
  await page.getByLabel('คำตอบฟื้นคืนชีพ').fill('cat');
  await page.getByRole('button', { name: 'พักก่อน', exact: true }).click();
  await page.clock.runFor(10000);
  await page.getByRole('button', { name: 'เล่นต่อ', exact: false }).click();
  await expect(page.getByLabel('คำตอบฟื้นคืนชีพ')).toHaveValue('cat');
  await page.getByRole('button', { name: 'ตอบเพื่อฟื้นคืนชีพ' }).click();
  await expect(page.getByRole('img', { name: 'ฟื้นคืนชีพได้อีก 2 ครั้ง' })).toBeVisible();
  await expect(page.getByTestId('score')).toHaveText('0');
});
test('collects a silver chest through movement and claims two letters', async ({ page }) => {
  // Place a chest ahead so this checks collection without frame-sensitive steering.
  await page.route('**/src/game/engine.ts', async (route) => {
    const response = await route.fetch();
    const original = await response.text();
    let body = original.replace('random = Math.random', 'random = () => 0');
    body = body.replace(
      'chest: null,',
      'chest: { id: 999, kind: "silver", x: 11, y: 11, expiresAt: 30000 },',
    );
    expect(body).toContain('chest: { id: 999, kind: "silver", x: 11, y: 11, expiresAt: 30000 },');
    await route.fulfill({ response, body });
  });
  await page.goto('/');
  await page.clock.install();
  await page.getByRole('button', { name: 'เข้าไปเล่นกัน' }).click();
  await page.getByRole('button', { name: /เคยเล่นแล้ว พร้อมเลย/ }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await page.clock.runFor(5400);
  await expect(page.getByRole('heading', { name: 'ของขวัญของคุณมาแล้ว!' })).toBeVisible();
  await expect(page.locator('.reward-letters .letter-tile')).toHaveCount(2);
  await expect(page.locator('.inventory-strip .letter-tile')).toHaveCount(0);
  // Reading the reward must keep the world paused and must not claim it early.
  await page.clock.runFor(10000);
  await expect(page.getByRole('heading', { name: 'ของขวัญของคุณมาแล้ว!' })).toBeVisible();
  await expect(page.locator('.inventory-strip .letter-tile')).toHaveCount(0);
  await page.getByRole('button', { name: 'เก็บใส่กระเป๋า +2' }).click();
  await expect(page.locator('.inventory-strip .letter-tile')).toHaveCount(2);
});

test('appearance settings persist and reach the game renderer', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'ตั้งค่า', exact: true }).click();
  await page.getByRole('tab', { name: 'ตัวงู', exact: true }).click();
  await page.getByRole('button', { name: 'Cyber Purple', exact: true }).click();
  await selectCustom(page, 'รูปแบบตัวงู', 'คลาสสิก');
  await page.getByRole('tab', { name: 'แมพและสนาม', exact: true }).click();
  await selectCustom(page, 'แมพพื้นหลัง', 'Midnight Ocean');
  await page
    .locator('label')
    .filter({ hasText: 'แสดงเส้นตาราง' })
    .locator('input[type="checkbox"]')
    .uncheck();
  await page.getByRole('button', { name: 'บันทึกการตั้งค่า' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'ตั้งค่า', exact: true }).click();
  await page.getByRole('tab', { name: 'ตัวงู', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cyber Purple', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByLabel('รูปแบบตัวงู')).toHaveValue('classic');
  await page.getByRole('tab', { name: 'แมพและสนาม', exact: true }).click();
  await expect(page.getByLabel('แมพพื้นหลัง')).toHaveValue('ocean');
  await expect(page.getByLabel('แสดงเส้นตาราง')).not.toBeChecked();
  await page.getByRole('button', { name: 'ปิด', exact: true }).click();
  await page.getByRole('button', { name: 'เข้าไปเล่นกัน' }).click();
  await page.getByRole('button', { name: /เคยเล่นแล้ว พร้อมเลย/ }).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-map', 'ocean');
  await expect(page.locator('canvas')).toHaveAttribute('data-skin', 'purple');
  await expect(page.locator('canvas')).toHaveAttribute('data-grid', 'false');
  await expect(page.locator('.map-badge')).toHaveText('Midnight Ocean');
});
test('a portal word unlocks the next map and exit arrows follow accepted steering', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Seed a near-threshold round and a gate ahead using the served module only.
  await page.route('**/src/game/engine.ts', async (route) => {
    const response = await route.fetch();
    const original = await response.text();
    let body = original.replace('random = Math.random', 'random = () => 0');
    body = body.replace('score: 0,', 'score: 1050,');
    body = body.replace('portals: [],', 'portals: [{ x: 10, y: 11, expiresAt: 60000 }],');
    expect(body).toContain('score: 1050,');
    expect(body).toContain('portals: [{ x: 10, y: 11, expiresAt: 60000 }],');
    await route.fulfill({ response, body });
  });
  await page.goto('/');
  await page.clock.install();
  await page.getByRole('button', { name: 'เข้าไปเล่นกัน' }).click();
  await page.getByRole('button', { name: /เคยเล่นแล้ว พร้อมเลย/ }).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-map', 'midnight');
  await page.clock.runFor(3700);
  await expect(page.getByRole('heading', { name: 'ประตูมิติต่างโลก' })).toBeVisible();
  await page.getByLabel('คำศัพท์ภาษาอังกฤษ', { exact: true }).fill('CAT');
  await page.getByRole('button', { name: 'ส่งคำศัพท์' }).click();
  await expect(page.getByTestId('score')).toHaveText('1,500');
  await page.getByRole('button', { name: /กลับไปเดินเล่นต่อ/ }).click();
  const arrow = page.getByTestId('direction-preview');
  await expect(arrow).toHaveAttribute('aria-label', 'ทิศทางถัดไป ขวา');
  await page.keyboard.press('ArrowUp');
  await expect(arrow).toHaveAttribute('aria-label', 'ทิศทางถัดไป ขึ้น');
  await page.keyboard.press('ArrowLeft');
  await expect(arrow).toHaveAttribute('aria-label', 'ทิศทางถัดไป ขึ้น');
  await page.keyboard.press('ArrowDown');
  await expect(arrow).toHaveAttribute('aria-label', 'ทิศทางถัดไป ลง');
  await page.clock.runFor(3200);
  await expect(arrow).toHaveCount(0);
  await expect(page.locator('canvas')).toHaveAttribute('data-map', 'forest');
  await expect(page.locator('.map-badge')).toHaveText('Firefly Forest');
  expect(errors).toEqual([]);
});

test('portal typing and paste only use available letters, including duplicate counts and an empty bag', async ({
  page,
}) => {
  let emptyBag = false;
  await page.route('**/src/game/engine.ts*', async (route) => {
    const response = await route.fetch();
    const original = await response.text();
    let body = original.replace('portal: null,', 'portal: { x: 10, y: 11, expiresAt: 60000 },');
    const inventory = emptyBag ? '[]' : '["G", "O", "D", "P", "P", "C", "A", "T"]';
    body = body.replace(
      /inventory: tutorial \? \[\] : \[[\s\S]*?\],/,
      'inventory: ' + inventory + ',',
    );
    expect(body.includes('inventory: ' + inventory + ',')).toBe(true);
    await route.fulfill({ response, body });
  });
  const enterPortal = async () => {
    await page.goto('/');
    await page.getByRole('button', { name: 'เข้าไปเล่นกัน' }).click();
    await page.getByRole('button', { name: /เคยเล่นแล้ว พร้อมเลย/ }).click();
    await expect(page.locator('canvas')).toBeVisible();
    await page.clock.runFor(3700);
    await expect(page.getByRole('heading', { name: 'ประตูมิติต่างโลก' })).toBeVisible();
  };
  await page.clock.install();
  await enterPortal();
  const input = page.getByLabel('คำศัพท์ภาษาอังกฤษ', { exact: true });
  await input.pressSequentially('good');
  await expect(input).toHaveValue('GOD'); // Only one O is in the bag.
  // A rejected keystroke reports the missing letter, then a valid edit clears it.
  await input.press('o');
  await expect(page.getByTestId('word-feedback')).toContainText('ขาด: O');
  await input.press('Backspace');
  await expect(page.getByTestId('word-feedback')).toHaveText('');
  await input.press('d');
  await input.pressSequentially('xyz');
  await expect(input).toHaveValue('GOD');
  await input.fill('');
  await input.pressSequentially('ppp');
  await expect(input).toHaveValue('PP'); // Two P tiles, not three.
  await input.press('Backspace');
  await expect(input).toHaveValue('P');
  await page.getByRole('button', { name: 'เลือก P', exact: true }).last().click();
  await expect(input).toHaveValue('PP');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await input.press('Control+a');
  await page.evaluate(() => navigator.clipboard.writeText('cat'));
  await input.press('Control+v');
  await expect(input).toHaveValue('CAT');
  await input.press('Control+a');
  await page.evaluate(() => navigator.clipboard.writeText('GOOD'));
  await input.press('Control+v');
  await expect(input).toHaveValue('CAT'); // Reject an invalid paste as a whole.
  await expect(page.getByTestId('word-feedback')).toContainText('ขาด: O');
  await input.evaluate((node) => (node as HTMLInputElement).setSelectionRange(1, 2));
  await input.press('p');
  await expect(input).toHaveValue('CPT');
  await input.fill('CAT');
  await page.getByRole('button', { name: 'ส่งคำศัพท์' }).click();
  await expect(page.getByTestId('score')).toHaveText('450');
  emptyBag = true;
  await enterPortal();
  await expect(input).toHaveAttribute('readonly', '');
  await expect(page.getByTestId('word-feedback')).toContainText('กระเป๋ายังไม่มีอักษร');
  await input.pressSequentially('cat');
  await expect(input).toHaveValue('');
  await expect(page.getByRole('button', { name: 'ส่งคำศัพท์' })).toBeDisabled();
});

test('settings sidebar keeps drafts across categories and cancels without saving on mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'ตั้งค่า', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(page.getByRole('tab', { name: 'การเล่น', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await selectCustom(page, 'ความเร็วเจ้างู', 'เร็ว');
  await page.getByRole('tab', { name: 'ตัวงู', exact: true }).click();
  await page.getByRole('button', { name: 'Golden Fire', exact: true }).click();
  await page.getByRole('tab', { name: 'แมพและสนาม', exact: true }).click();
  await selectCustom(page, 'แมพพื้นหลัง', 'Volcano');
  await page.getByRole('tab', { name: 'เสียงและเอฟเฟกต์', exact: true }).click();
  await page.getByLabel('เสียงเอฟเฟกต์และเสียงอ่าน').uncheck();
  await page.getByRole('tab', { name: 'การเล่น', exact: true }).click();
  await expect(page.getByLabel('ความเร็วเจ้างู')).toHaveValue('fast');
  const sidebar = await page.locator('.settings-sidebar').boundingBox();
  const content = await page.locator('.settings-content').boundingBox();
  expect(sidebar!.x + sidebar!.width).toBeLessThanOrEqual(content!.x + 1);
  const save = await page.getByRole('button', { name: 'บันทึกการตั้งค่า' }).boundingBox();
  expect(save!.y + save!.height).toBeLessThan(844);
  expect(await dialog.evaluate((d) => d.scrollWidth <= d.clientWidth)).toBe(true);
  await page.getByRole('tab', { name: 'การเล่น', exact: true }).focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('tab', { name: 'ตัวงู', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Golden Fire', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'ยกเลิก', exact: true }).click();
  await page.getByRole('button', { name: 'ตั้งค่า', exact: true }).click();
  await expectCustomValue(page, 'ความเร็วเจ้างู', 'ช้า');
  await page.getByRole('tab', { name: 'ตัวงู', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Neon Mint', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});
test('Thai-layout WASD steers, and tutorial panels never resize the board', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.clock.install();
  await page.getByRole('button', { name: 'เข้าไปเล่นกัน' }).click();
  await page.getByRole('button', { name: /มือใหม่ ขอฝึกก่อน/ }).click();
  await page.getByRole('button', { name: 'เริ่มฝึกเลี้ยว' }).click();
  const board = page.getByTestId('game-board');
  await expect(page.locator('canvas')).toBeVisible();
  const withBanner = await board.boundingBox();
  expect(withBanner).not.toBeNull();
  const press = (key: string, code: string) =>
    page.evaluate(
      ([k, c]) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: c })),
      [key, code],
    );
  await page.clock.runFor(3100);
  // Thai Kedmanee types ไ ฟ ห ก on the physical W A S D keys: up, left, down, right.
  await press('ไ', 'KeyW');
  await page.clock.runFor(650);
  for (const [key, code] of [
    ['ฟ', 'KeyA'],
    ['ห', 'KeyS'],
    ['ก', 'KeyD'],
  ]) {
    await press(key, code);
    await page.clock.runFor(650);
  }
  await expect(page.getByRole('heading', { name: 'ลองครบทั้ง 4 ทิศแล้ว' })).toBeVisible();
  const withReview = await board.boundingBox();
  expect(withReview).toEqual(withBanner);
  await page.getByRole('button', { name: 'พร้อมแล้ว ไปฝึกเร่งความเร็ว' }).click();
  await expect(page.getByRole('heading', { name: 'กด Shift เพื่อเร่งความเร็ว' })).toBeVisible();
  expect(await board.boundingBox()).toEqual(withBanner);
  expect(errors).toEqual([]);
});
test('Word Journal opens as a book, turns pages, searches and closes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const words = Array.from({ length: 12 }, (_, i) => ({
    word: [
      'FORCE',
      'CITY',
      'GOD',
      'ANE',
      'AGO',
      'HOUSE',
      'WATER',
      'LIGHT',
      'STORY',
      'DREAM',
      'RIVER',
      'MOUNTAIN',
    ][i],
    meaningTh: 'คำที่ ' + (i + 1),
    level: 'A1',
  }));
  await page.addInitScript((learned) => {
    localStorage.setItem(
      'lexisnake:v2',
      JSON.stringify({
        version: 2,
        settings: { language: 'th' },
        played: 2,
        bestScore: 900,
        learned,
      }),
    );
  }, words);
  await page.goto('/');
  await page.getByRole('button', { name: 'สมุดคำศัพท์', exact: true }).click();
  const book = page.getByRole('dialog');
  // The cover swings open, then the first spread shows the intro page and five words.
  await expect(book.locator('.cover')).toHaveCount(0, { timeout: 5000 });
  await expect(book.locator('.journal-entry')).toHaveCount(5);
  await expect(book).toContainText('FORCE');
  await expect(book).toContainText('หน้า 1–2 จาก 4');
  await expect(page.getByRole('button', { name: 'หน้าก่อนหน้า' })).toBeDisabled();
  await page.getByRole('button', { name: 'หน้าถัดไป' }).click();
  await expect(book.locator('.sheet')).toHaveCount(0, { timeout: 3000 });
  await expect(book).toContainText('หน้า 3–4 จาก 4');
  await expect(book.locator('.journal-entry')).toHaveCount(7);
  await expect(book).toContainText('MOUNTAIN');
  await expect(page.getByRole('button', { name: 'หน้าถัดไป' })).toBeDisabled();
  await page.keyboard.press('ArrowLeft');
  await expect(book).toContainText('หน้า 1–2 จาก 4', { timeout: 3000 });
  // Searching returns to the first spread and filters entries by word or meaning.
  await page.getByLabel('ค้นหาคำศัพท์').fill('moun');
  await expect(book.locator('.journal-entry')).toHaveCount(1);
  await expect(book).toContainText('MOUNTAIN');
  await page.getByRole('button', { name: 'ปิด', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(errors).toEqual([]);
});
