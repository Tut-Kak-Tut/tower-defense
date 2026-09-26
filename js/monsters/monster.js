// Опис виду монстра (Monster) і будівельник для нього (MonsterBuilder). Самі монстри створюються в monsters.js (ця ж папка).
// Monster — «картка виду»: характеристики й прокачка. Монстр, що стоїть у ніші на мапі, — клас Tower (entities.js).

const TOWERS = {};  // реєстр видів монстрів за id: заповнює build()

// Характеристики, що можуть змінюватися з рівнем (setLevel). Відстані — у клітинках, rate — секунд між атаками.
const LEVEL_STATS = ['damage', 'damageMax', 'range', 'rate', 'targets', 'hold', 'slow', 'frail', 'stunChance',
  'splash', 'buff', 'knock', 'poison', 'chainRange', 'minRange'];

// Види атаки (setAttack):
//   projectile — снаряд в одну ціль (за замовчуванням); aura — б'є всіх у радіусі; beam — промінь крізь усіх на лінії;
//   haunt — аура без урону: усі в радіусі крихкі на frail, невидимі розкриті й сповільнені на slow;
//   drain — висмоктує до targets цілей: урон/с росте від damage до damageMax за ramp с (rate — множник часу розгону);
//   cleave — ближній бій: удар по найближчому в range, фізичний урон усім у splash кл. від нього;
//   buff — відьма: перед набігом бафає двох випадкових атакуючих монстрів на buff (одному частоту, другому урон);
//   manual — орк: сам не атакує, гравець подвійним кліком кидає валун (див. Boulder);
//   web — павук раз на rate с стріляє павутиною в конус cone°: усі в ньому стоять hold с (бос — вдвічі менше).
const ATTACKS = ['projectile', 'aura', 'beam', 'haunt', 'drain', 'cleave', 'buff', 'manual', 'web'];

class Monster {
  // Створює лише MonsterBuilder.build(): params — усі поля, levels — { стат: [значення на рівнях 1…MAX_LEVEL],
  // upgrade: [ціни посилення 1→2 … 9→10] }.
  constructor(id, params, levels) {
    this.id = id;
    Object.assign(this, params);
    this.levels = levels;
  }
}

class MonsterBuilder {
  constructor(id) {
    this.id = id;
    this.params = {};
    this.levelUps = {};   // рівень → { стат: значення, upgradeCost }
  }

  set(key, value) { this.params[key] = value; return this; }

  // --- основне ---
  setName(name) { return this.set('name', name); }
  setDescription(text) { return this.set('desc', text); }
  setColor(color) { return this.set('color', color); }
  setCost(souls) { return this.set('cost', souls); }                // ціна купівлі
  setAttack(kind) { return this.set('attack', kind); }              // один з ATTACKS, за замовчуванням 'projectile'

  // --- атака (значення 1-го рівня) ---
  setDamage(dmg) { return this.set('damage', dmg); }
  setRange(cells) { return this.set('range', cells); }
  setRate(seconds) { return this.set('rate', seconds); }            // пауза між атаками
  setProjectileSpeed(pxPerSec) { return this.set('projSpeed', pxPerSec); }
  setLob(on = true) { return this.set('lob', on); }                 // снаряд летить дугою
  setMinRange(cells) { return this.set('minRange', cells); }        // мертва зона під собою
  setSplash(cells) { return this.set('splash', cells); }            // радіус вибуху / удару по площі
  setSplashBig(part) { return this.set('splashBig', part); }        // лати: частка урону по площі великим (big), 0 — не зачіпає
  setTargets(n) { return this.set('targets', n); }                  // цілі в ланцюгу / у вампіра / валуни орка / кому зілля відьми
  setChainRange(cells) { return this.set('chainRange', cells); }    // як далеко стрибає блискавка
  setMagic(on = true) { return this.set('magic', on); }             // бойовий маг не відчуває
  setArmorPierce(on = true) { return this.set('armorPierce', on); } // б'є крізь фізичну броню (armor)
  setDetect(on = true) { return this.set('detect', on); }           // бачить невидимих
  setUnique(on = true) { return this.set('unique', on); }           // лише один у підземеллі
  setFixedDir(on = true) { return this.set('fixedDir', on); }       // б'є в обраний бік, а не в ціль
  setBeamWidth(cells) { return this.set('beamWidth', cells); }      // півширина променя

  // --- ефекти ---
  setSlow(mul, seconds) { this.set('slow', mul); return seconds === undefined ? this : this.set('slowTime', seconds); }
  setPoison(dps, seconds) { this.set('poison', dps); return this.set('poisonTime', seconds); }
  setFrail(part) { return this.set('frail', part); }                // +частка урону від усіх
  setStun(seconds, chance) { this.set('stun', seconds); return this.set('stunChance', chance); }

  // --- особливі механіки ---
  setWeb(coneDeg, holdSeconds) { this.set('cone', coneDeg); return this.set('hold', holdSeconds); } // павук
  setDrain(dmgMax, rampSeconds) { this.set('damageMax', dmgMax); return this.set('ramp', rampSeconds); } // вампір
  setBuff(part) { return this.set('buff', part); }                  // котел відьми
  setKnock(cells) { return this.set('knock', cells); }              // валун орка

  // Що змінюється на рівні level (2…MAX_LEVEL): { upgradeCost, damage, range, ... }.
  // Чого не вказано — лишається як на попередньому рівні.
  setLevel(level, stats) {
    this.levelUps[level] = { ...this.levelUps[level], ...stats };
    return this;
  }

  build() {
    const id = this.id, p = { attack: 'projectile', ...this.params };
    const fail = msg => { throw new Error(`Монстр '${id}': ${msg}`); };
    if (TOWERS[id]) fail('такий id уже є');
    for (const key of ['name', 'desc', 'color', 'cost']) if (p[key] === undefined) fail(`не задано ${key}`);
    if (!ATTACKS.includes(p.attack)) fail(`невідома атака '${p.attack}'`);

    // рівні: кожна характеристика, що є в setLevel, — масив значень на рівнях 1…MAX_LEVEL
    const levels = { upgrade: [] };
    for (const [lvl, up] of Object.entries(this.levelUps)) {
      if (!(lvl >= 2 && lvl <= MAX_LEVEL)) fail(`рівень ${lvl} поза 2…${MAX_LEVEL}`);
      for (const key in up) {
        if (key === 'upgradeCost') continue;
        if (!LEVEL_STATS.includes(key)) fail(`рівень ${lvl}: '${key}' не росте з рівнем (можна: ${LEVEL_STATS.join(', ')})`);
        levels[key] = [];
      }
    }
    for (let lvl = 1; lvl <= MAX_LEVEL; lvl++) {
      const up = this.levelUps[lvl] || {};
      if (lvl > 1) {
        if (up.upgradeCost === undefined) fail(`на рівні ${lvl} не задано upgradeCost`);
        levels.upgrade.push(up.upgradeCost);
      }
      for (const key in levels) {
        if (key !== 'upgrade') levels[key].push(key in up ? up[key] : levels[key].at(-1) ?? (p[key] || 0));
      }
    }

    const monster = new Monster(id, p, levels);
    TOWERS[id] = monster;
    return monster;
  }
}
