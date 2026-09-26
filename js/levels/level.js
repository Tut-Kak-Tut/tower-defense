// Рівень — відрізок набігів кампанії на своїй мапі з обмеженим набором монстрів.
// Рівні оголошуються ланцюжками LevelBuilder у levels.js; порядок = порядок на головній сторінці.
//   new LevelBuilder('crypt').setName('Крипта').setDesc('…')
//     .setWaves(11, 30)                    // набіги кампанії з 11-го по 30-й включно
//     .setMoney(400).setLives(20)          // стартові душі й міцність Серця
//     .setMonsters(['archer', 'cannon'])   // хто доступний (у панелі — в порядку TOWERS)
//     .setMap([[-1, 2], …, [20, 9]], [[2, 1], …])  // коридор (формат PATH_POINTS) і факели
//     .build();

const LEVELS = {};

class LevelBuilder {
  constructor(id) {
    this.l = { id, lives: START_LIVES, torches: [] };
  }

  setName(name) { this.l.name = name; return this; }
  setDesc(desc) { this.l.desc = desc; return this; }
  setWaves(from, to) { this.l.from = from; this.l.to = to; return this; }
  setMoney(money) { this.l.money = money; return this; }
  setLives(lives) { this.l.lives = lives; return this; }
  setMonsters(list) { this.l.monsters = list; return this; }
  setMap(path, torches = []) { this.l.path = path; this.l.torches = torches; return this; }

  build() {
    const l = this.l;
    const fail = msg => { throw new Error(`Рівень ${l.id}: ${msg}`); };
    if (LEVELS[l.id]) fail('вже оголошений');
    for (const k of ['name', 'desc', 'from', 'money', 'monsters', 'path']) if (l[k] === undefined) fail(`не задано ${k}`);
    if (!(l.from >= 1 && l.from <= l.to && l.to <= CAMPAIGN_WAVES)) fail(`набіги ${l.from}–${l.to} поза кампанією`);
    for (const t of l.monsters) if (!TOWERS[t]) fail(`невідомий монстр ${t}`);
    l.monsters = Object.keys(TOWERS).filter(t => l.monsters.includes(t));

    // коридор: вхід за лівим краєм, Серце за правим, лише прямі відрізки, без самоперетинів
    const p = l.path;
    if (p[0][0] !== -1 || p[p.length - 1][0] !== COLS) fail('коридор має йти від col -1 до col ' + COLS);
    const cells = new Set();
    for (let i = 1; i < p.length; i++) {
      let [c, r] = p[i - 1];
      const [c2, r2] = p[i];
      if (c !== c2 && r !== r2) fail(`відрізок ${i} не прямий`);
      while (c !== c2 || r !== r2) {
        c += Math.sign(c2 - c); r += Math.sign(r2 - r);
        if (c < 0 || c >= COLS) continue;
        if (r < 0 || r >= ROWS) fail(`коридор виходить за мапу в ${c},${r}`);
        if (cells.has(c + ',' + r)) fail(`коридор перетинає себе в ${c},${r}`);
        cells.add(c + ',' + r);
      }
    }
    for (const [c, r] of l.torches) {
      if (cells.has(c + ',' + r)) fail(`факел ${c},${r} у коридорі`);
    }
    LEVELS[l.id] = l;
    return l;
  }
}

// Пройдені рівні — у браузері; лише позначка на головній.
const LEVELS_DONE_KEY = 'dungeon-heart-levels-done';
function loadLevelsDone() {
  try { return JSON.parse(localStorage.getItem(LEVELS_DONE_KEY)) || []; } catch { return []; }
}
function markLevelDone(id) {
  const done = loadLevelsDone();
  if (done.includes(id)) return;
  try { localStorage.setItem(LEVELS_DONE_KEY, JSON.stringify([...done, id])); } catch { /* ігноруємо */ }
}
