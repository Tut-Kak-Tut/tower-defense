# T-003 GameMap: шляхи, коридор, завали
Залежить від: T-002
Модель: sonnet
## Мета
Клас мапи рівня (або стандартної мапи кампанії) з усім, що вебова логіка бере з глобалей `ROUTES`, `ROCKS`, `TORCHES`, `PATH_CELLS`.
Спершу прочитай розділ «Правила порту логіки» в `docs/plan.md`.

## Файли
- створити: `godot/scripts/game/map.gd` (`class_name GameMap extends RefCounted`), `godot/tests/test_map.gd`

## Кроки
- [x] 1. `static func for_level(level_id: String) -> GameMap` (порожній id → стандартна мапа: `DEFAULT_PATH`, `DEFAULT_TORCHES`, без каміння, ваги `[1]`; інакше з `Data.levels[id]`). Поля: `level` (dict або null), `route_points`, `route_weights`, `routes` (масив `{px: Array[Vector2], len: Array[float]}`), `rocks`, `torches`, `path_cells`, `rock_cells` (Dictionary з ключем `Vector2i` → true).
  Джерело: `web/js/entities.js` 6–9 (`cellCenter`), 57–71 (ROUTES, `routeLetter`); `web/js/game.js` 7–23 (PATH_CELLS, ROCK_CELLS), 72–84 (`inBounds`, `canPlace` — без перевірки `towerAt`, її дасть GameState: зроби `can_place_cell(col, row)` = у межах і не коридор і не завал).
- [x] 2. Методи: `cell_center(col,row) -> Vector2`, `route_letter(i)`, `in_bounds`, `is_path`, `is_rock`, `can_place_cell`, `route_len(i)` (повна довжина), `point_at(route, progress) -> Vector2` (позиція на шляху за пройденою відстанню — як це рахує `Enemy.setProgress` у `entities.js`, знайди там). 
- [x] 3. `test_map.gd`: стандартна мапа — довжина шляху й кількість клітинок коридору збігаються з тим, що дає веб (порахуй у Node через `web/tests/harness.js`: `ROUTES[0].len`, і впиши числа в тест як константи); для кожного рівня з `Data.level_order` — кількість шляхів = `paths.size()`, усі `rocks` не на коридорі.

- [x] 4. Раннер `tests/run_tests.gd`: зараз тест, що впав із SCRIPT ERROR (перервався посередині), не рахується як збій. Зроби так, щоб рахувався: напр. тест-метод після виконання ставить прапорець/повертає `true`, а раннер вважає збоєм, якщо метод не дійшов до кінця. Перевір навмисною помилкою (виклик неіснуючого методу) і прибери її.

## Готово, коли
`run_tests.gd` проходить, включно з `test_map.gd`.

## Як перевірити
`"$G" --headless --path godot -s res://tests/run_tests.gd` (G — див. docs/plan.md «Запуск»)
