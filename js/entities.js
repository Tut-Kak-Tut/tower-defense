// Ігрові сутності: вороги, вежі, снаряди.

function cellCenter(col, row) {
  return { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 };
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
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.lineWidth = this.slowTimer > 0 ? 3 : 2;
    ctx.strokeStyle = this.slowTimer > 0 ? '#caf0f8' : 'rgba(0,0,0,0.5)';
    ctx.stroke();

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

  get damage() { return this.def.damage * Math.pow(1.5, this.level - 1); }
  get range() { return (this.def.range + 0.4 * (this.level - 1)) * CELL; }
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
    this.cooldown = this.def.rate;
  }

  draw(ctx) {
    const s = CELL - 8;
    ctx.fillStyle = '#2b2d42';
    ctx.fillRect(this.x - s / 2, this.y - s / 2, s, s);

    // ствол
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = '#8d99ae';
    ctx.fillRect(0, -3, 16, 6);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = this.def.color;
    ctx.fill();

    // рівень — крапки внизу
    ctx.fillStyle = '#ffd166';
    for (let i = 0; i < this.level; i++) {
      ctx.fillRect(this.x - 10 + i * 8, this.y + s / 2 - 5, 5, 3);
    }
  }
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
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.splash ? 5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}
