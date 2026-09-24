// Усі налаштування балансу гри в одному місці.

const CELL = 40;   // розмір клітинки в пікселях
const COLS = 20;
const ROWS = 12;

// Шлях ворогів: точки повороту в клітинках [col, row].
// Перша і остання точки — за межами мапи (вхід і вихід).
// Сегменти мають бути лише горизонтальними або вертикальними.
const PATH_POINTS = [
  [-1, 2], [4, 2], [4, 8], [9, 8], [9, 3], [14, 3], [14, 9], [20, 9],
];

const START_MONEY = 150;
const START_LIVES = 20;
const WAVE_BONUS = 20;        // бонус за пройдену хвилю (+5 за кожен номер хвилі)
const HP_GROWTH = 0.18;       // +18% HP ворогів за кожну наступну хвилю

const MAX_LEVEL = 3;
const UPGRADE_COST_MUL = 0.8; // ціна апгрейду = cost * 0.8 * поточний рівень
const SELL_REFUND = 0.6;      // при продажу повертається 60% витраченого

// range і splash — у клітинках, rate — секунд між пострілами
const TOWERS = {
  archer: {
    name: 'Стрілець', color: '#4ea8de', cost: 50,
    damage: 12, range: 3, rate: 0.5, projSpeed: 450,
    desc: 'Швидко б\'є одну ціль',
  },
  cannon: {
    name: 'Гармата', color: '#e76f51', cost: 100,
    damage: 35, range: 2.5, rate: 1.6, projSpeed: 300, splash: 1.2,
    desc: 'Повільна, урон по площі',
  },
  frost: {
    name: 'Мороз', color: '#90e0ef', cost: 75,
    damage: 4, range: 2.5, rate: 0.9, projSpeed: 400, slow: 0.5, slowTime: 2,
    desc: 'Сповільнює ворогів на 50%',
  },
};

// speed — пікселів за секунду
const ENEMIES = {
  normal: { name: 'Звичайний', color: '#e9c46a', hp: 40,  speed: 60,  reward: 5,  radius: 10 },
  fast:   { name: 'Швидкий',   color: '#f4a261', hp: 22,  speed: 110, reward: 5,  radius: 8 },
  tank:   { name: 'Танк',      color: '#9d4edd', hp: 160, speed: 35,  reward: 15, radius: 14 },
};

// Кожна хвиля — список груп [тип, кількість, інтервал між ворогами в секундах].
// Групи йдуть одна за одною.
const WAVES = [
  [['normal', 8, 1]],
  [['normal', 12, 0.8]],
  [['normal', 8, 0.8], ['fast', 6, 0.6]],
  [['fast', 12, 0.5]],
  [['normal', 10, 0.7], ['tank', 2, 2]],
  [['tank', 5, 1.5], ['fast', 10, 0.4]],
  [['normal', 15, 0.5], ['tank', 4, 1.5]],
  [['fast', 20, 0.3], ['tank', 4, 1.2]],
  [['tank', 10, 1], ['normal', 15, 0.4]],
  [['tank', 12, 0.9], ['fast', 20, 0.3], ['normal', 20, 0.3]],
];
