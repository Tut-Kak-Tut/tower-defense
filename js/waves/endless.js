// ============================== БЕЗКІНЕЧНИЙ РЕЖИМ ==============================
// Набіги після кампанії (101, 102, …) будує генератор із шаблонів загонів — руками нескінченність не пропишеш.
// Налаштування — ланцюжок EndlessBuilder у самому низу файлу (const ENDLESS = …).
//
// ЯК ГЕНЕРАТОР БУДУЄ НАБІГ n
//   - кожен setBossEvery-й (10-й) — бос-набіг: два випадкові загони, далі герой в оточенні (вершник/гном/паладин
//     попереду, жрець і маг позаду); героїв +1 кожні setHeroesEvery (50) набігів;
//   - кожен setThemeEvery-й (5-й) — тематичний: один і той самий загін раз за разом;
//   - решта — випадкові загони, поки не набереться «загроза» набігу = setBudget × розмір набігу
//     (загроза авантюриста = HP × швидкість/60 × удар по Серцю; розмір росте за setWaveSize);
//   - «випадковість» детермінована (hash), тож набіг n завжди однаковий і панель показує його наперед.
//
// ЯК ДОДАТИ ЗАГІН (шаблон, з якого генератор складає набіги)
//   .addSquad('Назва', [['tank', 1], ['normal', 3], ['priest', 1]])
//     — пари [id авантюриста, кількість на розмірі набігу 1]; порядок = стрій (авангард → основа → тил).
//     Кількості генератор сам збільшує з набігами. Загін потрапляє в набіги, коли відкриті всі його типи
//     (setUnlockWave авантюриста; без нього тип у генераторі не з'являється, як герой — той лише в бос-набігах).
//
// ЯК ЗРОБИТИ ОКРЕМИЙ НАБІГ ВРУЧНУ (наприклад, особливий 150-й)
//   Допиши в campaign.js звичайний new WaveBuilder(150)…build() — заданий набіг має перевагу над генератором.
//
// ІНШІ НАЛАШТУВАННЯ (усі — у ланцюжку ENDLESS унизу)
//   setHpGrowth(1.02)             — HP і броня × 1.02 за кожен набіг після кампанії (на додачу до setWave авантюристів);
//   setBudget(1100)               — скільки «загрози» в набігу на розмірі 1: більше — довші набіги;
//   setWaveSize(0.08, 38, 0.03)   — розмір набігу: +0.08 за набіг до 38-го, далі +0.03;
//   setSquadPause(2.5)            — пауза між загонами (с);
//   setIntervalShrink(0.005, 0.6) — інтервали й паузи коротшають на 0.5% за набіг, але не більше ніж на 60%.

class EndlessBuilder {
  constructor() {
    this.hpGrowth = 1;
    this.bossEvery = 10;
    this.themeEvery = 5;
    this.budget = 1100;
    this.size = { early: 0.08, until: 38, late: 0.03 };
    this.pause = 2.5;
    this.shrink = { perWave: 0.005, max: 0.6 };
    this.heroesEvery = 50;
    this.squads = [];
  }

  setHpGrowth(mul) { this.hpGrowth = mul; return this; }            // HP і броня × mul за кожен набіг після кампанії
  setBossEvery(n) { this.bossEvery = n; return this; }              // бос-набіг кожні n
  setThemeEvery(n) { this.themeEvery = n; return this; }            // тематичний (один загін раз за разом) кожні n
  setBudget(threat) { this.budget = threat; return this; }          // сумарна «загроза» набігу на розмірі 1
  // «Розмір набігу» (множить бюджет і загони): +early за набіг до until-го, далі +late — без стелі
  setWaveSize(early, until, late) { this.size = { early, until, late }; return this; }
  setSquadPause(seconds) { this.pause = seconds; return this; }     // пауза між загонами до скорочення
  setIntervalShrink(perWave, max) { this.shrink = { perWave, max }; return this; } // інтервали коротшають на perWave за набіг, до max
  setHeroesEvery(n) { this.heroesEvery = n; return this; }          // +1 герой у бос-набігу кожні n набігів
  // Шаблон загону в порядку строю: авангард → основа → тил. units — [[тип, кількість на розмірі 1], ...].
  // Загін доступний, коли відкриті всі його типи (setUnlockWave).
  addSquad(name, units) { this.squads.push({ name, units }); return this; }

  build() {
    const fail = msg => { throw new Error(`Безкінечний режим: ${msg}`); };
    if (!this.squads.length) fail('немає жодного загону (addSquad)');
    for (const s of this.squads) {
      for (const [t] of s.units) if (!ENEMIES[t]) fail(`загін '${s.name}': авантюриста '${t}' немає`);
    }
    return new Endless(this);
  }
}

class Endless {
  constructor(cfg) { Object.assign(this, cfg); }

  waveSize(n) {
    const { early, until, late } = this.size;
    return n <= until ? 1 + n * early : 1 + until * early + (n - until) * late;
  }

  // Склад набігу n (детермінований через hash — панель показує його наперед).
  generate(n) {
    const rnd = i => hash(n, i, 7);
    const open = t => ENEMY_UNLOCK[t] <= n;
    const pool = this.squads.filter(s => s.units.every(([t]) => open(t)));
    const pick = i => pool[Math.floor(rnd(i) * pool.length)];
    const size = this.waveSize(n);
    const sq = 1 + (size - 1) * 0.4;                        // загони більшають повільніше, ніж їх кількість
    const fast = 1 - Math.min(this.shrink.max, n * this.shrink.perWave);
    const gap = +(this.pause * fast).toFixed(2);            // пауза між загонами
    const groups = [];
    const add = (units, mul = 1) => units.forEach(([t, c], i) => {
      const count = t === 'hero' ? c : Math.max(1, Math.round(c * sq * mul * (ENEMIES[t].countMul || 1))); // героїв не множимо
      const g = [t, count, +(SPAWN_GAP[t] * fast).toFixed(2)];
      if (i === 0) g.push(gap);
      groups.push(g);
    });

    if (n % this.bossEvery === 0) {
      // бос-набіг: два загони попереду, далі герой в оточенні — авангард веде, тил лікує/прикриває
      add(pick(1).units);
      add(pick(2).units);
      const guard = open('knight') ? 'knight' : open('gnome') ? 'gnome' : 'tank';
      const rear = ['priest', 'mage'].filter(open);
      add([[guard, 1], ['hero', 1 + Math.floor((n - 1) / this.heroesEvery)], ...rear.map(t => [t, 1])]);
      return groups;
    }
    const budget = this.budget * size;
    let mass = 0;
    if (n % this.themeEvery === 0) {
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
}

// «Загроза» авантюриста: HP × швидкість (відносно воїна) × удар по Серцю — швидких і вершників у набігу менше.
// шут із нащадками має втричі більше сумарного HP (1 + 2×½ + 4×¼)
const threat = t => ENEMIES[t].hp * ENEMIES[t].speed / 60 * (ENEMIES[t].lifeDmg || 1) * ((ENEMIES[t].split || 0) + 1)
  + (ENEMIES[t].spawn ? threat(ENEMIES[t].spawn) : 0);
const squadMass = s => s.units.reduce((m, [t, c]) => m + threat(t) * c * (ENEMIES[t].countMul || 1), 0);

const ENDLESS = new EndlessBuilder()
  .setHpGrowth(1.02)
  .setBossEvery(10)
  .setThemeEvery(5)
  .setBudget(1100)
  .setWaveSize(0.08, 38, 0.03)
  .setSquadPause(2.5)
  .setIntervalShrink(0.005, 0.6)
  .setHeroesEvery(50)
  .addSquad('Патруль', [['normal', 4]])
  .addSquad('Злодійська зграя', [['fast', 4]])
  .addSquad('Паладин із загоном', [['tank', 1], ['normal', 3]])
  .addSquad('Гномий клин', [['gnome', 2], ['normal', 2]])
  .addSquad('Хрестовий похід', [['tank', 1], ['normal', 2], ['priest', 1]])
  .addSquad('Бойова партія', [['gnome', 1], ['normal', 2], ['mage', 1]])
  .addSquad('Класична партія', [['tank', 1], ['fast', 1], ['mage', 1], ['priest', 1]])
  .addSquad('Тіньова група', [['scout', 2], ['fast', 2]])
  .addSquad('Кавалерійський наскок', [['knight', 1], ['scout', 1]])
  .addSquad('Велика експедиція', [['knight', 1], ['gnome', 1], ['normal', 2], ['mage', 1], ['priest', 1]])
  .addSquad('Мандрівний цирк', [['jester', 1], ['fast', 2]])
  .addSquad('Школа меча', [['blade', 2], ['normal', 2]])
  .addSquad('Легендарний загін', [['knight', 1], ['blade', 2], ['jester', 1], ['priest', 1]])
  .build();

checkCampaign();
