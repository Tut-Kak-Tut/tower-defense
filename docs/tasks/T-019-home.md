# T-019 Головний екран з картками рівнів
Залежить від: T-015 (контракт `game_screen.start`), T-013
Модель: sonnet
## Мета
Головна за `docs/gdd.md` 7.1–7.2: горизонтальна стрічка карток «Кампанія» + рівні, продовження з сейву, перемикач мови; перехід у гру і назад.

## Файли
- створити: `godot/scenes/home.tscn`, `godot/scripts/home/home.gd`, `godot/scripts/home/level_card.gd`, `godot/scripts/home/map_preview.gd` (Control: мініатюра мапи)
- змінити: `godot/project.godot` (`run/main_scene = res://scenes/home.tscn`), `godot/scripts/ui/game_screen.gd` — лише спосіб передачі параметрів старту з головної (напр. статичні `GameScreen.pending_mode/pending_level` або autoload-поле) і `go_home()` → `change_scene_to_file("res://scenes/home.tscn")`

## Кроки (джерело — `web/js/home.js`, `web/index.html`)
- [ ] 1. Заголовок «Серце Підземелля» + кнопка мови UA/RU у правому верхньому куті (64×64).
- [ ] 2. Стрічка карток (`ScrollContainer` горизонтальний, свайп; картка ~360×300+): перша — «Кампанія» (100 набігів), далі рівні в порядку `Data.level_order`. Картка: мініатюра мапи (`map_preview.gd` — `MapDraw` у масштабі 12 px/клітинку, як `mapPreview` у вебі, або спрощено: коридор/завали/вхід/Серце), назва, «N набігів», ряд `IconView` монстрів рівня, ряд авантюристів рівня (`levelFoes`: типи з `Data.wave_groups` набігів рівня), позначка «Пройдено» (`SaveStore.levels_done()`).
- [ ] 3. Кнопки на картці: якщо є сейв (`SaveStore.load_save(slot)`) — «Продовжити (набіг N)» і «Нова гра» (з підтвердженням «Точно?» — стирає сейв); інакше — «Грати».
- [ ] 4. Перехід: `change_scene_to_file("res://scenes/game_screen.tscn")` з параметрами (mode "campaign" | "level", level_id). Назад з гри — на головну.
- [ ] 5. «Назад» Android на головній: перше натискання — тост «Натисніть ще раз, щоб вийти», друге за 2 с — `get_tree().quit()`.
- [ ] 6. Мова на льоту (`I18n.lang_changed`).
- [ ] 7. Перевірка: запуск без аргументів — головна; скріншоти `user://home.png` (1280×720) і `home_wide.png` (`--resolution 2400x1080`) через аргумент `-- --shot`; переглянь. Перевір сценарій: головна → рівень → ☰ → На головну → бачимо «Продовжити».

## Готово, коли
Головна виглядає акуратно, переходи працюють, `run_tests` проходить.
