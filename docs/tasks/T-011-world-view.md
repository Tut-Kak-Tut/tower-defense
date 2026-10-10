# T-011 Ефекти, снаряди і WorldView — гра грається на ПК
Залежить від: T-006, T-008, T-009, T-010
Модель: sonnet
## Мета
Сцена гри без мобільного UI: світ 800×480, масштаб під екран, ігровий цикл як `frame()` у вебі, малювання всього, найпростіше керування мишею/клавіатурою для перевірки на ПК.

## Файли
- створити: `godot/scripts/draw/effects_draw.gd` (`class_name EffectsDraw`: `draw_effect(c, fx, time)` ← `drawEffect` `web/js/game.js` 542–662; `draw_projectile(c, p, time)` ← `Projectile.draw` entities.js 1822–1869; `draw_boulder(c, b, time)` ← `Boulder.draw` 1706–1724), `godot/scripts/ui/world_view.gd` (Node2D), `godot/scenes/game.tscn`
- змінити: `godot/project.godot` (`run/main_scene` поки = `res://scenes/game.tscn`)

## Кроки
- [ ] 1. `effects_draw.gd` — переклад 1:1 через Canvas2D (`Math.random()` в ефектах — тут дозволено `randf()`, це лише вигляд).
- [ ] 2. `world_view.gd`: `var game: GameState`; `start(mode, level_id)` — `GameState.create` + `SaveStore.restore`. Дочірні вузли в порядку `draw()` вебу (game.js 663–705): map_layer → map_fx(under) → динамічний шар (привид поселення з `draw_range`/`draw_beam_line`, дальність вибраного, монстри, авантюристи, зв'язки вампіра, снаряди/валуни, ефекти) → map_fx(over). Динамічний шар — `queue_redraw()` щокадру; `map_fx.heart_flash = game.heart_flash`.
- [ ] 3. Масштаб (docs/gdd.md 7.8): `scale = min(viewport_h / 480, viewport_w / 800)`, центрування, перерахунок при `get_viewport().size_changed`. `func screen_to_cell(pos: Vector2) -> Vector2i`.
- [ ] 4. `_process(delta)`: `dt = min(delta, 0.05)`; якщо не пауза — `for i in game.speed: if not game.over: game.update(dt)`.
- [ ] 5. Тимчасове керування ПК (замінить етап 4): клавіші 1–9, 0, Q, W, E — вибір монстра за порядком доступних (рівень — свій набір), ЛКМ — поселити / вибрати монстра, U — посилити вибраного, S — продати, Space — старт набігу, P — пауза, F — швидкість ×1/×2/×3, Esc — зняти вибір. Стан (душі, Серце, набіг, вибраний тип, `game.over`) — `Label` у кутку.
- [ ] 5a. Підчистити: `map_layer.gd`/`map_fx.gd` викликають `Canvas2D.make_add_layer` у `_draw()` — перенести створення Canvas2D у `_ready()`. `MapDraw.draw_beam_line` зараз чекає Dictionary з `x, y, dir, beam_width` — переведи на об'єкт `Tower` (як у вебі `drawBeamLine(t, ok)`; бери `t.beam_end()` тощо).
- [ ] 6. Аргументи після `--`: `--level=<id>` — рівень, без — кампанія; `--demo` — автоматично поселити 6 різних монстрів біля коридору, дати 5000 душ, запустити набіг 5, на 600-му кадрі зберегти `user://game_demo.png`.

## Готово, коли
`"$G" --path godot --quit-after 900 -- --demo` без помилок у консолі; на скріншоті посеред набігу видно авантюристів, монстрів, снаряди/ефекти; перевір і `--level=<id>` для рівня з двома шляхами.

## Як перевірити
`"$G" --path godot --quit-after 900 -- --demo` + переглянути `game_demo.png`
