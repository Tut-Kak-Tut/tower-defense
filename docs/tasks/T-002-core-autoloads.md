# T-002 Ядро Godot: I18n і Data + тестовий раннер
Залежить від: T-001 (формат JSON описано в T-001; для запуску тестів потрібні згенеровані файли)
Модель: sonnet
## Мета
Autoload-и `I18n` і `Data` (таблиці з `godot/data/*.json` + функції сили/набігів, 1:1 з вебом) і headless-тести, що звіряють їх з `tests/fixtures/web_reference.json`.

## Файли
- створити: `godot/scripts/core/i18n.gd`, `godot/scripts/core/data.gd`, `godot/tests/run_tests.gd`, `godot/tests/test_data.gd`
- змінити: `godot/project.godot` (секція `[autoload]`: `I18n="*res://scripts/core/i18n.gd"`, `Data="*res://scripts/core/data.gd"`)

## Кроки
- [ ] 1. `i18n.gd` (extends Node): `var lang := "uk"`; збереження в `user://settings.cfg` (ConfigFile, секція `ui`, ключ `lang`); `func t(uk: String, ru: String) -> String`; `func txt(v) -> String` (Dictionary з "uk"/"ru" → за мовою, інакше `str(v)`); `func set_lang(l)` зберігає й шле `signal lang_changed`. НЕ називай функцію `tr` — це вбудований метод Object.
- [ ] 2. `data.gd` (extends Node): у `_ready()`/`_init()` вантажить 5 JSON (`FileAccess` + `JSON.parse_string`). Поля: `cfg`, `monsters` (dict id→def), `monster_order`, `level_stats`, `roles`, `adventurers`, `adventurer_order`, `enemy_unlock`, `spawn_gap`, `wave_stats`, `waves` (ключі — int), `levels`, `level_order`. Увага: JSON дає числа як float — кількості/індекси приводь до int там, де вони використовуються як int.
- [ ] 3. `func hash(a, b, seed := 0) -> float` — точна копія JS (`web/js/config.js`):
  ```
  var x: int = int(float(a) * 374761393.0 + float(b) * 668265263.0 + float(seed) * 2246822519.0)  # як у JS у double, потім ToInt32
  var h: int = x & 0xFFFFFFFF
  h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF   # Math.imul + >>> на беззнаковому 32-біт
  return float((h ^ (h >> 16)) & 0xFFFFFFFF) / 4294967296.0
  ```
  (h тримаємо як беззнакове 32-біт у int64; зсуви `>>` на невід'ємному = `>>>`.) Перевір тестом, підправ, якщо розходиться.
- [ ] 4. Порт функцій (джерело в дужках, логіку брати звідти 1:1):
  `level_value(def, key, level)`, `tower_stats(def, level) -> Dictionary`, `targets_at(def, level)` (`web/js/entities.js` рядки 10–28);
  `stats_at(type, n)` (`Adventurer.statsAt`, `web/js/adventurers/adventurer.js`); `adventurer_stats(type, n, buff := {})`, `wave_groups(n)`, `wave_buff(n)`, `merge_buff(a, b)`, `route_for(n, squad, weights)`, `wave_spawns(n, weights := [1])` (`web/js/waves/wave.js` 84–145). `wave_groups` для n > CAMPAIGN_WAVES — `push_error` і `[]` (безкінечний не в MVP). `gap !== undefined` у JS ↔ «елемент є і не null» у GDScript. `graveEvery` з `monster.js` → `grave_every(def, wave)`.
- [ ] 5. `tests/run_tests.gd` (extends SceneTree): знаходить усі `res://tests/test_*.gd`, для кожного створює екземпляр і викликає методи `test_*`; тест кидає збій через `fail(msg)` базового класу або повертає рядок помилки — зроби простий спільний підхід (напр. базовий `tests/test_base.gd` з `assert_eq/assert_near`, лічильником помилок). Друкує `OK n` / список збоїв, `quit(0|1)`. Autoload-и в режимі `-s` можуть бути не готові в `_init` — запускай тести після `await process_frame` (або через `root.get_node("Data")`).
- [ ] 6. `tests/test_data.gd`: звір із фікстурою: усі `hash` (точний збіг або |Δ| < 1e-12), `tower_stats` усіх монстрів 1..10, `adventurer_stats` (|Δ| < 1e-9), `wave_spawns` для `default` і кожного рівня (type, delay, squad, route, buff, cargo). Окремо: 13 монстрів, 13 авантюристів, 100 набігів, `I18n.txt` повертає укр/рос.

## Готово, коли
Тести проходять (exit 0) і падають, якщо зіпсувати одне число в `data/monsters.json` (перевір і поверни).

## Як перевірити
```
G="/c/Users/Vova/AppData/Local/Microsoft/WinGet/Packages/GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe/Godot_v4.7.2-stable_win64_console.exe"
node godot/tools/export_data.js && "$G" --headless --path godot --import; "$G" --headless --path godot -s res://tests/run_tests.gd; echo exit=$?
```
