// Головна сторінка: картки рівнів (LEVELS) і вільна гра. Рівень відкривається як game.html?level=<id>.

const $ = id => document.getElementById(id);
let time = 0; // малювання монстрів читає глобальний час анімацій; на головній він стоїть

// Мініатюра мапи рівня: коридор, факели і Серце; клітинка = PREVIEW_CELL px.
const PREVIEW_CELL = 12;
function mapPreview(level) {
  const c = document.createElement('canvas');
  c.width = COLS * PREVIEW_CELL;
  c.height = ROWS * PREVIEW_CELL;
  c.className = 'lv-map';
  const g = c.getContext('2d');
  const s = PREVIEW_CELL;
  g.fillStyle = '#1b1722';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = 'hsl(30, 8%, 32%)';
  for (const { points: p } of level.paths) {
    for (let i = 1; i < p.length; i++) {
      const [c1, r1] = p[i - 1], [c2, r2] = p[i];
      const x = Math.max(0, Math.min(c1, c2)), y = Math.max(0, Math.min(r1, r2));
      const w = Math.min(COLS - 1, Math.max(c1, c2)) - x + 1, h = Math.min(ROWS - 1, Math.max(r1, r2)) - y + 1;
      g.fillRect(x * s, y * s, w * s, h * s);
    }
  }
  g.fillStyle = 'hsl(260, 6%, 50%)';   // завали
  for (const [rc, rr] of level.rocks) g.fillRect(rc * s + 1, rr * s + 1, s - 2, s - 2);
  g.fillStyle = '#ff9a3c';
  for (const [tc, tr] of level.torches) g.fillRect(tc * s + s / 2 - 2, tr * s + s / 2 - 2, 4, 4);
  const heart = level.paths[0].points;
  const [, er] = heart[heart.length - 1];
  g.fillStyle = '#d43cb4';
  g.shadowColor = '#b35cff';
  g.shadowBlur = 8;
  g.beginPath();
  g.arc((COLS - 1) * s + s / 2, er * s + s / 2, s / 2.4, 0, Math.PI * 2);
  g.fill();
  return c;
}

// Хто з авантюристів з'являється в набігах рівня — у порядку оголошення в adventurers.js.
function levelFoes(level) {
  const types = new Set();
  for (let n = level.from; n <= level.to; n++) for (const [type] of waveGroups(n)) types.add(type);
  return Object.keys(ENEMIES).filter(t => types.has(t));
}

function iconRow(label, icons) {
  const row = document.createElement('div');
  row.className = 'lv-icons';
  row.insertAdjacentHTML('beforeend', `<span class="lv-label">${label}</span>`);
  for (const [icon, title] of icons) {
    icon.title = title;
    row.appendChild(icon);
  }
  return row;
}

// Позначка автосейву на картці: скільки набігів відбито + кнопка «з початку», що стирає сейв.
function saveBadge(card, slot, first) {
  const save = loadSave(slot);
  if (!save) return;
  const badge = document.createElement('div');
  badge.className = 'lv-save';
  badge.textContent = L(`💾 Відбито набігів: ${save.wave - first + 1}`, `💾 Отбито набегов: ${save.wave - first + 1}`);
  const reset = document.createElement('button');
  reset.textContent = L('↺ з початку', '↺ сначала');
  reset.title = L('Стерти збереження', 'Стереть сохранение');
  reset.addEventListener('click', e => {
    e.preventDefault();   // кнопка всередині посилання-картки
    e.stopPropagation();
    deleteSave(slot);
    badge.remove();
  });
  badge.appendChild(reset);
  card.appendChild(badge);
}

const done = loadLevelsDone();
Object.values(LEVELS).forEach((level, i) => {
  const card = document.createElement('a');
  card.className = 'level-card' + (done.includes(level.id) ? ' done' : '');
  card.href = `game.html?level=${level.id}`;
  card.insertAdjacentHTML('beforeend',
    `<h3><span class="lv-num">${i + 1}</span> ${level.name}${done.includes(level.id) ? ' <span class="lv-done" title="Пройдено">✓</span>' : ''}</h3>`);
  card.appendChild(mapPreview(level));
  card.insertAdjacentHTML('beforeend',
    `<p>${level.desc}</p>` +
    `<div class="lv-meta"><span>⚔️ ${level.to - level.from + 1} ${L('набігів', 'набегов')}</span>` +
    `<span>👻 ${level.money}</span><span>💜 ${level.lives}</span></div>`);
  card.appendChild(iconRow(L('Монстри', 'Монстры'), level.monsters.map(t => [towerIcon(t, 28), TOWERS[t].name])));
  card.appendChild(iconRow(L('Прийдуть', 'Придут'), levelFoes(level).map(t => [enemyIcon(t, 24), ENEMIES[t].name])));
  saveBadge(card, saveSlotFor(level.id), level.from);
  $('levelList').appendChild(card);
});

saveBadge(document.querySelector('.free-play a[href="game.html"]'), saveSlotFor(null, false), 1);
saveBadge(document.querySelector('.free-play a[href="game.html?mode=endless"]'), saveSlotFor(null, true), 1);

const best = loadBest();
$('bestText').textContent = best ? L(`Рекорд: ${best} набігів.`, `Рекорд: ${best} набегов.`) : '';
