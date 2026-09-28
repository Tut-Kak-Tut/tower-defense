# Механіки мап (кілька шляхів, завали) — план реалізації

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** рівні можуть мати кілька коридорів до Серця (злиття/розвилка, загони розподіляються за вагами) і завали, де не можна селити монстрів; новий рівень «Глибини» на набіги 71–100.

**Architecture:** кожен шлях — повна ламана від входу до Серця; ворог тримає індекс свого шляху `route`, а весь рух (`wp`, `progress`, `setProgress`) працює по `ROUTES[route]`. Шлях загону — зважений детермінований вибір `routeFor(n, squad, weights)` через `hash`; спільна функція `waveSpawns` будує чергу і для гри, і для панелі набігу. Завали — клітинки рівня, які `canPlace` відкидає і `buildMapLayer` малює.

**Tech Stack:** HTML5 Canvas + чистий JS (звичайні `<script>`, спільна глобальна область), тести — вбудований `node --test` (Node 24) з vm-контекстом і заглушками DOM, без залежностей.

**Spec:** `docs/superpowers/specs/2026-09-28-map-mechanics-design.md`

## Global Constraints

- Скрипти — звичайні `<script>`, не ES-модулі; порядок підключення не змінюється; жодних залежностей і збірки.
- Будь-який текст для гравця — дві мови `L('укр', 'рос')`; повідомлення `throw` — лише українською.
- Графіка — лише примітиви Canvas; статичне — в `buildMapLayer()` з `hash()`, анімації — через `time`.
- Склад і розподіл набігів детерміновані — жодного `Math.random` у `routeFor`/`waveSpawns`.
- `refreshUI()`/`refreshRaid()` не перестворюють DOM щокадру (DOM панелі — лише при зміні набігу).
- Кампанія й безкінечний — стандартна мапа, один шлях, поведінка без змін.
- Сейв не змінюється (`SAVE_VERSION` не чіпати).
- Після кожної задачі — перезапустити `python -m http.server 8001 --bind 127.0.0.1` (пам'ять користувача).
- Тести: `node --test` з кореня проєкту (знаходить `tests/*.test.js`).

## Review Focus

1. Вхід згори/знизу (`row -1` / `row ROWS`): авантюрист з'являється за краєм і заходить у мапу, а не стрибає — тест у Task 3 (`ворог на шляху зі входом згори`).
2. Породжені (вантаж телеги, половинки шута, воїн вершника) на шляху B лишаються на шляху B, а не телепортуються на A — тест у Task 3 (`вантаж успадковує шлях`).
3. Валун орка відкидає ворога на шляху B по його ж шляху — `setProgress` на маршруті B дає точку на B — тест у Task 3 (`setProgress по своєму шляху`).
4. Рівень з одним шляхом / кампанія: усі загони `route 0`, панель без міток, черга появи та сама, що до змін — тест у Task 4 (`один шлях — усі route 0`, `черга як раніше`).
5. Спільний вхід двох шляхів (розвилка): одна брама, мітка `A·B`; спільний кінець — одне Серце — перевірка в Task 5 (ручна) + тест валідації в Task 1 (`розвилка зі спільним входом будується`).

---

### Task 1: Тестовий каркас і новий API `LevelBuilder`

**Files:**
- Create: `tests/harness.js`
- Create: `tests/levels.test.js`
- Modify: `js/levels/level.js` (весь клас `LevelBuilder`, коментар-приклад зверху)
- Modify: `js/levels/levels.js` (4 рівні: `setMap` → `addPath` + `setTorches`)
- Modify: `js/entities.js:55` (тимчасово `LEVEL.paths[0].points`)
- Modify: `js/home.js:8-35` (`mapPreview`: усі шляхи, каміння, Серце)

**Interfaces:**
- Produces: `LevelBuilder#addPath(points, weight = 1)`, `#setRocks(list)` (елемент — `[c, r]` або `[c, r, w, h]`), `#setTorches(list)`; рівень має `paths: [{ points, weight }]`, `rocks: [[c, r], …]` (розгорнуті клітинки), `torches`. `setMap` більше немає.
- Produces: `tests/harness.js` → `loadGame({ search = '', before = '' }) → get(name)` — повертає глобальне ім'я з контексту гри (скрипти від `i18n.js` до `entities.js`; `before` — код, що виконується перед `entities.js`).

- [ ] **Step 1: Створити тестовий каркас**

`tests/harness.js`:
```js
// Завантажує скрипти гри в ізольований контекст Node (заглушки DOM), щоб тестувати логіку без браузера.
// get('ІМ'Я') повертає будь-яке глобальне ім'я гри (зокрема const/class, яких немає на globalThis).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const FILES = [
  'i18n', 'config', 'monsters/monster', 'monsters/monsters', 'adventurers/adventurer', 'adventurers/adventurers',
  'waves/wave', 'waves/campaign', 'waves/endless', 'levels/level', 'levels/levels',
];

// search — рядок URL (напр. '?level=t2'), before — код перед entities.js (оголосити тестовий рівень).
function loadGame({ search = '', before = '' } = {}) {
  const read = f => fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8');
  const code = [...FILES.map(read), before, read('entities'),
    'globalThis.__get = name => eval(name);'].join('\n;\n');
  const noop = () => {};
  const el = () => ({ dataset: {}, style: {}, appendChild: noop, addEventListener: noop });
  const ctx = {
    console, URLSearchParams,
    localStorage: { getItem: () => null, setItem: noop },
    location: { search, reload: noop },
    document: { documentElement: {}, body: el(), querySelectorAll: () => [], getElementById: () => null, createElement: el },
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return ctx.__get;
}

module.exports = { loadGame };
```

- [ ] **Step 2: Написати тести, що падають**

`tests/levels.test.js`:
```js
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
  assert.deepStrictEqual(LEVELS.cellar.paths[0].points[0], [-1, 5]);
});

test('злиття: вхід зліва і знизу, спільний кінець', () => {
  const l = build(b => b.addPath(LEFT, 2).addPath([[5, 12], [5, 8], [8, 8], [8, 6], [20, 6]]));
  assert.strictEqual(l.paths.length, 2);
  assert.deepStrictEqual(l.paths.map(p => p.weight), [2, 1]);
});

test('розвилка зі спільним входом будується', () => {
  const l = build(b => b
    .addPath([[-1, 5], [3, 5], [3, 2], [12, 2], [12, 5], [20, 5]])
    .addPath([[-1, 5], [3, 5], [3, 8], [12, 8], [12, 5], [20, 5]]));
  assert.strictEqual(l.paths.length, 2);
});

test('вхід згори', () => {
  const l = build(b => b.addPath([[6, -1], [6, 4], [20, 4]]));
  assert.deepStrictEqual(l.paths[0].points[0], [6, -1]);
});

test('каміння: клітинки й прямокутники розгортаються', () => {
  const l = build(b => b.addPath(LEFT).setRocks([[0, 0], [10, 9, 2, 3]]));
  assert.strictEqual(l.rocks.length, 7);
  assert.deepStrictEqual(l.rocks[0], [0, 0]);
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
```

- [ ] **Step 3: Запустити — має впасти**

Run: `node --test`
Expected: FAIL (`addPath is not a function` / `paths` undefined).

- [ ] **Step 4: Реалізувати `LevelBuilder`**

`js/levels/level.js` — коментар-приклад зверху замінити на:
```js
// Рівень — відрізок набігів кампанії на своїй мапі з обмеженим набором монстрів.
// Рівні оголошуються ланцюжками LevelBuilder у levels.js; порядок = порядок на головній сторінці.
//   new LevelBuilder('crypt').setName('Крипта').setDesc('…')
//     .setWaves(11, 30)                    // набіги кампанії з 11-го по 30-й включно
//     .setMoney(400).setLives(20)          // стартові душі й міцність Серця
//     .setMonsters(['archer', 'cannon'])   // хто доступний (у панелі — в порядку TOWERS)
//     .addPath([[-1, 2], …, [20, 9]], 2)   // коридор (формат DEFAULT_PATH) і вага: частка загонів, що йдуть ним
//     .addPath([[6, 12], …, [20, 9]])      // ще шлях: вхід зліва/згори/знизу, Серце в тій самій точці
//     .setRocks([[3, 4], [10, 0, 3, 2]])   // завали (не селити): клітинка [c, r] або прямокутник [c, r, w, h]
//     .setTorches([[2, 1], …])             // факели — декор
//     .build();
```
Клас (замінити конструктор, `setMap` і `build`):
```js
class LevelBuilder {
  constructor(id) {
    this.l = { id, lives: START_LIVES, paths: [], rocks: [], torches: [] };
  }

  setName(name) { this.l.name = name; return this; }
  setDesc(desc) { this.l.desc = desc; return this; }
  setWaves(from, to) { this.l.from = from; this.l.to = to; return this; }
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
    for (const k of ['name', 'desc', 'from', 'money', 'monsters']) if (l[k] === undefined) fail(`не задано ${k}`);
    if (!(l.from >= 1 && l.from <= l.to && l.to <= CAMPAIGN_WAVES)) fail(`набіги ${l.from}–${l.to} поза кампанією`);
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
```

- [ ] **Step 5: Перевести 4 рівні**

У `js/levels/levels.js` у кожному рівні замінити
```js
  .setMap(
    [ …шлях… ],
    [ …факели… ])
```
на
```js
  .addPath([ …шлях… ])
  .setTorches([ …факели… ])
```
(ті самі масиви, без змін). Напр. `cellar`:
```js
  .addPath([[-1, 5], [6, 5], [6, 2], [13, 2], [13, 8], [20, 8]])
  .setTorches([[3, 4], [9, 1], [10, 3], [15, 7], [17, 9], [2, 6]])
```

- [ ] **Step 6: Тимчасово підключити споживачів**

`js/entities.js:55`:
```js
const PATH_POINTS = LEVEL ? LEVEL.paths[0].points : DEFAULT_PATH;
```
`js/home.js`, у `mapPreview` замінити малювання коридору (від `const p = level.path;` до кінця циклу) і Серця:
```js
  for (const { points: p } of level.paths) {
    for (let i = 1; i < p.length; i++) {
      const [c1, r1] = p[i - 1], [c2, r2] = p[i];
      const x = Math.max(0, Math.min(c1, c2)), y = Math.max(0, Math.min(r1, r2));
      const w = Math.min(COLS - 1, Math.max(c1, c2)) - x + 1, h = Math.min(ROWS - 1, Math.max(r1, r2)) - y + 1;
      g.fillRect(x * s, y * s, w * s, h * s);
    }
  }
  g.fillStyle = 'hsl(260, 6%, 50%)';   // завали
  for (const [rc, rr] of level.rocks) g.fillRect(rc * s + 1, rr * s + 1, s - 2, s - 2);
```
і
```js
  const [, er] = level.paths[0].points[level.paths[0].points.length - 1];
```
Також у `js/config.js:7` коментар «`setMap` у js/levels/levels.js» → «`addPath` у js/levels/levels.js».

- [ ] **Step 7: Тести проходять**

Run: `node --test`
Expected: PASS, 6 тестів.

- [ ] **Step 8: Ручна перевірка**

Перезапустити сервер, відкрити http://127.0.0.1:8001/ — 4 картки з тими самими мініатюрами; http://127.0.0.1:8001/game.html?level=crypt — мапа як раніше, консоль без помилок.

- [ ] **Step 9: Commit**

```bash
git add tests js/levels js/entities.js js/home.js js/config.js
git commit -m "feat: LevelBuilder - addPath/setRocks/setTorches замість setMap, перевірка кількох шляхів; тести node --test"
```

---

### Task 2: Завали в грі

**Files:**
- Modify: `js/entities.js:55-56` (константа `ROCKS`)
- Modify: `js/game.js` (`ROCK_CELLS`, `canPlace`, `buildMapLayer` + нова `drawRubble`)
- Modify: `js/levels/levels.js` (каміння на `cellar`)
- Test: `tests/levels.test.js`

**Interfaces:**
- Consumes: `LEVEL.rocks` (Task 1).
- Produces: `ROCKS` (entities.js, `[[c, r], …]`, `[]` без рівня), `ROCK_CELLS` (game.js, `Set` ключів `'c,r'`).

- [ ] **Step 1: Тест, що падає**

Додати в `tests/levels.test.js`:
```js
test('ROCKS: каміння рівня в грі, без рівня — порожньо', () => {
  assert.strictEqual(loadGame()('ROCKS').length, 0);
  const rocks = loadGame({ search: '?level=cellar' })('ROCKS');
  assert.ok(rocks.length > 0);
  assert.deepStrictEqual(rocks[0], [0, 10]);
});
```

- [ ] **Step 2: Запустити — FAIL** (`ROCKS is not defined`)

Run: `node --test`

- [ ] **Step 3: Реалізувати**

`js/entities.js` після `const TORCHES = …`:
```js
const ROCKS = LEVEL ? LEVEL.rocks : [];   // завали: клітинки, де не можна селити монстрів
```
`js/levels/levels.js`, `cellar` — після `.addPath(…)`:
```js
  .setRocks([[0, 10, 3, 2], [17, 0, 3, 2]])
```
`js/game.js` після `PATH_CELLS`:
```js
const ROCK_CELLS = new Set(ROCKS.map(([c, r]) => c + ',' + r));
```
`canPlace`:
```js
function canPlace(col, row) {
  const key = col + ',' + row;
  return inBounds(col, row) && !PATH_CELLS.has(key) && !ROCK_CELLS.has(key) && !towerAt(col, row);
}
```
У `buildMapLayer()` одразу перед блоком `// вхід у підземелля — кована ґрата зліва`:
```js
  // завали — нагромадження уламків скелі
  for (const [c, r] of ROCKS) drawRubble(g, c, r);
```
і нова функція після `buildMapLayer`:
```js
// Завал на клітинці: тінь і кілька уламків-багатокутників; форма, розмір і відтінок — з hash, щоб не мерехтіло.
function drawRubble(g, c, r) {
  const x0 = c * CELL, y0 = r * CELL;
  g.fillStyle = 'rgba(0,0,0,0.45)';
  g.fillRect(x0 + 2, y0 + 2, CELL - 4, CELL - 4);
  for (let k = 0; k < 5; k++) {
    const cx = x0 + 8 + hash(c, r, 10 + k) * (CELL - 16);
    const cy = y0 + 10 + hash(c, r, 20 + k) * (CELL - 18);
    const rad = 6 + hash(c, r, 30 + k) * 7;
    const rot = hash(c, r, 40 + k) * Math.PI;
    const sides = 5 + Math.floor(hash(c, r, 50 + k) * 3);
    g.fillStyle = `hsl(25, 6%, ${20 + hash(c, r, 60 + k) * 14}%)`;
    g.beginPath();
    for (let s = 0; s < sides; s++) {
      const a = rot + s / sides * Math.PI * 2;
      const rr = rad * (0.75 + hash(c * 7 + s, r, 70 + k) * 0.35);
      const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
      if (s) g.lineTo(px, py); else g.moveTo(px, py);
    }
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.07)';   // відблиск згори
    g.fillRect(cx - rad * 0.4, cy - rad * 0.6, rad * 0.8, 2);
  }
}
```

- [ ] **Step 4: Тести проходять** — `node --test` → PASS.

- [ ] **Step 5: Ручна перевірка**

Перезапустити сервер. `game.html?level=cellar`: у лівому нижньому й правому верхньому кутах — завали; при виборі монстра наведення на камінь — червона підсвітка, клік не селить. `game.html` (кампанія) — без каміння. Головна — сірі квадратики на мініатюрі «Сирого підвалу».

- [ ] **Step 6: Commit**

```bash
git add js tests
git commit -m "feat: завали на мапі рівня - не можна селити, малюються уламками; каміння в Сирому підвалі"
```

---

### Task 3: Кілька шляхів у русі ворогів

**Files:**
- Modify: `js/entities.js:54-63` (`ROUTE_POINTS`, `ROUTE_WEIGHTS`, `ROUTES` замість `PATH_POINTS`/`PATH_PX`/`PATH_LEN`), `Enemy` (конструктор, `update`, `setProgress`, новий `setRoute`, `spawnOnDeath`)
- Modify: `js/game.js` (`PATH_CELLS` — об'єднання; брама й Серце — тимчасово з `ROUTE_POINTS[0]`)
- Create: `tests/routes.test.js`

**Interfaces:**
- Consumes: `LEVEL.paths` (Task 1).
- Produces: `ROUTE_POINTS: number[][][]`, `ROUTE_WEIGHTS: number[]`, `ROUTES: { px: {x,y}[], len: number[] }[]`, `Enemy#route: number`, `Enemy#setRoute(i, p = 0)` — перевести на шлях `i` і поставити на відстань `p` від його входу. `PATH_POINTS`, `PATH_PX`, `PATH_LEN` більше не існують.

- [ ] **Step 1: Тести, що падають**

`tests/routes.test.js`:
```js
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
  assert.deepStrictEqual(get('ROUTE_WEIGHTS'), [1]);
  assert.deepStrictEqual(get('ROUTE_POINTS')[0], get('DEFAULT_PATH'));
});

test('рівень з двома шляхами', () => {
  const get = game2();
  assert.strictEqual(get('ROUTES').length, 2);
  assert.deepStrictEqual(get('ROUTE_WEIGHTS'), [2, 1]);
});

test('ворог на шляху зі входом згори', () => {
  const get = game2();
  const e = new (get('Enemy'))('normal', 1);
  assert.strictEqual(e.route, 0);
  e.setRoute(1);
  assert.strictEqual(e.route, 1);
  assert.deepStrictEqual([e.x, e.y], [9 * 40 + 20, -20]);   // за верхнім краєм
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
  assert.deepStrictEqual([e.x, e.y], [9 * 40 + 20, 2 * 40 + 20]);
  e.setRoute(0, 3 * 40);                                     // те саме на A — зліва
  assert.deepStrictEqual([e.x, e.y], [2 * 40 + 20, 3 * 40 + 20]);
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
```

- [ ] **Step 2: Запустити — FAIL** (`ROUTES is not defined`)

Run: `node --test`

- [ ] **Step 3: Реалізувати маршрути в `entities.js`**

Рядки 54–63 (від `const LEVEL` до кінця циклу `PATH_LEN`) замінити на:
```js
// Поточний рівень — з ?level= у game.html; без нього (кампанія, безкінечний) — стандартна мапа.
const LEVEL = LEVELS[new URLSearchParams(location.search).get('level')] || null;
const TORCHES = LEVEL ? LEVEL.torches : DEFAULT_TORCHES;
const ROCKS = LEVEL ? LEVEL.rocks : [];   // завали: клітинки, де не можна селити монстрів
// Шляхи до Серця: у рівня — addPath (кілька, з вагами), інакше — один стандартний.
const ROUTE_POINTS = LEVEL ? LEVEL.paths.map(p => p.points) : [DEFAULT_PATH];
const ROUTE_WEIGHTS = LEVEL ? LEVEL.paths.map(p => p.weight) : [1];
// Для кожного шляху: центри точок px і пройдена відстань до кожної len — щоб поставити авантюриста
// на будь-яке місце свого шляху (відкидання, поява).
const ROUTES = ROUTE_POINTS.map(points => {
  const px = points.map(([c, r]) => cellCenter(c, r));
  const len = px.map(() => 0);
  for (let i = 1; i < px.length; i++) len[i] = len[i - 1] + Math.hypot(px[i].x - px[i - 1].x, px[i].y - px[i - 1].y);
  return { px, len };
});
```
Конструктор `Enemy` — замість `this.x = PATH_PX[0].x; this.y = PATH_PX[0].y;`:
```js
    this.route = 0;       // індекс шляху в ROUTES (setRoute)
    this.x = ROUTES[0].px[0].x;
    this.y = ROUTES[0].px[0].y;
```
`update` — перед `let move = speed * dt;` додати `const { px } = ROUTES[this.route];` і в циклі та після нього `PATH_PX` → `px`:
```js
    const { px } = ROUTES[this.route];
    let move = speed * dt;
    while (move > 0 && this.wp < px.length) {
      const t = px[this.wp];
      …
    }
    if (this.wp >= px.length) this.escaped = true;
```
`setProgress` і новий `setRoute`:
```js
  // Поставити на відстань p від входу свого шляху (не далі кінця).
  setProgress(p) {
    const { px, len } = ROUTES[this.route];
    const end = len[len.length - 1];
    p = Math.max(0, Math.min(p, end - 1));
    let i = 1;
    while (i < len.length - 1 && len[i] <= p) i++;
    const a = px[i - 1], b = px[i];
    const k = (p - len[i - 1]) / (len[i] - len[i - 1]);
    this.x = a.x + (b.x - a.x) * k;
    this.y = a.y + (b.y - a.y) * k;
    this.dir = Math.atan2(b.y - a.y, b.x - a.x);
    this.wp = i;
    this.progress = p;
  }

  // Перевести на шлях i і поставити на відстань p від його входу.
  setRoute(i, p = 0) {
    this.route = i;
    this.setProgress(p);
  }
```
`spawnOnDeath` → у `make` замінити `e.setProgress(progress);` на:
```js
      e.setRoute(this.route, progress);   // породжені йдуть тим самим шляхом
```

- [ ] **Step 4: `game.js` — коридор усіх шляхів**

`PATH_CELLS`:
```js
// Клітинки коридору всіх шляхів (у рівня їх може бути кілька; спільні ділянки — один раз).
const PATH_CELLS = (() => {
  const cells = new Set();
  for (const points of ROUTE_POINTS) {
    for (let i = 0; i < points.length - 1; i++) {
      let [c, r] = points[i];
      const [c2, r2] = points[i + 1];
      const dc = Math.sign(c2 - c), dr = Math.sign(r2 - r);
      cells.add(c + ',' + r);
      while (c !== c2 || r !== r2) {
        c += dc; r += dr;
        cells.add(c + ',' + r);
      }
    }
  }
  return cells;
})();
```
Тимчасово (Task 5 перепише): у брамі `PATH_POINTS[0][1]` → `ROUTE_POINTS[0][0][1]`; у `drawHeart` `const [ec, er] = PATH_POINTS[PATH_POINTS.length - 1];` → `const [ec, er] = ROUTE_POINTS[0][ROUTE_POINTS[0].length - 1];`.

Перевірити, що імен не лишилось:
Run: `grep -rn "PATH_POINTS\|PATH_PX\|PATH_LEN" js`
Expected: порожньо.

- [ ] **Step 5: Тести проходять** — `node --test` → PASS (усі, включно з Task 1–2).

- [ ] **Step 6: Ручна перевірка** — перезапустити сервер; кампанія (`game.html`) і `?level=tomb`: вороги йдуть як раніше, валун орка (`?wave=20&money=5000`, подвійний клік по орку) відкидає назад, шут розпадається на місці.

- [ ] **Step 7: Commit**

```bash
git add js tests
git commit -m "feat: кілька шляхів у русі - ROUTES, Enemy.route/setRoute, породжені йдуть своїм шляхом"
```

---

### Task 4: Розподіл загонів по шляхах

**Files:**
- Modify: `js/waves/wave.js` (нові `routeFor`, `waveSpawns` після `waveBuff`)
- Modify: `js/game.js` (`startWave`, поява в `update`)
- Create: `tests/waves.test.js`

**Interfaces:**
- Consumes: `ROUTE_WEIGHTS`, `Enemy#setRoute` (Task 3); `hash` (config.js), `waveGroups`, `waveBuff`, `mergeBuff` (wave.js).
- Produces: `routeFor(n, squad, weights) → number`; `waveSpawns(n, weights = [1]) → { type, delay, squad, buff, cargo, route }[]` — черга появи набігу `n` (спільна для гри й панелі).

- [ ] **Step 1: Тести, що падають**

`tests/waves.test.js`:
```js
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
```

- [ ] **Step 2: Запустити — FAIL** (`routeFor is not defined`)

- [ ] **Step 3: Реалізувати в `wave.js`** (після `const waveBuff = …`):
```js
// Шлях загону squad у набігу n: зважений вибір за hash серед weights (ваги шляхів рівня, addPath).
// Детерміновано, бо панель набігу показує розподіл наперед. Один шлях — завжди 0.
function routeFor(n, squad, weights) {
  if (weights.length < 2) return 0;
  let x = hash(n, squad, 7) * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < weights.length; i++) {
    x -= weights[i];
    if (x < 0) return i;
  }
  return weights.length - 1;
}

// Черга появи набігу n: хто, з якою паузою перед появою, у якому загоні, з яким бафом/вантажем і яким шляхом.
// Спільна для гри (startWave) і панелі набігу, щоб мітки шляхів збігалися з тим, що станеться.
function waveSpawns(n, weights = [1]) {
  const wb = waveBuff(n);
  const out = [];
  let squad = 0;
  waveGroups(n).forEach(([type, count, interval, gap, gb, cargo], gi) => {
    if (gap !== undefined && gi > 0) squad++;   // група з паузою починає новий загін
    const buff = gb ? mergeBuff(wb, gb) : wb;
    const route = routeFor(n, squad, weights);
    for (let i = 0; i < count; i++) {
      // delay — пауза перед появою цього ворога; у продовженні загону пауза = звичайний інтервал
      const delay = i === 0 ? (gi === 0 ? 0 : gap ?? interval) : interval;
      out.push({ type, delay, squad, buff, cargo, route });
    }
  });
  return out;
}
```

- [ ] **Step 4: Підключити в `game.js`**

У `startWave` замінити блок від `const groups = waveGroups(game.wave);` до кінця `groups.forEach(…);` на:
```js
  game.spawnQueue = waveSpawns(game.wave, ROUTE_WEIGHTS);
```
У `update`, одразу після `const e = new Enemy(s.type, game.wave, s.buff);`:
```js
      e.setRoute(s.route);
```

- [ ] **Step 5: Тести проходять** — `node --test` → PASS.

- [ ] **Step 6: Ручна перевірка** — перезапустити сервер, кампанія `game.html`: набіг 1 стартує, вороги виходять тими самими групами й паузами, стрій тримається.

- [ ] **Step 7: Commit**

```bash
git add js tests
git commit -m "feat: загони розподіляються по шляхах за вагами (routeFor, спільна черга waveSpawns)"
```

---

### Task 5: Брами на всіх входах, мітки шляхів, панель набігу

**Files:**
- Modify: `js/entities.js` (після `ROUTES`: `routeLetter`)
- Modify: `js/game.js` (`buildMapLayer`: брами й мітки через нову `drawGate`; `drawHeart`)
- Modify: `js/ui.js` (`foeRow`, `refreshRaid`)
- Modify: `style.css` (`.foe .f-route`)
- Test: `tests/routes.test.js`

**Interfaces:**
- Consumes: `ROUTE_POINTS`, `ROUTE_WEIGHTS` (Task 3), `waveSpawns` (Task 4).
- Produces: `routeLetter(i) → 'A' | 'B' | …`.

- [ ] **Step 1: Тест, що падає** — додати в `tests/routes.test.js`:
```js
test('routeLetter', () => {
  const routeLetter = loadGame()('routeLetter');
  assert.deepStrictEqual([0, 1, 2].map(routeLetter), ['A', 'B', 'C']);
});
```

- [ ] **Step 2: FAIL**, потім у `entities.js` після `ROUTES`:
```js
const routeLetter = i => String.fromCharCode(65 + i);   // мітка шляху на мапі й у панелі: A, B, C…
```
`node --test` → PASS.

- [ ] **Step 3: Брами й мітки на мапі (`game.js`)**

Блок `// вхід у підземелля — кована ґрата зліва` (від `const sy = …` до `g.fillRect(0, sy + CELL - 3, 12, 3);`) замінити на:
```js
  // входи в підземелля — кована ґрата на краю; спільний вхід кількох шляхів — одна ґрата з мітками всіх
  const entries = new Map();   // 'c,r' → [точка входу, індекси шляхів]
  ROUTE_POINTS.forEach((p, i) => {
    const key = p[0].join(',');
    if (!entries.has(key)) entries.set(key, [p[0], p[1], []]);
    entries.get(key)[2].push(i);
  });
  for (const [[c, r], next, routes] of entries.values()) {
    drawGate(g, c, r);
    if (ROUTE_POINTS.length > 1) {
      // мітка — на першій клітинці коридору за брамою
      const lc = c + Math.sign(next[0] - c), lr = r + Math.sign(next[1] - r);
      g.font = 'bold 15px Cinzel, Georgia, serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillStyle = 'rgba(255, 210, 150, 0.55)';
      g.fillText(routes.map(routeLetter).join('·'), lc * CELL + CELL / 2, lr * CELL + CELL / 2);
    }
  }
```
Нова функція після `buildMapLayer` (поруч із `drawRubble`):
```js
// Кована ґрата входу. Намальована для лівого краю; для верхнього/нижнього — повернута всередину мапи.
function drawGate(g, c, r) {
  const left = c === -1, top = r === -1;
  g.save();
  if (left) g.translate(0, r * CELL + CELL / 2);
  else g.translate(c * CELL + CELL / 2, top ? 0 : ROWS * CELL);
  g.rotate(left ? 0 : top ? Math.PI / 2 : -Math.PI / 2);
  const sy = -CELL / 2;
  g.fillStyle = '#0a080c';
  g.fillRect(0, sy + 2, 10, CELL - 4);
  g.fillStyle = '#5a5060';
  for (let i = 0; i < 4; i++) g.fillRect(1, sy + 6 + i * 8, 10, 2);
  g.fillRect(3, sy + 2, 2, CELL - 4);
  g.fillRect(8, sy + 2, 2, CELL - 4);
  g.fillRect(0, sy, 12, 3);
  g.fillRect(0, sy + CELL - 3, 12, 3);
  g.restore();
}
```
`drawHeart` — Серце одне для всіх шляхів (перевіряє `LevelBuilder`):
```js
  const heart = ROUTE_POINTS[0];
  const [ec, er] = heart[heart.length - 1];   // спільне для всіх шляхів
```

- [ ] **Step 4: Мітки в панелі набігу (`ui.js`, `style.css`)**

`foeRow` — у `insertAdjacentHTML` додати `<span class="f-route"></span>` після `f-name` і в повернений об'єкт `route: row.querySelector('.f-route'),`.
У `refreshRaid`, у гілці побудови (`else { … }`), перед `for (const [type, count] of …)`:
```js
      // якими шляхами йде кожен тип (лише коли шляхів кілька) — та сама черга, що й у startWave
      const routes = {};
      if (ROUTES.length > 1) {
        for (const s of waveSpawns(index + 1, ROUTE_WEIGHTS)) (routes[s.type] ??= new Set()).add(s.route);
      }
```
і в циклі після `r.total = count;`:
```js
        if (routes[type]) {
          r.route.textContent = [...routes[type]].sort().map(routeLetter).join('·');
          r.route.title = L('Яким шляхом іде', 'Каким путём идёт');
        }
```
`style.css` після `.foe .f-count …`:
```css
.foe .f-route { font-size: 11px; font-weight: 700; color: var(--muted); letter-spacing: 1px; }
.foe .f-route:empty { display: none; }
```
Відкрити `style.css:139-160` і, якщо `.foe` — grid із фіксованими колонками (`grid-template-columns`), поставити мітку в ту ж клітинку, що й ім'я: `.foe .f-route { grid-column: 2; grid-row: 1; justify-self: end; margin-right: 6px; }`, щоб рядок не розвалився.

- [ ] **Step 5: Ручна перевірка на тестовій мапі**

Тимчасово (не комітити) додати в кінець `js/levels/levels.js` рівень `t2` з `tests/routes.test.js` (`LEVEL_T2`) + `.setMonsters(Object.keys(TOWERS))`. Перезапустити сервер, `game.html?level=t2&money=5000`:
- дві ґрати: зліва (мітка `A`) і згори (мітка `B`, ґрата повернута, прутами вздовж краю);
- панель набігу: у рядках мітки `A`, `B` або `A·B`; після старту вороги виходять саме з тих входів;
- Серце одне праворуч.
Потім замінити другий шлях на розвилку з тим самим входом (`[[-1, 3], [4, 3], [4, 0], [12, 0], [12, 6], [20, 6]]` — перевірити, що не перетинає A) → одна ґрата з міткою `A·B`.
Прибрати тимчасовий рівень. Кампанія `game.html`: одна ґрата, жодних міток, у панелі міток немає.

- [ ] **Step 6: Commit**

```bash
git add js style.css tests
git commit -m "feat: брами на всіх входах з мітками шляхів, мітки шляхів у панелі набігу"
```

---

### Task 6: Рівень «Глибини» (71–100)

**Files:**
- Modify: `js/levels/levels.js` (новий рівень у кінці, коментар про душі)
- Test: `tests/levels.test.js`

**Interfaces:**
- Consumes: `addPath`, `setRocks`, `setTorches` (Task 1).

- [ ] **Step 1: Тест, що падає** — додати в `tests/levels.test.js`:
```js
test('Глибини: 71–100, два шляхи, завали', () => {
  const deep = loadGame()('LEVELS').deep;
  assert.ok(deep);
  assert.deepStrictEqual([deep.from, deep.to], [71, 100]);
  assert.deepStrictEqual(deep.paths.map(p => p.weight), [2, 1]);
  assert.ok(deep.rocks.length > 0);
});
```
`node --test` → FAIL.

- [ ] **Step 2: Додати рівень** у кінець `js/levels/levels.js`:
```js
new LevelBuilder('deep')
  .setName(L('Глибини', 'Глубины'))
  .setDesc(L('Два проходи сходяться перед Серцем. Завали забрали найкращі ніші, а до кінця дійдуть лише найсильніші загони.',
    'Два прохода сходятся перед Сердцем. Завалы отняли лучшие ниши, а до конца дойдут лишь сильнейшие отряды.'))
  .setWaves(71, 100)
  .setMoney(47000)
  .setMonsters(Object.keys(TOWERS))
  .addPath([[-1, 3], [4, 3], [4, 9], [11, 9], [11, 6], [20, 6]], 2)   // головний — довгий, зліва
  .addPath([[15, -1], [15, 3], [9, 3], [9, 6], [20, 6]])              // бічний — згори, коротший
  .setRocks([[5, 5, 2, 2], [12, 8, 2, 1], [0, 0, 3, 2], [17, 9, 3, 3]])
  .setTorches([[2, 2], [6, 8], [12, 2], [17, 5], [13, 10], [1, 7]])
  .build();
```
І в коментарі на початку файлу доповнити оцінку: `…~27000 до 50-го, ~47000 до 70-го`.

- [ ] **Step 3: Тести проходять** — `node --test` → PASS (якщо `build()` кидає — виправити координати, не послаблювати перевірку).

- [ ] **Step 4: Ручна перевірка й баланс**

Перезапустити сервер. Головна: 5-та картка «Глибини» з мініатюрою (два коридори, завали). `game.html?level=deep`: брами A зліва і B згори, завали на місці, на них не поселити. Зіграти кілька набігів; якщо до 75-го Серце падає без шансів або навпаки жодного прориву — підкоригувати `setMoney` (крок ±5000) і записати висновок у коментар рівня.

- [ ] **Step 5: Commit**

```bash
git add js/levels/levels.js tests
git commit -m "feat: рівень Глибини (набіги 71-100) - два входи зі злиттям і завали"
```

---

### Task 7: Документація й фінальна перевірка

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Оновити `CLAUDE.md`**

- Опис `js/levels/level.js`: `setMap(path, torches)` → `addPath(points, weight)` (кілька шляхів: вхід зліва/згори/знизу, одне Серце, спільні ділянки дозволені; вага — частка загонів), `setRocks` (клітинки/прямокутники, не селити), `setTorches`.
- Опис `js/entities.js`: «мапа `PATH_POINTS`/`TORCHES`» → «`ROUTE_POINTS`/`ROUTE_WEIGHTS`/`ROUTES` (шляхи рівня або стандартний), `ROCKS`, `TORCHES`»; у `Enemy` — `route` і `setRoute(i, p)`; `setProgress` — по своєму шляху; породжені успадковують шлях.
- Опис `js/waves/wave.js`: `routeFor(n, squad, weights)`, `waveSpawns(n, weights)` — спільна черга для `startWave` і панелі.
- Опис `js/game.js`: `PATH_CELLS` (усі шляхи), `ROCK_CELLS`, `drawGate`, `drawRubble`.
- Опис `js/ui.js`: мітки шляхів у панелі набігу.
- Правило «Новий рівень» — `LevelBuilder` з `addPath` (+ `setRocks`/`setTorches`).
- Новий розділ «Тести»: `node --test` з кореня; `tests/harness.js` — `loadGame({search, before})` вантажить скрипти до `entities.js` із заглушками DOM.

- [ ] **Step 2: Фінальна перевірка**

Run: `node --test` → усі PASS.
Перезапустити сервер. Пройти: головна (5 карток), кампанія, `?mode=endless`, кожен рівень — консоль без помилок; продовження сейву кампанії (поселити монстра, перезавантажити сторінку) працює.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: CLAUDE.md - кілька шляхів, завали, тести node --test"
```
