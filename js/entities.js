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
  };
}

const PATH_PX = PATH_POINTS.map(([c, r]) => cellCenter(c, r));

class Enemy {
  constructor(type, hpMul) {
    const def = ENEMIES[type];
    this.type = type;
    this.color = def.color;
    this.radius = def.radius;
    this.baseSpeed = def.speed;
    this.reward = def.reward;
    this.maxHp = Math.round(def.hp * hpMul);
    this.hp = this.maxHp;
    this.x = PATH_PX[0].x;
    this.y = PATH_PX[0].y;
    this.wp = 1;          // індекс наступної точки шляху
    this.progress = 0;    // пройдена відстань — вежі цілять у найдальшого
    this.slowFactor = 1;
    this.slowTimer = 0;
    this.dir = 0;
    this.dead = false;
    this.escaped = false;
  }

  update(dt) {
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) this.slowFactor = 1;
    }
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

  hit(damage) {
    this.hp -= damage;
    if (this.hp <= 0) this.dead = true;
  }

  slow(factor, time) {
    this.slowFactor = Math.min(this.slowFactor, factor);
    this.slowTimer = Math.max(this.slowTimer, time);
  }

  draw(ctx) {
    const r = this.radius;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + r * 0.6, r, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fill();

    // фігурка зверху, повернута за напрямком руху (вперед = +x)
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.dir);
    drawAdventurer(ctx, this.type, r, this.color);
    ctx.restore();

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

    // смужка HP
    const w = 24, h = 4;
    const x = this.x - w / 2, y = this.y - this.radius - 8;
    const frac = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = '#222';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = frac > 0.5 ? '#6ede8a' : frac > 0.25 ? '#ffd166' : '#ef476f';
    ctx.fillRect(x, y, w * frac, h);
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
    this.cooldown -= dt;
    if (this.cooldown > 0) return;
    let target = null;
    for (const e of game.enemies) {
      if (e.dead || e.escaped) continue;
      if (Math.hypot(e.x - this.x, e.y - this.y) > this.range + e.radius) continue;
      if (!target || e.progress > target.progress) target = e;
    }
    if (!target) return;
    this.angle = Math.atan2(target.y - this.y, target.x - this.x);
    game.projectiles.push(new Projectile(this, target));
    this.cooldown = towerStats(this.def, this.level).rate;
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
    if (this.type === 'archer') drawSkeleton(ctx, this.angle);
    else if (this.type === 'cannon') drawImp(ctx, this.angle);
    else drawGhost(ctx, this.angle);
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
  // зброя в правій руці (права = +y при погляді вздовж +x)
  if (type === 'fast') {
    ctx.fillStyle = '#cfd6de';
    ctx.fillRect(r * 0.2, r * 0.55, r * 0.9, 2);             // кинджал
  } else {
    ctx.fillStyle = '#dfe4ea';
    ctx.fillRect(r * 0.1, r * 0.6 - 1.5, r * 1.2, 3);        // меч
    ctx.fillStyle = '#6b4a2b';
    ctx.fillRect(r * 0.05, r * 0.6 - 3, 2, 6);               // гарда
  }
  // плечі / тулуб
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.6, r, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // голова
  ctx.beginPath();
  ctx.arc(r * 0.1, 0, r * 0.45, 0, Math.PI * 2);
  if (type === 'fast') {
    ctx.fillStyle = '#2e4a2b';                                // каптур
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, -r * 0.35); ctx.lineTo(-r * 0.75, 0); ctx.lineTo(-r * 0.2, r * 0.35);
    ctx.fill();
  } else {
    ctx.fillStyle = type === 'tank' ? '#f2d98a' : '#8e98a6'; // шолом
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(r * 0.3, -r * 0.3, 1.5, r * 0.6);            // прорізь забрала
  }
  // щит паладина зліва-спереду
  if (type === 'tank') {
    ctx.save();
    ctx.translate(r * 0.55, -r * 0.7);
    ctx.fillStyle = '#2f5aa8';
    ctx.strokeStyle = '#e6c35c';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 3, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
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

class Projectile {
  constructor(tower, target) {
    this.x = tower.x;
    this.y = tower.y;
    this.target = target;
    this.tx = target.x;
    this.ty = target.y;
    this.speed = tower.def.projSpeed;
    this.damage = tower.damage;
    this.splash = tower.def.splash ? tower.def.splash * CELL : 0;
    this.slow = tower.def.slow || 0;
    this.slowTime = tower.def.slowTime || 0;
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
    } else if (!this.target.dead && !this.target.escaped) {
      this.applyTo(this.target);
    }
  }

  applyTo(e) {
    e.hit(this.damage);
    if (this.slow) e.slow(this.slow, this.slowTime);
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
