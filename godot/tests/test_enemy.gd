extends "res://tests/test_base.gd"

class FakeGame:
	var enemies: Array = []
	var effects: Array = []
	var towers: Array = []
	var spawn_queue: Array = []
	var stats: Dictionary = {}
	var _s := 12345

	func rng() -> float:
		_s = (_s * 1103515245 + 12345) & 0x7fffffff
		return float(_s) / 2147483648.0


func test_walk_default_route():
	var map := GameMap.for_level("")
	var g := FakeGame.new()
	var e := Enemy.new("normal", 1, {}, map)
	g.enemies.append(e)
	var steps := 0
	while not e.escaped and steps < 100000:
		e.update(1.0 / 60.0, g)
		steps += 1
	assert_true(e.escaped, "дійшов до Серця")
	var expected := map.route_len(0) / e.base_speed
	assert_near(steps / 60.0, expected, expected * 0.02, "час проходу")
	return true


func test_hit_armor():
	var g := FakeGame.new()
	var e := Enemy.new("knight", 1, {}, null)   # броня 1.8
	g.enemies.append(e)
	var hp0 := e.hp
	e.hit(10.0, false, "", g)
	assert_near(hp0 - e.hp, maxf(10.0 * 0.2, 10.0 - e.armor), 1e-6, "урон з бронею")
	hp0 = e.hp
	e.hit(1.0, false, "", g)
	assert_near(hp0 - e.hp, maxf(0.2, 1.0 - e.armor), 1e-6, "мінімум 20%")
	hp0 = e.hp
	e.hit(10.0, true, "", g)
	assert_near(hp0 - e.hp, 10.0, 1e-6, "pierce")
	e.hit(1.0e9, true, "", g)
	assert_true(e.dead, "мертвий")
	return true


func test_stats_and_hit_src():
	var g := FakeGame.new()
	g.stats["archer"] = {"round": 0.0, "total": 0.0, "kills": 0}
	var e := Enemy.new("normal", 1, {}, null)
	g.enemies.append(e)
	e.hit(5.0, false, "archer", g)
	assert_near(g.stats["archer"]["total"], 5.0, 1e-6, "статистика урону")
	e.hit(1.0e9, false, "archer", g)
	assert_eq(g.stats["archer"]["kills"], 1, "вбивство")
	return true


func test_spawn_on_death():
	var k := Enemy.new("knight", 1, {}, null)
	k.set_route(0, 300.0)
	var out = k.spawn_on_death()
	assert_eq(out.size(), 1, "вершник лишає одного")
	assert_eq(out[0].type, "normal", "воїна")
	assert_true(out[0].summoned, "summoned")
	assert_eq(out[0].origin, "knight", "origin")
	assert_near(out[0].progress, 300.0 - 40.0, 1e-6, "позаду")
	var j := Enemy.new("jester", 1, {}, null)
	j.set_route(0, 300.0)
	var halves = j.spawn_on_death()
	assert_eq(halves.size(), 2, "дві половинки")
	assert_eq(halves[0].gen, 1, "gen")
	assert_eq(halves[0].max_hp, maxi(1, int(roundf(j.max_hp / 2.0))), "половина HP")
	assert_eq(halves[0].reward, 0, "душі лише за найменших")
	var small = halves[0].spawn_on_death()
	assert_eq(small.size(), 2, "ще дві")
	assert_eq(small[0].reward, j.split_reward, "найменші дають душі")
	assert_eq(small[0].spawn_on_death().size(), 0, "далі не розпадаються")
	return true


func test_status():
	var g := FakeGame.new()
	var e := Enemy.new("normal", 1, {}, null)
	g.enemies.append(e)
	e.slow(0.5, 1.0)
	assert_near(e.speed, e.base_speed * 0.5, 1e-6, "slow")
	e.stun(1.0)
	assert_eq(e.speed, 0.0, "stun")
	var s := Enemy.new("scout", 31, {}, null)
	assert_true(s.hidden, "розвідник невидимий")
	s.revealed = 1.0
	assert_true(not s.hidden, "підсвічений")
	assert_near(e.left, GameMap.for_level("").route_len(0) - e.progress, 1e-6, "left")
	return true
