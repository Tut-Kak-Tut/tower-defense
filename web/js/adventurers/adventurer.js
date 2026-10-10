// Опис виду авантюриста (Adventurer) і будівельник для нього (AdventurerBuilder). Самі авантюристи — у adventurers.js (ця ж папка).
// Adventurer — «картка виду». Авантюрист, що йде коридором, — клас Enemy (entities.js).

// Реєстри, які заповнює build(): види за id, набіг першої появи (для генератора безкінечного) та інтервал появи в загоні.
const ENEMIES = {};
const ENEMY_UNLOCK = {};
const SPAWN_GAP = {};

// Характеристики, що ростуть з набігами (setWave).
const WAVE_STATS = ['hp', 'speed', 'reward', 'armor', 'splitReward'];

class Adventurer {
  constructor(id, params, waves) {
    this.id = id;
    Object.assign(this, params);
    this.waves = waves;   // опорні точки [[набіг, { hp, speed, ... }], ...] за зростанням
  }

  // Характеристики на набігу n: між опорними точками setWave — плавно (лінійно), після останньої — тим самим темпом.
  statsAt(n) {
    const s = {};
    for (const key of WAVE_STATS) {
      const pts = [[1, this[key] || 0], ...this.waves.filter(([, v]) => key in v).map(([w, v]) => [w, v[key]])];
      if (pts.length === 1) { s[key] = pts[0][1]; continue; }
      let i = 1;
      while (i < pts.length - 1 && pts[i][0] < n) i++;
      const [w0, v0] = pts[i - 1], [w1, v1] = pts[i];
      s[key] = v0 + (v1 - v0) * (n - w0) / (w1 - w0);
    }
    return s;
  }
}

class AdventurerBuilder {
  constructor(id) {
    this.id = id;
    this.params = {};
    this.unlock = undefined;
    this.spawnGap = undefined;
    this.waves = {};      // набіг → { hp, speed, reward, armor, splitReward }
  }

  set(key, value) { this.params[key] = value; return this; }

  // --- основне ---
  setName(name) { return this.set('name', name); }
  setDescription(text) { return this.set('desc', text); }
  setColor(color) { return this.set('color', color); }
  setHp(hp) { return this.set('hp', hp); }
  setSpeed(pxPerSec) { return this.set('speed', pxPerSec); }
  setReward(souls) { return this.set('reward', souls); }            // душі за вбивство
  setRadius(px) { return this.set('radius', px); }                  // розмір фігурки
  setLifeDamage(n) { return this.set('lifeDmg', n); }               // скільки міцності Серця знімає при прориві (1)

  // --- набіги ---
  setUnlockWave(n) { this.unlock = n; return this; }                // з якого набігу його ставить генератор безкінечного (кампанія — у waves/campaign.js)
  setSpawnGap(seconds) { this.spawnGap = seconds; return this; }    // інтервал появи в загоні до скорочення з набігами
  setCountMul(mul) { return this.set('countMul', mul); }            // у генерованих набігах таких менше (множник кількості)
  setBoss(on = true) { return this.set('boss', on); }               // велика смужка HP
  // Сила на набігу n: { hp, speed, reward, armor, splitReward } — будь-які з них. Між точками значення ростуть плавно,
  // після останньої — тим самим темпом; набіг 1 — це setHp/setSpeed/... Приклад: .setWave(50, { hp: 390, reward: 11 })
  setWave(n, stats) { this.waves[n] = { ...this.waves[n], ...stats }; return this; }

  // --- захист ---
  setArmor(n) { return this.set('armor', n); }                      // віднімається від удару (лишається щонайменше 20%)
  setShield(part, regen, fromWave) {                                // щит — частка maxHp, що поглинає урон першою;
    this.set('shield', part);                                       // regen — частка щита за с, поки SHIELD_REGEN_DELAY с не били;
    if (fromWave) this.set('shieldWave', fromWave);                 // fromWave — з якого набігу щит є (раніше — без щита)
    return regen === undefined ? this : this.set('shieldRegen', regen);
  }
  setBig(on = true) { return this.set('big', on); }                 // удар лат по площі зачіпає лише на частку splashBig
  setSlowImmune(on = true) { return this.set('slowImmune', on); }   // холод привида не діє
  setPhysicalArmor(on = true) { return this.set('physArmor', on); } // броня тримає лише фізичні удари, магія (monster.magic) — крізь неї
  setSteadfast(on = true) { return this.set('steadfast', on); }     // валун орка не відкидає
  setWebImmune(on = true) { return this.set('webImmune', on); }     // павутина павука не тримає
  setUndying(on = true) { return this.set('undying', on); }         // не гине (лишається 1 HP), поки на полі є союзник без setUndying
  setDeflect(chance) { return this.set('deflect', chance); }        // шанс відбити снаряд (промені й аури — ні)
  setStealth(on = true) { return this.set('stealth', on); }         // невидимий: б'ють лише монстри з detect

  // --- уміння ---
  setHaste(radiusCells, mul) { return this.set('haste', { radius: radiusCells, mul }); } // пришвидшує сусідів (не складається)
  setShieldAura(radiusCells) { return this.set('shieldAura', radiusCells); } // щит (setShield) поглинає урон і по всіх поруч
  setMagicWard(radiusCells, cut) { return this.set('magicWard', { radius: radiusCells, cut }); } // магічний урон по всіх поруч (і по собі) × (1 − cut)
  setEscort(type) { return this.set('escort', type); }             // у набігах іде лише в загоні, де є type (перевіряють WaveBuilder і EndlessBuilder)
  setHeal(radiusCells, part, everySec) { return this.set('heal', { radius: radiusCells, amount: part, every: everySec }); } // лікує себе й сусідів
  setSpawnOnDeath(types) { return this.set('spawn', [].concat(types)); } // хто з'являється позаду, коли цей гине: тип або список типів (оголосити раніше)
  setFatal(on = true) { return this.set('fatal', on); }            // дійшов до Серця — одразу поразка
  setSplit(times, rewardEach) {                                     // гинучи, ділиться на двох з половиною HP, times разів;
    this.set('split', times);                                       // душі дають лише останні (rewardEach кожен)
    return this.set('splitReward', rewardEach);
  }

  build() {
    const id = this.id, p = this.params;
    const fail = msg => { throw new Error(`Авантюрист '${id}': ${msg}`); };
    if (ENEMIES[id]) fail('такий id уже є');
    for (const key of ['name', 'desc', 'color', 'hp', 'speed', 'reward', 'radius']) {
      if (p[key] === undefined) fail(`не задано ${key}`);
    }
    if (this.spawnGap === undefined) fail('не задано setSpawnGap');
    // кампанія задана вручну, правило — лише для генератора безкінечного
    if (this.unlock > CAMPAIGN_WAVES && this.unlock % 5 === 0) {
      fail(`набіг появи ${this.unlock} кратний 5 — там тематичні й бос-набіги, новачок не потрапить першим`);
    }
    if (p.escort && !ENEMIES[p.escort]) fail(`setEscort('${p.escort}'): такого авантюриста ще не оголошено вище`);
    for (const t of p.spawn || []) if (!ENEMIES[t]) fail(`setSpawnOnDeath('${t}'): такого авантюриста ще не оголошено вище`);

    for (const [n, stats] of Object.entries(this.waves)) {
      if (!(n >= 2)) fail(`setWave(${n}): набіг має бути від 2 (набіг 1 — це setHp/setSpeed/...)`);
      for (const key in stats) if (!WAVE_STATS.includes(key)) fail(`setWave(${n}): '${key}' не росте з набігами (можна: ${WAVE_STATS.join(', ')})`);
    }
    const waves = Object.entries(this.waves).map(([n, v]) => [+n, v]).sort((a, b) => a[0] - b[0]);
    const adventurer = new Adventurer(id, p, waves);
    ENEMIES[id] = adventurer;
    SPAWN_GAP[id] = this.spawnGap;
    if (this.unlock !== undefined) ENEMY_UNLOCK[id] = this.unlock;
    return adventurer;
  }
}
