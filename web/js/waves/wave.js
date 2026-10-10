// Набіги: будівельник набігу (WaveBuilder) і те, як гра дізнається склад і силу набігу n.
// Кампанія — у campaign.js (ця ж папка), безкінечний режим після неї — у endless.js.

// Набіг — список груп [тип, кількість, інтервал між ворогами (с), пауза?, баф?, вантаж?]. Групи йдуть одна за одною.
// Вантаж (.cargo) — хто висипає з кожного авантюриста групи, коли той гине (замість його setSpawnOnDeath).
// Група з паузою починає новий загін; група без паузи — продовження загону одразу за попередньою.
// У загоні ніхто не обганяє того, хто йде попереду (Enemy.leader), тож стрій тримається: авангард веде решту.
const WAVES = {};   // номер набігу → { groups, buff }; заповнює WaveBuilder.build()

// Що можна підсилити бафом набігу чи групи (множники): { hp: 1.3 } — +30% здоров'я.
const BUFF_KEYS = ['hp', 'speed', 'reward', 'armor'];

class WaveBuilder {
  constructor(n) {
    this.n = n;
    this.groups = [];
    this.waveBuff = {};
    this.pause = undefined;
  }

  // Новий загін; pause — секунди перед ним (у першого загону набігу не діє).
  squad(pause = 2.5) { this.pause = pause; return this; }

  // Група в поточному загоні: count авантюристів type з інтервалом interval с; buff — множники лише для цієї групи.
  add(type, count, interval, buff) {
    this.groups.push([type, count, interval, this.pause, buff]);
    this.pause = undefined;
    return this;
  }

  // Хто висипає з авантюристів попередньої групи, коли ті гинуть, — замість їхнього setSpawnOnDeath.
  // Приклад: .add('wagon', 1, 1.3).cargo(['knight', 'knight', 'priest'])
  cargo(types) {
    const g = this.groups[this.groups.length - 1];
    if (!g) throw new Error(`Набіг ${this.n}: .cargo() — лише після .add()`);
    g[5] = types;
    return this;
  }

  // Баф для всіх у цьому набігу: { hp, speed, reward, armor } — множники.
  buff(stats) { this.waveBuff = { ...this.waveBuff, ...stats }; return this; }

  build() {
    const n = this.n;
    const fail = msg => { throw new Error(`Набіг ${n}: ${msg}`); };
    if (!(Number.isInteger(n) && n >= 1)) fail('номер набігу — ціле число від 1');
    if (WAVES[n]) fail('такий набіг уже є');
    if (!this.groups.length) fail('немає жодної групи (.add)');
    const checkBuff = (b, where) => {
      for (const key in b) {
        if (!BUFF_KEYS.includes(key)) fail(`${where}: '${key}' не можна підсилити (можна: ${BUFF_KEYS.join(', ')})`);
        if (!(b[key] > 0)) fail(`${where}: ${key} має бути додатним множником`);
      }
    };
    checkBuff(this.waveBuff, 'buff');
    this.groups.forEach(([type, count, interval, , buff, cargo], i) => {
      const where = `група ${i + 1} ('${type}')`;
      if (!ENEMIES[type]) fail(`${where}: такого авантюриста немає`);
      if (cargo) {
        if (!Array.isArray(cargo) || !cargo.length) fail(`${where}: cargo — непорожній список типів`);
        for (const t of cargo) if (!ENEMIES[t]) fail(`${where}: cargo — авантюриста '${t}' немає`);
      }
      if (!(Number.isInteger(count) && count >= 1)) fail(`${where}: кількість — ціле число від 1`);
      if (!(interval >= 0)) fail(`${where}: інтервал — число від 0`);
      if (buff) checkBuff(buff, where);
    });
    // хто ходить лише в супроводі (setEscort) — у його загоні має бути супровідник
    const squads = [];
    this.groups.forEach(([type, , , pause], i) => {
      if (i === 0 || pause !== undefined) squads.push([]);
      squads[squads.length - 1].push(type);
    });
    squads.forEach((types, i) => {
      for (const t of types) {
        const esc = ENEMIES[t].escort;
        if (esc && !types.includes(esc)) fail(`загін ${i + 1}: '${t}' ходить лише разом із '${esc}'`);
      }
    });
    WAVES[n] = { groups: this.groups, buff: this.waveBuff };
  }
}

// Склад набігу n: з кампанії чи ручного набігу, інакше — генератор безкінечного.
function waveGroups(n) {
  if (WAVES[n]) return WAVES[n].groups;
  if (n <= CAMPAIGN_WAVES) throw new Error(`Набіг ${n} не задано в js/waves/campaign.js`);
  return ENDLESS.generate(n);
}

// Баф усього набігу n (для генерованих — порожній).
const waveBuff = n => WAVES[n] ? WAVES[n].buff : {};

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

// Два бафи разом: множники перемножуються.
function mergeBuff(a, b) {
  const out = { ...a };
  for (const key in b) out[key] = (out[key] || 1) * b[key];
  return out;
}

// Характеристики авантюриста type на набігу n з бафом: ріст із setWave, після кампанії HP і броня ще й
// множаться на ріст безкінечного (setHpGrowth).
function adventurerStats(type, n, buff = {}) {
  const s = ENEMIES[type].statsAt(n);
  if (n > CAMPAIGN_WAVES) {
    const g = ENDLESS.hpGrowth ** (n - CAMPAIGN_WAVES);
    s.hp *= g;
    s.armor *= g;
  }
  for (const key in buff) s[key] *= buff[key];
  if (buff.reward) s.splitReward *= buff.reward;
  return s;
}

// Чи всі набіги кампанії на місці — щоб дірку було видно одразу, а не посеред гри.
function checkCampaign() {
  const missing = [];
  for (let n = 1; n <= CAMPAIGN_WAVES; n++) if (!WAVES[n]) missing.push(n);
  if (missing.length) console.error(`У js/waves/campaign.js немає набігів: ${missing.join(', ')}`);
}
