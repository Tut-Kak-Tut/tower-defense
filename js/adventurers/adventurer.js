// Опис виду авантюриста (Adventurer) і будівельник для нього (AdventurerBuilder). Самі авантюристи — у adventurers.js (ця ж папка).
// Adventurer — «картка виду». Авантюрист, що йде коридором, — клас Enemy (entities.js).

// Реєстри, які заповнює build(): види за id, набіг першої появи (для генератора) та інтервал появи в загоні.
const ENEMIES = {};
const ENEMY_UNLOCK = {};
const SPAWN_GAP = {};

class Adventurer {
  constructor(id, params) {
    this.id = id;
    Object.assign(this, params);
  }
}

class AdventurerBuilder {
  constructor(id) {
    this.id = id;
    this.params = {};
    this.unlock = undefined;
    this.spawnGap = undefined;
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
  setUnlockWave(n) { this.unlock = n; return this; }                // з якого набігу з'являється в генераторі (після 10-го — не кратний 5)
  setSpawnGap(seconds) { this.spawnGap = seconds; return this; }    // інтервал появи в загоні до скорочення з набігами
  setCountMul(mul) { return this.set('countMul', mul); }            // у генерованих набігах таких менше (множник кількості)
  setBoss(on = true) { return this.set('boss', on); }               // велика смужка HP

  // --- захист ---
  setArmor(n) { return this.set('armor', n); }                      // віднімається від удару (лишається щонайменше 20%)
  setShield(part, regen) {                                          // щит — частка maxHp, що поглинає урон першою;
    this.set('shield', part);                                       // regen — частка щита за с, поки SHIELD_REGEN_DELAY с не били
    return regen === undefined ? this : this.set('shieldRegen', regen);
  }
  setBig(on = true) { return this.set('big', on); }                 // удар лат по площі зачіпає лише на частку splashBig
  setSlowImmune(on = true) { return this.set('slowImmune', on); }   // холод привида не діє
  setMagicImmune(on = true) { return this.set('magicImmune', on); } // магічні атаки (monster.magic) не завдають урону
  setSteadfast(on = true) { return this.set('steadfast', on); }     // валун орка не відкидає
  setLastStand(on = true) { return this.set('lastStand', on); }     // перший смертельний удар лишає 1 HP
  setDeflect(chance) { return this.set('deflect', chance); }        // шанс відбити снаряд (промені й аури — ні)
  setStealth(on = true) { return this.set('stealth', on); }         // невидимий: б'ють лише монстри з detect

  // --- уміння ---
  setHaste(radiusCells, mul) { return this.set('haste', { radius: radiusCells, mul }); } // пришвидшує сусідів (не складається)
  setHeal(radiusCells, part, everySec) { return this.set('heal', { radius: radiusCells, amount: part, every: everySec }); } // лікує себе й сусідів
  setSpawnOnDeath(type) { return this.set('spawn', type); }         // хто з'являється позаду, коли цей гине (оголосити раніше)
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
    // набіги до FIRST_WAVES.length задані вручну, правило — лише для генератора
    if (this.unlock > FIRST_WAVES.length && this.unlock % 5 === 0) {
      fail(`набіг появи ${this.unlock} кратний 5 — там тематичні й бос-набіги, новачок не потрапить першим`);
    }
    if (p.spawn && !ENEMIES[p.spawn]) fail(`setSpawnOnDeath('${p.spawn}'): такого авантюриста ще не оголошено вище`);

    const adventurer = new Adventurer(id, p);
    ENEMIES[id] = adventurer;
    SPAWN_GAP[id] = this.spawnGap;
    if (this.unlock !== undefined) ENEMY_UNLOCK[id] = this.unlock;
    return adventurer;
  }
}
