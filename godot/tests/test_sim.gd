extends "res://tests/test_base.gd"
# Золотий тест: та сама розстановка й сід, що в tools/export_sim.js → ті самі душі/міцність/вбивства по набігах.


func _kills(g: GameState) -> int:
	var k := 0
	for st in g.stats.values():
		k += int(st["kills"])
	return k


func _setup(fx: Dictionary) -> GameState:
	var g := GameState.create("campaign")
	g.save_enabled = false
	g.seed_rng(int(fx["seed"]))
	g.money = int(fx["money"])
	for p in fx["placements"]:
		g.place_tower(p["type"], int(p["col"]), int(p["row"]))
	for t in g.towers:
		for i in int(fx["upgrades"]):
			g.upgrade_tower(t)
	return g


func test_sim_matches_web():
	var f := FileAccess.open("res://tests/fixtures/web_sim.json", FileAccess.READ)
	var fx: Dictionary = JSON.parse_string(f.get_as_text())
	var g := _setup(fx)
	assert_eq(g.money, int(fx["start_money"]), "душі після розстановки")
	assert_near(float(fx["dt"]), 1.0 / 60.0, 1e-9, "dt")
	var dt := 1.0 / 60.0   # не з JSON: парсер Godot може округлити останній розряд
	for w in fx["waves"]:
		g.start_wave()
		var time := 0.0
		while g.wave_active and g.over == "" and time < 1200.0:
			g.update(dt)
			time += dt
		var n: int = int(w["wave"])
		assert_eq(g.wave, n, "набіг")
		assert_eq(g.lives, int(w["lives"]), "міцність, набіг %d" % n)
		assert_eq(_kills(g), int(w["kills"]), "вбивства, набіг %d" % n)
		assert_eq(g.money, int(w["money"]), "душі, набіг %d" % n)
		assert_eq(g.enemies.size(), int(w["alive"]), "живих, набіг %d" % n)
	return true


func test_rng_mulberry():
	var g := GameState.new()
	g.seed_rng(12345)
	var a := g.rng()
	assert_true(a >= 0.0 and a < 1.0, "rng у [0,1)")
	g.seed_rng(12345)
	assert_eq(g.rng(), a, "rng детермінований")
	return true


func test_save_roundtrip():
	var g := GameState.create("campaign")
	g.slot = "test-roundtrip"
	g.seed_rng(1)
	g.money = 5000
	g.place_tower("eye", 6, 7)
	g.place_tower("orc", 13, 6)
	g.place_tower("grave", 12, 4)
	g.place_tower("archer", 3, 3)
	g.upgrade_tower(g.towers[0])
	g.towers[3].aim = "strong"
	g.towers[0].set_dir(1)
	g.towers[1].boulders = 1
	g.towers[2].deaths = 2
	g.wave = 7
	g.lives = 13
	g.seen["normal"] = true
	g.stats["archer"]["kills"] = 4
	SaveStore.autosave(g)
	var h := GameState.create("campaign")
	h.slot = "test-roundtrip"
	assert_true(SaveStore.restore(h), "restore")
	SaveStore.delete_save("test-roundtrip")
	assert_eq(h.money, g.money, "душі")
	assert_eq(h.lives, 13, "міцність")
	assert_eq(h.wave, 7, "набіг")
	assert_true(h.seen.has("normal"), "seen")
	assert_eq(int(h.stats["archer"]["kills"]), 4, "stats")
	assert_eq(h.towers.size(), 4, "монстри")
	for i in 4:
		var a = g.towers[i]
		var b = h.towers[i]
		assert_eq(b.type, a.type, "тип")
		assert_eq(b.col, a.col, "col")
		assert_eq(b.row, a.row, "row")
		assert_eq(b.level, a.level, "рівень")
		assert_eq(b.spent, a.spent, "spent")
		assert_eq(b.aim, a.aim, "aim")
		assert_eq(b.dir, a.dir, "dir")
		assert_eq(b.boulders, a.boulders, "boulders")
		assert_eq(b.deaths, a.deaths, "deaths")
	return true


func test_can_afford_reasons():
	var g := GameState.create("campaign")
	g.save_enabled = false
	assert_eq(g.can_afford("archer"), "", "можна")
	g.money = 0
	assert_eq(g.can_afford("archer"), "money", "душі")
	g.money = 100000
	g.place_tower("orc", 13, 6)
	assert_eq(g.can_afford("orc"), "unique", "єдиний орк")
	return true
