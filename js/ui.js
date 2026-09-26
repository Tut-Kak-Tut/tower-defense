// Інтерфейс: кнопки, миша, клавіатура, панелі набігу, бестіарію і посилення.

const ui = {
  placing: null,   // тип вежі, яку зараз ставимо
  selected: null,  // вибрана поставлена вежа
  hover: null,     // {col, row} під курсором
  tab: 'monsters', // вкладка правого вікна: 'monsters' | 'upgrade'
};

const $ = id => document.getElementById(id);

// ---------- іконки (малюються один раз тими ж функціями, що й на полі) ----------
function makeIcon(size, paint) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.translate(size / 2, size / 2);
  paint(g);
  return c;
}

function towerIcon(type, size = 32) {
  return makeIcon(size, g => {
    g.scale(size / 40, size / 40);
    g.translate(0, -2);
    TOWER_DRAW[type](g, -Math.PI / 2);
  });
}

function enemyIcon(type, size = 32) {
  const def = ENEMIES[type];
  return makeIcon(size, g => {
    // усі авантюристи однакового розміру в іконці; вершник із конем і списом довший за радіус
    const k = size * 0.36 / def.radius / (type === 'knight' ? 1.5 : 1);
    g.scale(k, k);
    g.rotate(-Math.PI / 2);
    drawAdventurer(g, type, def.radius, def.color);
  });
}

// Рядок ворога для панелі набігу й бестіарію.
function foeRow(type) {
  const row = document.createElement('div');
  row.className = 'foe';
  const icon = document.createElement('span'); // фон окремо від canvas, щоб силует «???» не зафарбовував його
  icon.className = 'f-icon';
  icon.appendChild(enemyIcon(type));
  row.appendChild(icon);
  row.insertAdjacentHTML('beforeend',
    '<span class="f-name"></span><span class="f-count"></span><span class="f-sub"></span>');
  return {
    row,
    name: row.querySelector('.f-name'),
    count: row.querySelector('.f-count'),
    sub: row.querySelector('.f-sub'),
  };
}

// ---------- кнопки веж ----------
const TOWER_KEYS = '1234567890-=[';   // клавіші вибору монстра за порядком у TOWERS
const towerButtons = {};
Object.entries(TOWERS).forEach(([type, def], i) => {
  const btn = document.createElement('button');
  btn.className = 'tower-btn';
  btn.appendChild(towerIcon(type));
  btn.insertAdjacentHTML('beforeend',
    `<span class="t-name">${def.name} <kbd>${TOWER_KEYS[i]}</kbd></span>` +
    `<span class="t-cost">👻 ${def.cost}</span>` +
    `<span class="t-desc">${def.desc}</span>`);
  btn.addEventListener('click', () => selectTowerType(type));
  $('towerList').appendChild(btn);
  towerButtons[type] = btn;
});

function selectTowerType(type) {
  ui.placing = ui.placing === type ? null : type;
  ui.selected = null;
  ui.tab = 'monsters';
}

function selectTower(t) {
  ui.selected = t;
  ui.placing = null;
  ui.tab = 'upgrade';
}

function cancelSelection() {
  ui.placing = null;
  ui.selected = null;
}

// ---------- вкладки ----------
$('tabMonsters').addEventListener('click', () => { ui.tab = 'monsters'; });
$('tabUpgrade').addEventListener('click', () => { ui.tab = 'upgrade'; });

// ---------- бестіарій: рядки створюються один раз ----------
const bestiary = {};
for (const type of Object.keys(ENEMIES)) {
  bestiary[type] = foeRow(type);
  $('bestiaryList').appendChild(bestiary[type].row);
}

// ---------- миша ----------
function cellFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * canvas.width / rect.width;
  const y = (e.clientY - rect.top) * canvas.height / rect.height;
  return { col: Math.floor(x / CELL), row: Math.floor(y / CELL) };
}

canvas.addEventListener('mousemove', e => { ui.hover = cellFromEvent(e); });
canvas.addEventListener('mouseleave', () => { ui.hover = null; });
canvas.addEventListener('contextmenu', e => { e.preventDefault(); cancelSelection(); });

canvas.addEventListener('click', e => {
  if (game.over) return;
  const { col, row } = cellFromEvent(e);
  const t = towerAt(col, row);
  if (t) {
    selectTower(t);
  } else if (ui.placing) {
    // вежа лишається вибраною — можна ставити кілька підряд
    if (placeTower(ui.placing, col, row) && !canAfford(ui.placing)) ui.placing = null;
  } else {
    ui.selected = null;
  }
});

// орк: подвійний клік кидає валун (перший клік уже вибрав його)
canvas.addEventListener('dblclick', e => {
  if (game.over) return;
  const { col, row } = cellFromEvent(e);
  const t = towerAt(col, row);
  if (t && t.def.attack === 'manual') throwBoulder(t);
});

// ---------- кнопки керування ----------
$('waveBtn').addEventListener('click', startWave);
$('speedBtn').addEventListener('click', () => { game.speed = game.speed % 3 + 1; });
$('autoBtn').addEventListener('click', toggleAuto);
$('pauseBtn').addEventListener('click', () => { game.paused = !game.paused; });
$('upgradeBtn').addEventListener('click', () => { if (ui.selected) upgradeTower(ui.selected); });
document.querySelectorAll('#dirPad button').forEach(b => b.addEventListener('click', () => {
  if (ui.selected && ui.selected.def.fixedDir) ui.selected.setDir(+b.dataset.dir);
}));
$('sellBtn').addEventListener('click', () => { if (ui.selected) askSell(ui.selected); });

// Питання перед вигнанням: гра на паузі, поки гравець не відповість (Enter — так, Esc — ні).
let confirmState = null;  // { tower, wasPaused }
function askSell(tower) {
  confirmState = { tower, wasPaused: game.paused };
  game.paused = true;
  $('confirmText').textContent = `${tower.def.name} (рівень ${tower.level}) піде з підземелля, `
    + `а ти повернеш 👻 ${tower.sellValue}.`;
  $('confirm').classList.remove('hidden');
}
function closeConfirm(yes) {
  const { tower, wasPaused } = confirmState;
  confirmState = null;
  $('confirm').classList.add('hidden');
  game.paused = wasPaused;
  if (yes && game.towers.includes(tower)) {
    sellTower(tower);
    if (ui.selected === tower) ui.selected = null;
  }
}
$('confirmYes').addEventListener('click', () => closeConfirm(true));
$('confirmNo').addEventListener('click', () => closeConfirm(false));
$('restartBtn').addEventListener('click', () => { newGame(game.mode); cancelSelection(); });
$('campaignBtn').addEventListener('click', () => { newGame('campaign'); cancelSelection(); });
$('endlessBtn').addEventListener('click', () => { newGame('endless'); cancelSelection(); });
$('continueBtn').addEventListener('click', continueEndless);
$('menuBtn').addEventListener('click', () => { newGame(); cancelSelection(); });

function toggleAuto() {
  game.auto = !game.auto;
  game.autoTimer = AUTO_DELAY;
}

// ---------- музика: треки по черзі у випадковому порядку, вкл/викл зберігається ----------
const MUSIC = ['music/cave-theme.ogg', 'music/dungeon.ogg', 'music/battle-theme-a.mp3'];
const MUSIC_KEY = 'dungeon-heart-music';
const music = new Audio();
music.volume = 0.35;
let musicOn = true;
try { musicOn = localStorage.getItem(MUSIC_KEY) !== 'off'; } catch { /* лишаємо увімкненою */ }
let musicTrack = -1;

function nextTrack() {
  let i;
  do i = Math.floor(Math.random() * MUSIC.length); while (MUSIC.length > 1 && i === musicTrack);
  musicTrack = i;
  music.src = MUSIC[i];
  if (musicOn) music.play().catch(() => {});
}
music.addEventListener('ended', nextTrack);

function toggleMusic() {
  musicOn = !musicOn;
  try { localStorage.setItem(MUSIC_KEY, musicOn ? 'on' : 'off'); } catch { /* ігноруємо */ }
  if (!musicOn) music.pause();
  else if (musicTrack < 0) nextTrack();
  else music.play().catch(() => {});
}
$('musicBtn').addEventListener('click', toggleMusic);

// браузер не дає грати звук до першої взаємодії — стартуємо на першому кліку чи клавіші
function startMusicOnce() {
  document.removeEventListener('pointerdown', startMusicOnce);
  document.removeEventListener('keydown', startMusicOnce);
  if (musicOn && musicTrack < 0) nextTrack();
}
document.addEventListener('pointerdown', startMusicOnce);
document.addEventListener('keydown', startMusicOnce);

// ---------- клавіатура ----------
const towerTypes = Object.keys(TOWERS);
document.addEventListener('keydown', e => {
  if (confirmState) {   // поки висить питання, інші гарячі клавіші не працюють
    if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); closeConfirm(e.key === 'Enter'); }
    else if (e.key === ' ') e.preventDefault();
    return;
  }
  const ti = e.key.length === 1 ? TOWER_KEYS.indexOf(e.key) : -1;
  if (ti >= 0 && ti < towerTypes.length) selectTowerType(towerTypes[ti]);
  else if (e.key === 'Escape') cancelSelection();
  else if (e.key === ' ') { e.preventDefault(); if (!game.over) game.paused = !game.paused; }
  else if (e.key === 'Enter') { e.preventDefault(); startWave(); }
  else if (e.code === 'KeyA') toggleAuto(); // за кодом клавіші — працює і в українській розкладці
  else if (e.code === 'KeyM') toggleMusic();
  else if (e.code === 'KeyR' && ui.selected && ui.selected.def.fixedDir) ui.selected.setDir(ui.selected.dir + 1);
});

// ---------- панель набігу ----------
// Склад набігу за типами: набіг може містити кілька груп одного типу. index — з 0.
function raidGroups(index) {
  const total = {};
  for (const [type, count] of waveGroups(index + 1)) total[type] = (total[type] || 0) + count;
  return total;
}

let raidKey = null;   // DOM панелі перебудовується лише коли змінюється набіг
let raidRows = {};

function refreshRaid() {
  // під час набігу показуємо поточний, інакше — наступний
  const index = game.waveActive ? game.wave - 1 : game.wave;
  const key = index + ':' + game.waveActive;
  if (key !== raidKey) {
    raidKey = key;
    raidRows = {};
    const list = $('raidList');
    list.textContent = '';
    if (index >= maxWaves()) {
      $('raidTitle').textContent = 'Набігів більше немає';
      list.innerHTML = '<p class="empty">Підземелля чекає в тиші.</p>';
    } else {
      $('raidTitle').textContent = game.waveActive ? `Набіг ${index + 1} триває` : `Наступний набіг: ${index + 1}`;
      for (const [type, count] of Object.entries(raidGroups(index))) {
        const r = foeRow(type);
        r.total = count;
        raidRows[type] = r;
        list.appendChild(r.row);
      }
    }
  }

  for (const [type, r] of Object.entries(raidRows)) {
    const known = game.seen.has(type);
    r.name.textContent = known ? ENEMIES[type].name : 'Невідомий';
    r.row.classList.toggle('locked', !known);
    if (game.waveActive) {
      const left = game.spawnQueue.filter(s => s.type === type).length +
        game.enemies.filter(e => e.origin === type).length;   // разом із тими, хто з них з'явився
      r.count.textContent = `${left} / ${r.total}`;
      r.sub.textContent = left ? 'ще в підземеллі' : 'усіх переможено';
      r.row.classList.toggle('done', left === 0);
    } else {
      r.count.textContent = `×${r.total}`;
      r.sub.textContent = known ? ENEMIES[type].desc : 'ще не зустрічався';
    }
  }
}

// ---------- бестіарій ----------
// Особливості авантюриста одним рядком: «броня 6 · щит 50% · …».
function enemyTraits(def) {
  const t = [];
  if (def.armor) t.push(`броня ${def.armor}`);
  if (def.shield) t.push(`щит ${Math.round(def.shield * 100)}%${def.shieldRegen ? ' (відновлюється)' : ''}${def.shieldWave ? ` з ${def.shieldWave}-го набігу` : ''}`);
  if (def.slowImmune) t.push('не мерзне');
  if (def.physArmor) t.push('броня лише від фізичних ударів');
  if (def.shieldAura) t.push('щит накриває сусідів');
  if (def.haste) t.push(`пришвидшує сусідів на ${Math.round((def.haste.mul - 1) * 100)}%`);
  if (def.undying) t.push('не гине, поки є союзники');
  if (def.magicWard) t.push(`магічний щит −${Math.round(def.magicWard.cut * 100)}% магії поруч`);
  if (def.escort) t.push(`ходить лише з: ${ENEMIES[def.escort].name.toLowerCase()}`);
  if (def.spawn) t.push(`гинучи, лишає: ${ENEMIES[def.spawn].name.toLowerCase()}`);
  if (def.split) t.push(`ділиться ${def.split} рази`);
  if (def.deflect) t.push(`відбиває ${Math.round(def.deflect * 100)}% снарядів`);
  if (def.big) t.push('великий');
  if (def.heal) t.push('лікує');
  if (def.stealth) t.push('невидимий');
  if (def.lifeDmg) t.push(`Серцю −${def.lifeDmg}`);
  return t.length ? '. ' + t.join(' · ') : '';
}

function refreshBestiary() {
  for (const [type, r] of Object.entries(bestiary)) {
    const known = game.seen.has(type);
    const def = ENEMIES[type];
    r.row.classList.toggle('locked', !known);
    r.name.textContent = known ? def.name : '???';
    // шут дає душі лише за найменших — показуємо суму за всю родину
    const reward = def.split ? def.splitReward * 2 ** def.split : def.reward;
    r.count.textContent = known ? `👻 ${reward}` : '';
    r.sub.textContent = known
      ? `${def.desc}. Здоров'я ${def.hp}, швидкість ${def.speed}${enemyTraits(def)}`
      : 'Ще не зустрічався в підземеллі';
  }
}

// ---------- вкладка «Посилення» ----------
let upKey = null; // таблиця й іконка перебудовуються лише коли змінився монстр чи його рівень
let upTower = null;

// Що дасть наступний рівень — одним реченням, з різниці характеристик (прокачка задана в setLevel, тож може бути будь-якою).
function levelGains(attack, now, next) {
  const signed = (v, digits = 2) => (v < 0 ? '−' : '+') + +Math.abs(v).toFixed(digits);
  const pct = (a, b) => signed((b / a - 1) * 100, 0) + '%';
  const out = [];
  const add = (key, text) => { if (next[key] !== now[key]) out.push(text(now[key], next[key])); };
  add('damage', (a, b) => (attack === 'drain' ? 'висмоктування ' : 'урон ') + (a ? pct(a, b) : `${Math.round(a)} → ${Math.round(b)}`));
  add('range', (a, b) => `${attack === 'haunt' ? 'туман' : 'дальність'} ${signed(b - a)} кл.`);
  add('rate', (a, b) => attack === 'drain' ? `розгін ${b < a ? 'швидший' : 'повільніший'}`
    : `${attack === 'web' ? 'постріли' : 'атака'} на ${Math.round(Math.abs(1 - b / a) * 100)}% ${b < a ? 'частіше' : 'рідше'}`);
  add('targets', (a, b) => `${attack === 'manual' ? 'валунів' : 'цілей'} ${a} → ${b}`);
  add('hold', (a, b) => `утримання ${signed(b - a, 1)}с`);
  add('slow', (a, b) => `невидимі мерзнуть ${b < a ? 'дужче' : 'слабше'}`);
  add('frail', (a, b) => `крихкість ${signed((b - a) * 100, 1)}%`);
  add('stunChance', (a, b) => `шанс оглушення ${signed((b - a) * 100, 0)}%`);
  add('splash', (a, b) => `${attack === 'cleave' ? 'удар по площі' : 'вибух'} ${signed(b - a)} кл.`);
  add('buff', (a, b) => `зілля ${signed((b - a) * 100, 0)}%`);
  add('souls', (a, b) => `душі ${a} → ${b}`);
  add('knock', (a, b) => `відкидання ${signed(b - a, 1)} кл.`);
  add('chainRange', (a, b) => `стрибок ${signed(b - a, 1)} кл.`);
  add('minRange', (a, b) => `мертва зона ${signed(b - a)} кл.`);
  add('poison', (a, b) => `отрута ${a ? pct(a, b) : '+' + Math.round(b)}`);
  return out.join(', ') || 'характеристики не змінюються';
}

function refreshUpgrade() {
  const t = ui.selected;
  $('upEmpty').classList.toggle('hidden', !!t);
  $('upBody').classList.toggle('hidden', !t);
  if (!t) { upKey = null; upTower = null; return; }

  const key = [t.type, t.level, t.boulders, t.deaths, t.buffs.map(b => b.kind + b.v).join()].join(':');
  if (t !== upTower || key !== upKey) {
    if (!upTower || upTower.type !== t.type) {
      $('upIcon').textContent = '';
      $('upIcon').appendChild(towerIcon(t.type, 48));
    }
    upTower = t;
    upKey = key;

    const def = t.def;
    const maxed = t.level >= MAX_LEVEL;
    $('upName').textContent = def.name;
    $('upLevel').textContent = '◆'.repeat(t.level) + '◇'.repeat(MAX_LEVEL - t.level) + ` рівень ${t.level}/${MAX_LEVEL}`;
    const now = towerStats(def, t.level);
    const next = maxed ? null : towerStats(def, t.level + 1);
    const attack = def.attack || 'projectile';
    $('upDesc').textContent = maxed ? `${def.desc}. Монстр досяг найвищого рівня.`
      : `${def.desc}. Посилення: ${levelGains(attack, now, next)}.`;

    const rows = [];
    // незмінні з рівнем — однакові в обох колонках
    const fixed = (label, v) => rows.push([label, v, v]);
    const stat = (label, f) => rows.push([label, f(now), next && f(next)]);
    const range = s => s.range.toFixed(2) + ' кл.';
    if (attack === 'web') {
      stat('Утримання', s => s.hold.toFixed(1) + 'с');
      stat('Дальність', range);
      stat('Перезарядка', s => s.rate.toFixed(2) + 'с');
      fixed('Конус', def.cone + '°');
    } else if (attack === 'drain') {
      stat('Урон/с', s => `${Math.round(s.damage)}…${Math.round(s.damageMax)}`);
      stat('Розгін', s => (def.ramp * s.rate).toFixed(1) + 'с');
      stat('Цілей', s => s.targets);
      stat('Дальність', range);
    } else if (attack === 'buff') {
      stat('Зілля', s => `+${Math.round(s.buff * 100)}%`);
      stat('Кому', s => `${s.targets} випадк. монстр${s.targets === 1 ? 'у' : 'ам'}`);
    } else if (attack === 'grave') {
      stat('Душі', s => `+${s.souls} 👻 за ${def.every} смертей`);
      fixed('Смертей', `${t.deaths} / ${def.every}`);
    } else if (attack === 'manual') {
      stat('Валуни', s => `${Math.min(t.boulders, s.targets)} / ${s.targets}`);
      stat('Відкидання', s => s.knock.toFixed(1) + ' кл.');
      fixed('Вибух', `${def.damage} урону`);
      fixed('Кидок', def.range + ' кл.');
    } else if (attack === 'haunt') {
      stat('Крихкість', s => `+${Math.round(s.frail * 100)}% урону`);
      stat('Туман', range);
      stat('Сповільнення невидимих', s => `${Math.round((1 - s.slow) * 100)}%`);
    } else {
      stat('Урон', s => Math.round(s.damage));
      stat('Дальність', range);
      stat('Атака', s => s.rate.toFixed(2) + 'с');
      if (def.splash) stat(attack === 'cleave' ? 'Удар по площі' : 'Вибух', s => +s.splash.toFixed(2) + ' кл.');
      if (def.splashBig !== undefined) fixed('Великим по площі', def.splashBig ? Math.round(def.splashBig * 100) + '% урону' : 'не зачіпає');
      if (def.minRange) stat('Мертва зона', s => `ближче ${+s.minRange.toFixed(2)} кл.`);
      if (def.slow) stat('Сповільнення', s => `${Math.round((1 - s.slow) * 100)}% · ${def.slowTime}с`);
      if (def.frail) stat('Крихкість', s => `+${Math.round(s.frail * 100)}% урону`);
      if (def.poison) stat('Отрута', s => `${Math.round(s.poison)}/с · ${def.poisonTime}с`);
      if (def.chainRange) stat('Цілей', s => s.chain + 1);
      if (def.chainRange) stat('Стрибок', s => s.chainRange.toFixed(1) + ' кл.');
      if (def.stun) stat('Оглушення', s => `${Math.round(s.stunChance * 100)}% · ${def.stun}с`);
      if (attack === 'beam') fixed('Промінь', def.fixedDir ? 'смуга' : 'крізь усіх');
    }
    if (def.magic) fixed('Магія', 'маг послаблює, лати не тримають');
    if (def.armorPierce) fixed('Броня', 'ігнорує');
    for (const b of t.buffs) fixed(b.kind === 'rate' ? 'Зілля швидкості' : 'Зілля сили', `+${Math.round(b.v * 100)}%`);
    if (def.detect) fixed('Підсвічує невидимих', 'так');

    $('upStats').innerHTML = rows.map(([label, a, b]) => {
      if (maxed) return `<tr><td>${label}</td><td class="max" colspan="3">${a}</td></tr>`;
      const cls = String(a) === String(b) ? 'same' : 'next';
      return `<tr><td>${label}</td><td>${a}</td><td class="arrow">→</td><td class="${cls}">${b}</td></tr>`;
    }).join('');
  }

  $('dirPad').classList.toggle('hidden', !t.def.fixedDir);
  if (t.def.fixedDir) {
    document.querySelectorAll('#dirPad button').forEach(b => b.classList.toggle('on', +b.dataset.dir === t.dir));
  }

  const up = $('upgradeBtn');
  if (t.upgradeCost === null) {
    up.textContent = 'Макс. рівень';
    up.disabled = true;
  } else {
    up.textContent = `⬆ Посилити (👻 ${t.upgradeCost})`;
    up.disabled = game.money < t.upgradeCost;
  }
  $('sellBtn').textContent = `Вигнати (+👻 ${t.sellValue})`;
}

// ---------- статистика урону за типами монстрів ----------
const shortNum = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? Math.round(n / 1e3) + 'k'
  : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : String(Math.round(n));

let statsKey = null;
let statsCells = {};  // тип → [клітинка набігу, усього, вбито]
function refreshStats() {
  const types = Object.keys(TOWERS).filter(t => game.stats[t]);
  const key = types.join(',');
  if (key !== statsKey) {
    // перебудовуємо DOM лише коли з'явився новий тип (або нова гра)
    statsKey = key;
    statsCells = {};
    const list = $('statsList');
    list.textContent = '';
    for (const type of types) {
      const row = document.createElement('div');
      row.className = 'st-row';
      row.title = TOWERS[type].name;
      row.appendChild(towerIcon(type, 26));
      const cells = [0, 1, 2].map(() => row.appendChild(document.createElement('span')));
      statsCells[type] = cells;
      list.appendChild(row);
    }
    $('statsEmpty').classList.toggle('hidden', types.length > 0);
  }
  for (const type of types) {
    const st = game.stats[type], [r, t, k] = statsCells[type];
    r.textContent = shortNum(st.round);
    t.textContent = shortNum(st.total);
    k.textContent = st.kills;
  }
}

// ---------- оновлення панелей (кожен кадр) ----------
function refreshUI() {
  const max = maxWaves();
  $('money').textContent = game.money;
  $('lives').textContent = game.lives;
  const full = game.towers.length >= MAX_TOWERS;
  $('towerCount').textContent = `${game.towers.length} / ${MAX_TOWERS}`;
  $('towersStat').classList.toggle('full', full);
  $('wave').textContent = `${game.wave} / ${max === Infinity ? '∞' : max}`;

  for (const [type, btn] of Object.entries(towerButtons)) {
    btn.classList.toggle('active', ui.placing === type);
    btn.classList.toggle('poor', !canAfford(type));
  }

  refreshRaid();
  refreshBestiary();

  $('tabMonsters').classList.toggle('active', ui.tab === 'monsters');
  $('tabUpgrade').classList.toggle('active', ui.tab === 'upgrade');
  $('paneMonsters').classList.toggle('hidden', ui.tab !== 'monsters');
  $('paneUpgrade').classList.toggle('hidden', ui.tab !== 'upgrade');
  refreshUpgrade();
  refreshStats();

  const waveBtn = $('waveBtn');
  waveBtn.disabled = game.waveActive || !!game.over;
  waveBtn.classList.toggle('hidden', game.wave >= max && !game.waveActive);
  waveBtn.textContent = game.waveActive ? '⚔️ Набіг триває…'
    : game.auto ? `⚔️ Набіг ${game.wave + 1} через ${Math.ceil(game.autoTimer)}с`
    : `⚔️ Впустити набіг ${game.wave + 1}`;
  $('speedBtn').textContent = `⏩ x${game.speed}`;
  $('autoBtn').textContent = game.auto ? '🔁 Авто: так' : '🔁 Авто: ні';
  $('autoBtn').classList.toggle('on', game.auto);
  $('pauseBtn').textContent = game.paused ? '▶ Далі' : '⏸ Пауза';
  $('musicBtn').textContent = musicOn ? '🔊' : '🔇';
  $('musicBtn').classList.toggle('on', musicOn);

  refreshOverlay();
}

// Вікно поверх поля: стартове меню, перемога, поразка. Кнопки лише ховаємо/показуємо.
function refreshOverlay() {
  const over = game.over;
  $('overlay').classList.toggle('hidden', !over);
  if (!over) return;
  const best = loadBest();
  const bestText = best ? `Рекорд безкінечного режиму: ${best} набігів.` : '';
  let title, text;
  if (over === 'menu') {
    title = '💜 Серце Підземелля';
    text = `Кампанія — ${CAMPAIGN_WAVES} набігів із босом кожні 10. У безкінечному режимі набіги не закінчуються. ${bestText}`;
  } else if (over === 'win') {
    title = '👑 Підземелля вистояло';
    text = `Усі ${CAMPAIGN_WAVES} набігів відбито. Міцність Серця: ${game.lives}. Можна тримати оборону й далі.`;
  } else {
    title = '💔 Серце зруйновано';
    text = `Авантюристи прорвались до Серця під час набігу ${game.wave}. ${game.mode === 'endless' ? bestText : ''}`;
  }
  $('overlayTitle').textContent = title;
  $('overlayText').textContent = text;
  $('campaignBtn').classList.toggle('hidden', over !== 'menu');
  $('endlessBtn').classList.toggle('hidden', over !== 'menu');
  $('continueBtn').classList.toggle('hidden', over !== 'win');
  $('restartBtn').classList.toggle('hidden', over === 'menu');
  $('menuBtn').classList.toggle('hidden', over === 'menu');
}

// ---------- старт ----------
newGame(DEBUG.has('wave') || DEBUG.has('money') ? 'campaign' : null); // з параметрами відладки — одразу в гру
requestAnimationFrame(frame);
