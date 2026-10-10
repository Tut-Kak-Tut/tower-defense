# План: порт «Серце Підземелля» на Godot 4 (Android)

Еталон — `web/` (`web/CLAUDE.md`, `web/js/`). Бриф — `docs/brief.md`, дизайн — `docs/gdd.md`.

## Структура `godot/`
```
godot/
  project.godot           налаштування (Mobile, 1280×720 landscape); autoload-и I18n, Data
  data/                   ДАНІ БАЛАНСУ (JSON, згенеровані з web/ скриптом tools/export_data.js; далі правити тут)
    config.json           константи config.js (CELL, COLS, ROWS, START_MONEY…, DEFAULT_PATH, DEFAULT_TORCHES)
    monsters.json         TOWERS (+ LEVEL_STATS, ATTACKS, ROLES)
    adventurers.json      ENEMIES, ENEMY_UNLOCK, SPAWN_GAP, точки setWave
    waves.json            WAVES кампанії (groups, buff)
    levels.json           LEVELS + порядок карток
  tools/export_data.js    Node: web/js → data/*.json + tests/fixtures/web_reference.json
  scripts/
    core/                 i18n.gd (autoload I18n), data.gd (autoload Data: таблиці, hash, towerStats, adventurerStats, waveGroups, waveSpawns, routeFor)
    game/                 логіка без малювання: map.gd (шляхи, коридор, завали), enemy.gd, tower.gd, projectile.gd, boulder.gd, game_state.gd, save.gd
    draw/                 canvas.gd (обгортка Canvas2D-API над draw_*), map_draw.gd, adventurer_draw.gd, monster_draw.gd, icons.gd, effects_draw.gd
    ui/                   world_view.gd (Node2D мапи з масштабом), hud, shop_panel, raid_panel, foe_tip, pause_menu, end_overlay
    home/                 home.gd, level_card.gd
  scenes/                 home.tscn (main), game.tscn
  ui/theme.tres           тема Control-ів (палітра з web/style.css)
  tests/                  run_tests.gd (SceneTree-раннер), test_*.gd, fixtures/
  ANDROID.md              збірка APK
```
Правила:
- Числа — лише в `data/*.json`; у `.gd` — логіка. Імена ключів = імена з вебу (`damage`, `range`, `hp`…), id монстрів/авантюристів = веб-id (`archer`, `normal`…).
- Тексти для гравця — `I18n.t(uk, ru)` або словник `{"uk":…, "ru":…}` з даних (`I18n.tr(v)`).
- Файли: `snake_case.gd`, класи `class_name PascalCase`, функції/змінні `snake_case` (веб `towerStats` → `tower_stats`).
- Склад набігів детермінований (`Data.hash`), без `randf` у генераторах. Анімації — від глобального часу, не від `dt`.
- Логіка (`scripts/game`) не малює; малювання (`scripts/draw`) не змінює стан.

## Правила порту логіки (етап 2+)
- Переносимо 1:1 порядок обчислень (щоб симуляція збігалася з вебом). Імена: JS `camelCase` → GDScript `snake_case` (поля й методи), `ALL_CAPS` константи → з `Data.cfg["ІМ'Я"]`.
- Глобалі вебу замінюємо посиланнями: `ROUTES/ROCKS/TORCHES/LEVEL/PATH_CELLS` → `map` (екземпляр `GameMap`, `scripts/game/map.gd`); `game` → `GameState` (передається в `update(dt, game)` як у вебі); `TOWERS[id]`/`ENEMIES[id]` → `Data.monsters[id]`/`Data.adventurers[id]`.
- Класи — `RefCounted` з `class_name` (`GameMap`, `Enemy`, `Tower`, `Projectile`, `Boulder`, `GameState`); позиції — окремі `x`, `y` (float) як у вебі.
- `Math.random()` → `game.rng()` (детермінований mulberry32 у GameState, сід задається) — щоб симуляцію можна було звірити з вебом.
- Ефекти (`game.effects`) — Dictionary з тими ж ключами, що у вебі (`kind`, `x`, `y`, `t`, `max`, `color`…).
- Тести: `tests/test_*.gd` extends `res://tests/test_base.gd`; методи `func test_xxx():` БЕЗ `-> void` і закінчуються `return true` (інакше раннер вважає, що тест перервався).
- `GameMap.point_at(route, progress) -> {pos, dir, wp, progress}`.
- Методи `draw*` у логіку НЕ переносимо — їх зробить етап 3 (`scripts/draw/`), але всі поля, які читає малювання, мають лишитися.

## Запуск
```
set G=C:\Users\Vova\AppData\Local\Microsoft\WinGet\Packages\GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe\Godot_v4.7.2-stable_win64_console.exe
node godot/tools/export_data.js                       # перегенерувати data/ з web/
"%G%" --headless --path godot --import                # імпорт (раз після нових файлів)
"%G%" --headless --path godot -s res://tests/run_tests.gd   # тести (exit 0 = ок)
"%G%" --path godot                                    # запуск гри у вікні
```
У Git Bash: `G="/c/Users/Vova/AppData/Local/Microsoft/WinGet/Packages/GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe/Godot_v4.7.2-stable_win64_console.exe"`.

## Етапи
1. **Дані і ядро** — T-001 експорт даних, T-002 I18n/Data + тести на збіг з вебом.
2. **Симуляція (headless)** — T-003 мапа/шляхи, T-004 Enemy, T-005 Tower/Projectile/Boulder, T-006 game_state + save + headless-прогін ботом.
3. **Малювання** — T-007 canvas.gd, T-008 мапа, T-009 авантюристи, T-010 монстри + іконки, T-011 ефекти/снаряди + world_view (гра грається мишею на ПК).
4. **Мобільний UI** — тема (designer), HUD/старт/пауза/швидкість, поселення тачем, панель магазину/посилення, панель набігу + підказки, меню паузи/кінець гри/«Назад», головна з картками.
5. **Android** — ANDROID.md, фінальний тест.
Задачі етапів 3–5 нарізаються, коли попередній етап прийнято (залежать від API, що вийде).
