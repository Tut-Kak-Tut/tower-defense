# T-015 Ігровий екран: каркас UI, HUD, тач-поселення
Залежить від: T-011, T-012, T-013, T-014
Модель: sonnet
## Мета
Мобільний ігровий екран за `docs/gdd.md` 7.3, 7.4, 7.8: мапа на весь екран (WorldView), HUD, кнопка старту набігу, тач-керування поселенням/вибором і **каркас для панелей**, які доробляють T-016…T-018 (вони йдуть паралельно після цієї задачі).

## Файли
- створити: `godot/scenes/game_screen.tscn`, `godot/scripts/ui/game_screen.gd` (контролер), `godot/scripts/ui/hud.gd`, заглушки `godot/scripts/ui/shop_panel.gd`, `raid_panel.gd`, `foe_tip.gd`, `pause_menu.gd`, `end_overlay.gd` (кожна — `extends Control`, `func setup(screen)` + порожні методи з контракту нижче)
- змінити: `godot/scripts/ui/world_view.gd` (прибрати клавіатурне керування в окремий прапорець `debug_keys`, вимкнений у game_screen; додати малювання привида поселення з ✔/✖ — або кнопки ✔/✖ як Control над клітинкою), `godot/project.godot` (`run/main_scene = res://scenes/game_screen.tscn`; тема `gui/theme/custom = res://ui/theme.tres`; `input_devices/pointing/emulate_mouse_from_touch=true`)

## Контракт `game_screen.gd` (для T-016…T-019)
```
var world: WorldView; var game: GameState
var state := "idle"            # "idle" | "placing" | "selected"
var placing_type := ""; var selected: Tower = null
signal state_changed           # будь-яка зміна state/placing_type/selected
signal game_changed            # гроші/міцність/набіг/кінець (емітувати, коли змінились, не щокадру)
func start(mode: String, level_id := "")      # з головної; аргументи `-- --level=<id>` теж
func select_type(type: String)                 # магазин → placing (або причина відмови → toast)
func select_tower(t: Tower); func clear_selection()
func open_panel(name: String)                  # "shop" | "raid" | "" (закрити); одночасно відкрита одна
func toast(text: String)
func set_paused(on: bool); func toggle_speed(); func start_wave(); func toggle_auto()
func go_home(); func restart()
```
Заглушки панелей: `shop_panel.gd` — `setup(screen)`, `open(tab := "monsters")`, `close()`; `raid_panel.gd` — `setup`, `open`, `close`; `foe_tip.gd` — `show_for(type: String, wave: int, at: Vector2)`, `hide_tip()`; `pause_menu.gd` — `setup`, `open`, `close`; `end_overlay.gd` — `setup`, `show_result()`.

## Кроки
- [ ] 1. Сцена: `WorldView` (Node2D) + `CanvasLayer` UI з якорями: HUD зверху (GDD 7.3: ліворуч душі й Серце, по центру «Набіг N/M», праворуч ⏸, ⏩×N, ☰), кнопка «Впустити набіг N» знизу по центру (`PrimaryButton`, ~220×72) + перемикач «Авто», під час набігу — «Ідуть: X»; язичок «Набіг» по лівому краю й язичок «Монстри» по правому (відкривають панелі); вузли панелей-заглушок; шар тостів. Відступи — `DisplayServer.get_display_safe_area()`.
- [ ] 2. Тач на мапі (GDD 7.4): `idle` + тап по монстру → `select_tower` (+ `open_panel("shop")` на вкладці посилення); тап по авантюристу (найближчий у радіусі 28 світових px) → `foe_tip.show_for`; `placing` + тап у клітинку → привид з колом дальності (зелений/червоний за `game.can_place`/`can_afford`) і кнопки ✔ (з ціною) / ✖ під клітинкою; тап в іншу клітинку переносить; перетяг пальцем рухає привид із зсувом на 1.5 клітинки вгору; ✔ → `game.place_tower`, лишаємось у placing. Тап по порожньому в `selected` → `clear_selection`. Тач на панелях не протікає на мапу.
- [ ] 3. Тости (`Toast`): причини відмови `can_afford` — «Мало душ», «Ліміт 18», «Вже є»; зникають через 2 с.
- [ ] 4. Мова: усі тексти через I18n; на `I18n.lang_changed` оновити підписи (без перезапуску сцени).
- [ ] 5. Кнопка «Назад» Android (`NOTIFICATION_WM_GO_BACK_REQUEST`; для ПК — Esc): закрити підказку → закрити панель → скасувати placing/selected → відкрити паузу-меню.
- [ ] 6. HUD оновлювати лише при зміні значень (не перестворювати вузли щокадру).
- [ ] 7. Перевірка: запустити у вікні 1280×720 і 2400×1080 (`--resolution`), автоматичний сценарій з аргументом `-- --uitest`: емульовані `InputEventScreenTouch` (вибрати тип через `select_type("archer")`, тап у клітинку біля коридору, тап ✔, старт набігу), скріншоти `user://ui_1.png`, `ui_2.png`; переглянь їх.

## Готово, коли
Можна мишею (емуляція тачу) поселити монстра двома тапами, вибрати його, запустити набіг; HUD живий; тести `run_tests` проходять; скріншоти виглядають акуратно на обох роздільностях.

## Як перевірити
`"$G" --path godot --quit-after 900 -- --uitest` + переглянути PNG
