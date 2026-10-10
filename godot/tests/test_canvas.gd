extends "res://tests/test_base.gd"


func test_color_parser():
	var c := Canvas2D.parse_color("#c9a227")
	assert_near(c.r, 0xc9 / 255.0, 0.003, "hex r")
	assert_near(c.g, 0xa2 / 255.0, 0.003, "hex g")
	assert_near(c.b, 0x27 / 255.0, 0.003, "hex b")
	assert_near(Canvas2D.parse_color("#fff").r, 1.0, 0.003, "hex3")
	var r := Canvas2D.parse_color("rgba(0,0,0,0.5)")
	assert_near(r.a, 0.5, 0.003, "rgba a")
	assert_near(r.r, 0.0, 0.003, "rgba r")
	var h := Canvas2D.parse_color("hsl(25, 6%, 30%)")
	assert_near(h.r, 0.318, 0.004, "hsl r")
	assert_near(h.g, 0.297, 0.004, "hsl g")
	assert_near(h.b, 0.282, 0.004, "hsl b")
	assert_near(Canvas2D.parse_color("hsla(120, 100%, 50%, 0.4)").g, 1.0, 0.003, "hsla g")
	assert_near(Canvas2D.parse_color("transparent").a, 0.0, 0.001, "transparent")
	return true


func test_save_restore():
	var c := Canvas2D.new()
	c.fill_style = "#112233"
	c.line_width = 3.0
	c.global_alpha = 0.5
	c.translate(10, 20)
	c.save()
	c.fill_style = "#ffffff"
	c.line_width = 9.0
	c.global_alpha = 1.0
	c.rotate(1.0)
	c.restore()
	assert_eq(c.fill_style, "#112233", "fill_style")
	assert_eq(c.line_width, 3.0, "line_width")
	assert_eq(c.global_alpha, 0.5, "alpha")
	assert_true(c.transform == Transform2D.IDENTITY.translated_local(Vector2(10, 20)), "transform")
	return true


func test_arc_circle():
	var c := Canvas2D.new()
	c.begin_path()
	c.arc(100, 50, 30, 0, TAU)
	assert_eq(c.subpaths.size(), 1, "subpaths")
	var s: Dictionary = c.subpaths[0]
	assert_true(s["closed"], "closed")
	for p in s["pts"]:
		assert_near(p.distance_to(Vector2(100, 50)), 30.0, 0.001, "radius")
	assert_true(s["pts"].size() >= 8 and s["pts"].size() <= 64, "segments")
	# трансформ застосовується при додаванні
	c.begin_path()
	c.translate(5, 5)
	c.scale(2, 2)
	c.arc(0, 0, 10, 0, TAU)
	for p in c.subpaths[0]["pts"]:
		assert_near(p.distance_to(Vector2(5, 5)), 20.0, 0.001, "scaled radius")
	return true


func test_gradient():
	var c := Canvas2D.new()
	var g := c.create_radial_gradient(0, 0, 0, 0, 0, 10)
	g.add_color_stop(0, "#ff0000")
	g.add_color_stop(1, "#0000ff")
	assert_near(g.color_at(Vector2(0, 0)).r, 1.0, 0.01, "centre")
	assert_near(g.color_at(Vector2(10, 0)).b, 1.0, 0.01, "edge")
	assert_near(g.color_at(Vector2(5, 0)).r, 0.5, 0.01, "mid")
	return true


func test_gradient_transparent_stop():
	var c := Canvas2D.new()
	var g := c.create_radial_gradient(0, 0, 4, 0, 0, 70)
	g.add_color_stop(0, "rgba(255,150,60,0.32)")
	g.add_color_stop(1, "rgba(0,0,0,0)")
	assert_near(g.color_at(Vector2(99, 99)).a, 0.0, 0.001, "corner alpha")
	assert_near(g.color_at(Vector2(70, 0)).a, 0.0, 0.001, "edge alpha")
	assert_near(g.color_at(Vector2(0, 0)).a, 0.32, 0.01, "centre alpha")
	assert_near(Canvas2D.parse_color("rgba(0,0,0,0)").a, 0.0, 0.001, "rgba0")
	return true


func test_add_layer_reused():
	var n := Node2D.new()
	var a := Canvas2D.make_add_layer(n)
	var b := Canvas2D.make_add_layer(n)
	assert_true(a == b, "same layer")
	assert_eq(n.get_child_count(), 1, "one child")
	n.free()
	return true
