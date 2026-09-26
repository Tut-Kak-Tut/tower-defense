// Іконки монстрів і авантюристів — маленькі canvas; спільні для гри (ui.js) і головної (home.js).

// Малюються один раз тими ж функціями, що й на полі.
function makeIcon(size, paint) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.translate(size / 2, size / 2);
  paint(g);
  return c;
}

function towerIcon(type, size = 32) {
  return makeIcon(size, g => {
    g.scale(size / 40, size / 40);
    g.translate(0, -2);
    TOWER_DRAW[type](g, -Math.PI / 2);
  });
}

function enemyIcon(type, size = 32) {
  const def = ENEMIES[type];
  return makeIcon(size, g => {
    // усі авантюристи однакового розміру в іконці; вершник із конем і списом довший за радіус
    const k = size * 0.36 / def.radius / (type === 'knight' ? 1.5 : 1);
    g.scale(k, k);
    g.rotate(-Math.PI / 2);
    drawAdventurer(g, type, def.radius, def.color);
  });
}
