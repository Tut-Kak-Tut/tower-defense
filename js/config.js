// Усі налаштування балансу гри в одному місці.

const CELL = 40;   // розмір клітинки в пікселях
const COLS = 20;
const ROWS = 12;

// Коридор авантюристів: точки повороту в клітинках [col, row].
// Перша і остання точки — за межами мапи (вхід у підземелля і Серце).
// Сегменти мають бути лише горизонтальними або вертикальними.
const PATH_POINTS = [
  [-1, 2], [4, 2], [4, 8], [9, 8], [9, 3], [14, 3], [14, 9], [20, 9],
];

// Факели на стінах — лише декор [col, row]; клітинки лишаються доступними для монстрів.
const TORCHES = [[2, 1], [5, 5], [7, 9], [11, 2], [15, 6], [17, 10]];

const START_MONEY = 150;      // душі
const START_LIVES = 20;       // міцність Серця
const WAVE_BONUS = 20;        // бонус за пройдену хвилю (+5 за кожен номер хвилі)
// ріст HP і нагороди за набігами — hpMul() / rewardMul() унизу, біля генератора набігів

const MAX_LEVEL = 10;
const LVL_DMG = 1.25;         // урон ×1.25 за кожен рівень
const LVL_RANGE = 0.15;       // +0.15 клітинки дальності за рівень
const LVL_RATE = 0.96;        // пауза між атаками ×0.96 за рівень (на 4% частіше)
const UPGRADE_COST_MUL = 0.8; // ціна апгрейду = cost * 0.8 * поточний рівень
const SELL_REFUND = 0.6;      // при продажу повертається 60% витраченого

// range і splash — у клітинках, rate — секунд між атаками.
// attack: 'projectile' (за замовчуванням) | 'aura' (б'є всіх у радіусі) | 'beam' (промінь крізь усіх на лінії).
// Необов'язкові механіки: splash, slow/slowTime, poison (урон/с крізь броню)/poisonTime,
// chain (скільки разів перестрибує)/chainRange, stun (с)/stunChance, detect (бачить невидимих),
// fixedDir (промінь б'є лише в обраний гравцем бік світу, а не в ціль), beamWidth (півширина променя, кл.).
const TOWERS = {
  archer: {
    name: 'Скелет-лучник', color: '#e8dcc0', cost: 50,
    damage: 12, range: 3, rate: 0.5, projSpeed: 450,
    desc: 'Часто стріляє в одного авантюриста',
  },
  cannon: {
    name: 'Вогняний імп', color: '#ff7a2f', cost: 100,
    damage: 22, range: 2.5, rate: 1.6, projSpeed: 300, splash: 1,
    desc: 'Повільний фаєрбол, вибух по площі',
  },
  frost: {
    name: 'Привид', color: '#8fe3ff', cost: 75,
    damage: 4, range: 2.5, rate: 0.9, projSpeed: 400, slow: 0.5, slowTime: 2, detect: true,
    desc: 'Крижаний дотик: сповільнює на 50%, підсвічує невидимих для всіх',
  },
  spider: {
    name: 'Печерний павук', color: '#8fd14f', cost: 80,
    damage: 3, range: 2.5, rate: 1.0, projSpeed: 350, poison: 9, poisonTime: 3, slow: 0.8, slowTime: 1,
    desc: 'Отрутна павутина: шкода з часом крізь броню, трохи сповільнює',
  },
  golem: {
    name: 'Кам’яний голем', color: '#a89a86', cost: 120, attack: 'aura',
    damage: 18, range: 1.4, rate: 1.4, stun: 0.6, stunChance: 0.3,
    desc: 'Б’є по землі: урон усім поруч і шанс оглушити',
  },
  lich: {
    name: 'Лич', color: '#b98cff', cost: 150,
    damage: 22, range: 3, rate: 1.3, projSpeed: 700, chain: 3, chainRange: 1.8,
    desc: 'Блискавка перестрибує між авантюристами (−25% за стрибок)',
  },
  eye: {
    name: 'Біхолдер', color: '#ff4d6d', cost: 175, attack: 'beam', fixedDir: true, beamWidth: 1,
    damage: 30, range: 5, rate: 1.5, detect: true,
    desc: 'Промінь у вибраний бік (↑↓←→) пробиває всіх на лінії, підсвічує невидимих',
  },
};

// Авантюристи. speed — пікселів за секунду.
// Необов'язкові механіки:
//   armor      — віднімається від кожного удару (але лишається щонайменше 20% урону); отрута ігнорує броню
//   shield     — частка maxHp, яку спершу поглинає магічний щит
//   shieldRegen — частка щита за секунду, що відновлюється, поки авантюриста SHIELD_REGEN_DELAY с не били
//                 (отрута теж «б'є» — тому павук добре знімає магів)
//   slowImmune — холод привида не діє
//   heal       — лікує себе й сусідів: radius (кл.), amount (частка maxHp), every (с)
//   stealth    — невидимий: б'ють лише монстри з detect, або всі, поки він у радіусі такого монстра
//   lifeDmg    — скільки міцності Серця знімає при прориві (за замовчуванням 1)
//   boss       — велика смужка HP
const SHIELD_REGEN_DELAY = 2;
const FORMATION_GAP = 26;     // px: наздогнавши попереднього в загоні, авантюрист іде його кроком
const ENEMIES = {
  normal: { name: 'Воїн',    color: '#b0b8c4', hp: 40,  speed: 60,  reward: 5,  radius: 10,
            desc: 'Надійний шукач пригод, середній у всьому' },
  fast:   { name: 'Злодій',  color: '#4f7a4a', hp: 22,  speed: 110, reward: 5,  radius: 8,
            desc: 'Швидкий, але крихкий' },
  tank:   { name: 'Паладин', color: '#e6c35c', hp: 160, speed: 35,  reward: 15, radius: 14,
            desc: 'Повільний і дуже міцний' },
  gnome:  { name: 'Гном-латник', color: '#7a6a5a', hp: 90, speed: 45, reward: 8, radius: 11, armor: 6,
            desc: 'Важкі лати зрізають урон кожного удару — бий сильно або отрутою' },
  priest: { name: 'Жрець',   color: '#e8e0d0', hp: 60,  speed: 50,  reward: 10, radius: 10,
            heal: { radius: 1.5, amount: 0.06, every: 2 },
            desc: 'Молитвою лікує себе й усіх поруч — убивай першим' },
  mage:   { name: 'Бойовий маг', color: '#5a3fa0', hp: 80, speed: 55, reward: 12, radius: 10,
            shield: 0.6, shieldRegen: 0.12, slowImmune: true,
            desc: 'Магічний щит поглинає урон і відновлюється, якщо мага 2 с не били; холод на нього не діє' },
  scout:  { name: 'Ельф-розвідник', color: '#3f6f5a', hp: 35, speed: 120, reward: 8, radius: 8, stealth: true,
            desc: 'Невидимий: його видно лише поруч із привидом чи оком' },
  knight: { name: 'Вершник', color: '#9aa4b0', hp: 180, speed: 75,  reward: 18, radius: 14, armor: 2, lifeDmg: 2,
            desc: 'Швидкий і міцний, прорвавшись, б’є Серце вдвічі сильніше' },
  hero:   { name: 'Герой',   color: '#d4a82a', hp: 500, speed: 30, reward: 100, radius: 17,
            armor: 4, shield: 0.25, lifeDmg: 5, boss: true,
            desc: 'Легендарний бос: броня, щит, величезне здоров’я' },
};

// ---------- набіги ----------
// Набіг — список груп [тип, кількість, інтервал між ворогами в секундах, пауза?]. Групи йдуть одна за одною.
// Група з паузою (4-й елемент) починає новий загін; група без паузи — продовження загону одразу за попередньою.
// У загоні ніхто не обганяє того, хто йде попереду (Enemy.leader), тож стрій тримається: авангард веде решту.

const CAMPAIGN_WAVES = 100;   // у безкінечному режимі генератор просто продовжує далі

// Перші набіги — ручні, щоб навчити гравця; 10-й — перший бос зі свитою.
const FIRST_WAVES = [
  [['normal', 4, 0.9], ['normal', 4, 0.9, 3]],
  [['normal', 4, 0.8], ['normal', 4, 0.8, 2.5], ['normal', 4, 0.8, 2.5]],
  [['normal', 4, 0.8], ['fast', 3, 0.5, 2.5], ['normal', 4, 0.8, 2.5], ['fast', 3, 0.5, 2.5]],
  [['fast', 4, 0.45], ['fast', 4, 0.45, 2.5], ['fast', 4, 0.45, 2.5]],
  [['normal', 4, 0.7], ['tank', 1, 1, 3], ['normal', 3, 0.7], ['tank', 1, 1, 3], ['normal', 3, 0.7]],
  [['fast', 5, 0.4], ['tank', 2, 1.5, 2.5], ['normal', 3, 0.7], ['fast', 5, 0.4, 2.5]],
  [['tank', 1, 1], ['normal', 4, 0.5], ['tank', 1, 1, 2.5], ['normal', 4, 0.5], ['tank', 1, 1, 2.5], ['normal', 4, 0.5]],
  [['fast', 8, 0.3], ['tank', 2, 1.2, 2.5], ['normal', 3, 0.5], ['fast', 8, 0.3, 2.5], ['tank', 1, 1, 2.5]],
  [['tank', 2, 1], ['normal', 7, 0.4], ['tank', 2, 1, 2.5], ['normal', 7, 0.4], ['tank', 2, 1, 2.5]],
  [['normal', 5, 0.5], ['normal', 5, 0.5, 2.5], ['tank', 1, 1, 3], ['hero', 1, 1], ['normal', 3, 0.5]],
];

// З якого набігу тип з'являється в генерованих набігах.
// Не на кратних 5 — там тематичні й бос-набіги, а новачок має з'явитися у звичайному набігу першим.
const ENEMY_UNLOCK = { normal: 1, fast: 3, tank: 5, gnome: 11, priest: 14, mage: 18, scout: 23, knight: 27 };
// Інтервал появи всередині групи (с) до скорочення з набігами.
const SPAWN_GAP = {
  normal: 0.7, fast: 0.45, tank: 1.3, gnome: 1.0, priest: 1.0, mage: 1.0, scout: 0.6, knight: 1.2, hero: 2,
};

// Шаблони загонів у порядку строю: авангард (паладин/гном/вершник) → основа (воїни) → тил (жрець/маг).
// Злодії й розвідники — окремі швидкі зграйки. Кількості — на «розмірі набігу» 1.
// Загін доступний, коли відкриті всі його типи.
const SQUADS = [
  { name: 'Патруль',           units: [['normal', 4]] },
  { name: 'Злодійська зграя',  units: [['fast', 4]] },
  { name: 'Паладин із загоном', units: [['tank', 1], ['normal', 3]] },
  { name: 'Гномий клин',       units: [['gnome', 2], ['normal', 2]] },
  { name: 'Хрестовий похід',   units: [['tank', 1], ['normal', 2], ['priest', 1]] },
  { name: 'Бойова партія',     units: [['gnome', 1], ['normal', 2], ['mage', 1]] },
  { name: 'Класична партія',   units: [['tank', 1], ['fast', 1], ['mage', 1], ['priest', 1]] },
  { name: 'Тіньова група',     units: [['scout', 2], ['fast', 2]] },
  { name: 'Кавалерійський наскок', units: [['knight', 1], ['scout', 1]] },
  { name: 'Велика експедиція', units: [['knight', 1], ['gnome', 1], ['normal', 2], ['mage', 1], ['priest', 1]] },
];

// Детермінований «рандом» 0..1 від чисел — і для візерунку мапи, і для складу набігів
// (склад має бути однаковим щоразу, бо панель показує його наперед).
function hash(a, b, seed = 0) {
  let h = (a * 374761393 + b * 668265263 + seed * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// «Розмір набігу»: швидко росте до 38-го, далі повільніше, але без стелі — інакше пізні набіги стають легкими.
const waveSize = n => n <= 38 ? 1 + n * 0.08 : 4.04 + (n - 38) * 0.03;
// «Загроза» загону: HP × швидкість (відносно воїна) × удар по Серцю — швидких і вершників у набігу менше.
const threat = t => ENEMIES[t].hp * ENEMIES[t].speed / 60 * (ENEMIES[t].lifeDmg || 1);
const squadMass = s => s.units.reduce((m, [t, c]) => m + threat(t) * c, 0);

// Склад набігу n (з 1).
function waveGroups(n) {
  if (n <= FIRST_WAVES.length) return FIRST_WAVES[n - 1];
  const rnd = i => hash(n, i, 7);
  const open = t => ENEMY_UNLOCK[t] <= n;
  const pool = SQUADS.filter(s => s.units.every(([t]) => open(t)));
  const pick = i => pool[Math.floor(rnd(i) * pool.length)];
  const size = waveSize(n);
  const sq = 1 + (size - 1) * 0.4;                        // загони більшають повільніше, ніж їх кількість
  const fast = 1 - Math.min(0.6, n * 0.005);              // інтервали скорочуються до 0.4
  const gap = +(2.5 * fast).toFixed(2);                   // пауза між загонами
  const groups = [];
  const add = (units, mul = 1) => units.forEach(([t, c], i) => {
    const count = t === 'hero' ? c : Math.max(1, Math.round(c * sq * mul));  // героїв не множимо
    const g = [t, count, +(SPAWN_GAP[t] * fast).toFixed(2)];
    if (i === 0) g.push(gap);
    groups.push(g);
  });

  if (n % 10 === 0) {
    // бос-набіг: два загони попереду, далі герой в оточенні — авангард веде, тил лікує/прикриває
    add(pick(1).units);
    add(pick(2).units);
    const guard = open('knight') ? 'knight' : open('gnome') ? 'gnome' : 'tank';
    const rear = ['priest', 'mage'].filter(open);
    add([[guard, 1], ['hero', 1 + Math.floor((n - 1) / 50)], ...rear.map(t => [t, 1])]);
    return groups;
  }
  const budget = 1100 * size;                             // сумарна базова загроза набігу
  let mass = 0;
  if (n % 5 === 0) {
    // тематичний набіг — той самий загін раз за разом
    const s = pick(1);
    for (let i = 0; mass < budget && i < 8; i++) { add(s.units, 0.8); mass += squadMass(s) * sq * 0.8; }
    return groups;
  }
  // щойно відкритий тип приходить першим — у невеликому загоні, де він на своєму місці в строю
  const fresh = Object.keys(ENEMY_UNLOCK).find(t => ENEMY_UNLOCK[t] === n);
  if (fresh) {
    const intro = pool.find(s => s.units.some(([t]) => t === fresh));
    add(intro.units, 0.6);
    mass += squadMass(intro) * sq * 0.6;
  }
  for (let i = 0; (mass < budget || groups.length < 2) && i < 12; i++) {
    const s = pick(10 + i);
    add(s.units);
    mass += squadMass(s) * sq;
  }
  return groups;
}

// Множники сили й нагороди авантюристів на набігу n.
// Після кампанії HP росте ще й експоненційно — безкінечний режим рано чи пізно ламає будь-яку оборону.
const hpMul = n => (1 + 0.12 * (n - 1) + 0.003 * (n - 1) ** 2) * 1.02 ** Math.max(0, n - CAMPAIGN_WAVES);
const rewardMul = n => 1 + 0.008 * (n - 1);
const speedMul = n => 1 + Math.min(0.3, 0.003 * (n - 1));   // авантюристи досвідченішають: до +30% швидкості
