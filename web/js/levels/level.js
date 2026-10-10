// Рівень — перші N набігів кампанії на своїй мапі з обмеженим набором монстрів (усі рівні починаються з 1-го набігу).
// Рівні оголошуються ланцюжками LevelBuilder у levels.js; порядок = порядок на головній сторінці.
//   new LevelBuilder('crypt').setName('Крипта').setDesc('…')
//     .setWaves(30)                        // набіги кампанії з 1-го по 30-й
//     .setMoney(200).setLives(20)          // стартові душі (за замовчуванням START_MONEY) й міцність Серця
//     .setMonsters(['archer', 'cannon'])   // хто доступний (у панелі — в порядку TOWERS)
//     .addPath([[-1, 2], …, [20, 9]], 2)   // коридор (формат DEFAULT_PATH) і вага: частка загонів, що йдуть ним
//     .addPath([[6, 12], …, [20, 9]])      // ще шлях: вхід зліва/згори/знизу, Серце в тій самій точці
//     .setRocks([[3, 4], [10, 0, 3, 2]])   // завали (не селити): клітинка [c, r] або прямокутник [c, r, w, h]
//     .setTorches([[2, 1], …])             // факели — декор
//     .build();

const LEVELS = {};

class LevelBuilder {
  constructor(id) {
    this.l = { id, money: START_MONEY, lives: START_LIVES, paths: [], rocks: [], torches: [] };
  }

  setName(name) { this.l.name = name; return this; }
  setDesc(desc) { this.l.desc = desc; return this; }
  setWaves(count) { this.l.waves = count; return this; }
  setMoney(money) { this.l.money = money; return this; }
  setLives(lives) { this.l.lives = lives; return this; }
  setMonsters(list) { this.l.monsters = list; return this; }
  addPath(points, weight = 1) { this.l.paths.push({ points, weight }); return this; }
  setTorches(list) { this.l.torches = list; return this; }
  setRocks(list) {
    this.l.rocks = list.flatMap(([c, r, w = 1, h = 1]) => {
      const out = [];
      for (let dr = 0; dr < h; dr++) for (let dc = 0; dc < w; dc++) out.push([c + dc, r + dr]);
      return out;
    });
    return this;
  }

  build() {
    const l = this.l;
    const fail = msg => { throw new Error(`Рівень ${l.id}: ${msg}`); };
    if (LEVELS[l.id]) fail('вже оголошений');
    for (const k of ['name', 'desc', 'waves', 'monsters']) if (l[k] === undefined) fail(`не задано ${k}`);
    if (!(Number.isInteger(l.waves) && l.waves >= 1 && l.waves <= CAMPAIGN_WAVES)) fail(`набігів ${l.waves} — має бути 1…${CAMPAIGN_WAVES}`);
    for (const t of l.monsters) if (!TOWERS[t]) fail(`невідомий монстр ${t}`);
    l.monsters = Object.keys(TOWERS).filter(t => l.monsters.includes(t));

    // коридори: вхід за лівим, верхнім або нижнім краєм, усі — до одного Серця за правим краєм,
    // лише прямі відрізки, без самоперетинів; різні шляхи можуть ділити клітинки (злиття, розвилка)
    if (!l.paths.length) fail('не задано жодного шляху (addPath)');
    const inMap = (c, r) => c >= 0 && c < COLS && r >= 0 && r < ROWS;
    const heart = l.paths[0].points[l.paths[0].points.length - 1];
    const cells = new Set();
    l.paths.forEach(({ points: p, weight }, n) => {
      const tag = `шлях ${n + 1}`;
      if (!(weight > 0)) fail(`${tag}: вага має бути додатною`);
      const [c0, r0] = p[0];
      const edge = (c0 === -1 && r0 >= 0 && r0 < ROWS) || ((r0 === -1 || r0 === ROWS) && c0 >= 0 && c0 < COLS);
      if (!edge) fail(`${tag}: вхід ${c0},${r0} має бути за лівим, верхнім або нижнім краєм`);
      const [ce, re] = p[p.length - 1];
      if (ce !== COLS) fail(`${tag}: має закінчуватися в col ${COLS} (Серце)`);
      if (re !== heart[1]) fail(`${tag}: Серце в ${ce},${re}, а в шляху 1 — ${heart[0]},${heart[1]}`);
      const own = new Set();
      for (let i = 1; i < p.length; i++) {
        let [c, r] = p[i - 1];
        const [c2, r2] = p[i];
        if (c !== c2 && r !== r2) fail(`${tag}: відрізок ${i} не прямий`);
        while (c !== c2 || r !== r2) {
          c += Math.sign(c2 - c); r += Math.sign(r2 - r);
          if (i === p.length - 1 && c === c2 && r === r2) break;   // сама точка Серця — за краєм
          if (!inMap(c, r)) fail(`${tag}: коридор виходить за мапу в ${c},${r}`);
          const key = c + ',' + r;
          if (own.has(key)) fail(`${tag}: коридор перетинає себе в ${c},${r}`);
          own.add(key);
          cells.add(key);
        }
      }
    });

    const rocks = new Set();
    for (const [c, r] of l.rocks) {
      if (!inMap(c, r)) fail(`камінь ${c},${r} за мапою`);
      if (cells.has(c + ',' + r)) fail(`камінь ${c},${r} у коридорі`);
      rocks.add(c + ',' + r);
    }
    for (const [c, r] of l.torches) {
      if (cells.has(c + ',' + r)) fail(`факел ${c},${r} у коридорі`);
      if (rocks.has(c + ',' + r)) fail(`факел ${c},${r} на камені`);
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
