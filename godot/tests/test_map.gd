extends "res://tests/test_base.gd"

var D


func _init() -> void:
	D = Engine.get_main_loop().root.get_node("Data")


func test_default_map():
	var m := GameMap.for_level("")
	assert_true(m.level == null, "level null")
	assert_eq(m.routes.size(), 1, "шляхів")
	assert_eq(m.route_len(0), 1520.0, "довжина стандартного шляху")
	assert_eq(m.routes[0]["len"], [0.0, 200.0, 440.0, 640.0, 840.0, 1040.0, 1280.0, 1520.0], "len")
	assert_eq(m.path_cells.size(), 39, "клітинок коридору")
	assert_eq(m.rock_cells.size(), 0, "завалів")
	assert_eq(m.torches.size(), 6, "факелів")
	assert_eq(m.route_letter(1), "B", "літера")
	assert_eq(m.cell_center(0, 0), Vector2(20, 20), "cell_center")
	assert_true(not m.can_place_cell(4, 2), "коридор")
	assert_true(m.can_place_cell(0, 0), "вільна клітинка")
	assert_true(not m.can_place_cell(20, 0), "поза мапою")
	return true


func test_point_at():
	var m := GameMap.for_level("")
	var r := m.point_at(0, 100.0)
	assert_eq(r["pos"], Vector2(-20 + 100, 100), "pos 100")
	assert_eq(r["wp"], 1, "wp")
	r = m.point_at(0, 320.0)
	assert_eq(r["pos"], Vector2(180, 220), "pos після повороту")
	assert_eq(r["wp"], 2, "wp 2")
	r = m.point_at(0, 99999.0)
	assert_eq(r["progress"], 1519.0, "обмеження кінця")
	r = m.point_at(0, -5.0)
	assert_eq(r["progress"], 0.0, "обмеження початку")
	return true


func test_levels():
	assert_true(D.level_order.size() > 0, "є рівні")
	for id in D.level_order:
		var m := GameMap.for_level(id)
		assert_eq(m.routes.size(), D.levels[id]["paths"].size(), id + " шляхів")
		assert_true(m.level != null, id + " level")
		for rk in m.rocks:
			assert_true(not m.is_path(rk[0], rk[1]), "%s: завал %s на коридорі" % [id, str(rk)])
	return true
