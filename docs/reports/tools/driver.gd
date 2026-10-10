extends SceneTree
# Драйвер тестера (Godot). Запуск:
# "$G" --path godot [--resolution WxH] -s D:/MyProg/tower-defense/docs/reports/tools/driver.gd -- --name=X [--level=id] [--wave=N] [--lvl=10] [--shots=3,6,10] [--towers=all|a,b] [--nowave]
var wv
var opts := {}
var t := 0.0
var shots: Array = []
var done := 0
var fps_samples: Array = []
var maxen := 0
var seen := {}
var outdir := "D:/MyProg/tower-defense/docs/reports/screens/"

func _initialize() -> void:
	for a in OS.get_cmdline_user_args():
		var kv: PackedStringArray = a.trim_prefix("--").split("=")
		opts[kv[0]] = kv[1] if kv.size() > 1 else "1"
	for s in str(opts.get("shots", "3,8")).split(","):
		shots.append(float(s))
	wv = load("res://scenes/game.tscn").instantiate()
	root.add_child(wv)  # _ready читає --level= з cmdline
	await process_frame
	var g = wv.game
	g.save_enabled = false
	g.towers.clear()
	g.lives = 99999
	g.money = 999999
	var picks: Array = []
	var ts: String = str(opts.get("towers", "none"))
	if ts == "all":
		picks = Rules.data().monster_order.duplicate()
	elif ts != "none":
		picks = Array(ts.split(","))
	_place(g, picks, int(opts.get("lvl", 1)))
	if not opts.has("nowave"):
		g.wave = int(opts.get("wave", 5)) - 1
		g.start_wave()
	if opts.has("speed"):
		g.speed = float(opts["speed"])

func _place(g, picks: Array, lvl: int) -> void:
	var used: Array = []
	var keys: Array = g.map.path_cells.keys()
	keys.sort_custom(func(a, b): return a.x < b.x or (a.x == b.x and a.y < b.y))
	var i := 0
	var guard := 0
	while i < picks.size() and guard < 20:
		guard += 1
		for key in keys:
			if i >= picks.size():
				break
			for d in [Vector2i(0, -1), Vector2i(0, 1), Vector2i(1, 0), Vector2i(-1, 0)]:
				var cc: Vector2i = key + d
				if not g.in_bounds(cc.x, cc.y) or not g.can_place(cc.x, cc.y):
					continue
				var far := true
				for u in used:
					if Vector2(u - cc).length() < (3.0 if guard < 3 else 1.5):
						far = false
				if far and g.place_tower(picks[i], cc.x, cc.y):
					used.append(cc)
					var tw = g.tower_at(cc.x, cc.y)
					for k in range(lvl - 1):
						g.upgrade_tower(tw)
					i += 1
					break
	print("placed ", i, "/", picks.size(), " money=", g.money, " towers=", g.towers.map(func(x): return x.type + str(x.level)), " next=", (g.can_afford(picks[i]) if i < picks.size() else ""))

func _process(delta: float) -> bool:
	if wv == null or wv.game == null:
		return false
	t += delta
	var g = wv.game
	maxen = max(maxen, g.enemies.size())
	for e in g.enemies:
		seen[e.type] = true
	if int(t * 4) != int((t - delta) * 4):
		fps_samples.append(Engine.get_frames_per_second())
	if done < shots.size() and t >= shots[done]:
		var img := root.get_texture().get_image()
		img.resize(img.get_width() / 2, img.get_height() / 2)
		var fn := "%s%s_%d.png" % [outdir, opts.get("name", "x"), done]
		img.save_png(fn)
		print("shot ", fn, " t=", snappedf(t, 0.1), " en=", g.enemies.size(), " proj=", g.projectiles.size(), " fx=", g.effects.size(), " wave_active=", g.wave_active, " lives=", g.lives)
		done += 1
	if done >= shots.size():
		var mn := 1e9
		var sum := 0.0
		for f in fps_samples:
			mn = min(mn, f)
			sum += f
		print("FPS avg=", snappedf(sum / max(1, fps_samples.size()), 0.1), " min=", mn, " maxEnemies=", maxen, " types=", seen.keys(), " over=", g.over)
		quit()
	return false
