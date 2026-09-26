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
const SELL_REFUND = 0.6;      // при продажу повертається 60% витраченого
const MAX_TOWERS = 18;        // скільки монстрів може жити в підземеллі одночасно

// Авантюристи — у js/adventurers/adventurers.js (AdventurerBuilder).
const SHIELD_REGEN_DELAY = 2;  // с без ударів, після яких щит (setShield) почне відновлюватися
const FORMATION_GAP = 26;     // px: наздогнавши попереднього в загоні, авантюрист іде його кроком

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
  [['fast', 5, 0.4], ['tank', 1, 1.5, 2.5], ['normal', 3, 0.7], ['fast', 5, 0.4, 2.5]],
  [['tank', 1, 1], ['normal', 4, 0.5], ['normal', 4, 0.5, 2.5], ['tank', 1, 1, 2.5], ['normal', 4, 0.5]],
  [['fast', 8, 0.3], ['tank', 1, 1.2, 2.5], ['normal', 3, 0.5], ['fast', 8, 0.3, 2.5], ['tank', 1, 1, 2.5]],
  [['tank', 1, 1], ['normal', 7, 0.4], ['tank', 1, 1, 2.5], ['normal', 7, 0.4], ['normal', 4, 0.4, 2.5]],
  [['normal', 5, 0.5], ['normal', 5, 0.5, 2.5], ['tank', 1, 1, 3], ['hero', 1, 1], ['normal', 3, 0.5]],
];

// З якого набігу тип з'являється (ENEMY_UNLOCK) та інтервал появи в загоні (SPAWN_GAP) — у js/adventurers/adventurers.js.

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
  { name: 'Мандрівний цирк',   units: [['jester', 1], ['fast', 2]] },
  { name: 'Школа меча',        units: [['blade', 2], ['normal', 2]] },
  { name: 'Легендарний загін', units: [['knight', 1], ['blade', 2], ['jester', 1], ['priest', 1]] },
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
// шут із нащадками має втричі більше сумарного HP (1 + 2×½ + 4×¼)
const threat = t => ENEMIES[t].hp * ENEMIES[t].speed / 60 * (ENEMIES[t].lifeDmg || 1) * ((ENEMIES[t].split || 0) + 1)
  + (ENEMIES[t].spawn ? threat(ENEMIES[t].spawn) : 0);
const squadMass = s => s.units.reduce((m, [t, c]) => m + threat(t) * c * (ENEMIES[t].countMul || 1), 0);

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
    const count = t === 'hero' ? c : Math.max(1, Math.round(c * sq * mul * (ENEMIES[t].countMul || 1))); // героїв не множимо
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
const hpMul = n => (1 + 0.12 * (n - 1) + 0.0019 * (n - 1) ** 2) * 1.02 ** Math.max(0, n - CAMPAIGN_WAVES);
const rewardMul = n => 1 + 0.008 * (n - 1);
const speedMul = n => 1 + Math.min(0.3, 0.003 * (n - 1));   // авантюристи досвідченішають: до +30% швидкості
