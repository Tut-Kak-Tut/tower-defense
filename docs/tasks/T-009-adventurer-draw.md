# T-009 Малювання авантюристів
Залежить від: T-004, T-007
Модель: haiku (механічна)
## Мета
Перенести `Enemy.draw(ctx)` (`web/js/entities.js` 336–474) і `drawAdventurer(ctx, type, r, color)` (756–1054) через `Canvas2D` (API = Canvas у snake_case).

## Файли
- створити: `godot/scripts/draw/adventurer_draw.gd` (`class_name AdventurerDraw`: `static func draw_enemy(c: Canvas2D, e: Enemy, time: float)`, `static func draw_adventurer(c, type, r, color)`), `godot/scenes/dev/adventurers_demo.tscn` + скрипт

## Кроки
- [ ] 1. Переклад 1:1 рядок у рядок. `this.` → `e.` з полями Enemy у snake_case (див. `scripts/game/enemy.gd`; `hidden`, `left`, `speed` — property). `Math.PI` → `PI`, `Math.sin` → `sin`, глобальний `time` → параметр. `ENEMIES[type]` → `Data.adventurers[type]`; колір з даних — CSS-рядок, Canvas2D приймає як є.
- [ ] 2. Лише малювання, логіку не змінюй. Якщо поля немає в enemy.gd — повідом у відповіді.
- [ ] 3. Демо: сітка з усіх 13 типів (`Data.adventurer_order`), `Enemy.new(type, 10, {}, map)`, позицію `e.x/e.y` задати вручну (клітинки 80×80), плюс кілька станів: оглушений, невидимий-розкритий, зі щитом, поранений (HP 40%). Скріншот на 60-му кадрі в `user://adventurers_demo.png`, переглянь.

## Готово, коли
Демо без помилок, на скріншоті всі 13 впізнавані (веб для порівняння: `web/index.html` — картки з іконками).

## Як перевірити
`"$G" --path godot res://scenes/dev/adventurers_demo.tscn --quit-after 120`
