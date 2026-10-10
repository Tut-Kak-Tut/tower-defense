extends "res://tests/test_base.gd"

var D


class FakeGame:
	var enemies: Array = []
	var towers: Array = []
	var projectiles: Array = []
	var effects: Array = []
	var stats: Dictionary = {}
	var wave: int = 1

	func rng() -> float:
		return 0.5


func _init() -> void:
	D = Engine.get_main_loop().root.get_node("Data")


# крок симуляції як у грі: монстри, снаряди
func _step(game: FakeGame, dt: float) -> void:
	for t in game.towers:
		t.update(dt, game)
	for p in game.projectiles:
		p.update(dt, game)
	game.projectiles = game.projectiles.filter(func(p): return not p.done)


func test_archer_kills_warrior():
	var m := GameMap.for_level("")
	var g := FakeGame.new()
	var t := Tower.new("archer", 5, 5, m)
	g.towers.append(t)
	var e := Enemy.new("normal", 1, {}, m)
	e.set_progress(320.0)
	g.enemies.append(e)
	var dmg: float = D.tower_stats(D.monsters["archer"], 1)["damage"]
	var rate: float = D.tower_stats(D.monsters["archer"], 1)["rate"]
	var shots := int(ceil(e.max_hp / dmg))
	var expect_t := (shots - 1) * rate   # перший постріл одразу, далі кожні rate
	var time := 0.0
	var dt := 0.02
	while not e.dead and time < 10.0:
		_step(g, dt)
		time += dt
	assert_true(e.dead, "воїн убитий")
	assert_true(time >= expect_t - 0.001, "не раніше %f (було %f)" % [expect_t, time])
	assert_true(time <= expect_t + 0.2, "не пізніше %f (було %f)" % [expect_t + 0.2, time])
	return true


func test_stats_level5():
	var m := GameMap.for_level("")
	var t := Tower.new("archer", 5, 5, m)
	t.level = 5
	var s := t.stats()
	var ref: Dictionary = D.tower_stats(D.monsters["archer"], 5)
	assert_eq(s, ref, "stats рівня 5")
	assert_eq(s["damage"], 24.0, "damage рівня 5")
	t.buffs.append({"kind": "dmg", "v": 0.5})
	t.buffs.append({"kind": "rate", "v": 0.2})
	assert_near(t.damage(), 36.0, 0.0001, "баф урону")
	assert_near(t.stats()["rate"], ref["rate"] * 0.8, 0.0001, "баф швидкості")
	assert_eq(t.upgrade_cost(), 120, "ціна посилення 5->6")
	t.level = 10
	assert_true(t.upgrade_cost() == null, "максимум")
	return true


func test_sell_value():
	var m := GameMap.for_level("")
	var t := Tower.new("archer", 5, 5, m)
	t.spent = 123.0
	assert_eq(t.sell_value(), int(floor(123.0 * float(D.cfg["SELL_REFUND"]))), "sell_value")
	return true


func test_beholder_beam_only_in_lane():
	var m := GameMap.for_level("")
	var g := FakeGame.new()
	var t := Tower.new("eye", 10, 6, m)   # центр (420, 260), дивиться вгору (dir 3)
	assert_eq(t.dir, 3, "dir за замовчуванням")
	var inside := Enemy.new("normal", 1, {}, m)
	inside.x = t.x
	inside.y = t.y - 100.0
	var outside := Enemy.new("normal", 1, {}, m)
	outside.x = t.x + 80.0
	outside.y = t.y - 100.0
	assert_true(t.reaches(inside), "у смузі")
	assert_true(not t.reaches(outside), "поза смугою")
	g.enemies = [inside, outside]
	g.towers = [t]
	var hp_out := outside.hp
	var hp_in := inside.hp
	t.update(0.016, g)
	assert_true(inside.hp < hp_in, "промінь вразив ворога в смузі")
	assert_eq(outside.hp, hp_out, "ворог поза смугою цілий")
	assert_eq(g.effects.size(), 1, "ефект променя")
	# поворот: вправо — тепер навпаки
	t.set_dir(0)
	outside.y = t.y
	assert_true(t.reaches(outside), "вправо: у смузі")
	assert_true(not t.reaches(inside), "вправо: нагорі поза смугою")
	return true


func test_target_modes():
	var m := GameMap.for_level("")
	var t := Tower.new("archer", 5, 5, m)
	var a := Enemy.new("normal", 1, {}, m)
	var b := Enemy.new("normal", 1, {}, m)
	a.set_progress(100.0)
	b.set_progress(300.0)
	t.aim = "first"
	assert_true(Tower.better_target(t.priority(b), t.priority(a)), "перший: далі по шляху")
	t.aim = "last"
	assert_true(Tower.better_target(t.priority(a), t.priority(b)), "останній")
	assert_true(not t.aims() == false, "лучник сам цілить")
	return true
