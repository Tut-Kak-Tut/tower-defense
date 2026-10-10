# T-010 Малювання монстрів та іконки
Залежить від: T-005, T-007 (іконки авантюристів — T-009)
Модель: haiku (механічна)
## Мета
Перенести `Tower.draw` (`web/js/entities.js` 698–755), `Tower.drawLinks` (630–697, перевір межі), `drawSkeleton … drawGrave`, `drawCarriedBoulders`, `TOWER_DRAW` (1055–1662) і іконки (`web/js/icons.js`) через `Canvas2D` (API = Canvas у snake_case).

## Файли
- створити: `godot/scripts/draw/monster_draw.gd` (`class_name MonsterDraw`: `static func draw_tower(c, t: Tower, time)`, `draw_links(c, t, time)`, `draw_kind(c, type, angle, time)` — замість `TOWER_DRAW` — `match type`), `godot/scripts/ui/icon_view.gd` (`class_name IconView extends Control`: `@export var kind := "tower"` ("tower"|"enemy"), `@export var id := ""`; `_draw()` — іконка в розмір контрола як `towerIcon`/`enemyIcon`), `godot/scenes/dev/monsters_demo.tscn` + скрипт

## Кроки
- [ ] 1. Переклад 1:1. `this.` → `t.` (поля Tower у snake_case, див. `scripts/game/tower.gd`; `range` → `t.range_px()`, `damage` → `t.damage()`…). Глобальний `time` → параметр. `TOWERS[id]` → `Data.monsters[id]`.
- [ ] 2. `drawLinks` використовує `'lighter'` — Canvas2D це підтримує add-шаром (див. canvas.gd).
- [ ] 3. `IconView`: Canvas2D у `_ready`; `_draw` — `translate(size/2)` і далі як `makeIcon` + `towerIcon`/`enemyIcon` (`AdventurerDraw.draw_adventurer` — з T-009; якщо файлу ще немає — малюй заглушку-коло і повідом). Перемальовувати лише при зміні `id`/розміру.
- [ ] 4. Демо: 13 монстрів (`Data.monster_order`) рівнів 1, 5, 10 у сітці + ряд `IconView` (усі монстри й авантюристи, 48 px). Скріншот на 60-му кадрі в `user://monsters_demo.png`, переглянь.

## Готово, коли
Демо без помилок, на скріншоті всі монстри впізнавані (порівняй з вебом).

## Як перевірити
`"$G" --path godot res://scenes/dev/monsters_demo.tscn --quit-after 120`
