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

// Відладка: index.html?wave=40&money=5000 — почати одразу з 40-го набігу з 5000 душ.
const DEBUG = new URLSearchParams(location.search);

// mode: 'campaign' | 'endless'; без режиму — стартове меню (гра стоїть, поки over === 'menu').
function newGame(mode = null) {
  game = {
    mode: mode || 'campaign',
    money: +DEBUG.get('money') || START_MONEY,
    lives: START_LIVES,
    wave: Math.max(0, (+DEBUG.get('wave') || 1) - 1), // номер останньої запущеної хвилі
    waveActive: false,
    spawnQueue: [],
    spawnTimer: 0,
    lastInSquad: [],    // останній авантюрист кожного загону — за ним стає наступний
    enemies: [],
    towers: [],
    projectiles: [],
    effects: [],
    speed: 1,
    paused: false,
    auto: false,        // авто-набіг: наступний стартує сам через AUTO_DELAY після зачистки
    autoTimer: 0,
    heartFlash: 0,      // секунди червоного спалаху Серця після удару
    over: mode ? null : 'menu', // 'menu' | 'win' | 'lose'
    seen: new Set(),    // типи авантюристів, що вже з'являлись — для бестіарію
    stats: {},          // тип монстра → {round, total, kills}; запис з'являється, щойно такого поселили
  };
}

const AUTO_DELAY = 3;

const maxWaves = () => game.mode === 'endless' ? Infinity : CAMPAIGN_WAVES;

// Рекорд безкінечного режиму — у браузері; якщо сховище недоступне, просто не зберігаємо.
const BEST_KEY = 'dungeon-heart-endless-best';
function loadBest() {
  try { return +localStorage.getItem(BEST_KEY) || 0; } catch { return 0; }
}
function saveBest(wave) {
  try { if (wave > loadBest()) localStorage.setItem(BEST_KEY, wave); } catch { /* ігноруємо */ }
}

// Після перемоги в кампанії — грати далі тим самим підземеллям.
function continueEndless() {
  game.mode = 'endless';
  game.over = null;
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

// Чи можна зараз поселити монстра цього типу (душі, ліміт підземелля, єдиний орк).
function canAfford(type) {
  const def = TOWERS[type];
  return game.money >= def.cost && game.towers.length < MAX_TOWERS
    && !(def.unique && game.towers.some(t => t.type === type));
}

function placeTower(type, col, row) {
  if (!canPlace(col, row) || !canAfford(type)) return false;
  game.money -= TOWERS[type].cost;
  const t = newTower(type, col, row);
  game.towers.push(t);
  if (!game.stats[type]) game.stats[type] = { round: 0, total: 0, kills: 0 };
  if (t.def.attack === 'buff' && game.waveActive) brew(t);   // відьма, поселена під час набігу, варить одразу
  return true;
}

// Зілля відьми: двом випадковим монстрам, що б'ють, — одному частота атаки, другому урон.
const BREWABLE = t => !['web', 'haunt', 'buff', 'manual'].includes(t.def.attack);
function brew(witch) {
  const pool = game.towers.filter(BREWABLE);
  const v = towerStats(witch.def, witch.level).buff;
  for (const kind of ['rate', 'dmg']) {
    if (!pool.length) return;
    const t = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
    t.buffs.push({ kind, v, from: witch });
  }
}

// Орк кидає валун — лише під час набігу і якщо є заряд.
function throwBoulder(t) {
  if (!game.waveActive || game.over || t.boulders <= 0) return false;
  t.boulders--;
  game.projectiles.push(new Boulder(t));
  return true;
}

// Новий монстр; біхолдер одразу дивиться туди, де на лінії його променя найбільше коридору.
function newTower(type, col, row) {
  const t = new Tower(type, col, row);
  if (t.def.fixedDir) t.setDir(bestDir(col, row, t.def));
  return t;
}

function bestDir(col, row, def) {
  let best = 3, bestN = -1;
  DIRS.forEach((d, i) => {
    const n = beamCoverage(col, row, def.range, def.beamWidth || 0, i);
    if (n > bestN) { bestN = n; best = i; }
  });
  return best;
}

// Скільки клітинок коридору накриває смуга (промінь біхолдера, кидок орка) з клітинки col,row у бік dir.
function beamCoverage(col, row, range, half, dir) {
  const d = DIRS[dir];
  let n = 0;
  for (const key of PATH_CELLS) {
    const [c, r] = key.split(',').map(Number);
    const along = (c - col) * d.dx + (r - row) * d.dy;      // уздовж променя
    const side = Math.abs((c - col) * d.dy - (r - row) * d.dx); // убік від осі
    if (along >= 1 && along <= range && side <= half) n++;
  }
  return n;
}

function upgradeTower(tower) {
  const cost = tower.upgradeCost;
  if (cost === null || game.money < cost) return false;
  game.money -= cost;
  tower.spent += cost;
  tower.level++;
  // орк на 5-му і 10-му рівні одразу отримує ще один валун
  if (tower.def.attack === 'manual') tower.boulders += targetsAt(tower.def, tower.level) - targetsAt(tower.def, tower.level - 1);
  return true;
}

function sellTower(tower) {
  game.money += tower.sellValue;
  game.towers = game.towers.filter(t => t !== tower);
  for (const t of game.towers) t.buffs = t.buffs.filter(b => b.from !== tower);   // зілля вигнаної відьми вивітрюється
}

function startWave() {
  if (game.waveActive || game.over || game.wave >= maxWaves()) return;
  game.wave++;
  for (const st of Object.values(game.stats)) st.round = 0;
  const groups = waveGroups(game.wave);
  game.spawnQueue = [];
  let squad = 0;
  groups.forEach(([type, count, interval, gap], gi) => {
    if (gap !== undefined && gi > 0) squad++;   // група з паузою починає новий загін
    for (let i = 0; i < count; i++) {
      // delay — пауза перед появою цього ворога; у продовженні загону пауза = звичайний інтервал
      const delay = i === 0 ? (gi === 0 ? 0 : gap ?? interval) : interval;
      game.spawnQueue.push({ type, delay, squad });
    }
  });
  game.lastInSquad = [];
  for (const t of game.towers) t.buffs = [];
  for (const t of game.towers) if (t.def.attack === 'buff') brew(t);
  game.spawnTimer = game.spawnQueue[0].delay;
  game.waveActive = true;
}

function update(dt) {
  if (game.auto && !game.waveActive) {
    game.autoTimer -= dt;
    if (game.autoTimer <= 0) startWave();
  }

  // поява ворогів
  if (game.spawnQueue.length) {
    game.spawnTimer -= dt;
    const hp = hpMul(game.wave), reward = rewardMul(game.wave), speed = speedMul(game.wave);
    while (game.spawnQueue.length && game.spawnTimer <= 0) {
      const s = game.spawnQueue.shift();
      game.seen.add(s.type);
      const e = new Enemy(s.type, hp, reward, speed);
      e.leader = game.lastInSquad[s.squad] || null;   // іде за попереднім у своєму загоні
      game.lastInSquad[s.squad] = e;
      game.enemies.push(e);
      if (game.spawnQueue.length) game.spawnTimer += game.spawnQueue[0].delay;
    }
  }

  for (const e of game.enemies) e.update(dt, game);
  for (const t of game.towers) t.update(dt, game);
  for (const p of game.projectiles) p.update(dt, game);
  for (const fx of game.effects) fx.t -= dt;
  game.heartFlash = Math.max(0, game.heartFlash - dt);

  const born = [];   // ті, хто з'явився із загиблих (воїн вершника, половинки шута)
  game.enemies = game.enemies.filter(e => {
    if (e.dead) { game.money += e.reward; born.push(...e.spawnOnDeath()); return false; }
    if (e.escaped) { game.lives -= e.lifeDmg; game.heartFlash = 0.5; return false; }
    return true;
  });
  for (const e of born) game.seen.add(e.type);
  game.enemies.push(...born);
  game.projectiles = game.projectiles.filter(p => !p.done);
  game.effects = game.effects.filter(fx => fx.t > 0);

  if (game.lives <= 0) {
    game.lives = 0;
    game.over = 'lose';
    return;
  }

  if (game.waveActive && !game.spawnQueue.length && !game.enemies.length) {
    game.waveActive = false;
    game.autoTimer = AUTO_DELAY;
    game.money += WAVE_BONUS + game.wave * 5;
    // орк між набігами обтесує ще один валун
    for (const t of game.towers) {
      if (t.def.attack === 'manual') t.boulders = Math.min(targetsAt(t.def, t.level), t.boulders + 1);
    }
    if (game.mode === 'endless') saveBest(game.wave);
    if (game.wave >= maxWaves()) game.over = 'win';
  }
}

// ---------- малювання ----------

const isPath = (c, r) => PATH_CELLS.has(c + ',' + r);

// Статичний шар мапи малюється один раз в offscreen-canvas, далі лише копіюється.
function buildMapLayer() {
  const layer = document.createElement('canvas');
  layer.width = canvas.width;
  layer.height = canvas.height;
  const g = layer.getContext('2d');

  // ніші: кам'яна кладка на всю мапу
  g.fillStyle = '#131017';
  g.fillRect(0, 0, layer.width, layer.height);
  const BH = CELL / 2, BW = CELL;
  for (let by = 0; by * BH < layer.height; by++) {
    const off = by % 2 ? BW / 2 : 0;
    for (let bx = -1; bx * BW < layer.width; bx++) {
      const x = bx * BW + off, y = by * BH;
      const n = hash(bx, by, 1);
      const l = 10 + Math.floor(n * 6);
      g.fillStyle = `hsl(270, 12%, ${l}%)`;
      g.fillRect(x + 1, y + 1, BW - 2, BH - 2);
      g.fillStyle = 'rgba(255,255,255,0.05)';
      g.fillRect(x + 1, y + 1, BW - 2, 1);
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillRect(x + 1, y + BH - 2, BW - 2, 1);
      // тріщина або мох на деяких цеглинах
      const m = hash(bx, by, 2);
      if (m < 0.12) {
        g.strokeStyle = 'rgba(0,0,0,0.5)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(x + 6 + m * 60, y + 2);
        g.lineTo(x + 12 + m * 40, y + BH / 2);
        g.lineTo(x + 8 + m * 80, y + BH - 3);
        g.stroke();
      } else if (m > 0.96) {
        g.fillStyle = 'rgba(70, 110, 60, 0.3)';
        g.beginPath();
        g.ellipse(x + BW * hash(bx, by, 3), y + BH - 3, 7, 3, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
  }

  // коридор: кам'яні плити
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!isPath(c, r)) continue;
      const x = c * CELL, y = r * CELL;
      const l = 27 + Math.floor(hash(c, r, 4) * 6);
      g.fillStyle = `hsl(30, 8%, ${l}%)`;
      g.fillRect(x, y, CELL, CELL);
      // шви між плитами (кожна клітинка — 4 плитки)
      g.strokeStyle = 'rgba(0,0,0,0.35)';
      g.lineWidth = 1;
      g.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
      g.beginPath();
      g.moveTo(x + CELL / 2, y); g.lineTo(x + CELL / 2, y + CELL);
      g.moveTo(x, y + CELL / 2); g.lineTo(x + CELL, y + CELL / 2);
      g.stroke();
      // камінці/плями
      for (let i = 0; i < 3; i++) {
        const k = hash(c, r, 10 + i);
        g.fillStyle = k > 0.5 ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.06)';
        g.fillRect(x + hash(c, r, 20 + i) * (CELL - 4), y + hash(c, r, 30 + i) * (CELL - 4), 2 + k * 3, 2);
      }
    }
  }

  // тінь від стін на краях коридору
  const SH = 9;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (!isPath(c, r)) continue;
      const x = c * CELL, y = r * CELL;
      const sides = [
        [0, -1, x, y, x, y + SH, x, y, CELL, SH],
        [0, 1, x, y + CELL, x, y + CELL - SH, x, y + CELL - SH, CELL, SH],
        [-1, 0, x, y, x + SH, y, x, y, SH, CELL],
        [1, 0, x + CELL, y, x + CELL - SH, y, x + CELL - SH, y, SH, CELL],
      ];
      for (const [dc, dr, x0, y0, x1, y1, rx, ry, rw, rh] of sides) {
        if (isPath(c + dc, r + dr)) continue;
        const grad = g.createLinearGradient(x0, y0, x1, y1);
        grad.addColorStop(0, 'rgba(0,0,0,0.55)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grad;
        g.fillRect(rx, ry, rw, rh);
      }
    }
  }

  // вхід у підземелля — кована ґрата зліва
  const sy = PATH_POINTS[0][1] * CELL;
  g.fillStyle = '#0a080c';
  g.fillRect(0, sy + 2, 10, CELL - 4);
  g.fillStyle = '#5a5060';
  for (let i = 0; i < 4; i++) g.fillRect(1, sy + 6 + i * 8, 10, 2);
  g.fillRect(3, sy + 2, 2, CELL - 4);
  g.fillRect(8, sy + 2, 2, CELL - 4);
  g.fillRect(0, sy, 12, 3);
  g.fillRect(0, sy + CELL - 3, 12, 3);

  return layer;
}

let mapLayer = null;

function drawMap() {
  if (!mapLayer) mapLayer = buildMapLayer();
  ctx.drawImage(mapLayer, 0, 0);
}

// Серце Підземелля — на останній клітинці коридору, пульсує; спалахує червоним при ударі.
function drawHeart() {
  const [ec, er] = PATH_POINTS[PATH_POINTS.length - 1];
  const x = (ec - 1) * CELL + CELL / 2, y = er * CELL + CELL / 2;
  const hurt = game.heartFlash / 0.5;
  const beat = 1.35 + 0.12 * Math.max(0, Math.sin(time * 4)) ** 3 + hurt * 0.2;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(x, y, 4, x, y, 70);
  glow.addColorStop(0, hurt > 0 ? `rgba(255,60,60,${0.55 + hurt * 0.3})` : 'rgba(170,70,255,0.6)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 70, y - 70, 140, 140);
  ctx.restore();

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(beat, beat);
  ctx.shadowColor = hurt > 0 ? '#ff3b3b' : '#b35cff';
  ctx.shadowBlur = 25;
  const body = ctx.createRadialGradient(-4, -5, 1, 0, 0, 16);
  body.addColorStop(0, '#ffc2ea');
  body.addColorStop(0.45, hurt > 0 ? '#ff2a48' : '#d43cb4');
  body.addColorStop(1, '#5a0f48');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, 13);
  ctx.bezierCurveTo(-18, 2, -12, -14, 0, -6);
  ctx.bezierCurveTo(12, -14, 18, 2, 0, 13);
  ctx.fill();
  ctx.restore();
}

function drawTorches() {
  for (const [c, r] of TORCHES) {
    const x = c * CELL + CELL / 2, y = r * CELL + 10;
    const f = Math.sin(time * 9 + c * 3) * 0.5 + Math.sin(time * 23 + r) * 0.5; // мерехтіння -1..1

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const rad = 85 + f * 6;
    const light = ctx.createRadialGradient(x, y, 2, x, y, rad);
    light.addColorStop(0, 'rgba(255,150,60,0.32)');
    light.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = light;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    ctx.restore();

    ctx.fillStyle = '#3a2a1c';                  // тримач
    ctx.fillRect(x - 2, y, 4, 9);
    ctx.fillStyle = '#1e1a22';
    ctx.fillRect(x - 4, y - 1, 8, 3);
    ctx.save();
    ctx.shadowColor = '#ff8c2f';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ff9a3c';
    ctx.beginPath();                            // полум'я
    ctx.moveTo(x - 4, y - 1);
    ctx.quadraticCurveTo(x - 3 + f, y - 10 - f * 2, x + f * 1.5, y - 13 - f * 2);
    ctx.quadraticCurveTo(x + 3 + f, y - 8, x + 4, y - 1);
    ctx.fill();
    ctx.fillStyle = '#ffe28a';
    ctx.beginPath();
    ctx.ellipse(x, y - 4, 1.8, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

let vignette = null;

function drawVignette() {
  if (!vignette) {
    const w = canvas.width, h = canvas.height;
    vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.62);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.7)');
  }
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Зона дії; minRange — мертва зона під монстром (кл.), лишається незафарбованою.
function drawRange(x, y, range, ok, minRange = 0) {
  ctx.beginPath();
  ctx.arc(x, y, range, 0, Math.PI * 2);
  if (minRange) ctx.arc(x, y, minRange * CELL, 0, Math.PI * 2, true);
  ctx.fillStyle = ok ? 'rgba(255,255,255,0.12)' : 'rgba(239,71,111,0.12)';
  ctx.fill();
  ctx.strokeStyle = ok ? 'rgba(255,255,255,0.6)' : 'rgba(239,71,111,0.7)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// Куди б'є біхолдер: смуга на ширину променя + пунктир по осі.
function drawBeamLine(t, ok) {
  const end = t.beamEnd();
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = ok ? 'rgba(255,77,109,0.16)' : 'rgba(239,71,111,0.25)';
  ctx.lineWidth = ((t.def.beamWidth || 0) * 2 + 0.5) * CELL;
  ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(end.x, end.y); ctx.stroke();
  ctx.strokeStyle = ok ? 'rgba(255,200,210,0.75)' : 'rgba(239,71,111,0.8)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 5]);
  ctx.lineDashOffset = -time * 20;
  ctx.stroke();
  ctx.restore();
}

// Короткі ефекти: fx.t спадає від fx.max до 0.
function drawEffect(fx) {
  const k = fx.t / fx.max; // 1 → 0
  ctx.save();
  if (fx.kind === 'beam') {
    // промінь біхолдера: широкий «погляд» + сяйво + яскраве ядро
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.strokeStyle = fx.color;
    ctx.beginPath(); ctx.moveTo(fx.x, fx.y); ctx.lineTo(fx.x2, fx.y2);
    if (fx.w) {
      ctx.globalAlpha = k * 0.18;
      ctx.lineWidth = fx.w * 2 * (0.6 + 0.4 * k);
      ctx.stroke();
    }
    ctx.globalAlpha = k * 0.5;
    ctx.lineWidth = 9 * k + 2;
    ctx.stroke();
    ctx.strokeStyle = '#fff0f2';
    ctx.globalAlpha = k;
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (fx.kind === 'bolt') {
    // блискавка лича: ламана з випадковими зламами між цілями
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#efe2ff';
    ctx.shadowColor = fx.color;
    ctx.shadowBlur = 10;
    ctx.globalAlpha = k;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx.points[0].x, fx.points[0].y);
    for (let i = 1; i < fx.points.length; i++) {
      const a = fx.points[i - 1], b = fx.points[i];
      for (let j = 1; j <= 3; j++) {
        const t = j / 4, off = (Math.random() - 0.5) * 10;
        ctx.lineTo(a.x + (b.x - a.x) * t + off, a.y + (b.y - a.y) * t + off);
      }
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
  } else if (fx.kind === 'cone') {
    // постріл павука: нитки віялом летять від павука, за ними — напівпрозорий слід конуса
    const reach = fx.r * Math.min(1, (1 - k) * 3);
    ctx.translate(fx.x, fx.y);
    ctx.rotate(fx.a);
    ctx.globalAlpha = k * 0.25;
    ctx.fillStyle = fx.color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, reach, -fx.half, fx.half);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = k * 0.9;
    ctx.strokeStyle = '#eef6e4';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const N = 7;
    for (let i = 0; i < N; i++) {
      const a = -fx.half + (2 * fx.half) * i / (N - 1);
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * reach, Math.sin(a) * reach);
    }
    // поперечні нитки — дугами між променями
    for (const f of [0.45, 0.75, 1]) {
      for (let i = 0; i < N; i++) {
        const a = -fx.half + (2 * fx.half) * i / (N - 1);
        const px = Math.cos(a) * reach * f, py = Math.sin(a) * reach * f;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
  } else if (fx.kind === 'spark') {
    // розсіяна магія чи відбитий снаряд: кілька іскор урізнобіч
    ctx.strokeStyle = fx.color;
    ctx.globalAlpha = k;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 + fx.x, r1 = 6 + (1 - k) * 6, r2 = r1 + 5;
      ctx.moveTo(fx.x + Math.cos(a) * r1, fx.y + Math.sin(a) * r1);
      ctx.lineTo(fx.x + Math.cos(a) * r2, fx.y + Math.sin(a) * r2);
    }
    ctx.stroke();
  } else if (fx.kind === 'slash') {
    // замах живих лат: світла дуга поперек цілі
    ctx.strokeStyle = fx.color;
    ctx.globalAlpha = k;
    ctx.lineWidth = 3 * k + 1;
    ctx.lineCap = 'round';
    const sweep = (1 - k) * 1.6;
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, Math.max(12, fx.r), fx.a - 1.3 + sweep, fx.a - 0.2 + sweep);
    ctx.stroke();
  } else if (fx.kind === 'quake') {
    // удар голема: кільце, що розходиться по землі
    ctx.strokeStyle = fx.color;
    ctx.globalAlpha = k * 0.8;
    ctx.lineWidth = 4 * k + 1;
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, fx.r * (1 - k * 0.7), 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // вибух фаєрбола, хвиля лікування
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, fx.r * (1 - k * 0.5), 0, Math.PI * 2);
    ctx.globalAlpha = k * 0.5;
    ctx.fillStyle = fx.color;
    ctx.fill();
  }
  ctx.restore();
}

function draw() {
  drawMap();
  drawTorches();

  // привид вежі під курсором
  if (ui.placing && ui.hover && inBounds(ui.hover.col, ui.hover.row)) {
    const { col, row } = ui.hover;
    const ok = canPlace(col, row) && canAfford(ui.placing);
    ctx.fillStyle = ok ? 'rgba(150,95,220,0.35)' : 'rgba(239,71,111,0.4)';
    ctx.fillRect(col * CELL, row * CELL, CELL, CELL);
    const ghost = newTower(ui.placing, col, row);
    if (ghost.def.fixedDir) drawBeamLine(ghost, ok);
    else if (ghost.range) drawRange(ghost.x, ghost.y, ghost.range, ok, ghost.def.minRange);
    ctx.globalAlpha = 0.55;
    ghost.draw(ctx);
    ctx.globalAlpha = 1;
  }

  if (ui.selected) {
    const t = ui.selected;
    if (t.def.fixedDir) drawBeamLine(t, true);
    else if (t.range) drawRange(t.x, t.y, t.range, true, t.def.minRange);
  }

  for (const t of game.towers) t.draw(ctx);
  for (const e of game.enemies) e.draw(ctx);
  for (const t of game.towers) if (t.links) t.drawLinks(ctx);
  for (const p of game.projectiles) p.draw(ctx);
  for (const fx of game.effects) drawEffect(fx);

  drawVignette();
  drawHeart(); // після віньєтки, щоб головна ціль не тонула в темряві кута

  if (game.paused && !game.over) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#d9c8a9';
    ctx.font = 'bold 40px Cinzel, Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ПАУЗА', canvas.width / 2, canvas.height / 2);
  }
}

let lastTime = performance.now();
let time = 0; // секунди реального часу — для анімацій (факели, привид), не для логіки

function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05); // обмеження, щоб не "телепортувалось" після згортання вкладки
  lastTime = now;
  time += dt;
  if (!game.paused) {
    for (let i = 0; i < game.speed && !game.over; i++) update(dt);
  }
  draw();
  refreshUI();
  requestAnimationFrame(frame);
}
