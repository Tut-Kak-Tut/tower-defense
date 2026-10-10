# Серце Підземелля (tower defense)

Tower defense у браузері в темі підземелля: гравець — володар підземелля, селить монстрів у ніші біля коридору,
авантюристи йдуть коридором до Серця. Запуск: відкрити `index.html` — головна з вибором рівня (сервер не потрібен) або `python -m http.server 8001 --bind 127.0.0.1` → http://127.0.0.1:8001.
Гра — `game.html`: `?level=<id>` рівень, `?mode=endless` безкінечний (рекорд у `localStorage`), без параметрів — кампанія (100 набігів).
Відладка: `game.html?wave=40&money=5000`.

## Стек
HTML5 Canvas + чистий JavaScript, без збірки і залежностей (шрифт Cinzel з Google Fonts, фолбек Georgia).
Скрипти — звичайні `<script>` (не ES-модулі), щоб працювало з `file://`. Порядок підключення важливий:
`i18n.js` → `config.js` → `monsters/monster.js` → `monsters/monsters.js` → `adventurers/adventurer.js` → `adventurers/adventurers.js` → `waves/wave.js` → `waves/campaign.js` → `waves/endless.js` → `levels/level.js` → `levels/levels.js` → `entities.js` → `icons.js` → `game.js` → `save.js` → `ui.js` (у `game.html`; `index.html` замість `game.js`/`ui.js` — `save.js` → `home.js`). Усі мають спільну глобальну область видимості.

## Тема ↔ код
Код лишився з TD-назвами: `Tower` = монстр, `Enemy` = авантюрист, `money` = душі, `lives` = міцність Серця,
`wave` = набіг. Монстри: `archer` скелет-лучник, `cannon` вогняний імп, `frost` привид, `spider` павук,
`golem` голем, `lich` лич, `eye` біхолдер, `slime` слаймо-пулька, `vampire` вампір, `plate` живі лати, `witch` котел відьми,
`orc` орк-швиряка, `grave` кладовище. Авантюристи: `normal` воїн, `fast` злодій, `tank` паладин, `gnome` гном,
`banner` носій прапора, `priest` жрець, `mage` маг, `scout` розвідник, `knight` вершник, `jester` шут, `blade` майстер меча, `hero` герой-бос,
`wagon` телега авантюристів (дуже повільна й міцна, `setSpawnOnDeath([...])` — висипає загін, `setFatal` — дійшла до Серця = поразка).

## Структура
- `js/i18n.js` — мова (укр/рос, `LANG` з `localStorage`): `L('укр', 'рос')` у коді, `data-ru`/`data-ru-title` у HTML, кнопка RU/UA у правому верхньому куті; перемикання перезавантажує сторінку.
- `js/config.js` — загальне: стандартна мапа (`DEFAULT_PATH`, `DEFAULT_TORCHES`), рекорд безкінечного (`loadBest`), `MAX_TOWERS`, `MAX_LEVEL`, `CAMPAIGN_WAVES`, `hash()`.
  Монстри, авантюристи й набіги — у своїх папках (`js/monsters/`, `js/adventurers/`, `js/waves/`).
- `js/monsters/monster.js` — `Monster` (вид монстра) і `MonsterBuilder`: `set…` задають 1-й рівень, `setLevel(N, {upgradeCost, стат…})` —
  що змінюється на рівні N (решта переходить з попереднього). `build()` перевіряє поля/рівні й кладе монстра в реєстр `TOWERS` (оголошений тут же); види атаки описані над `ATTACKS`,
  рівні зберігаються як `def.levels` (масиви на 10 рівнів + `upgrade`), `towerStats()` читає їх за `LEVEL_STATS`.
  Роль `setRole` (обов'язкова, з `ROLES`: attack/support/buff/economy); `monsterTags(def)` — чіпи для UI: роль + тип урону й ефекти, що рахуються з характеристик (нова механіка — додати рядок туди).
- `js/monsters/monsters.js` — самі монстри: по ланцюжку `new MonsterBuilder(id)…build()` на кожного. Баланс монстрів правити тут.
- `js/adventurers/adventurer.js` — `Adventurer` (вид авантюриста) і `AdventurerBuilder`; реєстри `ENEMIES`, `ENEMY_UNLOCK`, `SPAWN_GAP` заповнює `build()`
  (перевіряє обов'язкові поля, набіг появи після 10-го не кратний 5, `setSpawnOnDeath` — лише на вже оголошеного).
  `setEscort(type)` — ходить лише в загоні з `type` (жрець — з паладином); перевіряють `WaveBuilder.build()` і `EndlessBuilder.build()`.
- `js/adventurers/adventurers.js` — самі авантюристи ланцюжками `new AdventurerBuilder(id)…build()`; порядок = порядок на головній (картки рівнів).
  Сила з набігами — опорні точки `setWave(n, {hp, speed, reward, armor, splitReward})`: між ними лінійно, після останньої —
  тим самим темпом (`Adventurer.statsAt(n)`); точки згенеровані зі старої кривої HP `1 + 0.12(n−1) + 0.0019(n−1)²`.
- `js/waves/wave.js` — `WaveBuilder` (`.squad(пауза).add(тип, к-сть, інтервал, баф?)`, `.cargo([типи])` — вантаж попередньої групи (хто висипає при смерті, замість `setSpawnOnDeath`; → `Enemy.cargo`), `.buff({hp, speed, reward, armor})`) → реєстр `WAVES`;
  `waveGroups(n)` (з `WAVES`, інакше генератор безкінечного), `waveBuff(n)`, `mergeBuff`, `routeFor(n, squad, weights)` — шлях загону (зважено через `hash`),
  `waveSpawns(n, weights)` — черга появи з `route` (спільна для `startWave` і панелі набігу), `adventurerStats(type, n, buff)` — сила для `Enemy`.
  Група набігу — `[тип, кількість, інтервал, пауза?, баф?, вантаж?]`: група з паузою починає новий загін; у загоні ніхто не обганяє
  попереднього (`Enemy.leader`, `FORMATION_GAP`), тож стрій «авангард → основа → тил» тримається.
- `js/waves/campaign.js` — усі 100 набігів кампанії ланцюжками `WaveBuilder` (згенеровані зі старого генератора, далі — вручну).
- `js/waves/endless.js` — безкінечний: `EndlessBuilder` (ріст HP і броні після кампанії `setHpGrowth`, бос/тематичний кожні N, бюджет
  «загрози» `threat`, розмір набігу, загони `addSquad` — доступні, коли всі типи відкриті `setUnlockWave`) → `ENDLESS.generate(n)`.
- `js/levels/level.js` — `LevelBuilder` (`setWaves(n)` — перші n набігів кампанії: усі рівні починаються з 1-го, `setMoney` (за замовчуванням `START_MONEY`), `setLives`, `setMonsters`, `addPath(points, weight)` — шлях до Серця,
  їх може бути кілька: вхід зліва/згори/знизу (col −1, row −1 або row `ROWS`), усі закінчуються в одній точці за правим краєм, спільні ділянки дозволені
  (злиття, розвилка), вага — частка загонів; `setRocks([[c, r] | [c, r, w, h]])` — завали, де не можна селити; `setTorches`)
  → реєстр `LEVELS` (`paths: [{points, weight}]`, `rocks` — розгорнуті клітинки); `build()` перевіряє монстрів, коридори (прямі відрізки, без самоперетинів у шляху), каміння й факели. Пройдені — `markLevelDone` у `localStorage`.
- `js/levels/levels.js` — самі рівні; порядок = порядок карток на головній. Рівні відрізняються лише кількістю набігів, мапою й набором монстрів
  (і, де треба, стартовими душами). Короткий коридор (< ~35 кл.) і кілька шляхів роблять рівень помітно важчим.
- `js/save.js` — автосейв у `localStorage`, слот на вхід (`saveSlotFor`: `campaign` / `endless` / `level-<id>`). Пишемо лише між набігами
  (`autosave()` після зачистки, поселення/посилення/продажу, на `pagehide`), тож посеред набігу знімок не потрібен — продовження з його початку.
  Поразка/пройдений рівень/«Грати знову» стирають сейв; відладка `?wave=`/`?money=` сейв не чіпає. Нове поле монстра/`game`, що живе
  між набігами, — додати в `snapshot()` і `restoreSave()`; несумісна зміна формату — підняти `SAVE_VERSION`.
- `js/home.js` — головна (`index.html`): картки рівнів (мініатюра мапи, монстри, авантюристи з `waveGroups`) і вільна гра.
- `js/icons.js` — `towerIcon`/`enemyIcon` (спільні для гри й головної).
- `js/entities.js` — поточний рівень `LEVEL` (з `?level=`) і мапа: `ROUTE_POINTS`/`ROUTE_WEIGHTS` (шляхи рівня або `[DEFAULT_PATH]`), `ROUTES[i] = {px, len}`, `routeLetter(i)` (A, B…), `ROCKS`, `TORCHES`; `towerStats(def, level)` (усі характеристики на рівні — і для гри, і для UI; `Tower.stats()` — те саме
  з бафами відьми `tower.buffs`, у грі брати його), `targetsAt()` (цілі/валуни на рівні), `Enemy`
  (`route` — індекс свого шляху, `setRoute(i, p)`; `setProgress(p)` ставить на будь-яке місце свого шляху за `ROUTES[route].len`, породжені успадковують шлях; `spawnOnDeath()` — воїн вершника, половинки шута,
  їм ставиться `summoned` і `origin` — панель набігу рахує за `origin`; `speed` — з прискоренням носія прапора `hasted`;
  носій прапора `undying` не падає нижче 1 HP, поки живий хтось не-`undying` (`hasGuards`), і монстри цілять його останнім (`Tower.priority` / `betterTarget`); щит паладина `shieldAura`
  поглинає урон і по сусідах (`shieldGuards`); `magicWard` мага повністю гасить магічний урон (`TOWERS[src].magic`) по собі й поруч;
  броня `physArmor` (гном) не діє проти магії; `Tower.canHit(e)` — хто кого взагалі може цілити; `Tower.aim` — фільтр цілі з `TARGET_MODES` (перший/останній/сильний/слабкий/ближній), `Tower.aims` — чи монстр сам обирає ціль),
  (броня/щит/отрута/лікування/оглушення/невидимість через `hidden`/`revealed`), `Tower` (атаки `projectile`/`aura`/`beam`/`web` — павук раз на `rate` стріляє павутиною в конус `cone` перед собою — усі в ньому стоять `hold` с через `stun(t, webbed)` (кокон замість зірочок, ефект `cone`), без урону; з рівнем ростуть утримання, дальність і частота,
  детектори підсвічують невидимих; біхолдер `fixedDir` б'є смугою `beamWidth` у бік `dir` з `DIRS`, зона дії — `reaches(e)`
  (з мертвою зоною `minRange`); `haunt` привида, `drain` вампіра (`links` + `drawLinks`), `cleave` лат (ближній удар + фізичний сплеш `splash` навколо цілі), `buff`, `manual` і `grave` —
  без власної атаки; кладовище рахує смерті `deaths`, кожна `every`-та дає `souls` душ — `graveDeath()` у game.js), `Boulder` (валун орка живе в `game.projectiles`: відкидає назад через `setProgress`, крім `steadfast`),
  `Projectile` (сплеш, сповільнення, отрута, ланцюг `jump`),
  малювання: `drawAdventurer` (switch за типом), монстри через мапу `TOWER_DRAW`.
- `js/game.js` — стан `game` (`mode`: 'campaign'|'endless'|'level', `over`: 'win'|'lose', `auto`, `stats` — урон/вбивства за типом монстра), `startWave`
  (скидає бафи й варить нові — `brew()`), `update(dt)` (після набігу орк отримує валун), рекорд, `canAfford` (душі, ліміт,
  `unique`), `throwBoulder`, `newTower` (біхолдер/орк одразу дивляться за `bestDir`);
  `PATH_CELLS` — коридор усіх шляхів, `ROCK_CELLS` — завали (обидва відкидає `canPlace`);
  малювання: `buildMapLayer()` (кеш; `drawGate` — ґрата на кожному вході з мітками шляхів, `drawRubble` — завали), факели, Серце, віньєтка, `drawEffect` (ефекти за `kind`: beam/bolt/quake/кола); цикл `frame`.
- `js/ui.js` — об'єкт `ui` (placing/selected/hover/tab), події миші й клавіатури (монстри — `towerTypes`, у рівні лише його; вибір монстра — лише кліком;
  подвійний клік по орку — кидок), `refreshUI()` кожен кадр, `refreshOverlay()` (кінець гри), старт гри за URL; 🏠 — на головну.
  Розкладка: зліва панель набігу (`refreshRaid`; наведення на рядок — картка авантюриста `showFoeTip` із силою на цьому набігу й `enemyTraits`,
  позначка «новий» — за `game.seen`, хто ще не з'являвся за цю гру; коли шляхів кілька — мітка шляхів `f-route` з `waveSpawns`); окремого бестіарію немає;
  центр — canvas; справа вкладки «Монстри» / «Посилення» (`refreshUpgrade`, «зараз → після» через `towerStats()`).
  Рядки характеристик для обох — `statRows(def, levels, tower?)`; 🔍 у картці монстра — вікно `openMonsterView` (рівні `VIEW_LEVELS` 1/5/10, гра на паузі).
  Праворуч від вкладок — окрема колонка статистики (`refreshStats`): урон за набіг / за гру / вбивства; урон зараховується через `Enemy.hit(dmg, pierce, src)`
  (`src` = тип монстра, отрута пам'ятає `poisonSrc`) — нова атака має передавати `src`.
  Музика — `MUSIC` у `ui.js`, файли в `music/` (CC0, автори в `music/CREDITS.txt`), кнопка 🔊 / `M`.
  Іконки в панелях — маленькі canvas, що малюються тими ж функціями (`towerIcon`, `enemyIcon` з `icons.js`).
- `style.css` — темний «кам'яний» інтерфейс, кольори в CSS-змінних `:root`.

## Правила
- Будь-який текст для гравця — дві мови: `L('укр', 'рос')` у JS (і в `setName`/`setDescription`/`setDesc`), `data-ru` у HTML. Повідомлення помилок (`throw`) — лише українською.
- Графіка — лише примітиви Canvas, без картинок.
- Відстані в config — у клітинках (`CELL` = 40px), швидкості ворогів — px/с.
- Новий монстр = ланцюжок `MonsterBuilder` у `monsters.js` (з `setLevel` на 2…10) + функція малювання в `TOWER_DRAW`; новий авантюрист = ланцюжок `AdventurerBuilder` в `adventurers.js` (з `setSpawnGap` і `setWave`)
  + `case` у `drawAdventurer()` + поява в набігах `campaign.js` + (для безкінечного) `setUnlockWave` і місце в загоні `addSquad`. Новий рівень = ланцюжок `LevelBuilder` у `levels.js` (`addPath` + `setRocks`/`setTorches`). Нова характеристика, що росте з рівнем, — ключ у `LEVEL_STATS` (monster.js), рядок у `refreshUpgrade` і `levelGains`.
- Для безкінечного `setUnlockWave` > 100 — не кратний 5 (там тематичні/бос-набіги, новачок не потрапить першим).
- Склад набігів детермінований (генератор — через `hash`), бо панель показує його наперед — не використовуй там `Math.random`.
- Статичне малюємо в `buildMapLayer()` (з `hash()`, щоб не мерехтіло); анімації — через глобальний `time`, не через ігровий `dt`.
- `refreshUI()` не перестворює DOM кожен кадр (лише textContent/класи), інакше ламаються кліки.
- Баланс перевіряли headless-прогоном у Node (заглушки DOM + бот): бот проходить кампанію з поодинокими проривами;
  метрика — середня частка шляху, яку проходять вороги, по десятках набігів (має рости з ~0.2 до ~0.35–0.4).
  Край складності — квадратичний коефіцієнт кривої HP ~0.0022–0.0025 (зараз 0.0019, тепер закладений у `setWave`): вище бот уже не проходить 100-й набіг
  (знизили з 0.003, коли привид перестав сповільнювати всіх). Бот не кидає валуни й не підлаштовується під магів/невидимих.
  Безкінечний після 100-го — ще ×1.02 HP і броні за набіг (`setHpGrowth`), тож максимально прокачана оборона падає невдовзі після 100-го.
  Невидимі (розвідник з 31-го, шут з 66-го) — головний спайк: детектор підсвічує їх ще `REVEAL_TIME` с після виходу з зони (entities.js).
  Бот 2026-10 (18 монстрів, детектори, ставить на злиття шляхів) проходить рівні до 60 набігів; максимально прокачаний упирається в ~66-й (шути).

## Тести
`node --test` з кореня (Node 24, без залежностей) — `tests/*.test.js`. `tests/harness.js`: `loadGame({search, before})` вантажить скрипти
від `i18n.js` до `entities.js` у vm-контекст із заглушками DOM і повертає `get('ІМ'Я')` для будь-якого глобального імені;
`before` — код перед `entities.js` (оголосити тестовий рівень для `?level=`). Масиви з контексту мають інший прототип — порівнювати `assert.deepEqual`.
