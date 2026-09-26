# Серце Підземелля (tower defense)

Tower defense у браузері в темі підземелля: гравець — володар підземелля, селить монстрів у ніші біля коридору,
авантюристи йдуть коридором до Серця. Запуск: відкрити `index.html` — головна з вибором рівня (сервер не потрібен) або `docker compose up -d --build` → http://localhost:8001 (nginx).
Гра — `game.html`: `?level=<id>` рівень, `?mode=endless` безкінечний (рекорд у `localStorage`), без параметрів — кампанія (100 набігів).
Відладка: `game.html?wave=40&money=5000`.

## Стек
HTML5 Canvas + чистий JavaScript, без збірки і залежностей (шрифт Cinzel з Google Fonts, фолбек Georgia).
Скрипти — звичайні `<script>` (не ES-модулі), щоб працювало з `file://`. Порядок підключення важливий:
`i18n.js` → `config.js` → `monsters/monster.js` → `monsters/monsters.js` → `adventurers/adventurer.js` → `adventurers/adventurers.js` → `waves/wave.js` → `waves/campaign.js` → `waves/endless.js` → `levels/level.js` → `levels/levels.js` → `entities.js` → `icons.js` → `game.js` → `ui.js` (у `game.html`; `index.html` замість `game.js`/`ui.js` — `home.js`). Усі мають спільну глобальну область видимості.

## Тема ↔ код
Код лишився з TD-назвами: `Tower` = монстр, `Enemy` = авантюрист, `money` = душі, `lives` = міцність Серця,
`wave` = набіг. Монстри: `archer` скелет-лучник, `cannon` вогняний імп, `frost` привид, `spider` павук,
`golem` голем, `lich` лич, `eye` біхолдер, `slime` слаймо-пулька, `vampire` вампір, `plate` живі лати, `witch` котел відьми,
`orc` орк-швиряка, `grave` кладовище. Авантюристи: `normal` воїн, `fast` злодій, `tank` паладин, `gnome` гном,
`banner` носій прапора, `priest` жрець, `mage` маг, `scout` розвідник, `knight` вершник, `jester` шут, `blade` майстер меча, `hero` герой-бос.

## Структура
- `js/i18n.js` — мова (укр/рос, `LANG` з `localStorage`): `L('укр', 'рос')` у коді, `data-ru`/`data-ru-title` у HTML, кнопка RU/UA у правому верхньому куті; перемикання перезавантажує сторінку.
- `js/config.js` — загальне: стандартна мапа (`DEFAULT_PATH`, `DEFAULT_TORCHES`), рекорд безкінечного (`loadBest`), `MAX_TOWERS`, `MAX_LEVEL`, `CAMPAIGN_WAVES`, `hash()`.
  Монстри, авантюристи й набіги — у своїх папках (`js/monsters/`, `js/adventurers/`, `js/waves/`).
- `js/monsters/monster.js` — `Monster` (вид монстра) і `MonsterBuilder`: `set…` задають 1-й рівень, `setLevel(N, {upgradeCost, стат…})` —
  що змінюється на рівні N (решта переходить з попереднього). `build()` перевіряє поля/рівні й кладе монстра в реєстр `TOWERS` (оголошений тут же); види атаки описані над `ATTACKS`,
  рівні зберігаються як `def.levels` (масиви на 10 рівнів + `upgrade`), `towerStats()` читає їх за `LEVEL_STATS`.
- `js/monsters/monsters.js` — самі монстри: по ланцюжку `new MonsterBuilder(id)…build()` на кожного. Баланс монстрів правити тут.
- `js/adventurers/adventurer.js` — `Adventurer` (вид авантюриста) і `AdventurerBuilder`; реєстри `ENEMIES`, `ENEMY_UNLOCK`, `SPAWN_GAP` заповнює `build()`
  (перевіряє обов'язкові поля, набіг появи після 10-го не кратний 5, `setSpawnOnDeath` — лише на вже оголошеного).
  `setEscort(type)` — ходить лише в загоні з `type` (жрець — з паладином); перевіряють `WaveBuilder.build()` і `EndlessBuilder.build()`.
- `js/adventurers/adventurers.js` — самі авантюристи ланцюжками `new AdventurerBuilder(id)…build()`; порядок = порядок у бестіарії.
  Сила з набігами — опорні точки `setWave(n, {hp, speed, reward, armor, splitReward})`: між ними лінійно, після останньої —
  тим самим темпом (`Adventurer.statsAt(n)`); точки згенеровані зі старої кривої HP `1 + 0.12(n−1) + 0.0019(n−1)²`.
- `js/waves/wave.js` — `WaveBuilder` (`.squad(пауза).add(тип, к-сть, інтервал, баф?)`, `.buff({hp, speed, reward, armor})`) → реєстр `WAVES`;
  `waveGroups(n)` (з `WAVES`, інакше генератор безкінечного), `waveBuff(n)`, `mergeBuff`, `adventurerStats(type, n, buff)` — сила для `Enemy`.
  Група набігу — `[тип, кількість, інтервал, пауза?, баф?]`: група з паузою починає новий загін; у загоні ніхто не обганяє
  попереднього (`Enemy.leader`, `FORMATION_GAP`), тож стрій «авангард → основа → тил» тримається.
- `js/waves/campaign.js` — усі 100 набігів кампанії ланцюжками `WaveBuilder` (згенеровані зі старого генератора, далі — вручну).
- `js/waves/endless.js` — безкінечний: `EndlessBuilder` (ріст HP і броні після кампанії `setHpGrowth`, бос/тематичний кожні N, бюджет
  «загрози» `threat`, розмір набігу, загони `addSquad` — доступні, коли всі типи відкриті `setUnlockWave`) → `ENDLESS.generate(n)`.
- `js/levels/level.js` — `LevelBuilder` (`setWaves(from, to)` — відрізок набігів кампанії, `setMoney`, `setLives`, `setMonsters`, `setMap(path, torches)`)
  → реєстр `LEVELS`; `build()` перевіряє монстрів і коридор (від col −1 до `COLS`, прямі відрізки, без самоперетинів). Пройдені — `markLevelDone` у `localStorage`.
- `js/levels/levels.js` — самі рівні; порядок = порядок карток на головній. Стартові душі — ≈ дохід кампанії до першого набігу рівня.
- `js/home.js` — головна (`index.html`): картки рівнів (мініатюра мапи, монстри, авантюристи з `waveGroups`) і вільна гра.
- `js/icons.js` — `towerIcon`/`enemyIcon` (спільні для гри й головної).
- `js/entities.js` — поточний рівень `LEVEL` (з `?level=`) і мапа `PATH_POINTS`/`TORCHES` (рівня або стандартна); `towerStats(def, level)` (усі характеристики на рівні — і для гри, і для UI; `Tower.stats()` — те саме
  з бафами відьми `tower.buffs`, у грі брати його), `targetsAt()` (цілі/валуни на рівні), `Enemy`
  (`setProgress(p)` ставить на будь-яке місце шляху за `PATH_LEN`; `spawnOnDeath()` — воїн вершника, половинки шута,
  їм ставиться `summoned` і `origin` — панель набігу рахує за `origin`; `speed` — з прискоренням носія прапора `hasted`;
  носій прапора `undying` не падає нижче 1 HP, поки живий хтось не-`undying` (`hasGuards`); щит паладина `shieldAura`
  поглинає урон і по сусідах (`shieldGuards`); `magicWard` мага ріже магічний урон (`TOWERS[src].magic`) поруч;
  броня `physArmor` (гном) не діє проти магії; `Tower.canHit(e)` — хто кого взагалі може цілити; `Tower.aim` — фільтр цілі з `TARGET_MODES` (перший/останній/сильний/слабкий/ближній), `Tower.aims` — чи монстр сам обирає ціль),
  (броня/щит/отрута/лікування/оглушення/невидимість через `hidden`/`revealed`), `Tower` (атаки `projectile`/`aura`/`beam`/`web` — павук раз на `rate` стріляє павутиною в конус `cone` перед собою — усі в ньому стоять `hold` с через `stun(t, webbed)` (кокон замість зірочок, ефект `cone`), без урону; з рівнем ростуть утримання, дальність і частота,
  детектори підсвічують невидимих; біхолдер `fixedDir` б'є смугою `beamWidth` у бік `dir` з `DIRS`, зона дії — `reaches(e)`
  (з мертвою зоною `minRange`); `haunt` привида, `drain` вампіра (`links` + `drawLinks`), `cleave` лат (ближній удар + фізичний сплеш `splash` навколо цілі), `buff`, `manual` і `grave` —
  без власної атаки; кладовище рахує смерті `deaths`, кожна `every`-та дає `souls` душ — `graveDeath()` у game.js), `Boulder` (валун орка живе в `game.projectiles`: відкидає назад через `setProgress`, крім `steadfast`),
  `Projectile` (сплеш, сповільнення, отрута, ланцюг `jump`),
  малювання: `drawAdventurer` (switch за типом), монстри через мапу `TOWER_DRAW`.
- `js/game.js` — стан `game` (`mode`: 'campaign'|'endless'|'level', `first` — перший набіг, `waveNo(n)` — номер для показу, `over`: 'win'|'lose', `auto`, `stats` — урон/вбивства за типом монстра), `startWave`
  (скидає бафи й варить нові — `brew()`), `update(dt)` (після набігу орк отримує валун), рекорд, `canAfford` (душі, ліміт,
  `unique`), `throwBoulder`, `newTower` (біхолдер/орк одразу дивляться за `bestDir`);
  малювання: `buildMapLayer()` (кеш), факели, Серце, віньєтка, `drawEffect` (ефекти за `kind`: beam/bolt/quake/кола); цикл `frame`.
- `js/ui.js` — об'єкт `ui` (placing/selected/hover/tab), події миші й клавіатури (монстри — `towerTypes`, у рівні лише його; клавіші `TOWER_KEYS` 1…9, 0, -, =, [;
  подвійний клік по орку — кидок), `refreshUI()` кожен кадр, `refreshOverlay()` (кінець гри), старт гри за URL; 🏠 — на головну.
  Розкладка: зліва панель набігу (`refreshRaid`) і бестіарій (`refreshBestiary`, за `game.seen` — хто вже з'являвся за цю гру);
  центр — canvas; справа вкладки «Монстри» / «Посилення» (`refreshUpgrade`, «зараз → після» через `towerStats()`).
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
  + `case` у `drawAdventurer()` + поява в набігах `campaign.js` + (для безкінечного) `setUnlockWave` і місце в загоні `addSquad`. Новий рівень = ланцюжок `LevelBuilder` у `levels.js`. Нова характеристика, що росте з рівнем, — ключ у `LEVEL_STATS` (monster.js), рядок у `refreshUpgrade` і `levelGains`.
- Для безкінечного `setUnlockWave` > 100 — не кратний 5 (там тематичні/бос-набіги, новачок не потрапить першим).
- Склад набігів детермінований (генератор — через `hash`), бо панель показує його наперед — не використовуй там `Math.random`.
- Статичне малюємо в `buildMapLayer()` (з `hash()`, щоб не мерехтіло); анімації — через глобальний `time`, не через ігровий `dt`.
- `refreshUI()` не перестворює DOM кожен кадр (лише textContent/класи), інакше ламаються кліки.
- Баланс перевіряли headless-прогоном у Node (заглушки DOM + бот): бот проходить кампанію з поодинокими проривами;
  метрика — середня частка шляху, яку проходять вороги, по десятках набігів (має рости з ~0.2 до ~0.35–0.4).
  Край складності — квадратичний коефіцієнт кривої HP ~0.0022–0.0025 (зараз 0.0019, тепер закладений у `setWave`): вище бот уже не проходить 100-й набіг
  (знизили з 0.003, коли привид перестав сповільнювати всіх). Бот не кидає валуни й не підлаштовується під магів/невидимих.
  Безкінечний після 100-го — ще ×1.02 HP і броні за набіг (`setHpGrowth`), тож максимально прокачана оборона падає невдовзі після 100-го.
