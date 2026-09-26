// Набіги: будівельник набігу (WaveBuilder) і те, як гра дізнається склад і силу набігу n.
// Кампанія — у campaign.js (ця ж папка), безкінечний режим після неї — у endless.js.

// Набіг — список груп [тип, кількість, інтервал між ворогами (с), пауза?, баф?]. Групи йдуть одна за одною.
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
    this.groups.forEach(([type, count, interval, , buff], i) => {
      const where = `група ${i + 1} ('${type}')`;
      if (!ENEMIES[type]) fail(`${where}: такого авантюриста немає`);
      if (!(Number.isInteger(count) && count >= 1)) fail(`${where}: кількість — ціле число від 1`);
      if (!(interval >= 0)) fail(`${where}: інтервал — число від 0`);
      if (buff) checkBuff(buff, where);
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
