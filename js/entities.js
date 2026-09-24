// Ігрові сутності: вороги, вежі, снаряди.

function cellCenter(col, row) {
  return { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 };
}

// Характеристики монстра на заданому рівні — і для гри, і для підказки про посилення.
// range — у клітинках, rate — секунд між атаками.
function towerStats(def, level) {
  const l = level - 1;
  return {
    damage: def.damage * Math.pow(LVL_DMG, l),
    range: def.range + LVL_RANGE * l,
    rate: def.rate * Math.pow(LVL_RATE, l),
    poison: (def.poison || 0) * Math.pow(LVL_DMG, l),
    stunChance: def.stunChance ? Math.min(0.8, def.stunChance + 0.04 * l) : 0,
    chain: def.chain ? def.chain + Math.floor(l / 3) : 0,
  };
}

// Відстань від точки до відрізка — для променя ока.
function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

const alive = e => !e.dead && !e.escaped;

const PATH_PX = PATH_POINTS.map(([c, r]) => cellCenter(c, r));

class Enemy {
  constructor(type, hpMul, rewardMul = 1) {
    const def = ENEMIES[type];
    this.type = type;
    this.def = def;
    this.color = def.color;
    this.radius = def.radius;
    this.baseSpeed = def.speed;
    this.reward = Math.round(def.reward * rewardMul);
    this.maxHp = Math.round(def.hp * hpMul);
    this.hp = this.maxHp;
    // броня росте повільніше за HP, інакше на пізніх набігах вона обнуляла б слабких монстрів
    this.armor = (def.armor || 0) * (1 + (hpMul - 1) * 0.25);
    this.maxShield = Math.round(this.maxHp * (def.shield || 0));
    this.shield = this.maxShield;
    this.lifeDmg = def.lifeDmg || 1;
    this.stealth = !!def.stealth;
    this.revealed = 0;    // секунди, поки невидимого підсвічує монстр із detect
    this.healTimer = def.heal ? def.heal.every : 0;
    this.x = PATH_PX[0].x;
    this.y = PATH_PX[0].y;
    this.wp = 1;          // індекс наступної точки шляху
    this.progress = 0;    // пройдена відстань — вежі цілять у найдальшого
    this.slowFactor = 1;
    this.slowTimer = 0;
    this.stunTimer = 0;
    this.poisonDps = 0;
    this.poisonTimer = 0;
    this.dir = 0;
    this.dead = false;
    this.escaped = false;
  }

  get hidden() { return this.stealth && this.revealed <= 0; }

  update(dt, game) {
    if (this.revealed > 0) this.revealed -= dt;
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) this.slowFactor = 1;
    }
    if (this.poisonTimer > 0) {
      this.poisonTimer -= dt;
      this.hit(this.poisonDps * dt, true);
      if (this.poisonTimer <= 0) this.poisonDps = 0;
    }
    if (this.def.heal) {
      this.healTimer -= dt;
      if (this.healTimer <= 0) {
        const h = this.def.heal;
        this.healTimer += h.every;
        const rad = h.radius * CELL;
        for (const e of game.enemies) {
          if (e.dead || e.escaped || Math.hypot(e.x - this.x, e.y - this.y) > rad) continue;
          e.hp = Math.min(e.maxHp, e.hp + e.maxHp * h.amount);
        }
        game.effects.push({ kind: 'heal', x: this.x, y: this.y, r: rad, t: 0.5, max: 0.5, color: '#9dffb0' });
      }
    }
    if (this.stunTimer > 0) { this.stunTimer -= dt; return; }
    let move = this.baseSpeed * this.slowFactor * dt;
    while (move > 0 && this.wp < PATH_PX.length) {
      const t = PATH_PX[this.wp];
      const dx = t.x - this.x, dy = t.y - this.y;
      const d = Math.hypot(dx, dy);
      this.dir = Math.atan2(dy, dx); // лише для малювання — куди дивиться
      if (d <= move) {
        this.x = t.x; this.y = t.y;
        move -= d; this.progress += d; this.wp++;
      } else {
        this.x += dx / d * move; this.y += dy / d * move;
        this.progress += move; move = 0;
      }
    }
    if (this.wp >= PATH_PX.length) this.escaped = true;
  }

  // pierce — урон крізь броню (отрута)
  hit(damage, pierce = false) {
    if (this.dead) return;
    if (!pierce && this.armor) damage = Math.max(damage * 0.2, damage - this.armor);
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, damage);
      this.shield -= absorbed;
      damage -= absorbed;
    }
    this.hp -= damage;
    if (this.hp <= 0) this.dead = true;
  }

  slow(factor, time) {
    if (this.def.slowImmune) return;
    this.slowFactor = Math.min(this.slowFactor, factor);
    this.slowTimer = Math.max(this.slowTimer, time);
  }

  stun(time) {
    // боса оглушення тримає вдвічі коротше
    this.stunTimer = Math.max(this.stunTimer, this.def.boss ? time / 2 : time);
  }

  poison(dps, time) {
    this.poisonDps = Math.max(this.poisonDps, dps);
    this.poisonTimer = Math.max(this.poisonTimer, time);
  }

  draw(ctx) {
    const r = this.radius;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + r * 0.6, r, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fill();

    // фігурка зверху, повернута за напрямком руху (вперед = +x); невидимий ледь мерехтить
    ctx.save();
    if (this.stealth) ctx.globalAlpha = this.hidden ? 0.28 + Math.sin(time * 6 + this.progress * 0.05) * 0.08 : 0.75;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.dir);
    drawAdventurer(ctx, this.type, r, this.color);
    ctx.restore();

    if (this.shield > 0) {
      // магічний щит — мерехтлива синя сфера
      ctx.beginPath();
      ctx.arc(this.x, this.y, r + 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(90, 140, 255, 0.12)';
      ctx.fill();
      ctx.strokeStyle = `rgba(140, 180, 255, ${0.5 + Math.sin(time * 5) * 0.2})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    if (this.poisonTimer > 0) {
      // отрута — зелені бульбашки над головою
      ctx.fillStyle = 'rgba(120, 230, 80, 0.8)';
      for (let i = 0; i < 3; i++) {
        const ph = (time * 1.5 + i / 3) % 1;
        ctx.beginPath();
        ctx.arc(this.x + (i - 1) * 5, this.y - ph * r * 1.2, 1.5 + (1 - ph), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (this.stunTimer > 0) {
      // оглушення — зірочки навколо голови
      ctx.fillStyle = '#ffe066';
      for (let i = 0; i < 3; i++) {
        const a = time * 6 + i * Math.PI * 2 / 3;
        ctx.fillRect(this.x + Math.cos(a) * r * 0.9 - 1.5, this.y - r * 0.4 + Math.sin(a) * r * 0.35 - 1.5, 3, 3);
      }
    }

    if (this.slowTimer > 0) {
      // іній від привида
      ctx.beginPath();
      ctx.arc(this.x, this.y, r + 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(143, 227, 255, 0.3)';
      ctx.fill();
      ctx.strokeStyle = '#caf0f8';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // смужка HP (у боса ширша), над нею — щит
    const w = this.def.boss ? 44 : 24, h = this.def.boss ? 5 : 4;
    const x = this.x - w / 2, y = this.y - this.radius - 8;
    const frac = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = '#222';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = frac > 0.5 ? '#6ede8a' : frac > 0.25 ? '#ffd166' : '#ef476f';
    ctx.fillRect(x, y, w * frac, h);
    if (this.shield > 0) {
      ctx.fillStyle = '#7fa8ff';
      ctx.fillRect(x, y - 3, w * this.shield / this.maxShield, 2);
    }
  }
}

class Tower {
  constructor(type, col, row) {
    this.type = type;
    this.def = TOWERS[type];
    this.col = col;
    this.row = row;
    const c = cellCenter(col, row);
    this.x = c.x;
    this.y = c.y;
    this.level = 1;
    this.spent = this.def.cost;
    this.cooldown = 0;
    this.angle = -Math.PI / 2;
  }

  get damage() { return towerStats(this.def, this.level).damage; }
  get range() { return towerStats(this.def, this.level).range * CELL; }
  get upgradeCost() {
    return this.level >= MAX_LEVEL ? null : Math.round(this.def.cost * UPGRADE_COST_MUL * this.level);
  }
  get sellValue() { return Math.floor(this.spent * SELL_REFUND); }

  update(dt, game) {
    if (this.def.detect) {
      // підсвічує невидимих у своєму радіусі — тоді їх б'ють і решта монстрів
      for (const e of game.enemies) {
        if (e.stealth && Math.hypot(e.x - this.x, e.y - this.y) <= this.range + e.radius) e.revealed = 0.3;
      }
    }
    this.cooldown -= dt;
    if (this.cooldown > 0) return;
    let target = null;
    for (const e of game.enemies) {
      if (!alive(e) || (e.hidden && !this.def.detect)) continue;
      if (Math.hypot(e.x - this.x, e.y - this.y) > this.range + e.radius) continue;
      if (!target || e.progress > target.progress) target = e;
    }
    if (!target) return;
    this.angle = Math.atan2(target.y - this.y, target.x - this.x);
    const s = towerStats(this.def, this.level);
    const attack = this.def.attack || 'projectile';
    if (attack === 'aura') this.stomp(game, s);
    else if (attack === 'beam') this.beam(game, s);
    else game.projectiles.push(new Projectile(this, target));
    this.cooldown = s.rate;
  }

  // голем: удар по землі по всіх у радіусі (і невидимих теж — земля трясеться під усіма)
  stomp(game, s) {
    const rad = s.range * CELL;
    for (const e of game.enemies) {
      if (!alive(e) || Math.hypot(e.x - this.x, e.y - this.y) > rad + e.radius) continue;
      e.hit(s.damage);
      if (Math.random() < s.stunChance) e.stun(this.def.stun);
    }
    game.effects.push({ kind: 'quake', x: this.x, y: this.y, r: rad, t: 0.35, max: 0.35, color: this.def.color });
  }

  // око: промінь на всю дальність у напрямку цілі
  beam(game, s) {
    const len = s.range * CELL;
    const x2 = this.x + Math.cos(this.angle) * len, y2 = this.y + Math.sin(this.angle) * len;
    for (const e of game.enemies) {
      if (alive(e) && segDist(e.x, e.y, this.x, this.y, x2, y2) <= e.radius + 4) e.hit(s.damage);
    }
    game.effects.push({ kind: 'beam', x: this.x, y: this.y, x2, y2, t: 0.25, max: 0.25, color: this.def.color });
  }

  draw(ctx) {
    const { x, y } = this;

    // коло призову під монстром + тінь
    ctx.beginPath();
    ctx.ellipse(x, y + 12, 15, 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(150, 95, 220, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.save();
    ctx.translate(x, y);
    TOWER_DRAW[this.type](ctx, this.angle);
    ctx.restore();

    // рівень — руни, що світяться: до 5 фіолетових, далі вони по одній стають золотими
    const runes = Math.min(this.level, 5);
    const gold = this.level - 5;
    ctx.save();
    ctx.shadowBlur = 6;
    for (let i = 0; i < runes; i++) {
      ctx.fillStyle = i < gold ? '#ffd86b' : '#c9a0ff';
      ctx.shadowColor = i < gold ? '#ffae00' : '#9b5cff';
      const rx = x + (i - (runes - 1) / 2) * 8, ry = y + 17;
      ctx.beginPath();
      ctx.moveTo(rx, ry - 3); ctx.lineTo(rx + 2.5, ry); ctx.lineTo(rx, ry + 3); ctx.lineTo(rx - 2.5, ry);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ---------- малюнок авантюриста (центр у 0,0; дивиться вздовж +x) ----------

function drawAdventurer(ctx, type, r, color) {
  const outline = () => { ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 1.5; ctx.stroke(); };
  const ellipse = (x, y, rx, ry, fill, stroke = true) => {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) outline();
  };
  const sword = (len = 1.2, w = 3) => {
    ctx.fillStyle = '#dfe4ea';
    ctx.fillRect(r * 0.1, r * 0.6 - w / 2, r * len, w);      // клинок
    ctx.fillStyle = '#6b4a2b';
    ctx.fillRect(r * 0.05, r * 0.6 - 3, 2, 6);               // гарда
  };
  const staff = (orb, glow) => {
    ctx.fillStyle = '#6b4a2b';
    ctx.fillRect(-r * 0.4, r * 0.6 - 1, r * 1.7, 2);
    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(r * 1.3, r * 0.6, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = orb;
    ctx.fill();
    ctx.restore();
  };
  const body = () => ellipse(0, 0, r * 0.6, r, color);
  const helmet = fill => {
    ellipse(r * 0.1, 0, r * 0.45, r * 0.45, fill);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(r * 0.3, -r * 0.3, 1.5, r * 0.6);            // прорізь забрала
  };
  const hood = fill => {
    ellipse(r * 0.1, 0, r * 0.45, r * 0.45, fill, false);
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, -r * 0.35); ctx.lineTo(-r * 0.75, 0); ctx.lineTo(-r * 0.2, r * 0.35);
    ctx.fill();
  };

  switch (type) {
    case 'fast':
      ctx.fillStyle = '#cfd6de';
      ctx.fillRect(r * 0.2, r * 0.55, r * 0.9, 2);             // кинджал
      body();
      hood('#2e4a2b');
      break;

    case 'tank':
      sword();
      body();
      helmet('#f2d98a');
      ctx.save();                                              // щит паладина зліва-спереду
      ctx.translate(r * 0.55, -r * 0.7);
      ctx.fillStyle = '#2f5aa8';
      ctx.strokeStyle = '#e6c35c';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 3, r * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      break;

    case 'gnome': {
      // сокира: руків'я + лезо-півмісяць
      ctx.fillStyle = '#6b4a2b';
      ctx.fillRect(-r * 0.1, r * 0.65 - 1, r * 1.2, 2);
      ctx.beginPath();
      ctx.arc(r * 1.0, r * 0.65, r * 0.4, -Math.PI / 2, Math.PI / 2);
      ctx.fillStyle = '#c4ccd4';
      ctx.fill();
      ellipse(0, 0, r * 0.7, r * 0.85, color);                // кремезний у латах
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';              // пластини лат
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-r * 0.35, -r * 0.6); ctx.lineTo(-r * 0.35, r * 0.6);
      ctx.moveTo(-r * 0.05, -r * 0.75); ctx.lineTo(-r * 0.05, r * 0.75);
      ctx.stroke();
      ctx.beginPath();                                         // руда борода вперед
      ctx.moveTo(r * 0.3, -r * 0.3); ctx.lineTo(r * 0.85, 0); ctx.lineTo(r * 0.3, r * 0.3);
      ctx.fillStyle = '#c0562a';
      ctx.fill();
      helmet('#8e98a6');
      break;
    }

    case 'priest':
      staff('#fff2a8', '#ffe066');
      body();
      ellipse(r * 0.1, 0, r * 0.42, r * 0.42, '#f4efe6');       // мітра зверху
      ctx.strokeStyle = '#d4a82a';                              // золотий хрест
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(r * 0.1 - r * 0.25, 0); ctx.lineTo(r * 0.1 + r * 0.25, 0);
      ctx.moveTo(r * 0.1, -r * 0.25); ctx.lineTo(r * 0.1, r * 0.25);
      ctx.stroke();
      break;

    case 'mage':
      staff('#c78cff', '#a15cff');
      body();
      ellipse(r * 0.05, 0, r * 0.75, r * 0.75, '#3a2870');     // широкі криси капелюха
      ellipse(r * 0.1, 0, r * 0.32, r * 0.32, '#4d3595', false);
      ctx.fillStyle = '#ffd86b';                                // зірка на верхівці
      ctx.fillRect(r * 0.1 - 1, -1, 2, 2);
      break;

    case 'scout':
      ctx.strokeStyle = '#8a6a3a';                              // лук спереду
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r * 0.2, 0, r * 0.95, -1.0, 1.0);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(230,230,230,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(r * 0.2 + r * 0.95 * Math.cos(1), -r * 0.95 * Math.sin(1));
      ctx.lineTo(r * 0.2 + r * 0.95 * Math.cos(1), r * 0.95 * Math.sin(1));
      ctx.stroke();
      ellipse(-r * 0.15, 0, r * 0.65, r * 1.05, '#24453a', false); // плащ
      body();
      hood('#2f5a48');
      break;

    case 'knight': {
      // кінь: тулуб, шия з головою вперед, хвіст
      ctx.fillStyle = '#3a2618';
      ctx.fillRect(-r * 1.3, -1.5, r * 0.3, 3);
      ellipse(0, 0, r * 1.05, r * 0.55, '#6b4528');
      ellipse(r * 1.05, 0, r * 0.35, r * 0.22, '#5a3a22');
      // спис уздовж правого боку, вістрям далеко вперед
      ctx.fillStyle = '#8a6a3a';
      ctx.fillRect(-r * 0.5, r * 0.45 - 1, r * 1.9, 2);
      ctx.fillStyle = '#dfe4ea';
      ctx.beginPath();
      ctx.moveTo(r * 1.6, r * 0.45); ctx.lineTo(r * 1.35, r * 0.45 - 2.5); ctx.lineTo(r * 1.35, r * 0.45 + 2.5);
      ctx.fill();
      // вершник
      ellipse(-r * 0.1, 0, r * 0.35, r * 0.6, color);
      helmet('#c4ccd4');
      ctx.fillStyle = '#b22a3a';                                // плюмаж
      ctx.fillRect(-r * 0.3, -1.5, r * 0.4, 3);
      break;
    }

    case 'hero': {
      // червоний плащ позаду
      ctx.beginPath();
      ctx.moveTo(r * 0.1, -r * 0.8);
      ctx.quadraticCurveTo(-r * 1.3, -r * 1.0 + Math.sin(time * 4) * 2, -r * 1.15, 0);
      ctx.quadraticCurveTo(-r * 1.3, r * 1.0 + Math.sin(time * 4 + 1) * 2, r * 0.1, r * 0.8);
      ctx.fillStyle = '#8b1e3f';
      ctx.fill();
      sword(1.5, 4);                                            // великий меч
      body();
      ctx.strokeStyle = '#fff1b8';                              // гравіювання на латах
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.4, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ellipse(r * 0.1, 0, r * 0.42, r * 0.42, '#f0d8a8');        // голова
      ctx.save();                                               // корона
      ctx.translate(r * 0.1, 0);
      ctx.fillStyle = '#ffd23f';
      ctx.shadowColor = '#ffae00';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2, rr = i % 2 ? r * 0.28 : r * 0.46;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ellipse(r * 0.1, 0, r * 0.2, r * 0.2, '#f0d8a8', false);
      break;
    }

    default: // 'normal' — воїн
      sword();
      body();
      helmet('#8e98a6');
  }
}

// ---------- малюнки монстрів (центр у 0,0; angle — напрямок на ціль) ----------

function drawSkeleton(ctx, angle) {
  const bone = TOWERS.archer.color;
  // хребет і ребра
  ctx.strokeStyle = bone;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(0, 11);
  for (let i = 0; i < 3; i++) {
    const w = 6 - i;
    ctx.moveTo(-w, 3 + i * 3); ctx.lineTo(w, 3 + i * 3);
  }
  ctx.stroke();
  // лук, повернутий до цілі
  ctx.save();
  ctx.rotate(angle);
  ctx.strokeStyle = '#7a5230';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(4, 0, 12, -1.1, 1.1);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(230,230,230,0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const bx = 4 + 12 * Math.cos(1.1), by = 12 * Math.sin(1.1);
  ctx.moveTo(bx, -by); ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.restore();
  // череп
  ctx.beginPath();
  ctx.arc(0, -7, 7.5, 0, Math.PI * 2);
  ctx.fillStyle = bone;
  ctx.fill();
  ctx.fillRect(-4, -2, 8, 4);
  ctx.fillStyle = '#1a1014';
  ctx.beginPath();
  ctx.arc(-3, -7, 2.2, 0, Math.PI * 2);
  ctx.arc(3, -7, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff3b3b';
  ctx.fillRect(-3.5, -7.5, 1, 1);
  ctx.fillRect(2.5, -7.5, 1, 1);
}

function drawImp(ctx, angle) {
  // крила
  ctx.fillStyle = '#4a1414';
  ctx.beginPath();
  ctx.moveTo(-6, -2); ctx.lineTo(-17, -10); ctx.lineTo(-14, 2); ctx.closePath();
  ctx.moveTo(6, -2); ctx.lineTo(17, -10); ctx.lineTo(14, 2); ctx.closePath();
  ctx.fill();
  // тіло
  const grad = ctx.createRadialGradient(-3, -4, 2, 0, 0, 12);
  grad.addColorStop(0, '#e8552a');
  grad.addColorStop(1, '#8a1e10');
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  // роги
  ctx.fillStyle = '#2a1a14';
  ctx.beginPath();
  ctx.moveTo(-7, -6); ctx.lineTo(-9, -15); ctx.lineTo(-3, -9); ctx.closePath();
  ctx.moveTo(7, -6); ctx.lineTo(9, -15); ctx.lineTo(3, -9); ctx.closePath();
  ctx.fill();
  // очі
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.ellipse(-3.5, -2, 2.2, 1.4, 0.3, 0, Math.PI * 2);
  ctx.ellipse(3.5, -2, 2.2, 1.4, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // вогонь у лапі в напрямку цілі
  const fx = Math.cos(angle) * 12, fy = Math.sin(angle) * 12;
  const flick = 3.5 + Math.sin(time * 12) * 0.8;
  ctx.save();
  ctx.shadowColor = '#ff7a2f';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#ffb347';
  ctx.beginPath();
  ctx.arc(fx, fy, flick, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGhost(ctx, angle) {
  const bob = Math.sin(time * 3) * 2;
  ctx.save();
  ctx.translate(0, bob - 2);
  ctx.shadowColor = '#8fe3ff';
  ctx.shadowBlur = 12;
  ctx.fillStyle = 'rgba(190, 240, 255, 0.8)';
  ctx.beginPath();
  ctx.arc(0, -3, 10, Math.PI, 0);
  ctx.lineTo(10, 10);
  // хвилястий низ
  for (let i = 0; i < 4; i++) {
    const x0 = 10 - i * 5;
    const wave = Math.sin(time * 5 + i) * 1.5;
    ctx.quadraticCurveTo(x0 - 2.5, 6 + wave, x0 - 5, 10);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // очі дивляться на ціль
  const ex = Math.cos(angle) * 1.5, ey = Math.sin(angle) * 1.5;
  ctx.fillStyle = '#1b2a44';
  ctx.beginPath();
  ctx.ellipse(-3.5 + ex, -3 + bob + ey, 2, 3, 0, 0, Math.PI * 2);
  ctx.ellipse(3.5 + ex, -3 + bob + ey, 2, 3, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawSpider(ctx, angle) {
  ctx.save();
  ctx.rotate(angle);                         // голова (+x) дивиться на ціль
  // 8 лапок, що ледь перебирають
  ctx.strokeStyle = '#2a2230';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 4; i++) {
      const wiggle = Math.sin(time * 6 + i * 1.3 + side) * 1.2;
      const bx = 3 - i * 3;
      ctx.beginPath();
      ctx.moveTo(bx, 0);
      ctx.lineTo(bx + 3 - i * 1.5, side * (9 + wiggle));
      ctx.lineTo(bx + 5 - i * 3.5, side * (15 + wiggle));
      ctx.stroke();
    }
  }
  // черевце з отруйним візерунком
  ctx.beginPath();
  ctx.ellipse(-6, 0, 8, 6.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#1c1622';
  ctx.fill();
  ctx.fillStyle = TOWERS.spider.color;
  ctx.beginPath();
  ctx.moveTo(-10, 0); ctx.lineTo(-6, -2.5); ctx.lineTo(-2, 0); ctx.lineTo(-6, 2.5);
  ctx.fill();
  // головогруди й очі
  ctx.beginPath();
  ctx.arc(4, 0, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = '#2e2436';
  ctx.fill();
  ctx.fillStyle = '#ff3b3b';
  for (const [ex, ey] of [[6, -1.6], [6, 1.6], [4.5, -2.8], [4.5, 2.8]]) ctx.fillRect(ex - 0.8, ey - 0.8, 1.6, 1.6);
  ctx.restore();
}

function drawGolem(ctx, angle) {
  const breathe = Math.sin(time * 2) * 0.6;
  // кулаки — з боків, трохи вперед до цілі
  const fx = Math.cos(angle) * 4, fy = Math.sin(angle) * 4;
  ctx.fillStyle = '#7d7163';
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1.5;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.rect(s * 13 - 4 + fx, -2 + fy, 8, 8);
    ctx.fill();
    ctx.stroke();
  }
  // кам'яний тулуб з брил
  ctx.fillStyle = TOWERS.golem.color;
  ctx.beginPath();
  ctx.moveTo(-10, -8 - breathe); ctx.lineTo(10, -9 - breathe); ctx.lineTo(12, 6); ctx.lineTo(7, 12);
  ctx.lineTo(-8, 12); ctx.lineTo(-12, 5); ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';     // шви між каменями
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-11, 2); ctx.lineTo(0, 4); ctx.lineTo(11, 1);
  ctx.moveTo(0, 4); ctx.lineTo(-1, 12);
  ctx.stroke();
  ctx.fillStyle = 'rgba(80, 130, 60, 0.7)';  // мох
  ctx.beginPath();
  ctx.ellipse(-6, -7 - breathe, 4, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  // голова-брила з рунними очима
  ctx.fillStyle = '#948878';
  ctx.fillRect(-6, -16 - breathe, 12, 9);
  ctx.save();
  ctx.shadowColor = '#ff9a3c';
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#ffb347';
  ctx.fillRect(-4, -13 - breathe, 3, 2);
  ctx.fillRect(1, -13 - breathe, 3, 2);
  ctx.fillRect(-1, 0, 2, 5);                 // руна на грудях
  ctx.restore();
}

function drawLich(ctx, angle) {
  const hover = Math.sin(time * 2.5) * 1.5;
  ctx.save();
  ctx.translate(0, hover);
  // мантія
  ctx.fillStyle = '#2a1840';
  ctx.beginPath();
  ctx.moveTo(-11, 12); ctx.lineTo(-7, -4); ctx.lineTo(7, -4); ctx.lineTo(11, 12);
  ctx.quadraticCurveTo(0, 8, -11, 12);
  ctx.fill();
  ctx.strokeStyle = TOWERS.lich.color;
  ctx.lineWidth = 1;
  ctx.stroke();
  // посох з кристалом у напрямку цілі
  const sx = Math.cos(angle) * 13, sy = Math.sin(angle) * 13;
  ctx.strokeStyle = '#4a3a2a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx * 0.2, sy * 0.2 + 2); ctx.lineTo(sx, sy);
  ctx.stroke();
  ctx.save();
  ctx.shadowColor = TOWERS.lich.color;
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#e6d4ff';
  ctx.beginPath();
  ctx.arc(sx, sy, 2.5 + Math.sin(time * 10) * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // череп у короні
  ctx.beginPath();
  ctx.arc(0, -8, 6.5, 0, Math.PI * 2);
  ctx.fillStyle = '#ddd6c4';
  ctx.fill();
  ctx.fillStyle = '#1a1014';
  ctx.beginPath();
  ctx.arc(-2.5, -8, 1.8, 0, Math.PI * 2);
  ctx.arc(2.5, -8, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7dffb0';                 // зелені вогники в очницях
  ctx.fillRect(-3, -8.5, 1, 1);
  ctx.fillRect(2, -8.5, 1, 1);
  ctx.fillStyle = '#c9a227';
  ctx.beginPath();
  ctx.moveTo(-6, -12); ctx.lineTo(-5, -17); ctx.lineTo(-2.5, -13.5); ctx.lineTo(0, -18);
  ctx.lineTo(2.5, -13.5); ctx.lineTo(5, -17); ctx.lineTo(6, -12); ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawEye(ctx, angle) {
  const bob = Math.sin(time * 2) * 1.5;
  ctx.save();
  ctx.translate(0, bob - 2);
  // стебельця з маленькими очима зверху
  for (let i = 0; i < 4; i++) {
    const a = -Math.PI / 2 + (i - 1.5) * 0.55;
    const sway = Math.sin(time * 3 + i) * 0.15;
    const ex = Math.cos(a + sway) * 15, ey = Math.sin(a + sway) * 15;
    ctx.strokeStyle = '#6a2a3a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.fillStyle = '#f2e6e0';
    ctx.beginPath();
    ctx.arc(ex, ey, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1014';
    ctx.fillRect(ex - 0.6, ey - 0.6, 1.2, 1.2);
  }
  // тіло-куля
  const grad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 11);
  grad.addColorStop(0, '#c2485e');
  grad.addColorStop(1, '#5a1426');
  ctx.beginPath();
  ctx.arc(0, 0, 10.5, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  // велике око дивиться на ціль
  const px = Math.cos(angle) * 2.5, py = Math.sin(angle) * 2.5;
  ctx.fillStyle = '#fff4ea';
  ctx.beginPath();
  ctx.ellipse(px * 0.5, py * 0.5, 6.5, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.shadowColor = TOWERS.eye.color;
  ctx.shadowBlur = 8;
  ctx.fillStyle = TOWERS.eye.color;
  ctx.beginPath();
  ctx.arc(px, py, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#12080c';
  ctx.beginPath();
  ctx.ellipse(px * 1.2, py * 1.2, 1.2, 2.8, angle, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Малюнок монстра за ключем — і на полі, і в іконках.
const TOWER_DRAW = {
  archer: drawSkeleton, cannon: drawImp, frost: drawGhost,
  spider: drawSpider, golem: drawGolem, lich: drawLich, eye: drawEye,
};

class Projectile {
  constructor(tower, target) {
    this.x = tower.x;
    this.y = tower.y;
    this.target = target;
    this.tx = target.x;
    this.ty = target.y;
    const def = tower.def, s = towerStats(def, tower.level);
    this.speed = def.projSpeed;
    this.damage = s.damage;
    this.splash = def.splash ? def.splash * CELL : 0;
    this.slow = def.slow || 0;
    this.slowTime = def.slowTime || 0;
    this.poison = s.poison;
    this.poisonTime = def.poisonTime || 0;
    this.chain = s.chain;
    this.chainRange = (def.chainRange || 0) * CELL;
    this.detect = !!def.detect;
    this.color = tower.def.color;
    this.kind = tower.type;
    this.angle = tower.angle;
    this.done = false;
  }

  update(dt, game) {
    // якщо ціль ще жива — летимо за нею, інакше до її останньої позиції
    if (!this.target.dead && !this.target.escaped) {
      this.tx = this.target.x;
      this.ty = this.target.y;
    }
    const dx = this.tx - this.x, dy = this.ty - this.y;
    const d = Math.hypot(dx, dy);
    const step = this.speed * dt;
    if (d <= step) {
      this.x = this.tx; this.y = this.ty;
      this.explode(game);
      this.done = true;
    } else {
      this.x += dx / d * step;
      this.y += dy / d * step;
      this.angle = Math.atan2(dy, dx);
    }
  }

  explode(game) {
    if (this.splash) {
      for (const e of game.enemies) {
        if (e.dead || e.escaped) continue;
        if (Math.hypot(e.x - this.x, e.y - this.y) <= this.splash + e.radius) this.applyTo(e);
      }
      game.effects.push({ x: this.x, y: this.y, r: this.splash, t: 0.25, max: 0.25, color: this.color });
    } else if (alive(this.target)) {
      this.applyTo(this.target);
      if (this.chain) this.jump(game);
    }
  }

  // блискавка лича: від цілі до найближчого ще не враженого, урон −25% за стрибок
  jump(game) {
    const hit = new Set([this.target]);
    const points = [{ x: this.target.x, y: this.target.y }];
    let from = this.target, dmg = this.damage;
    for (let i = 0; i < this.chain; i++) {
      let next = null, best = this.chainRange;
      for (const e of game.enemies) {
        if (!alive(e) || hit.has(e) || (e.hidden && !this.detect)) continue;
        const d = Math.hypot(e.x - from.x, e.y - from.y);
        if (d <= best) { best = d; next = e; }
      }
      if (!next) break;
      dmg *= 0.75;
      next.hit(dmg);
      hit.add(next);
      points.push({ x: next.x, y: next.y });
      from = next;
    }
    if (points.length > 1) game.effects.push({ kind: 'bolt', points, t: 0.2, max: 0.2, color: this.color });
  }

  applyTo(e) {
    e.hit(this.damage);
    if (this.slow) e.slow(this.slow, this.slowTime);
    if (this.poison) e.poison(this.poison, this.poisonTime);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.kind === 'archer') {
      // стріла: древко + наконечник + оперення
      ctx.rotate(this.angle);
      ctx.strokeStyle = '#c8b58e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-10, 0); ctx.lineTo(2, 0);
      ctx.stroke();
      ctx.fillStyle = '#9aa3ad';
      ctx.beginPath();
      ctx.moveTo(5, 0); ctx.lineTo(1, -2.5); ctx.lineTo(1, 2.5);
      ctx.fill();
      ctx.fillStyle = '#8b1e3f';
      ctx.fillRect(-10, -2, 3, 4);
    } else if (this.kind === 'spider') {
      // грудка павутини з отрутою, що крутиться в польоті
      ctx.rotate(time * 8);
      ctx.strokeStyle = 'rgba(230, 240, 220, 0.85)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 4;
        ctx.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
        ctx.lineTo(-Math.cos(a) * 6, -Math.sin(a) * 6);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // фаєрбол імпа або крижана куля привида — з сяйвом
      const fire = this.kind === 'cannon';
      ctx.shadowColor = this.color;
      ctx.shadowBlur = fire ? 14 : 10;
      const rad = fire ? 5.5 : 4;
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
      grad.addColorStop(0, fire ? '#fff3b0' : '#ffffff');
      grad.addColorStop(1, this.color);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
