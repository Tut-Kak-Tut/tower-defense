class_name Tower extends RefCounted
# Монстр (вежа): 1:1 з Tower у web/js/entities.js, без малювання.

const TARGET_MODES := {
	"first": {"name": {"uk": "Перший", "ru": "Первый"}, "title": {"uk": "Найдальший по коридору", "ru": "Дальше всех по коридору"}},
	"last": {"name": {"uk": "Останній", "ru": "Последний"}, "title": {"uk": "Найближчий до входу", "ru": "Ближе всех ко входу"}},
	"strong": {"name": {"uk": "Сильний", "ru": "Сильный"}, "title": {"uk": "Найбільше HP (зі щитом)", "ru": "Больше всего HP (со щитом)"}},
	"weak": {"name": {"uk": "Слабкий", "ru": "Слабый"}, "title": {"uk": "Найменше HP (зі щитом)", "ru": "Меньше всего HP (со щитом)"}},
	"close": {"name": {"uk": "Ближній", "ru": "Ближний"}, "title": {"uk": "Найближчий до монстра", "ru": "Ближайший к монстру"}},
}

var type: String
var def: Dictionary
var map: GameMap
var aim: String = "first"   # кого цілити — ключ TARGET_MODES
var col: int
var row: int
var x: float
var y: float
var level: int = 1
var spent: float
var cooldown: float = 0.0
var buffs: Array = []       # бафи відьми на цей набіг: {kind: 'rate' | 'dmg', v}
var angle: float = -PI / 2.0
var dir: int = 0
var boulders: float = 0.0   # валуни орка
var links: Dictionary = {}  # цілі вампіра -> секунди висмоктування
var deaths: int = 0         # смерті до наступних душ кладовища
var ramp_time: float = 0.0
var _game_ref: WeakRef = null


static func _data():
	return Engine.get_main_loop().root.get_node("Data")


# Оцінка цілі за режимом (більше = краще), як TARGET_MODES[mode].score(e, tower)
static func target_score(mode: String, e, t) -> float:
	match mode:
		"first": return -e.left
		"last": return e.left
		"strong": return e.hp + e.shield
		"weak": return -(e.hp + e.shield)
		"close": return -Vector2(e.x - t.x, e.y - t.y).length()
	return 0.0


# чи пріоритет a ([ранг, score]) кращий за b
static func better_target(a: Array, b: Array) -> bool:
	return a[0] > b[0] if a[0] != b[0] else a[1] > b[1]


func _init(p_type: String, p_col: int, p_row: int, p_map: GameMap) -> void:
	var d = _data()
	type = p_type
	def = d.monsters[p_type]
	map = p_map
	col = p_col
	row = p_row
	var c := map.cell_center(col, row)
	x = c.x
	y = c.y
	spent = float(def["cost"])
	if def.get("fixedDir", false):
		set_dir(3)
	if def.get("attack") == "manual":
		boulders = d.targets_at(def, 1)
	if def.get("attack") == "drain":
		links = {}
	if def.get("attack") == "grave":
		deaths = 0


func set_dir(d: int) -> void:
	dir = (d + 4) % 4
	angle = dir * PI / 2.0


func beam_end(rng: float = -1.0) -> Vector2:
	if rng < 0.0:
		rng = range_px()
	var d: Dictionary = Rules.DIRS[dir]
	return Vector2(x + d["dx"] * rng, y + d["dy"] * rng)


# смуга завширшки 2 × beamWidth клітинок + сам авантюрист
func in_beam(e, x2: float, y2: float) -> bool:
	return Rules.seg_dist(e.x, e.y, x, y, x2, y2) <= e.radius + 4 + float(def.get("beamWidth", 0)) * map.cell


# хто в зоні дії: у колі дальності, а для біхолдера — на лінії його променя
func reaches(e) -> bool:
	if not def.get("fixedDir", false):
		var d := Vector2(e.x - x, e.y - y).length()
		return d <= range_px() + e.radius and d >= min_range() * map.cell
	var end := beam_end()
	return in_beam(e, end.x, end.y)


# характеристики з урахуванням бафів відьми
func stats() -> Dictionary:
	var s: Dictionary = _data().tower_stats(def, level)
	for b in buffs:
		if b["kind"] == "dmg":
			s["damage"] *= 1.0 + b["v"]
		else:
			s["rate"] *= 1.0 - b["v"]
	return s


# чи обирає монстр ціль сам (тоді гравець може задати фільтр цілі)
func aims() -> bool:
	return not def.get("fixedDir", false) and not (def.get("attack", "projectile") in ["aura", "haunt", "buff", "manual", "grave"])


# чи може цей монстр атакувати авантюриста: невидимих — лише з detect
func can_hit(e, game = null) -> bool:
	if game == null:
		game = _game_ref.get_ref() if _game_ref != null else null
	if not Rules.alive(e):
		return false
	if e.hidden and not def.get("detect", false):
		return false
	return not (def.get("attack") == "web" and Rules.web_proof(e, game))


# [ранг, score]; носія прапора (undying) б'ють останнім
func priority(e) -> Array:
	return [0 if e.def.get("undying", false) else 1, target_score(aim, e, self)]


func damage() -> float:
	return stats()["damage"]


func range_px() -> float:
	return stats()["range"] * map.cell


func min_range() -> float:
	return stats()["minRange"]   # мертва зона, кл.


func upgrade_cost():
	if level >= int(_data().cfg["MAX_LEVEL"]):
		return null
	return def["levels"]["upgrade"][level - 1]


func sell_value() -> int:
	return int(floor(spent * float(_data().cfg["SELL_REFUND"])))


func update(dt: float, game) -> void:
	_game_ref = weakref(game)
	if def.get("detect", false):
		var rt: float = float(_data().cfg["REVEAL_TIME"])
		for e in game.enemies:
			if e.stealth and reaches(e):
				e.revealed = rt
	var attack: String = def.get("attack", "projectile")
	if attack == "buff" or attack == "manual" or attack == "grave":
		return
	if attack == "haunt":
		haunt(game, stats())
		return
	if attack == "drain":
		drain(game, dt, stats())
		return
	cooldown -= dt
	if cooldown > 0.0:
		return
	var target = null
	var best = null
	for e in game.enemies:
		if not can_hit(e, game) or not reaches(e):
			continue
		var v := priority(e)
		if best == null or better_target(v, best):
			best = v
			target = e
	if target == null:
		return
	if not def.get("fixedDir", false):
		angle = atan2(target.y - y, target.x - x)
	var s := stats()
	if attack == "aura":
		stomp(game, s)
	elif attack == "cleave":
		cleave(game, s, target)
	elif attack == "beam":
		beam(game, s)
	elif attack == "web":
		web(game, s)
	else:
		game.projectiles.append(Projectile.new(self, target))
	cooldown = s["rate"]


# привид: постійний холодний туман — усі в ньому крихкі, невидимі ще й сповільнені
func haunt(game, s: Dictionary) -> void:
	var rad: float = s["range"] * map.cell
	for e in game.enemies:
		if not Rules.alive(e) or Vector2(e.x - x, e.y - y).length() > rad + e.radius:
			continue
		e.make_frail(s["frail"], 0.2)
		if e.stealth:
			e.slow(s["slow"], 0.3)


# вампір: тримає до targets цілей; на кожній урон росте, поки її не відпустить
func drain(game, dt: float, s: Dictionary) -> void:
	for e in links.keys():
		if not can_hit(e, game) or not reaches(e):
			links.erase(e)
	if links.size() < int(s["targets"]):
		var free: Array = []
		for e in game.enemies:
			if not links.has(e) and can_hit(e, game) and reaches(e):
				free.append([e, priority(e)])
		# стабільне сортування (як Array.sort у JS): вставками
		var sorted: Array = []
		for it in free:
			var i := sorted.size()
			while i > 0 and better_target(it[1], sorted[i - 1][1]):
				i -= 1
			sorted.insert(i, it)
		var need: int = int(s["targets"]) - links.size()
		for i in mini(need, sorted.size()):
			links[sorted[i][0]] = 0.0
	ramp_time = float(def["ramp"]) * s["rate"]
	for e in links.keys():
		var held: float = links[e]
		var k := minf(1.0, held / ramp_time)
		e.hit((s["damage"] + (s["damageMax"] - s["damage"]) * k) * dt, false, type)
		links[e] = held + dt
		angle = atan2(e.y - y, e.x - x)


# живі лати: удар по цілі поруч + фізичний сплеш навколо неї
func cleave(game, s: Dictionary, target) -> void:
	var rad: float = s["splash"] * map.cell
	target.hit(s["damage"], false, type)
	for e in game.enemies:
		if e == target or not can_hit(e, game):
			continue
		var dmg: float = s["damage"] * float(def.get("splashBig", 1)) if e.def.get("big", false) else s["damage"]
		if dmg > 0.0 and Vector2(e.x - target.x, e.y - target.y).length() <= rad + e.radius:
			e.hit(dmg, false, type)
	game.effects.append({"kind": "slash", "x": target.x, "y": target.y, "a": angle, "r": rad, "t": 0.25, "max": 0.25, "color": "#dfe6f2"})


# голем: удар по землі по всіх у радіусі
func stomp(game, s: Dictionary) -> void:
	var rad: float = s["range"] * map.cell
	for e in game.enemies:
		if not Rules.alive(e) or Vector2(e.x - x, e.y - y).length() > rad + e.radius:
			continue
		e.hit(s["damage"], false, type)
		if game.rng() < s["stunChance"]:
			e.stun(float(def["stun"]))
	game.effects.append({"kind": "quake", "x": x, "y": y, "r": rad, "t": 0.35, "max": 0.35, "color": def["color"]})


# павук: павутина конусом у бік angle
func web(game, s: Dictionary) -> void:
	var length: float = s["range"] * map.cell
	var half: float = float(def["cone"]) * PI / 360.0
	for e in game.enemies:
		if not Rules.alive(e) or Rules.web_proof(e, game):
			continue
		var dx: float = e.x - x
		var dy: float = e.y - y
		var d := Vector2(dx, dy).length()
		if d > length + e.radius:
			continue
		var da := absf(atan2(dy, dx) - angle)
		if da > PI:
			da = PI * 2.0 - da
		if d > e.radius and da > half + asin(minf(1.0, e.radius / d)):
			continue
		e.stun(s["hold"], true)
	game.effects.append({"kind": "cone", "x": x, "y": y, "r": length, "a": angle, "half": half,
		"t": 0.4, "max": 0.4, "color": def["color"]})


# біхолдер: промінь на всю дальність у напрямку angle
func beam(game, s: Dictionary) -> void:
	var length: float = s["range"] * map.cell
	var x2 := x + cos(angle) * length
	var y2 := y + sin(angle) * length
	for e in game.enemies:
		if Rules.alive(e) and in_beam(e, x2, y2):
			e.hit(s["damage"], false, type)
	game.effects.append({"kind": "beam", "x": x, "y": y, "x2": x2, "y2": y2, "w": float(def.get("beamWidth", 0)) * map.cell,
		"t": 0.3, "max": 0.3, "color": def["color"]})
