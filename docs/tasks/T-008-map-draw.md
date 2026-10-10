# T-008 Малювання мапи: тло, коридор, брами, завали, факели, Серце, віньєтка, дальність
Залежить від: T-003, T-007
Модель: haiku (механічна: переклад JS-малювання через Canvas2D)
## Мета
Перенести статичне й декоративне малювання мапи з `web/js/game.js` у Godot через `Canvas2D` (`scripts/draw/canvas.gd`, API = Canvas у snake_case: `c.fill_style = "#…"`, `c.begin_path()`, `c.arc(...)`, `c.fill()`…).

## Файли
- створити: `godot/scripts/draw/map_draw.gd` (`class_name MapDraw`, лише `static func`), `godot/scripts/draw/map_layer.gd` (Node2D: статична мапа, малюється один раз), `godot/scripts/draw/map_fx.gd` (Node2D: факели/віньєтка/Серце, `queue_redraw()` у `_process`), `godot/scenes/dev/map_demo.tscn` + скрипт

## Кроки
- [ ] 1. `MapDraw.build_map_layer(c, map: GameMap)` ← `buildMapLayer()` (`game.js` 262–377), `draw_gate(c, map, col, row)` ← `drawGate` (378–396), `draw_rubble(c, col, row)` ← `drawRubble` (397–421). Глобалі: `ROUTES/ROCKS/TORCHES/PATH_CELLS` → `map.*`, `isPath` → `map.is_path`, `hash` → `Data.hash`, `CELL/COLS/ROWS` → `map.cell/map.cols/map.rows`, `routeLetter` → `map.route_letter`.
- [ ] 2. `draw_heart(c, map, heart_flash, time)` ← `drawHeart` (430–463); `draw_torches(c, map, time)` ← `drawTorches` (464–499); `draw_vignette(c, w, h)` ← `drawVignette` (500–513); `draw_range(c, x, y, range, ok, min_range)` ← `drawRange` (514–525); `draw_beam_line(c, tower, ok)` ← `drawBeamLine` (526–541). Глобальний `time` → параметр (`Canvas2D.now()`).
- [ ] 3. `map_layer.gd`: `var map: GameMap`; `_ready()` — `Canvas2D.new(self, Canvas2D.make_add_layer(self))`; `_draw()` → `build_map_layer`. `map_fx.gd`: `var map`, `var heart_flash := 0.0`, `@export var part := "under"` ("under" — факели; "over" — віньєтка + Серце), бо у вебі факели малюються під монстрами, а віньєтка й Серце — над усім.
- [ ] 4. Демо `map_demo.tscn`: map_layer + map_fx(under) + map_fx(over), `GameMap.for_level("")`, або рівень з аргументу `-- --level=<id>` (`OS.get_cmdline_user_args()`). На 60-му кадрі — скріншот `get_viewport().get_texture().get_image().save_png("user://map_demo.png")`.

## Готово, коли
`"$G" --path godot res://scenes/dev/map_demo.tscn --quit-after 120` без помилок; переглянь PNG (`%APPDATA%/Godot/app_userdata/<назва проєкту>/map_demo.png`) — коридор, брами з мітками, факели, Серце на місці; для рівня з завалами — завали.

## Як перевірити
та сама команда + PNG
