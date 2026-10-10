# Серце Підземелля

Tower defense у темі підземелля. Дві окремі версії:
- `web/` — браузерна версія (HTML5 Canvas + JS). Деталі — `web/CLAUDE.md`. Тести: `node --test` з `web/`.
  Сервер: `python -m http.server 8001 --bind 127.0.0.1` з `web/`.
- `godot/` — порт на Godot 4 для Android (renderer Mobile, альбомна орієнтація). Відкрити `godot/project.godot` у редакторі.
  Логіку й баланс переносити з `web/js/` (монстри, авантюристи, набіги, рівні).
- `docs/` — спільні специфікації та плани.
