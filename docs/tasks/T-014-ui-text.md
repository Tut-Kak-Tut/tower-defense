# T-014 Тексти й рядки для UI (порт функцій з ui.js)
Залежить від: T-006
Модель: sonnet
## Мета
Чисті функції, що формують дані для панелей: теги монстра, особливості авантюриста, рядки характеристик «зараз → після», склад набігу для панелі. Без вузлів, з тестами.

## Файли
- створити: `godot/scripts/ui/ui_text.gd` (`class_name UiText`, лише `static func`), `godot/tests/test_ui_text.gd`

## Кроки (джерела — `web/js/ui.js`, `web/js/monsters/monster.js`)
- [ ] 1. `monster_tags(def) -> Array[{text, kind}]` ← `monsterTags` (monster.js 139–160).
- [ ] 2. `enemy_traits(def, cargo = def.spawn) -> Array[String]` ← `enemyTraits` (ui.js 330–356).
- [ ] 3. `foe_tip(type, n) -> {title, lines: Array[String], traits}` — дані картки ← `showFoeTip` (363–382): сила на набігу n (`Data.adventurer_stats`), описи.
- [ ] 4. `stat_rows(def, levels: Array, tower = null) -> Array[{label, values: Array[String]}]` ← `statRows` (469–526); `level_gains(attack, now, next)` ← `levelGains` (390–413); `upgrade_info(tower) -> {rows, cost, can, sell}` — дані для вкладки «Посилення» ← `refreshUpgrade` (414–468) без DOM.
- [ ] 5. `raid_groups(game, index)` ← `raidGroups` (265–270) і дані рядків панелі набігу з `refreshRaid` (274–329): `raid_rows(game) -> Array[{type, count, route_letters, is_new}]` (без DOM; `game.seen` — для «новий»; мітки шляхів — `game.map.route_letter`, лише коли шляхів > 1).
- [ ] 6. `short_num(n)` ← ui.js 527.
- [ ] 7. Тексти — через `I18n.t(uk, ru)`/`I18n.txt(v)`; перекладай обидві мови з вебу дослівно.
- [ ] 8. `test_ui_text.gd`: теги лучника й імпа (як у вебі: «Атакуючий»+«Фізичний»; «Атакуючий»+«Магічний»+«По площі»), `stat_rows` лучника рівнів 1/5/10 — значення = `Data.tower_stats`, `raid_rows` набігу 1 кампанії = 2 воїни (`normal`), `short_num(12345) == "12k"`. Порівняння з вебом, де можна, — через Node: `web/tests/harness.js` (впиши очікувані рядки в тест константами).

## Готово, коли
Тести проходять.

## Як перевірити
`"$G" --headless --path godot -s res://tests/run_tests.gd`
