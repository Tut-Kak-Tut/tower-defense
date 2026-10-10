# T-007 Canvas2D — обгортка API HTML Canvas над малюванням Godot
Залежить від: T-002
Модель: sonnet
## Мета
Клас, що дає той самий API, що `CanvasRenderingContext2D` у вебі, але малює через `CanvasItem.draw_*`. Тоді функції малювання з `web/js/` переносяться майже рядок у рядок (`ctx.arc(...)` → `c.arc(...)`).

## Файли
- створити: `godot/scripts/draw/canvas.gd` (`class_name Canvas2D extends RefCounted`), `godot/tests/test_canvas.gd`, `godot/scenes/dev/canvas_demo.tscn` + `godot/scripts/draw/canvas_demo.gd` (демо для очей)

## Кроки
- [ ] 1. `Canvas2D.new(item: CanvasItem, add_item: CanvasItem = null)`: малює в `item` (виклик лише з його `_draw()`); `add_item` — дочірній вузол з `CanvasItemMaterial` `blend_mode = BLEND_MODE_ADD` для `global_composite_operation = "lighter"` (якщо null — малює в item звичайно). Статичний хелпер `static func make_add_layer(parent: Node2D) -> Node2D` створює такий вузол.
- [ ] 2. Стан (зі стеком `save()`/`restore()`): `fill_style`, `stroke_style` (рядок CSS-кольору, `Color` або градієнт), `line_width`, `global_alpha`, `line_cap`, `global_composite_operation`, `shadow_color`, `shadow_blur`, `font` (рядок як у вебі, з нього брати розмір px і bold), `text_align`, `text_baseline`, лінійний пунктир `set_line_dash(arr)`, `line_dash_offset`, поточна трансформація `Transform2D`.
- [ ] 3. Трансформації: `translate`, `rotate`, `scale`, `set_transform`/`reset_transform`. Як у Canvas — точки шляху трансформуються в момент додавання.
- [ ] 4. Шлях: `begin_path`, `move_to`, `line_to`, `close_path`, `arc(x,y,r,a0,a1,ccw=false)`, `ellipse(x,y,rx,ry,rot,a0,a1,ccw=false)`, `quadratic_curve_to`, `bezier_curve_to`, `rect`. Дуги/криві тесселювати (к-сть сегментів від радіуса в екранних px, мін. 8, макс. 64). Підшляхи — окремі масиви з прапорцем closed.
- [ ] 5. `fill()`: кожен підшлях — `draw_colored_polygon` (якщо `Geometry2D.triangulate_polygon` повертає порожньо — самоперетин — фолбек: `draw_polyline` контуру або розбиття віялом); `stroke()`: `draw_polyline` (ширина × масштаб трансформації, antialiased), пунктир — розбиття на штрихи; `fill_rect`, `stroke_rect`, `clear_rect` (no-op), `fill_text(text, x, y)` — `ThemeDB.fallback_font`, з урахуванням align/baseline.
- [ ] 6. Кольори: парсер CSS-рядків з кешем: `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()`, `rgba()`, `hsl()`, `hsla()` (HSL→RGB формулою CSS, не `Color.from_hsv`), назви `white/black/transparent`. `global_alpha` множить альфу.
- [ ] 7. Градієнти: `create_radial_gradient(x0,y0,r0,x1,y1,r1)` і `create_linear_gradient(x0,y0,x1,y1)` → об'єкт з `add_color_stop(t, css)`. Заливка градієнтом: полігон шляху тесселювати в трикутники з вершинними кольорами (`draw_polygon(points, colors)`): для радіального — віяло з центру з ≥ 6 концентричними кільцями, колір вершини = колір градієнта у її точці (у локальних координатах до трансформації); для лінійного — аналогічно за проєкцією.
- [ ] 8. Тінь (`shadow_blur > 0` і `shadow_color` непрозорий): перед fill/stroke намалюй ту саму фігуру 3 рази кольором тіні з альфою ~0.25, розширену на blur×(1/3, 2/3, 1) (для stroke — товща лінія; для fill — stroke контуру шириною blur). Це наближення світіння; точність не потрібна.
- [ ] 9. `static func now() -> float` — секунди реального часу (аналог глобального `time` вебу для анімацій).
- [ ] 10. `test_canvas.gd`: парсер кольорів (`#c9a227`, `rgba(0,0,0,0.5)`, `hsl(25, 6%, 30%)` — порівняти з очікуваними значеннями), save/restore відновлює стан, `arc` повного кола дає замкнений підшлях потрібного радіуса.
- [ ] 11. Демо-сцена `canvas_demo.tscn` (Node2D): малює кілька примітивів (коло з радіальним градієнтом, пунктир, текст, тінь, 'lighter') — для перевірки очима. Запусти `"$G" --path godot res://scenes/dev/canvas_demo.tscn` і переконайся, що немає помилок у консолі (вікно можна закрити через `--quit-after 120`).

## Готово, коли
Тести проходять, демо запускається без помилок.

## Як перевірити
`"$G" --headless --path godot -s res://tests/run_tests.gd && "$G" --path godot res://scenes/dev/canvas_demo.tscn --quit-after 120`
