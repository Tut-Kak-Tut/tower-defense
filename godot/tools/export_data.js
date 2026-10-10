// Експорт даних балансу веб-гри (web/) у JSON для Godot + еталонні значення для тестів порту.
// Запуск з кореня репо: node godot/tools/export_data.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const WEB = path.join(__dirname, '../../web');
const OUT = path.join(__dirname, '../data');
const FIX = path.join(__dirname, '../tests/fixtures');
const FILES = [
  'i18n', 'config', 'monsters/monster', 'monsters/monsters', 'adventurers/adventurer', 'adventurers/adventurers',
  'waves/wave', 'waves/campaign', 'waves/endless', 'levels/level', 'levels/levels',
];

function load(lang, search = '') {
  const read = f => fs.readFileSync(path.join(WEB, 'js', f + '.js'), 'utf8');
  const code = [...FILES.map(read), read('entities'), 'globalThis.__get = name => eval(name);'].join('\n;\n');
  const noop = () => {};
  const el = () => ({ dataset: {}, style: {}, appendChild: noop, addEventListener: noop });
  const ctx = {
    console, URLSearchParams,
    localStorage: { getItem: k => (k === 'dungeon-heart-lang' && lang === 'ru' ? 'ru' : null), setItem: noop },
    location: { search, reload: noop },
    document: { documentElement: {}, body: el(), querySelectorAll: () => [], getElementById: () => null, createElement: el },
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return ctx.__get;
}

// uk + ru → одне значення; різні рядки стають {uk, ru}; екземпляри класів — прості об'єкти; функції відкидаються.
function merge(uk, ru) {
  if (typeof uk === 'function') return undefined;
  if (typeof uk === 'string') return uk === ru ? uk : { uk, ru };
  if (Array.isArray(uk)) return uk.map((v, i) => merge(v, ru ? ru[i] : v));
  if (uk && typeof uk === 'object') {
    const out = {};
    for (const k of Object.keys(uk)) {
      const v = merge(uk[k], ru ? ru[k] : uk[k]);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  return uk;
}

const write = (dir, name, data) => fs.writeFileSync(path.join(dir, name), JSON.stringify(data, null, 1) + '\n');

const U = load('uk'), R = load('ru');
const both = name => merge(U(name), R(name));

// config.json
const config = {};
for (const k of ['CELL', 'COLS', 'ROWS', 'DEFAULT_PATH', 'DEFAULT_TORCHES', 'START_MONEY', 'START_LIVES', 'WAVE_BONUS',
  'WAVE_BONUS_PER', 'MAX_LEVEL', 'SELL_REFUND', 'MAX_TOWERS', 'SHIELD_REGEN_DELAY', 'FORMATION_GAP', 'CAMPAIGN_WAVES']) config[k] = U(k);
const entitiesSrc = fs.readFileSync(path.join(WEB, 'js/entities.js'), 'utf8');
for (const m of entitiesSrc.matchAll(/^const ([A-Z_]+) =/gm)) {
  if (['TORCHES', 'ROCKS', 'ROUTE_POINTS', 'ROUTE_WEIGHTS', 'ROUTES'].includes(m[1])) continue;  // залежать від рівня
  const v = U(m[1]);
  const onlyNums = x => typeof x === 'number' || (x && typeof x === 'object' && Object.values(x).every(onlyNums));
  if (onlyNums(v)) config[m[1]] = v;
}
write(OUT, 'config.json', config);

// monsters.json
const towers = U('TOWERS');
const monsters = { LEVEL_STATS: U('LEVEL_STATS'), ATTACKS: U('ATTACKS'), ROLES: both('ROLES'), order: Object.keys(towers), monsters: {} };
const mAll = both('TOWERS');
for (const id of monsters.order) monsters.monsters[id] = mAll[id];
write(OUT, 'monsters.json', monsters);

// adventurers.json
const enemies = U('ENEMIES');
const eAll = both('ENEMIES');
const adventurers = {
  WAVE_STATS: U('WAVE_STATS'), order: Object.keys(enemies),
  ENEMY_UNLOCK: U('ENEMY_UNLOCK'), SPAWN_GAP: U('SPAWN_GAP'), adventurers: {},
};
for (const id of adventurers.order) adventurers.adventurers[id] = eAll[id];
write(OUT, 'adventurers.json', adventurers);

// waves.json
const waves = {};
const CW = U('CAMPAIGN_WAVES');
for (let n = 1; n <= CW; n++) waves[n] = merge({ groups: U('waveGroups')(n), buff: U('waveBuff')(n) },
  { groups: R('waveGroups')(n), buff: R('waveBuff')(n) });
write(OUT, 'waves.json', { waves });

// levels.json
const levelsAll = both('LEVELS');
const levels = { order: Object.keys(U('LEVELS')), levels: {} };
for (const id of levels.order) levels.levels[id] = levelsAll[id];
write(OUT, 'levels.json', levels);

// web_reference.json
const hash = U('hash');
const ref = { hash: [], tower_stats: {}, adventurer_stats: {}, wave_spawns: { default: {} } };
for (let a = -2; a <= 30; a++) for (let b = -2; b <= 12; b++) for (const s of [0, 1, 4, 7, 23, 70]) ref.hash.push([a, b, s, hash(a, b, s)]);
for (const a of [50, 99, 100]) for (let b = 0; b <= 40; b++) ref.hash.push([a, b, 7, hash(a, b, 7)]);
const MAXL = U('MAX_LEVEL');
for (const id of monsters.order) {
  ref.tower_stats[id] = [];
  for (let L = 1; L <= MAXL; L++) ref.tower_stats[id].push(U('towerStats')(towers[id], L));
}
for (const t of adventurers.order) {
  ref.adventurer_stats[t] = {};
  for (const n of [1, 2, 5, 10, 25, 31, 50, 66, 75, 99, 100]) ref.adventurer_stats[t][n] = U('adventurerStats')(t, n, {});
}
const LV = U('LEVELS');
for (let n = 1; n <= 100; n++) ref.wave_spawns.default[n] = U('waveSpawns')(n, [1]);
for (const id of levels.order) {
  ref.wave_spawns[id] = {};
  const w = LV[id].paths.map(p => p.weight);
  for (let n = 1; n <= LV[id].waves; n++) ref.wave_spawns[id][n] = U('waveSpawns')(n, w);
}
write(FIX, 'web_reference.json', JSON.parse(JSON.stringify(ref)));

console.log(`config: ${Object.keys(config).length} ключів`);
console.log(`монстрів: ${monsters.order.length}, авантюристів: ${adventurers.order.length}, набігів: ${Object.keys(waves).length}, рівнів: ${levels.order.length}`);
console.log(`еталон: hash ${ref.hash.length}, tower_stats ${Object.keys(ref.tower_stats).length}, adventurer_stats ${Object.keys(ref.adventurer_stats).length}, wave_spawns ${Object.keys(ref.wave_spawns).length} наборів`);
