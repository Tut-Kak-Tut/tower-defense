# T-013 Тема інтерфейсу Godot (designer)
Залежить від: —
Виконавець: designer
## Мета
`godot/ui/theme.tres` — тема Control-ів у «кам'яному» стилі веб-версії, придатна для тач-екрана телефона.

## Джерела
- Палітра й стилі: `web/style.css` (`:root`: `--bg #0d0b12`, `--stone #221e2b`, `--stone-hi #2e2839`, `--stone-edge #3d3549`, `--text #e9e2d4`, `--muted #a39ab0`, `--crimson #8b1e3f`, `--crimson-hi #a8264c`, `--violet #7b4bb3`, `--soul #c9a227`, `--danger #e0556e`; кнопки, панелі, вкладки, чіпи тегів `.tag` / `role-*`).
- Вигляд вебу: `docs/reports/shots/web_game.png`. Розкладка мобільного UI: `docs/gdd.md` розділ 7.

## Файли
- створити: `godot/ui/theme.tres` (Godot 4 Theme, текстовий формат ресурсу), `godot/ui/theme.md` (коротко: які type variations є і для чого)

## Вимоги
- Базовий розмір шрифту 20 px (при 1280×720), заголовки 26 px; шрифт — дефолтний (без файлів шрифтів).
- StyleBoxFlat для: `Panel`/`PanelContainer` (камінь, рамка `--stone-edge`, заокруглення 8, легка тінь), `Button` (normal/hover/pressed/disabled/focus; мін. висота 56 px через content margins), `Label`, `ScrollContainer`/`VScrollBar` (тонкий, 8 px), `TabBar`/`TabContainer`, `LineEdit` не потрібен.
- Type variations (base type у дужках): `PrimaryButton` (Button — малиновий `--crimson` → `--crimson-hi`, як «Впустити набіг»), `HudChip` (PanelContainer — плашка HUD як у вебі), `Drawer` (PanelContainer — висувна панель, напівпрозорий камінь 0.92), `Tag`, `TagRole`, `TagMagic`, `TagPhys`, `TagFx` (PanelContainer + Label кольори як `.tag` у вебі), `MutedLabel`, `SoulLabel` (колір `--soul`), `DangerLabel`, `TitleLabel`, `Toast` (PanelContainer).
- Без зовнішніх текстур (лише StyleBoxFlat/StyleBoxEmpty).

## Готово, коли
Файл валідний: `"$G" --headless --path godot --quit` без помилок про `ui/theme.tres` (G — docs/plan.md «Запуск»). Якщо не можеш запускати команди — ретельно перевір синтаксис формату `[gd_resource type="Theme" format=3]`.
