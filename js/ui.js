// Інтерфейс: кнопки, миша, клавіатура, панелі набігу, бестіарію і посилення.

const ui = {
  placing: null,   // тип вежі, яку зараз ставимо
  selected: null,  // вибрана поставлена вежа
  hover: null,     // {col, row} під курсором
  tab: 'monsters', // вкладка правого вікна: 'monsters' | 'upgrade'
};

const $ = id => document.getElementById(id);

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
// чіпи тегів монстра (роль, тип урону, ефекти) — monsterTags() з monster.js
function tagsHTML(def) {
  return monsterTags(def).map(t => `<span class="tag ${t.kind}">${t.text}</span>`).join('');
}

const towerTypes = LEVEL ? LEVEL.monsters : Object.keys(TOWERS);   // у рівні — лише його монстри
const towerButtons = {};
towerTypes.forEach(type => {
  const def = TOWERS[type];
  const btn = document.createElement('button');
  btn.className = 'tower-btn';
  btn.appendChild(towerIcon(type));
  btn.insertAdjacentHTML('beforeend',
    `<span class="t-name">${def.name}</span>` +
    `<span class="t-cost">👻 ${def.cost}</span>` +
    `<span class="t-tags tags">${tagsHTML(def)}</span>` +
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
// фільтр цілі: кнопки з TARGET_MODES, T — наступний режим
for (const [mode, m] of Object.entries(TARGET_MODES)) {
  const b = document.createElement('button');
  b.dataset.aim = mode;
  b.textContent = m.label;
  b.title = m.title;
  b.addEventListener('click', () => { if (ui.selected && ui.selected.aims) ui.selected.aim = mode; });
  $('aimBtns').appendChild(b);
}
function nextAim(t) {
  const modes = Object.keys(TARGET_MODES);
  t.aim = modes[(modes.indexOf(t.aim) + 1) % modes.length];
}
$('sellBtn').addEventListener('click', () => { if (ui.selected) askSell(ui.selected); });

// Питання перед вигнанням: гра на паузі, поки гравець не відповість (Enter — так, Esc — ні).
let confirmState = null;  // { tower, wasPaused }
function askSell(tower) {
  confirmState = { tower, wasPaused: game.paused };
  game.paused = true;
  $('confirmText').textContent = L(`${tower.def.name} (рівень ${tower.level}) піде з підземелля, а ти повернеш 👻 ${tower.sellValue}.`,
    `${tower.def.name} (уровень ${tower.level}) уйдёт из подземелья, а ты вернёшь 👻 ${tower.sellValue}.`);
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
$('restartBtn').addEventListener('click', () => { deleteSave(saveSlot()); newGame(game.mode); cancelSelection(); });
$('continueBtn').addEventListener('click', continueEndless);
const goHome = () => { location.href = 'index.html'; };
$('menuBtn').addEventListener('click', goHome);
$('homeBtn').addEventListener('click', () => {
  // між набігами гра вже збережена; посеред набігу сейв — з його початку
  if (!game.waveActive || confirm(L('Покинути підземелля посеред набігу? Він почнеться заново.', 'Покинуть подземелье посреди набега? Он начнётся заново.'))) goHome();
});

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
document.addEventListener('keydown', e => {
  if (confirmState) {   // поки висить питання, інші гарячі клавіші не працюють
    if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); closeConfirm(e.key === 'Enter'); }
    else if (e.key === ' ') e.preventDefault();
    return;
  }
  if (e.key === 'Escape') cancelSelection();
  else if (e.key === ' ') { e.preventDefault(); if (!game.over) game.paused = !game.paused; }
  else if (e.key === 'Enter') { e.preventDefault(); startWave(); }
  else if (e.code === 'KeyA') toggleAuto(); // за кодом клавіші — працює і в українській розкладці
  else if (e.code === 'KeyM') toggleMusic();
  else if (e.code === 'KeyR' && ui.selected && ui.selected.def.fixedDir) ui.selected.setDir(ui.selected.dir + 1);
  else if (e.code === 'KeyT' && ui.selected && ui.selected.aims) nextAim(ui.selected);
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
      $('raidTitle').textContent = L('Набігів більше немає', 'Набегов больше нет');
      list.innerHTML = `<p class="empty">${L('Підземелля чекає в тиші.', 'Подземелье ждёт в тишине.')}</p>`;
    } else {
      $('raidTitle').textContent = game.waveActive ? L(`Набіг ${waveNo(index + 1)} триває`, `Набег ${waveNo(index + 1)} идёт`)
        : L(`Наступний набіг: ${waveNo(index + 1)}`, `Следующий набег: ${waveNo(index + 1)}`);
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
    r.name.textContent = known ? ENEMIES[type].name : L('Невідомий', 'Неизвестный');
    r.row.classList.toggle('locked', !known);
    if (game.waveActive) {
      const left = game.spawnQueue.filter(s => s.type === type).length +
        game.enemies.filter(e => e.origin === type).length;   // разом із тими, хто з них з'явився
      r.count.textContent = `${left} / ${r.total}`;
      r.sub.textContent = left ? L('ще в підземеллі', 'ещё в подземелье') : L('усіх переможено', 'все повержены');
      r.row.classList.toggle('done', left === 0);
    } else {
      r.count.textContent = `×${r.total}`;
      r.sub.textContent = known ? ENEMIES[type].desc : L('ще не зустрічався', 'ещё не встречался');
    }
  }
}

// ---------- бестіарій ----------
// Особливості авантюриста одним рядком: «броня 6 · щит 50% · …».
function enemyTraits(def) {
  const t = [];
  if (def.armor) t.push(L(`броня ${def.armor}`, `броня ${def.armor}`));
  if (def.shield) t.push(`щит ${Math.round(def.shield * 100)}%${def.shieldRegen ? L(' (відновлюється)', ' (восстанавливается)') : ''}${def.shieldWave ? L(` з ${def.shieldWave}-го набігу`, ` с ${def.shieldWave}-го набега`) : ''}`);
  if (def.slowImmune) t.push(L('не мерзне', 'не мёрзнет'));
  if (def.physArmor) t.push(L('броня лише від фізичних ударів', 'броня только от физических ударов'));
  if (def.shieldAura) t.push(L('щит накриває сусідів', 'щит накрывает соседей'));
  if (def.haste) t.push(L('пришвидшує сусідів на ', 'ускоряет соседей на ') + Math.round((def.haste.mul - 1) * 100) + '%');
  if (def.undying) t.push(L('не гине, поки є союзники; монстри б’ють його останнім', 'не гибнет, пока есть союзники; монстры бьют его последним'));
  if (def.magicWard) t.push(L(`магічний щит −${Math.round(def.magicWard.cut * 100)}% магії поруч`, `магический щит −${Math.round(def.magicWard.cut * 100)}% магии рядом`));
  if (def.escort) t.push(L('ходить лише з: ', 'ходит только с: ') + ENEMIES[def.escort].name.toLowerCase());
  if (def.spawn) t.push(L('гинучи, лишає: ', 'погибая, оставляет: ') + ENEMIES[def.spawn].name.toLowerCase());
  if (def.split) t.push(L(`ділиться ${def.split} рази`, `делится ${def.split} раза`));
  if (def.deflect) t.push(L(`відбиває ${Math.round(def.deflect * 100)}% снарядів`, `отражает ${Math.round(def.deflect * 100)}% снарядов`));
  if (def.big) t.push(L('великий', 'большой'));
  if (def.heal) t.push(L('лікує', 'лечит'));
  if (def.stealth) t.push(L('невидимий', 'невидимый'));
  if (def.lifeDmg) t.push(L('Серцю −', 'Сердцу −') + def.lifeDmg);
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
      ? `${def.desc}. ${L("Здоров'я", 'Здоровье')} ${def.hp}, ${L('швидкість', 'скорость')} ${def.speed}${enemyTraits(def)}`
      : L('Ще не зустрічався в підземеллі', 'Ещё не встречался в подземелье');
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
  add('damage', (a, b) => (attack === 'drain' ? L('висмоктування ', 'высасывание ') : 'урон ') + (a ? pct(a, b) : `${Math.round(a)} → ${Math.round(b)}`));
  add('range', (a, b) => `${attack === 'haunt' ? L('туман', 'туман') : attack === 'grave' ? L('територія', 'территория') : L('дальність', 'дальность')} ${signed(b - a)} ${L('кл.', 'кл.')}`);
  add('rate', (a, b) => attack === 'drain' ? L(`розгін ${b < a ? 'швидший' : 'повільніший'}`, `разгон ${b < a ? 'быстрее' : 'медленнее'}`)
    : `${attack === 'web' ? L('постріли', 'выстрелы') : 'атака'} на ${Math.round(Math.abs(1 - b / a) * 100)}% ${b < a ? L('частіше', 'чаще') : L('рідше', 'реже')}`);
  add('targets', (a, b) => `${attack === 'manual' ? L('валунів', 'валунов') : L('цілей', 'целей')} ${a} → ${b}`);
  add('hold', (a, b) => `${L('утримання', 'удержание')} ${signed(b - a, 1)}${L('с', 'с')}`);
  add('slow', (a, b) => L(`невидимі мерзнуть ${b < a ? 'дужче' : 'слабше'}`, `невидимые мёрзнут ${b < a ? 'сильнее' : 'слабее'}`));
  add('frail', (a, b) => `${L('крихкість', 'хрупкость')} ${signed((b - a) * 100, 1)}%`);
  add('stunChance', (a, b) => `${L('шанс оглушення', 'шанс оглушения')} ${signed((b - a) * 100, 0)}%`);
  add('splash', (a, b) => `${attack === 'cleave' ? L('удар по площі', 'удар по площади') : L('вибух', 'взрыв')} ${signed(b - a)} кл.`);
  add('buff', (a, b) => `${L('зілля', 'зелье')} ${signed((b - a) * 100, 0)}%`);
  add('souls', (a, b) => `${L('душі', 'души')} ${a} → ${b}`);
  add('knock', (a, b) => `${L('відкидання', 'отбрасывание')} ${signed(b - a, 1)} кл.`);
  add('chainRange', (a, b) => `${L('стрибок', 'прыжок')} ${signed(b - a, 1)} кл.`);
  add('minRange', (a, b) => `${L('мертва зона', 'мёртвая зона')} ${signed(b - a)} кл.`);
  add('poison', (a, b) => `${L('отрута', 'яд')} ${a ? pct(a, b) : '+' + Math.round(b)}`);
  return out.join(', ') || L('характеристики не змінюються', 'характеристики не меняются');
}

function refreshUpgrade() {
  const t = ui.selected;
  $('upEmpty').classList.toggle('hidden', !!t);
  $('upBody').classList.toggle('hidden', !t);
  if (!t) { upKey = null; upTower = null; return; }

  const key = [t.type, t.level, t.boulders, t.deaths, game.wave, t.buffs.map(b => b.kind + b.v).join()].join(':');
  if (t !== upTower || key !== upKey) {
    if (!upTower || upTower.type !== t.type) {
      $('upIcon').textContent = '';
      $('upIcon').appendChild(towerIcon(t.type, 48));
      $('upTags').innerHTML = tagsHTML(TOWERS[t.type]);
    }
    upTower = t;
    upKey = key;

    const def = t.def;
    const maxed = t.level >= MAX_LEVEL;
    $('upName').textContent = def.name;
    $('upLevel').textContent = '◆'.repeat(t.level) + '◇'.repeat(MAX_LEVEL - t.level) + ` ${L('рівень', 'уровень')} ${t.level}/${MAX_LEVEL}`;
    const now = towerStats(def, t.level);
    const next = maxed ? null : towerStats(def, t.level + 1);
    const attack = def.attack || 'projectile';
    $('upDesc').textContent = maxed ? `${def.desc}. ${L('Монстр досяг найвищого рівня.', 'Монстр достиг высшего уровня.')}`
      : `${def.desc}. ${L('Посилення', 'Усиление')}: ${levelGains(attack, now, next)}.`;

    const rows = [];
    // незмінні з рівнем — однакові в обох колонках
    const fixed = (label, v) => rows.push([label, v, v]);
    const stat = (label, f) => rows.push([label, f(now), next && f(next)]);
    const range = s => s.range.toFixed(2) + ' кл.';
    if (attack === 'web') {
      stat(L('Утримання', 'Удержание'), s => s.hold.toFixed(1) + 'с');
      stat(L('Дальність', 'Дальность'), range);
      stat('Перезарядка', s => s.rate.toFixed(2) + 'с');
      fixed('Конус', def.cone + '°');
    } else if (attack === 'drain') {
      stat('Урон/с', s => `${Math.round(s.damage)}…${Math.round(s.damageMax)}`);
      stat(L('Розгін', 'Разгон'), s => (def.ramp * s.rate).toFixed(1) + 'с');
      stat(L('Цілей', 'Целей'), s => s.targets);
      stat(L('Дальність', 'Дальность'), range);
    } else if (attack === 'buff') {
      stat(L('Зілля', 'Зелье'), s => `+${Math.round(s.buff * 100)}%`);
      stat('Кому', s => `${s.targets} ${L('випадк.', 'случайн.')} монстр${s.targets === 1 ? 'у' : 'ам'}`);
    } else if (attack === 'grave') {
      const need = def.graveEvery(Math.max(1, game.wave));
      stat(L('Душі', 'Души'), s => `+${s.souls} 👻 за ${need} смертей`);
      fixed('Смертей', `${t.deaths} / ${need}`);
      stat(L('Територія', 'Территория'), range);
    } else if (attack === 'manual') {
      stat(L('Валуни', 'Валуны'), s => `${Math.min(t.boulders, s.targets)} / ${s.targets}`);
      stat(L('Відкидання', 'Отбрасывание'), s => s.knock.toFixed(1) + ' кл.');
      fixed(L('Вибух', 'Взрыв'), `${def.damage} ${L('урону', 'урона')}`);
      fixed(L('Кидок', 'Бросок'), def.range + ' кл.');
    } else if (attack === 'haunt') {
      stat(L('Крихкість', 'Хрупкость'), s => `+${Math.round(s.frail * 100)}% ${L('урону', 'урона')}`);
      stat(L('Туман', 'Туман'), range);
      stat(L('Сповільнення невидимих', 'Замедление невидимых'), s => `${Math.round((1 - s.slow) * 100)}%`);
    } else {
      stat('Урон', s => Math.round(s.damage));
      stat(L('Дальність', 'Дальность'), range);
      stat('Атака', s => s.rate.toFixed(2) + 'с');
      if (def.splash) stat(attack === 'cleave' ? L('Удар по площі', 'Удар по площади') : L('Вибух', 'Взрыв'), s => +s.splash.toFixed(2) + ' кл.');
      if (def.splashBig !== undefined) fixed(L('Великим по площі', 'Большим по площади'), def.splashBig ? Math.round(def.splashBig * 100) + L('% урону', '% урона') : L('не зачіпає', 'не задевает'));
      if (def.minRange) stat(L('Мертва зона', 'Мёртвая зона'), s => `${L('ближче', 'ближе')} ${+s.minRange.toFixed(2)} кл.`);
      if (def.slow) stat(L('Сповільнення', 'Замедление'), s => `${Math.round((1 - s.slow) * 100)}% · ${def.slowTime}с`);
      if (def.frail) stat(L('Крихкість', 'Хрупкость'), s => `+${Math.round(s.frail * 100)}% ${L('урону', 'урона')}`);
      if (def.poison) stat(L('Отрута', 'Яд'), s => `${Math.round(s.poison)}/с · ${def.poisonTime}с`);
      if (def.chainRange) stat(L('Цілей', 'Целей'), s => s.chain + 1);
      if (def.chainRange) stat(L('Стрибок', 'Прыжок'), s => s.chainRange.toFixed(1) + ' кл.');
      if (def.stun) stat(L('Оглушення', 'Оглушение'), s => `${Math.round(s.stunChance * 100)}% · ${def.stun}с`);
      if (attack === 'beam') fixed(L('Промінь', 'Луч'), def.fixedDir ? L('смуга', 'полоса') : L('крізь усіх', 'сквозь всех'));
    }
    if (def.armorPierce) fixed('Броня', L('ігнорує', 'игнорирует'));
    for (const b of t.buffs) fixed(b.kind === 'rate' ? L('Зілля швидкості', 'Зелье скорости') : L('Зілля сили', 'Зелье силы'), `+${Math.round(b.v * 100)}%`);
    if (def.detect) fixed(L('Підсвічує невидимих', 'Подсвечивает невидимых'), L('так', 'да'));

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

  $('aimPad').classList.toggle('hidden', !t.aims);
  if (t.aims) {
    document.querySelectorAll('#aimBtns button').forEach(b => b.classList.toggle('on', b.dataset.aim === t.aim));
  }

  const up = $('upgradeBtn');
  if (t.upgradeCost === null) {
    up.textContent = L('Макс. рівень', 'Макс. уровень');
    up.disabled = true;
  } else {
    up.textContent = `⬆ ${L('Посилити', 'Усилить')} (👻 ${t.upgradeCost})`;
    up.disabled = game.money < t.upgradeCost;
  }
  $('sellBtn').textContent = `${L('Вигнати', 'Изгнать')} (+👻 ${t.sellValue})`;
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
  $('wave').textContent = `${waveNo(game.wave)} / ${max === Infinity ? '∞' : waveNo(max)}`;

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
  waveBtn.textContent = game.waveActive ? L('⚔️ Набіг триває…', '⚔️ Набег идёт…')
    : game.auto ? `⚔️ ${L('Набіг', 'Набег')} ${waveNo(game.wave + 1)} через ${Math.ceil(game.autoTimer)}с`
    : `⚔️ ${L('Впустити набіг', 'Впустить набег')} ${waveNo(game.wave + 1)}`;
  $('speedBtn').textContent = `⏩ x${game.speed}`;
  $('autoBtn').textContent = game.auto ? L('🔁 Авто: так', '🔁 Авто: да') : L('🔁 Авто: ні', '🔁 Авто: нет');
  $('autoBtn').classList.toggle('on', game.auto);
  $('pauseBtn').textContent = game.paused ? L('▶ Далі', '▶ Дальше') : '⏸ Пауза';
  $('musicBtn').textContent = musicOn ? '🔊' : '🔇';
  $('musicBtn').classList.toggle('on', musicOn);

  refreshOverlay();
}

// Вікно поверх поля: перемога чи поразка. Кнопки лише ховаємо/показуємо.
function refreshOverlay() {
  const over = game.over;
  $('overlay').classList.toggle('hidden', !over);
  if (!over) return;
  const best = loadBest();
  const bestText = best ? L(`Рекорд безкінечного режиму: ${best} набігів.`, `Рекорд бесконечного режима: ${best} набегов.`) : '';
  let title, text;
  if (over === 'win' && game.mode === 'level') {
    title = L('👑 Рівень пройдено', '👑 Уровень пройден');
    text = L(`«${LEVEL.name}» вистояло всі ${waveNo(LEVEL.to)} набігів. Міцність Серця: ${game.lives}.`,
      `«${LEVEL.name}» выстояло все ${waveNo(LEVEL.to)} набегов. Прочность Сердца: ${game.lives}.`);
  } else if (over === 'win') {
    title = L('👑 Підземелля вистояло', '👑 Подземелье выстояло');
    text = L(`Усі ${CAMPAIGN_WAVES} набігів відбито. Міцність Серця: ${game.lives}. Можна тримати оборону й далі.`,
      `Все ${CAMPAIGN_WAVES} набегов отбиты. Прочность Сердца: ${game.lives}. Можно держать оборону и дальше.`);
  } else {
    title = L('💔 Серце зруйновано', '💔 Сердце разрушено');
    text = L(`Авантюристи прорвались до Серця під час набігу ${waveNo(game.wave)}.`, `Авантюристы прорвались к Сердцу во время набега ${waveNo(game.wave)}.`)
      + (game.mode === 'endless' ? ' ' + bestText : '');
  }
  $('overlayTitle').textContent = title;
  $('overlayText').textContent = text;
  $('continueBtn').classList.toggle('hidden', !(over === 'win' && game.mode === 'campaign'));
}

// ---------- старт ----------
// game.html?level=crypt — рівень; ?mode=endless — безкінечний; інакше кампанія (головна сторінка — index.html).
newGame(LEVEL ? 'level' : DEBUG.get('mode') === 'endless' ? 'endless' : 'campaign');
restoreSave();
addEventListener('pagehide', autosave);   // напрям біхолдера, ціль, авто-набіг — зміни без окремого автосейву
if (LEVEL) { $('title').textContent = LEVEL.name; document.title = `${LEVEL.name} — ${L('Серце Підземелля', 'Сердце Подземелья')}`; }
requestAnimationFrame(frame);
