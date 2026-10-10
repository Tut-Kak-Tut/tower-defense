# T-004 Enemy (авантюрист) — логіка
Залежить від: T-003
Модель: sonnet
## Мета
Порт класу `Enemy` з `web/js/entities.js` рядки 1–56 (хелпери) і 73–474 (клас) — БЕЗ `draw(ctx)` (рядки 336–~474, перевір межі методу). Прочитай «Правила порту логіки» в `docs/plan.md`.

## Файли
- створити: `godot/scripts/game/enemy.gd` (`class_name Enemy extends RefCounted`), `godot/scripts/game/rules.gd` (`class_name Rules`: статичні хелпери `alive(e)`, `has_guards(e, game)`, `shield_guards(e, game)`, `web_proof(e, game)`, `seg_dist(...)`, `DIRS`), `godot/tests/test_enemy.gd`

## Кроки
- [x] 1. `rules.gd`: хелпери з `entities.js` 30–56. Там, де JS бере глобальний `game` (напр. `shieldGuards`), додай параметр `game`.
- [x] 2. `enemy.gd`: конструктор `_init(type, wave := 1, buff := {}, map: GameMap = null)` — `def = Data.adventurers[type]`, сила через `Data.adventurer_stats(type, wave, buff)`. Геттери → методи/property: `hidden`, `left`, `speed` (GDScript `var x: get = …` або функції `is_hidden()`, `get_left()`, `get_speed()` — обери одне й тримайся). Решта методів 1:1: `waits_escort`, `update(dt, game)`, `set_progress`, `set_route`, `spawn_on_death`, `hit(damage, pierce := false, src := "")`, `slow`, `make_frail`, `stun(time, webbed := false)`, `poison(dps, time, src := "")`.
- [x] 3. `Math.random()` → `game.rng()`; там, де game недоступний, — додай параметр. `game.stats`, `game.effects`, `game.enemies`, `game.towers` — поля GameState (його ще немає: для тесту зроби мінімальний заглушковий об'єкт-клас у тесті з цими полями і `rng()`).
- [x] 4. `test_enemy.gd`: на стандартній мапі воїн (`normal`) з набігу 1 за N кроків `update(1/60)` проходить шлях і стає `escaped`; час проходу ≈ `route_len / speed` (±2%); `hit` знімає HP з урахуванням броні (порівняй з формулою з вебу); `spawn_on_death` у вершника (`knight`) повертає воїна; шут (`jester`) — половинки.

## Готово, коли
Тести проходять; у `enemy.gd` немає малювання; всі поля, що є в JS-класі, присутні (малювання їх читатиме).

## Як перевірити
`"$G" --headless --path godot -s res://tests/run_tests.gd`
