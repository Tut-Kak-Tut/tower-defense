// Прогін веб-симуляції для золотого тесту порту: фіксована розстановка, сід 12345, набіги 1..25.
// Запуск з кореня репо: node godot/tools/export_sim.js  → godot/tests/fixtures/web_sim.json
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const WEB = path.join(__dirname, '../../web');
const OUT = path.join(__dirname, '../tests/fixtures/web_sim.json');
const FILES = [
  'i18n', 'config', 'monsters/monster', 'monsters/monsters', 'adventurers/adventurer', 'adventurers/adventurers',
  'waves/wave', 'waves/campaign', 'waves/endless', 'levels/level', 'levels/levels', 'entities', 'icons', 'game', 'save',
];
const SEED = 12345;
const WAVES = 25;
const DT = 1 / 60;
const MAX_TIME = 20 * 60;
const MONEY = 100000;
const UPGRADES = 3;   // рівень 4
const PLACEMENTS = [
  { type: 'archer', col: 3, row: 3 }, { type: 'cannon', col: 5, row: 3 }, { type: 'frost', col: 3, row: 5 },
  { type: 'spider', col: 5, row: 6 }, { type: 'eye', col: 6, row: 7 }, { type: 'slime', col: 7, row: 5 },
  { type: 'vampire', col: 8, row: 6 }, { type: 'plate', col: 10, row: 4 }, { type: 'witch', col: 6, row: 5 },
  { type: 'grave', col: 12, row: 4 },
];

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function loadWeb() {
  const code = [...FILES.map(f => fs.readFileSync(path.join(WEB, 'js', f + '.js'), 'utf8')),
    'globalThis.__get = name => eval(name);'].join('\n;\n');
  const noop = () => {};
  const proxy = () => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : proxy()), apply: () => proxy(), set: () => true });
  const el = () => ({ dataset: {}, style: {}, width: 800, height: 480, appendChild: noop, addEventListener: noop, getContext: () => proxy() });
  const store = new Map();
  const ctx = {
    console, URLSearchParams, performance: { now: () => 0 },
    requestAnimationFrame: noop,
    localStorage: { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
    location: { search: '', reload: noop },
    addEventListener: noop,
    document: { documentElement: {}, body: el(), querySelectorAll: () => [], getElementById: () => el(), createElement: el, addEventListener: noop },
  };
  vm.createContext(ctx);
  ctx.__rand = mulberry32(SEED);
  vm.runInContext('Math.random = __rand;', ctx);
  vm.runInContext(code, ctx);
  return ctx.__get;
}

const get = loadWeb();
get('newGame')('campaign');
const game = get('game');
game.money = MONEY;
for (const p of PLACEMENTS) {
  if (!get('placeTower')(p.type, p.col, p.row)) throw new Error('не поселили ' + p.type);
}
for (const t of game.towers) for (let i = 0; i < UPGRADES; i++) if (!get('upgradeTower')(t)) throw new Error('не посилили ' + t.type);

const startMoney = game.money;
const waves = [];
for (let w = 1; w <= WAVES; w++) {
  get('startWave')();
  let time = 0;
  while (game.waveActive && !game.over && time < MAX_TIME) { get('update')(DT); time += DT; }
  const kills = Object.values(game.stats).reduce((s, st) => s + st.kills, 0);
  waves.push({ wave: game.wave, money: game.money, lives: game.lives, kills, alive: game.enemies.length });
  if (game.over) break;
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ seed: SEED, dt: DT, money: MONEY, upgrades: UPGRADES, start_money: startMoney, placements: PLACEMENTS, waves }, null, 1));
console.log('web_sim.json:', waves.length, 'набігів; останній', JSON.stringify(waves[waves.length - 1]));
