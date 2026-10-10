class_name Rules extends RefCounted
# Спільні хелпери логіки (web/js/entities.js 30–56). Глобальний `game` з вебу тут — параметр.

# Сторони світу для променя біхолдера: індекс = tower.dir, кут = dir * π/2.
const DIRS := [
	{"dx": 1, "dy": 0, "name": {"uk": "праворуч", "ru": "вправо"}},
	{"dx": 0, "dy": 1, "name": {"uk": "вниз", "ru": "вниз"}},
	{"dx": -1, "dy": 0, "name": {"uk": "ліворуч", "ru": "влево"}},
	{"dx": 0, "dy": -1, "name": {"uk": "вгору", "ru": "вверх"}},
]


static func data() -> Node:
	return Engine.get_main_loop().root.get_node("Data")


static func cell() -> float:
	return float(data().cfg["CELL"])


# Відстань від точки до відрізка — для променя ока.
static func seg_dist(px: float, py: float, x1: float, y1: float, x2: float, y2: float) -> float:
	var dx := x2 - x1
	var dy := y2 - y1
	var t := maxf(0.0, minf(1.0, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)))
	return Vector2(px, py).distance_to(Vector2(x1 + dx * t, y1 + dy * t))


static func alive(e) -> bool:
	return not e.dead and not e.escaped


# Чи є на полі хтось, заради кого носій прапора e не може впасти (інші носії не рахуються).
static func has_guards(e, game) -> bool:
	for o in game.enemies:
		if o != e and alive(o) and not o.def.get("undying", false):
			return true
	return false


# Паладини, чия аура щита накриває e (сам e — ні).
static func shield_guards(e, game) -> Array:
	var out: Array = []
	var c := cell()
	for g in game.enemies:
		if g != e and g.def.get("shieldAura") and g.shield > 0 and alive(g) \
				and Vector2(g.x, g.y).distance_to(Vector2(e.x, e.y)) <= float(g.def["shieldAura"]) * c:
			out.append(g)
	return out


# Павутина не тримає: сам несприйнятливий (webImmune) або стоїть під цілим щитом паладина.
static func web_proof(e, game) -> bool:
	return bool(e.def.get("webImmune", false)) or shield_guards(e, game).size() > 0
