// Автосейв у localStorage: один слот на кожен вхід у гру — кампанія, безкінечний, кожен рівень.
// Пишемо лише між набігами (зачистка, поселення/посилення/продаж, закриття сторінки), тож посеред набігу
// знімок не потрібен: після перезавантаження гра продовжиться з початку того набігу.

const SAVE_PREFIX = 'dungeon-heart-save-';
const SAVE_VERSION = 1;

// Слот за URL: 'level-<id>' | 'endless' | 'campaign' (кампанія лишається в своєму слоті й після «продовжити безкінечно»).
const saveSlotFor = (levelId, endless) => levelId ? 'level-' + levelId : endless ? 'endless' : 'campaign';

function loadSave(slot) {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_PREFIX + slot));
    return s && s.v === SAVE_VERSION ? s : null;
  } catch { return null; }
}

function deleteSave(slot) {
  try { localStorage.removeItem(SAVE_PREFIX + slot); } catch { /* ігноруємо */ }
}

// ---------- лише в грі (game.html): знімок і відновлення стану game ----------

// Відладка (?wave=, ?money=) не читає й не пише сейв, щоб не затерти справжню гру.
const saveSlot = () => DEBUG.has('wave') || DEBUG.has('money') ? null
  : saveSlotFor(LEVEL && LEVEL.id, DEBUG.get('mode') === 'endless');

function snapshot() {
  return {
    v: SAVE_VERSION,
    mode: game.mode,
    wave: game.wave,
    money: game.money,
    lives: game.lives,
    auto: game.auto,
    over: game.over,
    seen: [...game.seen],
    stats: game.stats,
    towers: game.towers.map(t => ({
      type: t.type, col: t.col, row: t.row, level: t.level, spent: t.spent, aim: t.aim,
      dir: t.dir, boulders: t.boulders, deaths: t.deaths,
    })),
  };
}

// Зберегти, якщо набіг не йде; поразка чи пройдений рівень стирають сейв (грати далі нема чого).
function autosave() {
  const slot = saveSlot();
  if (!slot) return;
  if (game.over === 'lose' || (game.over === 'win' && game.mode === 'level')) { deleteSave(slot); return; }
  if (game.waveActive) return;
  try { localStorage.setItem(SAVE_PREFIX + slot, JSON.stringify(snapshot())); } catch { /* сховище недоступне */ }
}

// Відновити збережену гру поверх щойно створеної newGame(); false — сейву нема або він не підходить.
function restoreSave() {
  const slot = saveSlot();
  const s = slot && loadSave(slot);
  if (!s) return false;
  try {
    const towers = s.towers.map(d => {
      if (!TOWERS[d.type]) throw new Error(`невідомий монстр ${d.type}`);
      const t = newTower(d.type, d.col, d.row);
      t.level = Math.min(MAX_LEVEL, d.level);
      t.spent = d.spent;
      t.aim = d.aim in TARGET_MODES ? d.aim : t.aim;
      if (t.def.fixedDir && d.dir !== undefined) t.setDir(d.dir);
      if (d.boulders !== undefined && t.def.attack === 'manual') t.boulders = d.boulders;
      if (d.deaths !== undefined && t.def.attack === 'grave') t.deaths = d.deaths;
      return t;
    });
    Object.assign(game, {
      mode: s.mode, wave: s.wave, money: s.money, lives: s.lives, auto: s.auto, over: s.over,
      seen: new Set(s.seen.filter(type => ENEMIES[type])), stats: s.stats, towers,
    });
    game.autoTimer = AUTO_DELAY;
    return true;
  } catch {
    deleteSave(slot);   // зіпсований сейв — починаємо заново
    return false;
  }
}
