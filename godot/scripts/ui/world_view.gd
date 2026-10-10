extends Node2D
class_name WorldView
# Світ гри 800x480: шари карти, динамічний шар, масштаб під екран, ігровий цикл і тимчасове керування ПК.

const WORLD_W := 800.0
const WORLD_H := 480.0
const SELECT_KEYS := [KEY_1, KEY_2, KEY_3, KEY_4, KEY_5, KEY_6, KEY_7, KEY_8, KEY_9, KEY_0, KEY_Q, KEY_W, KEY_E]

var game: GameState
var map_layer: MapLayer
var fx_under: MapFx
var dyn: Node2D
var fx_over: MapFx
var hud: Label
var pause_label: Label
var types: Array = []
var placing: String = ""
var selected: Tower = null
var hover := Vector2i(-1, -1)
var ghost: Tower = null
var demo := false
var frame_count := 0
var _add_layer: Node2D


static func _data() -> Node:
	return Engine.get_main_loop().root.get_node("Data")


func _ready() -> void:
	var mode := "campaign"
	var level_id := ""
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--level="):
			level_id = arg.trim_prefix("--level=")
			mode = "level"
		elif arg == "--demo":
			demo = true
	start(mode, level_id)
	if demo:
		_setup_demo()
	get_viewport().size_changed.connect(_fit)
	_fit()


func start(mode: String, level_id: String = "") -> void:
	game = GameState.create(mode, level_id)
	if demo or not SaveStore.restore(game):
		pass
	if demo:
		game.save_enabled = false
	for ch in get_children():
		ch.queue_free()
	map_layer = MapLayer.new()
	map_layer.map = game.map
	add_child(map_layer)
	fx_under = MapFx.new()
	fx_under.map = game.map
	fx_under.part = "under"
	add_child(fx_under)
	dyn = Node2D.new()
	add_child(dyn)
	_add_layer = Canvas2D.make_add_layer(dyn)
	dyn.draw.connect(_draw_dynamic)
	fx_over = MapFx.new()
	fx_over.map = game.map
	fx_over.part = "over"
	add_child(fx_over)
	var cl := CanvasLayer.new()
	add_child(cl)
	hud = Label.new()
	hud.position = Vector2(8, 4)
	hud.add_theme_font_size_override("font_size", 16)
	hud.add_theme_color_override("font_outline_color", Color.BLACK)
	hud.add_theme_constant_override("outline_size", 4)
	cl.add_child(hud)
	pause_label = Label.new()
	pause_label.text = "ПАУЗА"
	pause_label.add_theme_font_size_override("font_size", 40)
	pause_label.position = Vector2(560, 300)
	pause_label.visible = false
	cl.add_child(pause_label)
	var d := _data()
	if mode == "level" and game.map.level != null:
		types = game.map.level["monsters"]
	else:
		types = d.monster_order
	placing = ""
	selected = null


# Масштаб: min(h/480, w/800), центрування.
func _fit() -> void:
	var vs := get_viewport_rect().size
	var s := minf(vs.y / WORLD_H, vs.x / WORLD_W)
	scale = Vector2(s, s)
	position = (vs - Vector2(WORLD_W, WORLD_H) * s) / 2.0


func screen_to_cell(pos: Vector2) -> Vector2i:
	var local := (pos - position) / scale.x
	return Vector2i(int(floor(local.x / game.map.cell)), int(floor(local.y / game.map.cell)))


func _process(delta: float) -> void:
	frame_count += 1
	var dt := minf(delta, 0.05)
	if not game.paused:
		for i in int(game.speed):
			if game.over == "":
				game.update(dt)
	fx_under.heart_flash = game.heart_flash
	fx_over.heart_flash = game.heart_flash
	dyn.queue_redraw()
	pause_label.visible = game.paused and game.over == ""
	_update_hud()
	if demo and frame_count == 600:
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png("user://game_demo.png")
		print("Скріншот: ", ProjectSettings.globalize_path("user://game_demo.png"))


func _update_hud() -> void:
	var t := "Душі %d   Серце %d   Набіг %d/%s   x%d" % [game.money, game.lives, game.wave, ("inf" if game.max_waves() == INF else str(int(game.max_waves()))), int(game.speed)]
	if placing != "":
		t += "\nСелимо: " + placing
	if selected != null:
		t += "\nВибрано: %s рів.%d (U посилити, S продати)" % [selected.type, selected.level]
	if game.over != "":
		t += "\nКІНЕЦЬ: " + game.over
	hud.text = t


func _draw_dynamic() -> void:
	var t0 := Time.get_ticks_usec()
	var c := Canvas2D.new(dyn, _add_layer)
	var time := Canvas2D.now()
	var cell := game.map.cell
	if placing != "" and game.in_bounds(hover.x, hover.y):
		var ok := game.can_place(hover.x, hover.y) and game.can_afford(placing) == ""
		c.fill_style = "rgba(150,95,220,0.35)" if ok else "rgba(239,71,111,0.4)"
		c.fill_rect(hover.x * cell, hover.y * cell, cell, cell)
		if ghost == null or ghost.type != placing or ghost.col != hover.x or ghost.row != hover.y:
			ghost = game.new_tower(placing, hover.x, hover.y)
		_draw_reach(c, ghost, ok)
		c.save()
		c.global_alpha = 0.55
		MonsterDraw.draw_tower(c, ghost, time)
		c.restore()
	if selected != null:
		_draw_reach(c, selected, true)
	var t1 := Time.get_ticks_usec()
	for t in game.towers:
		MonsterDraw.draw_tower(c, t, time)
	Canvas2D.prof_add("towers", t1)
	t1 = Time.get_ticks_usec()
	for e in game.enemies:
		AdventurerDraw.draw_enemy(c, e, time)
	Canvas2D.prof_add("enemies", t1)
	for t in game.towers:
		if t.def.get("attack") == "drain":
			MonsterDraw.draw_links(c, t, time)
	for p in game.projectiles:
		EffectsDraw.draw_projectile(c, p, time)
	for fx in game.effects:
		EffectsDraw.draw_effect(c, fx, time)
	Canvas2D.prof_add("dynamic", t0)


func _draw_reach(c: Canvas2D, t: Tower, ok: bool) -> void:
	if t.def.get("fixedDir", false):
		MapDraw.draw_beam_line(c, t, ok)
	elif t.range_px() > 0:
		MapDraw.draw_range(c, t.x, t.y, t.range_px(), ok, t.min_range() * game.map.cell)


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion:
		hover = screen_to_cell(event.position)
	elif event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		hover = screen_to_cell(event.position)
		_click(hover)
	elif event is InputEventKey and event.pressed and not event.echo:
		_key(event.keycode)


func _click(cell: Vector2i) -> void:
	if game.over != "" or not game.in_bounds(cell.x, cell.y):
		return
	var t = game.tower_at(cell.x, cell.y)
	if t != null:
		selected = t
		placing = ""
	elif placing != "":
		game.place_tower(placing, cell.x, cell.y)


func _key(code: int) -> void:
	var idx := SELECT_KEYS.find(code)
	if idx >= 0:
		if idx < types.size():
			placing = "" if placing == types[idx] else types[idx]
			selected = null
		return
	match code:
		KEY_U:
			if selected != null:
				game.upgrade_tower(selected)
		KEY_S:
			if selected != null:
				game.sell_tower(selected)
				selected = null
		KEY_SPACE:
			game.start_wave()
		KEY_P:
			game.paused = not game.paused
		KEY_F:
			game.speed = 1.0 if game.speed >= 3.0 else game.speed + 1.0
		KEY_ESCAPE:
			placing = ""
			selected = null


# --demo: 6 різних монстрів біля коридору, 5000 душ, набіг 5.
func _setup_demo() -> void:
	game.money = 5000
	var picks := ["archer", "cannon", "frost", "spider", "golem", "lich"]
	var used: Array = []
	var pi := 0
	var keys: Array = game.map.path_cells.keys()
	keys.sort_custom(func(a, b): return a.x < b.x or (a.x == b.x and a.y < b.y))
	for key in keys:
		if pi >= picks.size():
			break
		for d in [Vector2i(0, -1), Vector2i(0, 1), Vector2i(1, 0), Vector2i(-1, 0)]:
			var cc: Vector2i = key + d
			if not game.in_bounds(cc.x, cc.y) or not game.can_place(cc.x, cc.y):
				continue
			var far := true
			for u in used:
				if Vector2(u - cc).length() < 3.0:
					far = false
			if far:
				if game.place_tower(picks[pi], cc.x, cc.y):
					used.append(cc)
					pi += 1
				break
	game.wave = 4
	game.start_wave()
