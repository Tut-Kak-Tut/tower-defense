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
const LVL_DMG = 1.3;          // урон ×1.3 за кожен рівень
const LVL_RANGE = 0.15;       // +0.15 клітинки дальності за рівень
const LVL_RATE = 0.96;        // пауза між атаками ×0.96 за рівень (на 4% частіше)
const UPGRADE_COST_MUL = 0.8; // ціна апгрейду = cost * 0.8 * поточний рівень
const SELL_REFUND = 0.6;      // при продажу повертається 60% витраченого

// range і splash — у клітинках, rate — секунд між атаками.
// attack: 'projectile' (за замовчуванням) | 'aura' (б'є всіх у радіусі) | 'beam' (промінь крізь усіх на лінії).
// Необов'язкові механіки: splash, slow/slowTime, poison (урон/с крізь броню)/poisonTime,
// chain (скільки разів перестрибує)/chainRange, stun (с)/stunChance, detect (бачить невидимих).
const TOWERS = {
  archer: {
    name: 'Скелет-лучник', color: '#e8dcc0', cost: 50,
    damage: 12, range: 3, rate: 0.5, projSpeed: 450,
    desc: 'Часто стріляє в одного авантюриста',
  },
  cannon: {
    name: 'Вогняний імп', color: '#ff7a2f', cost: 100,
    damage: 35, range: 2.5, rate: 1.6, projSpeed: 300, splash: 1.2,
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
    name: 'Око-спостерігач', color: '#ff4d6d', cost: 175, attack: 'beam',
    damage: 30, range: 4, rate: 1.8, detect: true,
    desc: 'Промінь пробиває всіх на лінії, підсвічує невидимих для всіх',
  },
};

// Авантюристи. speed — пікселів за секунду.
// Необов'язкові механіки:
//   armor      — віднімається від кожного удару (але лишається щонайменше 20% урону); отрута ігнорує броню
//   shield     — частка maxHp, яку спершу поглинає магічний щит
//   slowImmune — холод привида не діє
//   heal       — лікує себе й сусідів: radius (кл.), amount (частка maxHp), every (с)
//   stealth    — невидимий: б'ють лише монстри з detect, або всі, поки він у радіусі такого монстра
//   lifeDmg    — скільки міцності Серця знімає при прориві (за замовчуванням 1)
//   boss       — велика смужка HP
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
  mage:   { name: 'Бойовий маг', color: '#5a3fa0', hp: 55, speed: 55, reward: 10, radius: 10,
            shield: 0.5, slowImmune: true,
            desc: 'Магічний щит поглинає урон, холод на нього не діє' },
  scout:  { name: 'Ельф-розвідник', color: '#3f6f5a', hp: 35, speed: 120, reward: 8, radius: 8, stealth: true,
            desc: 'Невидимий: його видно лише поруч із привидом чи оком' },
  knight: { name: 'Вершник', color: '#9aa4b0', hp: 180, speed: 85,  reward: 18, radius: 14, armor: 2, lifeDmg: 2,
            desc: 'Швидкий і міцний, прорвавшись, б’є Серце вдвічі сильніше' },
  hero:   { name: 'Герой',   color: '#d4a82a', hp: 1000, speed: 30, reward: 100, radius: 17,
            armor: 4, shield: 0.25, lifeDmg: 5, boss: true,
            desc: 'Легендарний бос: броня, щит, величезне здоров’я' },
};

// ---------- набіги ----------
// Набіг — список груп [тип, кількість, інтервал між ворогами в секундах]. Групи йдуть одна за одною.

const CAMPAIGN_WAVES = 100;   // у безкінечному режимі генератор просто продовжує далі

// Перші набіги — ручні, щоб навчити гравця; 10-й — перший бос.
const FIRST_WAVES = [
  [['normal', 8, 1]],
  [['normal', 12, 0.8]],
  [['normal', 8, 0.8], ['fast', 6, 0.6]],
  [['fast', 12, 0.5]],
  [['normal', 10, 0.7], ['tank', 2, 2]],
  [['tank', 4, 1.5], ['fast', 10, 0.4]],
  [['normal', 12, 0.5], ['tank', 3, 1.5]],
  [['fast', 16, 0.3], ['tank', 3, 1.2]],
  [['tank', 6, 1], ['normal', 14, 0.4]],
  [['normal', 10, 0.5], ['hero', 1, 1]],
];

// З якого набігу тип з'являється в генерованих набігах.
// Не на кратних 5 — там тематичні й бос-набіги, а новачок має з'явитися у звичайному набігу першим.
const ENEMY_UNLOCK = { normal: 1, fast: 3, tank: 5, gnome: 11, priest: 14, mage: 18, scout: 23, knight: 27 };
// Скільки таких у групі на «розмірі набігу» 1 і базовий інтервал появи.
const WAVE_BASE = {
  normal: [8, 0.7], fast: [8, 0.45], tank: [2, 1.5], gnome: [4, 1.0],
  priest: [2, 1.6], mage: [3, 1.0], scout: [3, 0.7], knight: [2, 1.3], hero: [1, 3],
};

// Детермінований «рандом» 0..1 від чисел — і для візерунку мапи, і для складу набігів
// (склад має бути однаковим щоразу, бо панель показує його наперед).
function hash(a, b, seed = 0) {
  let h = (a * 374761393 + b * 668265263 + seed * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Склад набігу n (з 1).
function waveGroups(n) {
  if (n <= FIRST_WAVES.length) return FIRST_WAVES[n - 1];
  const rnd = i => hash(n, i, 7);
  const pool = Object.keys(ENEMY_UNLOCK).filter(t => ENEMY_UNLOCK[t] <= n);
  const pick = i => pool[Math.floor(rnd(i) * pool.length)];
  const size = Math.min(1 + n * 0.08, 4);                // кількість росте до ~38-го набігу, далі — лише сила
  const fast = 1 - Math.min(0.5, n * 0.005);             // інтервали скорочуються до половини
  const group = (t, mul = 1) => [t, Math.max(1, Math.round(WAVE_BASE[t][0] * size * mul)), +(WAVE_BASE[t][1] * fast).toFixed(2)];

  if (n % 10 === 0) {
    // бос-набіг: свита, потім герої (+1 кожні 40 набігів)
    return [group(pick(1)), ['hero', 1 + Math.floor(n / 40), WAVE_BASE.hero[1]]];
  }
  if (n % 5 === 0) {
    // тематичний набіг — натовп одного типу
    return [group(pick(1), 1.8)];
  }
  // щойно відкритий тип іде першим невеликою групою, щоб гравець його помітив і встиг відреагувати
  const fresh = pool.find(t => ENEMY_UNLOCK[t] === n);
  const count = 2 + (rnd(2) < 0.35 + n * 0.004 ? 1 : 0);
  const types = fresh ? [fresh] : [];
  for (let i = 0; types.length < count && i < 20; i++) {
    const t = pick(10 + i);
    if (!types.includes(t)) types.push(t);
  }
  return types.map(t => group(t, t === fresh ? 0.5 : 1));
}

// Множники сили й нагороди авантюристів на набігу n.
const hpMul = n => 1 + 0.12 * (n - 1) + 0.0022 * (n - 1) ** 2;
const rewardMul = n => 1 + 0.02 * (n - 1);
