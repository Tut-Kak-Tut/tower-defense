const test = require('node:test');
const assert = require('node:assert');
const { loadGame } = require('./harness');

// Будує рівень у свіжому контексті; повертає сам рівень або кидає помилку build().
function build(chain) {
  const get = loadGame();
  const B = get('LevelBuilder');
  return chain(new B('t').setName('Т').setDesc('Т').setWaves(1, 5).setMoney(100).setMonsters(['archer'])).build();
}
const LEFT = [[-1, 2], [8, 2], [8, 6], [20, 6]];

test('наявні рівні переведені на addPath', () => {
  const LEVELS = loadGame()('LEVELS');
  for (const id of ['cellar', 'crypt', 'tomb', 'mountain']) {
    assert.strictEqual(LEVELS[id].paths.length, 1, id);
    assert.strictEqual(LEVELS[id].paths[0].weight, 1, id);
  }
  assert.deepEqual(LEVELS.cellar.paths[0].points[0], [-1, 5]);
});

test('злиття: вхід зліва і знизу, спільний кінець', () => {
  const l = build(b => b.addPath(LEFT, 2).addPath([[5, 12], [5, 8], [8, 8], [8, 6], [20, 6]]));
  assert.strictEqual(l.paths.length, 2);
  assert.deepEqual(l.paths.map(p => p.weight), [2, 1]);
});

test('розвилка зі спільним входом будується', () => {
  const l = build(b => b
    .addPath([[-1, 5], [3, 5], [3, 2], [12, 2], [12, 5], [20, 5]])
    .addPath([[-1, 5], [3, 5], [3, 8], [12, 8], [12, 5], [20, 5]]));
  assert.strictEqual(l.paths.length, 2);
});

test('вхід згори', () => {
  const l = build(b => b.addPath([[6, -1], [6, 4], [20, 4]]));
  assert.deepEqual(l.paths[0].points[0], [6, -1]);
});

test('каміння: клітинки й прямокутники розгортаються', () => {
  const l = build(b => b.addPath(LEFT).setRocks([[0, 0], [10, 9, 2, 3]]));
  assert.strictEqual(l.rocks.length, 7);
  assert.deepEqual(l.rocks[0], [0, 0]);
  assert.ok(l.rocks.some(([c, r]) => c === 11 && r === 11));
});

test('помилки мапи', () => {
  const bad = (chain, re) => assert.throws(() => build(chain), re);
  bad(b => b, /жодного шляху/);
  bad(b => b.addPath(LEFT, 0), /вага/);
  bad(b => b.addPath([[3, 2], [20, 2]]), /вхід/);                        // вхід не за краєм
  bad(b => b.addPath([[-1, 2], [19, 2]]), /Серце|col 20/);              // не доходить до Серця
  bad(b => b.addPath(LEFT).addPath([[-1, 9], [20, 9]]), /Серце/);        // різні Серця
  bad(b => b.addPath([[-1, 2], [5, 2], [5, 5], [3, 5], [3, 0], [20, 0]]), /перетинає себе/);
  bad(b => b.addPath([[-1, 2], [4, 3], [20, 3]]), /не прямий/);
  bad(b => b.addPath([[-1, 2], [4, 2], [4, 12], [20, 12]]), /за мапу/);
  bad(b => b.addPath([[-1, 0], [-1, 5], [20, 5]]), /за мапу/);            // іде вздовж краю поза мапою
  bad(b => b.addPath(LEFT).setRocks([[3, 2]]), /камінь 3,2 у коридорі/);
  bad(b => b.addPath(LEFT).setRocks([[19, 11, 2, 1]]), /камінь 20,11 за мапою/);
  bad(b => b.addPath(LEFT).setTorches([[8, 4]]), /факел 8,4 у коридорі/);
  bad(b => b.addPath(LEFT).setRocks([[0, 0]]).setTorches([[0, 0]]), /факел 0,0 на камені/);
});

test('ROCKS: каміння рівня в грі, без рівня — порожньо', () => {
  assert.strictEqual(loadGame()('ROCKS').length, 0);
  const rocks = loadGame({ search: '?level=cellar' })('ROCKS');
  assert.ok(rocks.length > 0);
  assert.deepEqual(rocks[0], [0, 10]);
});

test('Глибини: 71–100, два шляхи, завали', () => {
  const deep = loadGame()('LEVELS').deep;
  assert.ok(deep);
  assert.deepEqual([deep.from, deep.to], [71, 100]);
  assert.deepEqual(deep.paths.map(p => p.weight), [2, 1]);
  assert.ok(deep.rocks.length > 0);
});
