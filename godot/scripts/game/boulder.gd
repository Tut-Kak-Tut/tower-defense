class_name Boulder extends RefCounted
# Валун орка (живе в game.projectiles): 1:1 з Boulder у web/js/entities.js, без малювання.

var x: float
var y: float
var dx: float
var dy: float
var left: float          # скільки ще котитися
var speed: float = 250.0
var damage: float
var knock: float
var reach: float
var src: String
var struck: Dictionary = {}
var spin: float = 0.0
var done: bool = false
var cell: float


func _init(tower) -> void:
	var s: Dictionary = tower.stats()
	var d: Dictionary = Rules.DIRS[tower.dir]
	cell = tower.map.cell
	x = tower.x
	y = tower.y
	dx = d["dx"]
	dy = d["dy"]
	left = s["range"] * cell
	damage = s["damage"]
	knock = s["knock"] * cell
	reach = float(tower.def.get("beamWidth", 0)) * cell
	src = tower.type


func update(dt: float, game) -> void:
	var step := minf(left, speed * dt)
	x += dx * step
	y += dy * step
	left -= step
	spin += step / 9.0
	for e in game.enemies:
		if not Rules.alive(e) or struck.has(e) or Vector2(e.x - x, e.y - y).length() > reach + e.radius:
			continue
		struck[e] = true
		if not e.def.get("steadfast", false):
			e.set_progress(e.progress - knock)
			e.stun(0.3)
	if left > 0.0:
		return
	var rad := cell
	for e in game.enemies:
		if Rules.alive(e) and (struck.has(e) or Vector2(e.x - x, e.y - y).length() <= rad + e.radius):
			e.hit(damage, false, src)
	game.effects.append({"kind": "quake", "x": x, "y": y, "r": rad, "t": 0.4, "max": 0.4, "color": "#b0a090"})
	done = true
