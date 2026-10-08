(async (page) => {
  const results = [], errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const check = (name, pass, evidence) => {
    results.push({ name, pass: Boolean(pass), evidence });
    console.log(`${pass ? 'PASS' : 'FAIL'}: ${name}`, pass ? '' : evidence);
  };
  const state = () => page.evaluate(() => window.colosseum.state());
  const sleep = ms => page.waitForTimeout(ms);
  const same = (a, b) => a.every((value, i) => Math.abs(value - b[i]) < .001);
  const select = async era => { await page.locator(`[data-era="${era}"]`).click(); await sleep(250); };
  const view = async name => { await page.locator(`[data-view="${name}"]`).click(); await sleep(1050); };
  const hold = async (key, ms) => { await page.keyboard.down(key); await sleep(ms); await page.keyboard.up(key); };
  const face = async yaw => {
    const current = await state(), bounds = await page.locator('#scene').boundingBox();
    const difference = Math.atan2(Math.sin(current.yaw - yaw), Math.cos(current.yaw - yaw));
    const x = difference < 0 ? bounds.x + bounds.width - 120 : bounds.x + 120;
    const y = bounds.y + bounds.height * .54;
    await page.mouse.move(x, y); await page.mouse.down();
    await page.mouse.move(x + difference / .004, y, { steps: 12 }); await page.mouse.up();
  };
  const moveUntil = async (key, condition, timeout = 16000) => {
    await page.keyboard.down(key);
    let reached = true;
    // Release in the same browser frame that reaches the target. Waiting for the
    // automation round trip can overshoot narrow landings on a busy machine.
    const stopAtTarget = `() => {
      if (!(${condition.toString()})()) return false;
      window.dispatchEvent(new KeyboardEvent('keyup', { code: ${JSON.stringify(`Key${key.toUpperCase()}`)} }));
      return true;
    }`;
    try { await page.waitForFunction(`(${stopAtTarget})()`, null, { timeout, polling: 'raf' }); }
    catch { reached = false; }
    finally { await page.keyboard.up(key); }
    return reached;
  };
  await page.setViewportSize({ width: 1440, height: 1000 });
  if ((await state()).walking) await page.keyboard.press('Escape');
  await select('ruins'); await view('exterior');
  const original = await state();
  await select('ancient'); let current = await state();
  check('Ancient switch preserves exterior position, target and orientation', same(original.position, current.position) && same(original.target, current.target) && same(original.quaternion, current.quaternion) && !current.lastSwitchAdjusted, current);
  const ancientStats = await page.evaluate(() => window.colosseum.stats);
  check('Only the complete ancient form is visible, with 80 exterior bays', current.visibleForms.join() === 'ancient' && ancientStats.exteriorBays === 80, ancientStats);
  const audit = await page.evaluate(() => window.colosseum.auditGeometry());
  check('Ancient geometry has finite positions, normals, UVs and two-sided surfaces', audit.nonFinite === 0 && audit.missingNormals === 0 && audit.allDoubleSided, audit);
  await select('ruins'); current = await state();
  check('Reverse switch preserves the viewpoint and restores the ruined outer wall', same(original.position, current.position) && current.visibleForms.join() === 'ruins' && await page.evaluate(() => window.colosseum.stats.exteriorBays) === 39, current);
  await select('ancient'); await sleep(4000);
  await page.screenshot({ path: 'artifacts/ancient-exterior.png' });

  let previous = (await state()).azimuth, totalAngle = 0;
  const bounds = await page.locator('#scene').boundingBox();
  for (let i = 0; i < 8; i++) {
    await page.mouse.move(bounds.x + 450, bounds.y + 330); await page.mouse.down();
    await page.mouse.move(bounds.x + 720, bounds.y + 330, { steps: 12 }); await page.mouse.up(); await sleep(450);
    current = await state();
    const delta = Math.atan2(Math.sin(current.azimuth - previous), Math.cos(current.azimuth - previous));
    totalAngle += Math.abs(delta); previous = current.azimuth;
    if ([1, 3, 5].includes(i)) await page.screenshot({ path: `artifacts/ancient-orbit-${i}.png` });
  }
  check('Ancient exterior supports a full 360-degree orbit', totalAngle > Math.PI * 2, { degrees: totalAngle * 180 / Math.PI });
  await page.locator('#reset').click();
  const distance = (await state()).distance;
  await page.locator('#zoom-in').click(); await sleep(100);
  check('Ancient exterior zoom works', (await state()).distance < distance * .9);
  await page.locator('#reset').click();
  await page.locator('[data-hotspot="hypogeum"]').click();
  check('Ancient annotation describes the covered arena', (await page.locator('#feature-title').textContent()) === 'A covered arena');
  await page.locator('#feature-close').click();
  await page.locator('[data-light="golden"]').click(); await sleep(400);
  await page.screenshot({ path: 'artifacts/ancient-golden-hour.png' });
  await page.locator('[data-light="day"]').click();
  for (const name of ['arena', 'seating', 'passages']) {
    await view(name); current = await state();
    check(`Ancient ${name} viewpoint is clear`, current.view === name && current.cameraClear, current.position);
    await page.screenshot({ path: `artifacts/ancient-${name}.png` });
    await select('ruins'); await select('ancient');
    const switched = await state();
    check(`${name} orbit view survives both switches`, same(current.position, switched.position) && same(current.quaternion, switched.quaternion), switched.position);
  }

  await page.locator('#walk-toggle').click();
  const passageStart = await state();
  await moveUntil('w', () => window.colosseum.state().position[0] < 61, 13000);
  await page.screenshot({ path: 'artifacts/ancient-walking-passage.png' });
  const reachedArena = await moveUntil('w', () => window.colosseum.state().position[0] < 36, 21000);
  current = await state();
  check('Walk continuously through the ancient passage into the arena', reachedArena && current.position[1] > 6.8 && current.cameraClear, current);
  await page.screenshot({ path: 'artifacts/ancient-walking-arena.png' });
  const returned = await moveUntil('s', () => window.colosseum.state().position[0] > 87, 21000);
  current = await state();
  check('Return through the ancient passage without a trap', returned && current.position[1] < 2.2 && current.cameraClear, current.position);
  await select('ruins'); const passageRuins = await state(); await select('ancient');
  check('Walking passage switch preserves a safe stance', same(passageRuins.position, (await state()).position) && passageRuins.walking && passageStart.walking);

  await view('arena'); await face(Math.PI / 2);
  await moveUntil('w', () => window.colosseum.state().position[0] < 1, 11000);
  await moveUntil('a', () => window.colosseum.state().position[2] > 11, 5000);
  const sandPosition = await state(); await select('ruins'); current = await state();
  check('Switching off the ancient arena relocates safely to the surviving boardwalk', sandPosition.position[2] > 10 && current.lastSwitchAdjusted && current.walking && current.cameraClear && current.supported && Math.abs(current.position[2]) < 1, { from: sandPosition.position, to: current.position });
  check('Safety relocation preserves viewing direction', same(sandPosition.quaternion, current.quaternion));
  await select('ancient'); current = await state();
  check('Switching back from the boardwalk keeps its clear viewpoint', !current.lastSwitchAdjusted && current.cameraClear);

  await select('ruins'); await view('seating'); const ruinSeat = await state();
  await select('ancient'); current = await state();
  check('Restored seating relocates an obstructed walking camera', current.lastSwitchAdjusted && current.cameraClear && current.supported && same(ruinSeat.quaternion, current.quaternion), { from: ruinSeat.position, to: current.position });
  await view('seating'); current = await state();
  check('Ancient seating walking preset stands on the promenade', current.cameraClear && current.supported && current.position[1] > 18, current.position);
  await page.screenshot({ path: 'artifacts/ancient-walking-cavea.png' });
  for (let i = 0; i < 8; i++) {
    current = await state();
    if (current.position[2] > 15.4) break;
    const angle = Math.atan2(current.position[2] / 41.5, current.position[0] / 58.3);
    await face(Math.atan2(58.3 * Math.sin(angle), -41.5 * Math.cos(angle)));
    await hold('w', 350);
  }
  const bayAngle = 2.5 * Math.PI * 2 / 40;
  // Center the approach on the narrow doorway after following the curved promenade.
  // An outward heading alone would hit its jamb when the last walking step overshoots.
  for (let i = 0; i < 3; i++) {
    current = await state();
    const dx = 58.2 * Math.cos(bayAngle) - current.position[0];
    const dz = 41.4 * Math.sin(bayAngle) - current.position[2];
    const distance = Math.hypot(dx, dz);
    if (distance < .12) break;
    await face(Math.atan2(-dx, -dz));
    await hold('w', Math.min(350, distance / 4.8 * 1000));
  }
  const bayHeading = Math.atan2(-Math.cos(bayAngle) / 61.6, -Math.sin(bayAngle) / 44.8);
  await face(bayHeading);
  await hold('w', 1800); current = await state();
  check('Seating promenade leads into a finished vaulted access bay', current.position[0] > 57 && current.position[2] > 17 && current.cameraClear && current.supported, current.position);
  await face(bayHeading + Math.PI);
  await page.screenshot({ path: 'artifacts/ancient-access-bay.png' });
  await moveUntil('w', () => window.colosseum.state().position[0] < 54.1, 3500); current = await state();
  check('Access bay allows return to the seating promenade', current.position[0] < 54.1 && current.cameraClear && current.supported && current.position[1] > 18.5, current.position);

  await view('arena'); await face(Math.PI / 2);
  await moveUntil('a', () => window.colosseum.state().position[2] > 4.5, 3000);
  await face(-Math.PI / 2);
  const ascended = await moveUntil('w', () => window.colosseum.state().position[0] > 59.7, 16000);
  current = await state();
  check('Ancient arena stair reaches its upper landing', ascended && current.position[1] > 18.5 && current.cameraClear, current.position);
  await page.screenshot({ path: 'artifacts/ancient-stair.png' });
  await moveUntil('d', () => window.colosseum.state().position[2] > 7, 2500);
  await moveUntil('s', () => window.colosseum.state().position[0] < 57.6, 2500);
  current = await state();
  check('Ancient stair landing connects to the seating promenade', current.position[0] < 57.6 && current.position[2] > 7 && current.position[1] > 18.5 && current.cameraClear, current.position);
  await page.screenshot({ path: 'artifacts/ancient-stair-connection.png' });
  await moveUntil('w', () => window.colosseum.state().position[0] > 59.7, 2500);
  await moveUntil('a', () => window.colosseum.state().position[2] < 4.8, 2500);
  const descended = await moveUntil('s', () => window.colosseum.state().position[0] < 35, 13000);
  current = await state();
  check('Ancient stair returns to the sand floor', descended && current.position[1] < 7.1 && current.cameraClear, current.position);

  await page.keyboard.press('Escape'); await view('arena');
  await page.locator('[data-view="exterior"]').click(); await select('ruins'); await select('ancient'); await select('ruins');
  const rapid = await state(); await sleep(1200); current = await state();
  check('Switching during camera transitions cancels stale movement', same(rapid.position, current.position) && current.era === 'ruins' && current.visibleForms.length === 1 && await page.locator('#scene').evaluate(el => el.style.opacity) === '1', current);
  await page.locator('#reset').click(); await select('ancient');
  await page.locator('#fullscreen').click(); await sleep(300);
  await select('ruins'); await select('ancient');
  check('Form switch remains available in fullscreen', await page.evaluate(() => Boolean(document.fullscreenElement)) && (await state()).era === 'ancient');
  await page.locator('#fullscreen').click();
  await page.setViewportSize({ width: 390, height: 844 }); await page.locator('#reset').click(); await sleep(500);
  await select('ruins'); await select('ancient'); await sleep(4000);
  const mobile = await page.locator('.era-switch').boundingBox();
  check('Both forms can be selected on mobile without overflow', mobile.x >= 0 && mobile.x + mobile.width <= 390 && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: 'artifacts/ancient-mobile.png', fullPage: true });
  await page.locator('[data-view="arena"]').click(); await sleep(1050); await page.locator('#walk-toggle').click();
  const beforeMove = await state();
  const touch = await page.locator('[data-move="KeyW"]').boundingBox();
  await page.mouse.move(touch.x + touch.width / 2, touch.y + touch.height / 2); await page.mouse.down(); await sleep(650); await page.mouse.up();
  current = await state();
  check('Ancient mobile movement controls work', Math.abs(current.position[0] - beforeMove.position[0]) > .5 && current.cameraClear, current.position);
  await page.keyboard.press('Escape'); await page.setViewportSize({ width: 1440, height: 1000 });
  await select('ruins'); await page.locator('#reset').click();
  check('Present-day experience remains the final recoverable state', (await state()).era === 'ruins' && (await state()).cameraClear);
  check('No reconstruction runtime errors', errors.length === 0, errors);
  return { passed: results.filter(item => item.pass).length, failed: results.filter(item => !item.pass).length, results };
})
