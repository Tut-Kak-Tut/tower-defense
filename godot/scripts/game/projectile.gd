class_name Projectile extends RefCounted
# Снаряд монстра: 1:1 з Projectile у web/js/entities.js, без малювання.

var x: float
var y: float
var target
var tx: float
var ty: float
var tower
var speed: float
var damage: float
var splash: float
var slow: float
var frail: float
var slow_time: float
var poison: float
var poison_time: float
var chain: int
var chain_range: float
var color: String
var kind: String
var src: String
var angle: float
var lob: bool            # грудка слизу летить дугою
var dist0: float
var flown: float = 0.0
var done: bool = false


func _init(p_tower, p_target) -> void:
	var cell: float = p_tower.map.cell
	x = p_tower.x
	y = p_tower.y
	target = p_target
	tx = p_target.x
	ty = p_target.y
	var d: Dictionary = p_tower.def
	var s: Dictionary = p_tower.stats()
	tower = p_tower
	speed = float(d["projSpeed"])
	damage = s["damage"]
	splash = s["splash"] * cell
	slow = s["slow"]
	frail = s["frail"]
	slow_time = float(d.get("slowTime", 0))
	poison = s["poison"]
	poison_time = float(d.get("poisonTime", 0))
	chain = int(s["chain"])
	chain_range = s["chainRange"] * cell
	color = d["color"]
	kind = p_tower.type
	src = p_tower.type
	angle = p_tower.angle
	lob = bool(d.get("lob", false))
	dist0 = Vector2(p_target.x - p_tower.x, p_target.y - p_tower.y).length()
	if dist0 == 0.0:
		dist0 = 1.0


func update(dt: float, game) -> void:
	# якщо ціль ще жива — летимо за нею, інакше до її останньої позиції
	if not target.dead and not target.escaped:
		tx = target.x
		ty = target.y
	var dx := tx - x
	var dy := ty - y
	var d := Vector2(dx, dy).length()
	var step := speed * dt
	if d <= step:
		x = tx
		y = ty
		explode(game)
		done = true
	else:
		x += dx / d * step
		y += dy / d * step
		flown += step
		angle = atan2(dy, dx)


func explode(game) -> void:
	if Rules.alive(target) and target.def.get("deflect", 0) and game.rng() < float(target.def["deflect"]):
		# майстер меча відбиває снаряд — ні урону, ні вибуху
		game.effects.append({"kind": "spark", "x": target.x, "y": target.y, "t": 0.3, "max": 0.3, "color": "#eef4ff"})
		return
	if splash != 0.0:
		for e in game.enemies:
			if e.dead or e.escaped:
				continue
			if Vector2(e.x - x, e.y - y).length() <= splash + e.radius:
				apply_to(e)
		game.effects.append({"x": x, "y": y, "r": splash, "t": 0.25, "max": 0.25, "color": color})
	elif Rules.alive(target):
		apply_to(target)
		if chain > 0:
			jump(game)


# блискавка лича: від цілі до найближчого ще не враженого, урон −25% за стрибок
func jump(game) -> void:
	var hit := {target: true}
	var points: Array = [{"x": target.x, "y": target.y}]
	var from = target
	var dmg := damage
	for i in chain:
		var nxt = null
		var best := chain_range
		for e in game.enemies:
			if hit.has(e) or not tower.can_hit(e, game):
				continue
			var d := Vector2(e.x - from.x, e.y - from.y).length()
			if d <= best:
				best = d
				nxt = e
		if nxt == null:
			break
		dmg *= 0.75
		nxt.hit(dmg, false, src)
		hit[nxt] = true
		points.append({"x": nxt.x, "y": nxt.y})
		from = nxt
	if points.size() > 1:
		game.effects.append({"kind": "bolt", "points": points, "t": 0.2, "max": 0.2, "color": color})


func apply_to(e) -> void:
	if frail != 0.0:
		e.make_frail(frail, slow_time)
	e.hit(damage, false, src)
	if slow != 0.0:
		e.slow(slow, slow_time)
	if poison != 0.0:
		e.poison(poison, poison_time, src)
