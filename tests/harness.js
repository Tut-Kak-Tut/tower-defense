// Завантажує скрипти гри в ізольований контекст Node (заглушки DOM), щоб тестувати логіку без браузера.
// get('ІМ'Я') повертає будь-яке глобальне ім'я гри (зокрема const/class, яких немає на globalThis).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const FILES = [
  'i18n', 'config', 'monsters/monster', 'monsters/monsters', 'adventurers/adventurer', 'adventurers/adventurers',
  'waves/wave', 'waves/campaign', 'waves/endless', 'levels/level', 'levels/levels',
];

// search — рядок URL (напр. '?level=t2'), before — код перед entities.js (оголосити тестовий рівень).
function loadGame({ search = '', before = '' } = {}) {
  const read = f => fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8');
  const code = [...FILES.map(read), before, read('entities'),
    'globalThis.__get = name => eval(name);'].join('\n;\n');
  const noop = () => {};
  const el = () => ({ dataset: {}, style: {}, appendChild: noop, addEventListener: noop });
  const ctx = {
    console, URLSearchParams,
    localStorage: { getItem: () => null, setItem: noop },
    location: { search, reload: noop },
    document: { documentElement: {}, body: el(), querySelectorAll: () => [], getElementById: () => null, createElement: el },
  };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return ctx.__get;
}

module.exports = { loadGame };
