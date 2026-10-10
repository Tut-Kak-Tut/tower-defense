const test = require('node:test');
const assert = require('node:assert');
const { loadGame } = require('./harness');

const get = loadGame();
const routeFor = get('routeFor'), waveSpawns = get('waveSpawns'), waveGroups = get('waveGroups');

test('один шлях — усі route 0', () => {
  for (let n = 1; n <= 100; n++) for (const s of waveSpawns(n)) assert.strictEqual(s.route, 0);
});

test('черга як раніше: кількість, загони, паузи', () => {
  for (const n of [1, 10, 37, 100]) {
    const groups = waveGroups(n);
    const spawns = waveSpawns(n);
    assert.strictEqual(spawns.length, groups.reduce((a, g) => a + g[1], 0));
    assert.strictEqual(spawns[0].delay, 0);
    assert.strictEqual(spawns[0].squad, 0);
  }
});

test('загін іде одним шляхом', () => {
  for (let n = 1; n <= 100; n++) {
    const bySquad = {};
    for (const s of waveSpawns(n, [2, 1])) {
      bySquad[s.squad] ??= s.route;
      assert.strictEqual(s.route, bySquad[s.squad], `набіг ${n}, загін ${s.squad}`);
    }
  }
});

test('ваги: частка загонів ≈ вага, детерміновано', () => {
  let a = 0, total = 0;
  for (let n = 1; n <= 100; n++) for (let sq = 0; sq < 4; sq++) {
    const r = routeFor(n, sq, [2, 1]);
    assert.strictEqual(r, routeFor(n, sq, [2, 1]));
    assert.ok(r === 0 || r === 1);
    if (r === 0) a++;
    total++;
  }
  assert.ok(a / total > 0.55 && a / total < 0.78, `частка A = ${a / total}`);
  assert.strictEqual(routeFor(5, 0, [1]), 0);
});
