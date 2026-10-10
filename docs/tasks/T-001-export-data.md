# T-001 Експорт даних балансу з web/ у godot/data/
Залежить від: —
Модель: sonnet
## Мета
Node-скрипт, що завантажує скрипти веб-гри (як `web/tests/harness.js`) і пише дані балансу в JSON для Godot + еталонні значення для тестів порту.

## Файли
- створити: `godot/tools/export_data.js`
- результат запуску: `godot/data/config.json`, `monsters.json`, `adventurers.json`, `waves.json`, `levels.json`, `godot/tests/fixtures/web_reference.json`
- `web/` НЕ змінювати.

## Кроки
- [x] 1. Завантажувач: скопіюй підхід `web/tests/harness.js` (vm-контекст, заглушки DOM, ті самі FILES + `entities.js`, `__get`), але з параметрами `lang` і `search`: `localStorage.getItem(k)` повертає `'ru'` для ключа `dungeon-heart-lang`, коли lang='ru', інакше null. Шлях до web: `path.join(__dirname, '../../web')`.
- [x] 2. Завантаж двічі (uk, ru). Функція `merge(uk, ru)`: рекурсивно по масивах/об'єктах; якщо обидва — рядки й різні → `{"uk": uk, "ru": ru}`; інакше значення uk. Функції пропускай (`JSON.stringify` їх і так відкине). Екземпляри класів → звичайні об'єкти (own props).
- [x] 3. `config.json`: `CELL, COLS, ROWS, DEFAULT_PATH, DEFAULT_TORCHES, START_MONEY, START_LIVES, WAVE_BONUS, WAVE_BONUS_PER, MAX_LEVEL, SELL_REFUND, MAX_TOWERS, SHIELD_REGEN_DELAY, FORMATION_GAP, CAMPAIGN_WAVES` з `config.js` + усі верхньорівневі `const ІМ'Я = <число | масив/об'єкт з чисел>` з `entities.js` (напр. `REVEAL_TIME`; знайди grep-ом `^const [A-Z_]+ =`; об'єкти з функціями чи текстами не бери).
- [x] 4. `monsters.json`: `{"LEVEL_STATS":[…], "ATTACKS":[…], "ROLES":{id: {"uk","ru"}}, "order":[id… у порядку TOWERS], "monsters":{id: {…усі поля Monster, "levels":{стат:[10 значень], "upgrade":[9 цін]}}}}`.
- [x] 5. `adventurers.json`: `{"WAVE_STATS":[…], "order":[…], "ENEMY_UNLOCK":{…}, "SPAWN_GAP":{…}, "adventurers":{id: {…усі поля Adventurer, "waves":[[n,{…}],…]}}}`.
- [x] 6. `waves.json`: `{"waves":{"1":{"groups":[[type,count,interval,gap,buff,cargo], …], "buff":{…}}, … "100":…}}` — групи як є (відсутні/undefined елементи всередині масиву → null, хвіст масиву не доповнюй).
- [x] 7. `levels.json`: `{"order":[id… у порядку LEVELS], "levels":{id: {…усі поля, paths:[{points,weight}], rocks, torches…}}}`.
- [x] 8. `tests/fixtures/web_reference.json` (лише з uk-завантаження):
  - `"hash"`: `[[a,b,seed,value], …]` для a ∈ −2..30, b ∈ −2..12, seed ∈ {0,1,4,7,23,70}; плюс a ∈ {50,99,100}, b ∈ 0..40, seed 7.
  - `"tower_stats"`: `{id: [towerStats(def, L) для L=1..10]}`.
  - `"adventurer_stats"`: `{type: {"n": adventurerStats(type, n, {})}}` для n ∈ {1,2,5,10,25,31,50,66,75,99,100}.
  - `"wave_spawns"`: `{"default": {"n": waveSpawns(n, [1])} для n=1..100, "<levelId>": {"n": waveSpawns(n, ваги шляхів рівня)} для n=1..кількість набігів рівня}` — для рівнів вантаж із `search='?level=<id>'` не потрібен, ваги беруться з `LEVELS[id].paths`.
- [x] 9. JSON писати з відступом 1 пробіл (`JSON.stringify(x, null, 1)`), щоб диф був читабельний. Скрипт друкує, скільки чого записано.
- [x] 10. Онови `godot/.gitignore`, якщо треба (data/ і fixtures/ комітимо).

## Готово, коли
`node godot/tools/export_data.js` з кореня репо відпрацьовує без помилок, усі 6 файлів є, у monsters.json 13 монстрів, adventurers.json 13 авантюристів, waves.json 100 набігів, у назвах монстрів є `{"uk","ru"}`.

## Як перевірити
`node godot/tools/export_data.js && node -e "const m=require('./godot/data/monsters.json');console.log(Object.keys(m.monsters).length, JSON.stringify(m.monsters.archer).slice(0,300))"`
