extends Node
# Бенчмарк малювання: 18 монстрів, ~40 авантюристів (набіг 40), 600 кадрів без vsync.
# Запуск: "$G" --path godot res://tests/bench.tscn   (друкує FPS і середній час _draw шарів)

const FRAMES := 600
const WARMUP := 60

var wv: WorldView
var n := 0
var t0 := 0
var max_enemies := 0


func _ready() -> void:
	DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED)
	Engine.max_fps = 0
	wv = WorldView.new()
	wv.demo = true
	add_child(wv)
	var g: GameState = wv.game
	g.save_enabled = false
	g.money = 99999
	# 18 монстрів біля коридору
	var order: Array = Rules.data().monster_order
	var keys: Array = g.map.path_cells.keys()
	keys.sort_custom(func(a, b): return a.x < b.x or (a.x == b.x and a.y < b.y))
	var used: Array = []
	var pi := 0
	for key in keys:
		if g.towers.size() >= 18:
			break
		for d in [Vector2i(0, -1), Vector2i(0, 1), Vector2i(1, 0), Vector2i(-1, 0)]:
			var cc: Vector2i = key + d
			if not g.in_bounds(cc.x, cc.y) or not g.can_place(cc.x, cc.y):
				continue
			var ok := true
			for u in used:
				if Vector2(u - cc).length() < 1.5:
					ok = false
			if ok and g.place_tower(order[pi % order.size()], cc.x, cc.y):
				used.append(cc)
				pi += 1
			break
	g.lives = 999999
	for i in 60:
		_top_up()
		g.update(0.016)
	print("Монстрів: %d, авантюристів: %d" % [g.towers.size(), g.enemies.size()])


# Тримає ~40 живих авантюристів набігу 40: щокадру випускає наступного з черги, черга скінчилась — новий набіг 40.
func _top_up() -> void:
	var g: GameState = wv.game
	if g.enemies.size() >= 40:
		return
	if g.spawn_queue.is_empty():
		g.wave_active = false
		g.wave = 39
		g.start_wave()
	g.spawn_timer = 0.0


func _process(_delta: float) -> void:
	_top_up()
	n += 1
	max_enemies = maxi(max_enemies, wv.game.enemies.size())
	if n == WARMUP:
		Canvas2D.prof.clear()
		t0 = Time.get_ticks_usec()
	if n == WARMUP + FRAMES:
		var secs := (Time.get_ticks_usec() - t0) / 1e6
		print("FPS середній: %.1f (кадрів %d за %.2f с), макс. авантюристів %d" % [FRAMES / secs, FRAMES, secs, max_enemies])
		for k in Canvas2D.prof:
			print("  _draw %-8s %.2f мс/кадр" % [k, Canvas2D.prof[k] / 1000.0 / FRAMES])
		get_tree().quit()
