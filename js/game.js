// Стан гри, логіка хвиль, ігровий цикл і малювання мапи.

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const PATH_CELLS = (() => {
  const cells = new Set();
  for (let i = 0; i < PATH_POINTS.length - 1; i++) {
    let [c, r] = PATH_POINTS[i];
    const [c2, r2] = PATH_POINTS[i + 1];
    const dc = Math.sign(c2 - c), dr = Math.sign(r2 - r);
    cells.add(c + ',' + r);
    while (c !== c2 || r !== r2) {
      c += dc; r += dr;
      cells.add(c + ',' + r);
    }
  }
  return cells;
})();

let game;

function newGame() {
  game = {
    money: START_MONEY,
    lives: START_LIVES,
    wave: 0,            // номер останньої запущеної хвилі
    waveActive: false,
    spawnQueue: [],
    spawnTimer: 0,
    enemies: [],
    towers: [],
    projectiles: [],
    effects: [],
    speed: 1,
    paused: false,
    over: null,         // 'win' | 'lose'
  };
}

function inBounds(col, row) {
  return col >= 0 && col < COLS && row >= 0 && row < ROWS;
}

function towerAt(col, row) {
  return game.towers.find(t => t.col === col && t.row === row) || null;
}

function canPlace(col, row) {
  return inBounds(col, row) && !PATH_CELLS.has(col + ',' + row) && !towerAt(col, row);
}

function placeTower(type, col, row) {
  const cost = TOWERS[type].cost;
  if (!canPlace(col, row) || game.money < cost) return false;
  game.money -= cost;
  game.towers.push(new Tower(type, col, row));
  return true;
}

function upgradeTower(tower) {
  const cost = tower.upgradeCost;
  if (cost === null || game.money < cost) return false;
  game.money -= cost;
  tower.spent += cost;
  tower.level++;
  return true;
}

function sellTower(tower) {
  game.money += tower.sellValue;
  game.towers = game.towers.filter(t => t !== tower);
}

function startWave() {
  if (game.waveActive || game.over || game.wave >= WAVES.length) return;
  const groups = WAVES[game.wave];
  game.wave++;
  game.spawnQueue = [];
  groups.forEach(([type, count, interval], gi) => {
    for (let i = 0; i < count; i++) {
      // delay — пауза перед появою цього ворога; між групами +1.5с
      const delay = i === 0 ? (gi === 0 ? 0 : 1.5) : interval;
      game.spawnQueue.push({ type, delay });
    }
  });
  game.spawnTimer = game.spawnQueue[0].delay;
  game.waveActive = true;
}

function update(dt) {
  // поява ворогів
  if (game.spawnQueue.length) {
    game.spawnTimer -= dt;
    const hpMul = 1 + (game.wave - 1) * HP_GROWTH;
    while (game.spawnQueue.length && game.spawnTimer <= 0) {
      const s = game.spawnQueue.shift();
      game.enemies.push(new Enemy(s.type, hpMul));
      if (game.spawnQueue.length) game.spawnTimer += game.spawnQueue[0].delay;
    }
  }

  for (const e of game.enemies) e.update(dt);
  for (const t of game.towers) t.update(dt, game);
  for (const p of game.projectiles) p.update(dt, game);
  for (const fx of game.effects) fx.t -= dt;

  game.enemies = game.enemies.filter(e => {
    if (e.dead) { game.money += e.reward; return false; }
    if (e.escaped) { game.lives--; return false; }
    return true;
  });
  game.projectiles = game.projectiles.filter(p => !p.done);
  game.effects = game.effects.filter(fx => fx.t > 0);

  if (game.lives <= 0) {
    game.lives = 0;
    game.over = 'lose';
    return;
  }

  if (game.waveActive && !game.spawnQueue.length && !game.enemies.length) {
    game.waveActive = false;
    game.money += WAVE_BONUS + game.wave * 5;
    if (game.wave >= WAVES.length) game.over = 'win';
  }
}

// ---------- малювання ----------

function drawMap() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (PATH_CELLS.has(c + ',' + r)) ctx.fillStyle = '#c9b27c';
      else ctx.fillStyle = (c + r) % 2 ? '#3f6b48' : '#44744e';
      ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
    }
  }
  // вхід і вихід
  const start = PATH_POINTS[0], end = PATH_POINTS[PATH_POINTS.length - 1];
  ctx.fillStyle = '#2a9d8f';
  ctx.fillRect(0, start[1] * CELL, 6, CELL);
  ctx.fillStyle = '#e63946';
  ctx.fillRect(COLS * CELL - 6, end[1] * CELL, 6, CELL);
}

function drawRange(x, y, range, ok) {
  ctx.beginPath();
  ctx.arc(x, y, range, 0, Math.PI * 2);
  ctx.fillStyle = ok ? 'rgba(255,255,255,0.12)' : 'rgba(239,71,111,0.12)';
  ctx.fill();
  ctx.strokeStyle = ok ? 'rgba(255,255,255,0.6)' : 'rgba(239,71,111,0.7)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function draw() {
  drawMap();

  // привид вежі під курсором
  if (ui.placing && ui.hover && inBounds(ui.hover.col, ui.hover.row)) {
    const { col, row } = ui.hover;
    const ok = canPlace(col, row) && game.money >= TOWERS[ui.placing].cost;
    ctx.fillStyle = ok ? 'rgba(110,222,138,0.4)' : 'rgba(239,71,111,0.4)';
    ctx.fillRect(col * CELL, row * CELL, CELL, CELL);
    const c = cellCenter(col, row);
    drawRange(c.x, c.y, TOWERS[ui.placing].range * CELL, ok);
  }

  if (ui.selected) drawRange(ui.selected.x, ui.selected.y, ui.selected.range, true);

  for (const t of game.towers) t.draw(ctx);
  for (const e of game.enemies) e.draw(ctx);
  for (const p of game.projectiles) p.draw(ctx);
  for (const fx of game.effects) {
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, fx.r * (1 - fx.t / fx.max * 0.5), 0, Math.PI * 2);
    ctx.globalAlpha = fx.t / fx.max * 0.5;
    ctx.fillStyle = fx.color;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (game.paused && !game.over) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ПАУЗА', canvas.width / 2, canvas.height / 2);
  }
}

let lastTime = performance.now();

function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05); // обмеження, щоб не "телепортувалось" після згортання вкладки
  lastTime = now;
  if (!game.paused) {
    for (let i = 0; i < game.speed && !game.over; i++) update(dt);
  }
  draw();
  refreshUI();
  requestAnimationFrame(frame);
}
