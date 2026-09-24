// Інтерфейс: кнопки, миша, клавіатура, панель інформації.

const ui = {
  placing: null,   // тип вежі, яку зараз ставимо
  selected: null,  // вибрана поставлена вежа
  hover: null,     // {col, row} під курсором
};

const $ = id => document.getElementById(id);

// ---------- кнопки веж ----------
const towerButtons = {};
Object.entries(TOWERS).forEach(([type, def], i) => {
  const btn = document.createElement('button');
  btn.className = 'tower-btn';
  btn.innerHTML =
    `<span class="swatch" style="background:${def.color}"></span>` +
    `<span class="t-name">${def.name} <kbd>${i + 1}</kbd></span>` +
    `<span class="t-cost">💰 ${def.cost}</span>` +
    `<span class="t-desc">${def.desc}</span>`;
  btn.addEventListener('click', () => selectTowerType(type));
  $('towerList').appendChild(btn);
  towerButtons[type] = btn;
});

function selectTowerType(type) {
  ui.placing = ui.placing === type ? null : type;
  ui.selected = null;
}

function cancelSelection() {
  ui.placing = null;
  ui.selected = null;
}

// ---------- миша ----------
function cellFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * canvas.width / rect.width;
  const y = (e.clientY - rect.top) * canvas.height / rect.height;
  return { col: Math.floor(x / CELL), row: Math.floor(y / CELL) };
}

canvas.addEventListener('mousemove', e => { ui.hover = cellFromEvent(e); });
canvas.addEventListener('mouseleave', () => { ui.hover = null; });
canvas.addEventListener('contextmenu', e => { e.preventDefault(); cancelSelection(); });

canvas.addEventListener('click', e => {
  if (game.over) return;
  const { col, row } = cellFromEvent(e);
  const t = towerAt(col, row);
  if (t) {
    ui.selected = t;
    ui.placing = null;
  } else if (ui.placing) {
    // вежа лишається вибраною — можна ставити кілька підряд
    if (placeTower(ui.placing, col, row) && game.money < TOWERS[ui.placing].cost) ui.placing = null;
  } else {
    ui.selected = null;
  }
});

// ---------- кнопки керування ----------
$('waveBtn').addEventListener('click', startWave);
$('speedBtn').addEventListener('click', () => { game.speed = game.speed === 1 ? 2 : 1; });
$('pauseBtn').addEventListener('click', () => { game.paused = !game.paused; });
$('upgradeBtn').addEventListener('click', () => { if (ui.selected) upgradeTower(ui.selected); });
$('sellBtn').addEventListener('click', () => {
  if (ui.selected) { sellTower(ui.selected); ui.selected = null; }
});
$('restartBtn').addEventListener('click', () => { newGame(); cancelSelection(); });

// ---------- клавіатура ----------
const towerTypes = Object.keys(TOWERS);
document.addEventListener('keydown', e => {
  if (e.key >= '1' && e.key <= String(towerTypes.length)) selectTowerType(towerTypes[+e.key - 1]);
  else if (e.key === 'Escape') cancelSelection();
  else if (e.key === ' ') { e.preventDefault(); if (!game.over) game.paused = !game.paused; }
  else if (e.key === 'Enter') { e.preventDefault(); startWave(); }
});

// ---------- оновлення панелей (кожен кадр) ----------
function refreshUI() {
  $('money').textContent = game.money;
  $('lives').textContent = game.lives;
  $('wave').textContent = `${game.wave} / ${WAVES.length}`;

  for (const [type, btn] of Object.entries(towerButtons)) {
    btn.classList.toggle('active', ui.placing === type);
    btn.classList.toggle('poor', game.money < TOWERS[type].cost);
  }

  const waveBtn = $('waveBtn');
  waveBtn.disabled = game.waveActive || !!game.over;
  waveBtn.textContent = game.waveActive ? 'Хвиля йде…' : `▶ Почати хвилю ${game.wave + 1}`;
  $('speedBtn').textContent = game.speed === 1 ? '⏩ Швидкість x1' : '⏩ Швидкість x2';
  $('pauseBtn').textContent = game.paused ? '▶ Продовжити' : '⏸ Пауза';

  const t = ui.selected;
  $('info').classList.toggle('hidden', !t);
  if (t) {
    $('infoName').textContent = `${t.def.name} — рівень ${t.level}`;
    $('infoStats').textContent =
      `Урон: ${Math.round(t.damage)} · Дальність: ${(t.range / CELL).toFixed(1)} · Постріл: ${t.def.rate}с`;
    const up = $('upgradeBtn');
    if (t.upgradeCost === null) {
      up.textContent = 'Макс. рівень';
      up.disabled = true;
    } else {
      up.textContent = `⬆ Покращити (💰 ${t.upgradeCost})`;
      up.disabled = game.money < t.upgradeCost;
    }
    $('sellBtn').textContent = `Продати (+💰 ${t.sellValue})`;
  }

  $('overlay').classList.toggle('hidden', !game.over);
  if (game.over) {
    $('overlayTitle').textContent = game.over === 'win' ? '🏆 Перемога!' : '💀 Поразка';
    $('overlayText').textContent = game.over === 'win'
      ? `Усі ${WAVES.length} хвиль відбито. Залишилось життів: ${game.lives}.`
      : `Вороги прорвались на хвилі ${game.wave}.`;
  }
}

// ---------- старт ----------
newGame();
requestAnimationFrame(frame);
