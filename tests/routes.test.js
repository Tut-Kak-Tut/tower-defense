const test = require('node:test');
const assert = require('node:assert');
const { loadGame } = require('./harness');

// Рівень із двома шляхами: A — зліва, B — згори; зливаються в (12,6) і йдуть до Серця (20,6).
const LEVEL_T2 = `
new LevelBuilder('t2').setName('Т').setDesc('Т').setWaves(1, 5).setMoney(100).setMonsters(['archer'])
  .addPath([[-1, 3], [4, 3], [4, 9], [12, 9], [12, 6], [20, 6]], 2)
  .addPath([[9, -1], [9, 6], [20, 6]])
  .build();`;
const game2 = () => loadGame({ search: '?level=t2', before: LEVEL_T2 });
const G = { enemies: [], effects: [], projectiles: [] };

test('без рівня — один стандартний шлях', () => {
  const get = loadGame();
  assert.strictEqual(get('ROUTES').length, 1);
  assert.deepEqual(get('ROUTE_WEIGHTS'), [1]);
  assert.deepEqual(get('ROUTE_POINTS')[0], get('DEFAULT_PATH'));
});

test('рівень з двома шляхами', () => {
  const get = game2();
  assert.strictEqual(get('ROUTES').length, 2);
  assert.deepEqual(get('ROUTE_WEIGHTS'), [2, 1]);
});

test('ворог на шляху зі входом згори', () => {
  const get = game2();
  const e = new (get('Enemy'))('normal', 1);
  assert.strictEqual(e.route, 0);
  e.setRoute(1);
  assert.strictEqual(e.route, 1);
  assert.deepEqual([e.x, e.y], [9 * 40 + 20, -20]);   // за верхнім краєм
  G.enemies = [e];
  for (let i = 0; i < 20; i++) e.update(0.1, G);
  assert.strictEqual(e.x, 9 * 40 + 20);                     // іде вниз своєю колоною
  assert.ok(e.y > 0);
  for (let i = 0; i < 2000 && !e.escaped; i++) e.update(0.1, G);
  assert.ok(e.escaped);
  assert.strictEqual(Math.round(e.progress), Math.round(get('ROUTES')[1].len.at(-1)));
});

test('setProgress по своєму шляху', () => {
  const get = game2();
  const e = new (get('Enemy'))('normal', 1);
  e.setRoute(1, 3 * 40);                                     // 3 клітинки від входу B
  assert.deepEqual([e.x, e.y], [9 * 40 + 20, 2 * 40 + 20]);
  e.setRoute(0, 3 * 40);                                     // те саме на A — зліва
  assert.deepEqual([e.x, e.y], [2 * 40 + 20, 3 * 40 + 20]);
});

test('вантаж успадковує шлях', () => {
  const get = game2();
  const e = new (get('Enemy'))('normal', 1);
  e.setRoute(1, 5 * 40);
  e.cargo = ['normal', 'normal'];
  const born = e.spawnOnDeath();
  assert.strictEqual(born.length, 2);
  for (const b of born) {
    assert.strictEqual(b.route, 1);
    assert.strictEqual(b.x, 9 * 40 + 20);                    // на колоні B, позаду
    assert.ok(b.y < e.y);
  }
});

test('routeLetter', () => {
  const routeLetter = loadGame()('routeLetter');
  assert.deepEqual([0, 1, 2].map(routeLetter), ['A', 'B', 'C']);
});

test('«Перший»/«Останній» — за відстанню до Серця, а не за progress свого шляху', () => {
  const get = game2();
  const Enemy = get('Enemy'), modes = get('TARGET_MODES'), ROUTES = get('ROUTES');
  const at = (route, cellsLeft) => {                         // ворог за cellsLeft клітинок до Серця
    const e = new Enemy('normal', 1);
    e.setRoute(route, ROUTES[route].len.at(-1) - cellsLeft * 40);
    return e;
  };
  const a = at(0, 8), b = at(1, 4);                          // A довший — у нього progress більший
  assert.ok(a.progress > b.progress);
  assert.ok(modes.first.score(b) > modes.first.score(a));    // ближчий до Серця — «перший»
  assert.ok(modes.last.score(a) > modes.last.score(b));
});
