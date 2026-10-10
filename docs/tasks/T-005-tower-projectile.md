# T-005 Tower, Projectile, Boulder — логіка
Залежить від: T-003 (паралельно з T-004: API Enemy — ті самі імена, що в JS, у snake_case: `hit`, `slow`, `stun`, `poison`, `make_frail`, `set_progress`, поля `x`, `y`, `hp`, `dead`, `escaped`, `def`…)
Модель: sonnet
## Мета
Порт `TARGET_MODES`, `betterTarget`, класів `Tower` (без `draw`, `drawLinks`), `Boulder` і `Projectile` (без `draw`) з `web/js/entities.js` рядки 475–755, 1663–1869. Прочитай «Правила порту логіки» в `docs/plan.md`.

## Файли
- створити: `godot/scripts/game/tower.gd` (`class_name Tower`), `godot/scripts/game/projectile.gd` (`class_name Projectile`), `godot/scripts/game/boulder.gd` (`class_name Boulder`), `godot/tests/test_tower.gd`
- `Rules` (`scripts/game/rules.gd`) пише T-004 — якщо його ще немає, а він потрібен (`alive`, `DIRS`, `seg_dist`, `web_proof`, `has_guards`), використовуй ці імена, не дублюй.

## Кроки
- [x] 1. `Tower._init(type, col, row, map: GameMap)`; `TARGET_MODES` — константа-словник `{mode: {"name": {"uk","ru"}}}` + функція оцінки цілі (`func target_score(mode, e) -> Array`), бо в GDScript лямбди в const не зберігаються. Назви режимів — з вебу (L(...)).
- [x] 2. Методи 1:1: `set_dir`, `beam_end`, `in_beam`, `reaches`, `stats()` (через `Data.tower_stats` + `buffs`), `aims`, `can_hit`, `priority`, геттери `damage/range/min_range/upgrade_cost/sell_value`, `update(dt, game)`, `haunt`, `drain`, `cleave`, `stomp`, `web`, `beam`. `drawLinks` не переносити, але поле `links` лишити.
- [x] 3. `Boulder` і `Projectile`: `update`, `explode`, `jump`, `apply_to`, поле `done`. `Math.random()` → `game.rng()`.
- [x] 4. Посилання на `game` — через параметр `game` (GameState ще немає: у тесті — заглушковий клас з `enemies, towers, projectiles, effects, stats, wave, rng()`).
- [x] 5. `test_tower.gd`: скелет-лучник (`archer`) поруч із коридором стріляє по воїну і вбиває його за очікуваний час (порахуй з `damage`/`rate`/HP); `stats()` рівня 5 = `Data.tower_stats`; `sell_value` = floor(spent × SELL_REFUND); біхолдер з `fixed_dir` вражає лише ворогів у смузі.

## Готово, коли
Тести проходять; немає малювання; поля, що читає вебове малювання (`angle`, `links`, `boulders`, `deaths`, `dir`, `buffs`, `cooldown`…), присутні.

## Як перевірити
`"$G" --headless --path godot -s res://tests/run_tests.gd`
