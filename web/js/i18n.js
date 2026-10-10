// Мова інтерфейсу: українська (за замовчуванням) або російська; вибір — у localStorage.
// У коді текст пишемо парою L('укр', 'рос'); у статичному HTML — атрибути data-ru (вміст), data-ru-title (підказка).
// Тексти збираються один раз при завантаженні, тож перемикання мови перезавантажує сторінку.
// Підключається першим скриптом — DOM сторінки на цей момент уже є (скрипти в кінці body).

const LANG_KEY = 'dungeon-heart-lang';
const LANG = (() => {
  try { return localStorage.getItem(LANG_KEY) === 'ru' ? 'ru' : 'uk'; } catch { return 'uk'; }
})();
const L = (uk, ru) => LANG === 'ru' ? ru : uk;

function setLang(lang) {
  try { localStorage.setItem(LANG_KEY, lang); } catch { /* лишиться українська */ }
  location.reload();
}

(function translatePage() {
  document.documentElement.lang = LANG;
  if (LANG === 'ru') {
    for (const el of document.querySelectorAll('[data-ru]')) el.innerHTML = el.dataset.ru;
    for (const el of document.querySelectorAll('[data-ru-title]')) el.title = el.dataset.ruTitle;
    if (document.body.dataset.ruDoc) document.title = document.body.dataset.ruDoc;
  }

  // перемикач мови — у правому верхньому куті: у грі останньою кнопкою HUD, на головній — закріплений
  const btn = document.createElement('button');
  btn.id = 'langBtn';
  btn.textContent = LANG === 'ru' ? 'UA' : 'RU';
  btn.title = LANG === 'ru' ? 'Українська версія' : 'Русская версия';
  btn.addEventListener('click', () => setLang(LANG === 'ru' ? 'uk' : 'ru'));
  const hud = document.getElementById('hud');
  if (hud) { btn.className = 'hud-btn'; hud.appendChild(btn); } else { btn.className = 'lang-fixed'; document.body.appendChild(btn); }
})();
