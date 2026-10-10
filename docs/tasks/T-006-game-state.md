# T-006 GameState + Save + звірка симуляції з вебом
Залежить від: T-004, T-005
Модель: sonnet
## Мета
Стан гри й ігровий цикл (без малювання) з `web/js/game.js` і автосейв з `web/js/save.js`; золотий тест: та сама розстановка й ті самі набіги в Godot дають ті самі душі/міцність/вбивства, що у вебі.
Прочитай «Правила порту логіки» в `docs/plan.md`.

## Файли
- створити: `godot/scripts/game/game_state.gd` (`class_name GameState extends RefCounted`), `godot/scripts/game/save.gd` (`class_name SaveStore`), `godot/tools/export_sim.js`, `godot/tests/test_sim.gd`
- змінити (якщо треба для інтеграції): `enemy.gd`, `tower.gd`, `projectile.gd`, `boulder.gd` — лише виправлення стиків API.

## Кроки
- [x] 1. `GameState`: `static func create(mode, level_id := "") -> GameState` (поля з `newGame`, `game.js` 31–54; DEBUG не потрібен), `map` (`GameMap.for_level`), `max_waves()`, `in_bounds/tower_at/can_place/can_afford/place_tower/grave_death/brew/throw_boulder/new_tower/best_dir/beam_coverage/upgrade_tower/sell_tower/start_wave/update(dt)` — 1:1 з `game.js` 56–257. `can_afford` повертає причину відмови (`""` — можна; інакше `"money"|"limit"|"unique"`) — знадобиться UI для тосту. Сигнали не потрібні; UI читатиме поля.
  Кожного ворога, що потрапляє в `enemies` (з черги появи і з `spawn_on_death`), прив'язати `e.bind(self)` (див. `enemy.gd`: `hit` без game бере його з WeakRef). Поля, які читає Enemy: `enemies, effects, spawn_queue (елементи з "type"), stats[src] = {round, total, kills}, rng()`.
- [x] 2. RNG: `var rng_state: int`; `func rng() -> float` — mulberry32:
  ```
  rng_state = (rng_state + 0x6D2B79F5) & 0xFFFFFFFF
  var t = rng_state
  t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
  t = (t ^ (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF))) & 0xFFFFFFFF
  return float((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0
  ```
  (рівно як JS mulberry32 з `Math.imul`; перевір множення: `(t ^ (t>>15)) * (t|1)` у int64 може переповнитися понад 2^63 — розбий множення на 16-бітні половини або доведи, що не переповнюється). Сід за замовчуванням — з часу; у тестах — фіксований.
- [x] 3. `SaveStore`: файл `user://saves/<slot>.json`; `slot_for(level_id, endless)`, `load_save`, `delete_save`, `snapshot(game)`, `autosave(game)`, `restore(game) -> bool` — 1:1 з `save.js` (SAVE_VERSION=1). `markLevelDone`/`loadLevelsDone` (`web/js/levels/level.js` 94–101) → `user://progress.json` у цьому ж класі. `game_state` викликає `SaveStore.autosave(self)` там, де веб викликає `autosave()`; додай прапорець `game.save_enabled` (тести вимикають).
- [x] 4. `tools/export_sim.js` (Node): завантаж веб-гру як `web/tests/harness.js`, але ще й `game.js` + `save.js` (заглушки: `document.getElementById` → об'єкт з `getContext()` що повертає Proxy-заглушку ctx; `requestAnimationFrame` — noop; `localStorage` — у пам'яті). У vm-контексті підміни `Math` на копію з `random` = mulberry32(сід 12345). Сценарій: кампанія, `money` = 100000, поселити набір (ти визнач 8–10 монстрів різних атак, включно з `archer`, `cannon`, `frost`, `spider`, `eye`, `slime`, `vampire`, `plate`, `witch`, `grave`) на клітинки поруч коридору `DEFAULT_PATH`, посилити кожного до рівня 3; потім для набігів 1..25: `startWave()`, крок `update(1/60)` до кінця набігу (ліміт 20 хв ігрового часу). Після кожного набігу записати `{wave, money, lives, kills: сума game.stats[*].kills, alive: game.enemies.length}`. Пише `godot/tests/fixtures/web_sim.json` разом із розстановкою.
- [x] 5. `test_sim.gd`: той самий сценарій у Godot (розстановка з фікстури, сід 12345, dt=1/60) → порівняти по набігах. Очікування: `lives` і `kills` збігаються точно, `money` — точно (якщо розходиться — шукай розбіжність у порті, а не послаблюй тест; якщо розбіжність від float-округлення неусувна — допуск ±1 і опиши причину у відповіді).
- [x] 6. `test_save.gd` (можна в `test_sim.gd`): snapshot → restore відтворює монстрів (тип, клітинка, рівень, spent, aim, dir, boulders, deaths), душі, міцність, набіг.

- [x] 7. Витоки: зараз прогін тестів закінчується `14 ObjectDB instances were leaked` / `3 resources still in use`. Запусти з `--verbose`, знайди причину (цикли посилань RefCounted: enemy↔game, tower._game, leader, links, projectile.target тощо) і розірви їх (WeakRef або очищення при видаленні з game / в кінці набігу). Після 25 набігів test_sim не має лишати витоків.

## Готово, коли
Усі тести проходять, `test_sim` звіряє 25 набігів з вебом.

## Як перевірити
`node godot/tools/export_sim.js && "$G" --headless --path godot -s res://tests/run_tests.gd`
