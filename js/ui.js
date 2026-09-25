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
const towerButtons = {};
Object.entries(TOWERS).forEach(([type, def], i) => {
  const btn = document.createElement('button');
  btn.className = 'tower-btn';
  btn.appendChild(towerIcon(type));
  btn.insertAdjacentHTML('beforeend',
    `<span class="t-name">${def.name} <kbd>${i + 1}</kbd></span>` +
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
    if (placeTower(ui.placing, col, row) && game.money < TOWERS[ui.placing].cost) ui.placing = null;
  } else {
    ui.selected = null;
  }
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
$('sellBtn').addEventListener('click', () => {
  if (ui.selected) { sellTower(ui.selected); ui.selected = null; }
});
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
  if (e.key >= '1' && e.key <= String(towerTypes.length)) selectTowerType(towerTypes[+e.key - 1]);
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
        game.enemies.filter(e => e.type === type).length;
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
  if (def.shield) t.push(`щит ${Math.round(def.shield * 100)}%${def.shieldRegen ? ' (відновлюється)' : ''}`);
  if (def.slowImmune) t.push('не мерзне');
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
    r.count.textContent = known ? `👻 ${def.reward}` : '';
    r.sub.textContent = known
      ? `${def.desc}. Здоров'я ${def.hp}, швидкість ${def.speed}${enemyTraits(def)}`
      : 'Ще не зустрічався в підземеллі';
  }
}

// ---------- вкладка «Посилення» ----------
let upKey = null; // таблиця й іконка перебудовуються лише коли змінився монстр чи його рівень
let upTower = null;

function refreshUpgrade() {
  const t = ui.selected;
  $('upEmpty').classList.toggle('hidden', !!t);
  $('upBody').classList.toggle('hidden', !t);
  if (!t) { upKey = null; upTower = null; return; }

  const key = t.type + ':' + t.level;
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
    const web = def.attack === 'web';
    $('upDesc').textContent = maxed
      ? `${def.desc}. Монстр досяг найвищого рівня.`
      : web ? `${def.desc}. Посилення: павутина тримає довше, летить далі, постріли частіші.`
      : `${def.desc}. Посилення: урон +${Math.round(((def.dmgLvl || LVL_DMG) - 1) * 100)}%, ` +
        `дальність +${LVL_RANGE} кл., атака на ${Math.round((1 - LVL_RATE) * 100)}% частіше.`;

    const now = towerStats(def, t.level);
    const next = maxed ? null : towerStats(def, t.level + 1);
    const rows = web ? [
      ['Утримання', now.hold.toFixed(1) + 'с', next && next.hold.toFixed(1) + 'с'],
      ['Дальність', now.range.toFixed(2) + ' кл.', next && next.range.toFixed(2) + ' кл.'],
      ['Перезарядка', now.rate.toFixed(2) + 'с', next && next.rate.toFixed(2) + 'с'],
      ['Конус', def.cone + '°', def.cone + '°'],
    ] : [
      ['Урон', Math.round(now.damage), next && Math.round(next.damage)],
      ['Дальність', now.range.toFixed(2), next && next.range.toFixed(2)],
      ['Атака', now.rate.toFixed(2) + 'с', next && next.rate.toFixed(2) + 'с'],
    ];
    // незмінні з рівнем — однакові в обох колонках
    const fixed = (label, v) => rows.push([label, v, v]);
    const stat = (label, f) => rows.push([label, f(now), next && f(next)]);
    if (def.splash) fixed('Вибух', def.splash + ' кл.');
    if (def.slow && !web) stat('Сповільнення', s => `${Math.round((1 - s.slow) * 100)}% · ${def.slowTime}с`);
    if (def.frail) stat('Крихкість', s => `+${Math.round(s.frail * 100)}% урону`);
    if (def.poison && !web) stat('Отрута', s => `${Math.round(s.poison)}/с · ${def.poisonTime}с`);
    if (def.chain) stat('Стрибків', s => s.chain);
    if (def.stun) stat('Оглушення', s => `${Math.round(s.stunChance * 100)}% · ${def.stun}с`);
    if (def.attack === 'beam') fixed('Промінь', def.fixedDir ? 'смуга' : 'крізь усіх');
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
    btn.classList.toggle('poor', full || game.money < TOWERS[type].cost);
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
