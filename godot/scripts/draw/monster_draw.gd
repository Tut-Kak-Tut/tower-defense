class_name MonsterDraw
# Малювання монстрів через Canvas2D API. Переклад web/js/entities.js TOWER_DRAW.

static func draw_tower(c: Canvas2D, t, time: float) -> void:
	var x: float = t.x as float
	var y: float = t.y as float

	# коло призову під монстром + тінь
	c.begin_path()
	c.ellipse(x, y + 12, 15, 6, 0, 0, TAU)
	c.fill_style = "rgba(0,0,0,0.45)"
	c.fill()
	c.stroke_style = "rgba(150, 95, 220, 0.55)"
	c.line_width = 1.5
	c.stroke()

	# зілля відьми — кольорові кола під монстром
	for i in range(t.buffs.size()):
		var b = t.buffs[i]
		c.begin_path()
		c.ellipse(x, y + 12, 18 + i * 3, 7.5 + i * 1.5, 0, 0, TAU)
		c.stroke_style = "rgba(255, 170, 50, 0.85)" if b.get("kind") == "rate" else "rgba(255, 60, 70, 0.85)"
		c.line_width = 2
		c.stroke()

	if t.def.get("attack") == "haunt":
		# холодний туман привида на всю зону дії
		var rad = t.range_px()
		var fog = c.create_radial_gradient(x, y, rad * 0.2, x, y, rad)
		fog.add_color_stop(0, "rgba(143, 227, 255, 0)")
		var alpha = 0.1 + sin(time * 2 + x) * 0.03
		fog.add_color_stop(1, "rgba(143, 227, 255, %f)" % alpha)
		c.fill_style = fog
		c.begin_path()
		c.arc(x, y, rad, 0, TAU)
		c.fill()

	c.save()
	c.translate(x, y)
	draw_kind(c, t.type, t.angle, time)
	if t.def.get("attack") == "manual":
		draw_carried_boulders(c, int(t.boulders))
	c.restore()

	# рівень — руни, що світяться
	var runes: int = mini(t.level, 5)
	var gold: int = t.level - 5
	c.save()
	c.shadow_blur = 6
	for i in range(runes):
		c.fill_style = "#ffd86b" if i < gold else "#c9a0ff"
		c.shadow_color = "#ffae00" if i < gold else "#9b5cff"
		var rx = x + (i - float(runes - 1) / 2.0) * 8
		var ry = y + 17
		c.begin_path()
		c.move_to(rx, ry - 3)
		c.line_to(rx + 2.5, ry)
		c.line_to(rx, ry + 3)
		c.line_to(rx - 2.5, ry)
		c.fill()
	c.restore()


static func draw_links(c: Canvas2D, t, time: float) -> void:
	c.save()
	c.global_composite_operation = "lighter"
	for e in t.links:
		var held: float = t.links[e]
		var k: float = minf(1.0, held / t.ramp_time)
		var mx: float = (t.x + e.x) / 2.0 + sin(time * 7 + e.progress) * 5
		var my: float = (t.y + e.y) / 2.0 + cos(time * 6) * 5
		c.stroke_style = "rgba(220, 30, 60, %f)" % (0.35 + k * 0.45)
		c.line_width = 1 + k * 2.5
		c.begin_path()
		c.move_to(t.x, t.y - 6)
		c.quadratic_curve_to(mx, my, e.x, e.y)
		c.stroke()
	c.restore()


static func draw_carried_boulders(c: Canvas2D, n: int) -> void:
	for i in range(n):
		var bx = (i - float(n - 1) / 2.0) * 8
		var by = 11 + (i % 2) * 2
		c.begin_path()
		c.arc(bx, by, 4.5, 0, TAU)
		c.fill_style = "#8a8076"
		c.fill()
		c.stroke_style = "rgba(0,0,0,0.6)"
		c.line_width = 1
		c.stroke()


static func draw_kind(c: Canvas2D, monster_type: String, angle: float, time: float) -> void:
	match monster_type:
		"archer":
			draw_skeleton(c, angle, time)
		"cannon":
			draw_imp(c, angle, time)
		"frost":
			draw_ghost(c, angle, time)
		"spider":
			draw_spider(c, angle, time)
		"golem":
			draw_golem(c, angle, time)
		"lich":
			draw_lich(c, angle, time)
		"eye":
			draw_beholder(c, angle, time)
		"slime":
			draw_slime(c, angle, time)
		"vampire":
			draw_vampire(c, angle, time)
		"plate":
			draw_plate(c, angle, time)
		"witch":
			draw_witch(c, angle, time)
		"orc":
			draw_orc(c, angle, time)
		"grave":
			draw_grave(c, time)


static func draw_skeleton(c: Canvas2D, angle: float, time: float) -> void:
	var bone = Data.monsters["archer"]["color"]
	# хребет і ребра
	c.stroke_style = bone
	c.line_width = 2
	c.begin_path()
	c.move_to(0, 0)
	c.line_to(0, 11)
	for i in range(3):
		var w = 6 - i
		c.move_to(-w, 3 + i * 3)
		c.line_to(w, 3 + i * 3)
	c.stroke()
	# лук, повернутий до цілі
	c.save()
	c.rotate(angle)
	c.stroke_style = "#7a5230"
	c.line_width = 2.5
	c.begin_path()
	c.arc(4, 0, 12, -1.1, 1.1)
	c.stroke()
	c.stroke_style = "rgba(230,230,230,0.7)"
	c.line_width = 1
	c.begin_path()
	var bx = 4 + 12 * cos(1.1)
	var by = 12 * sin(1.1)
	c.move_to(bx, -by)
	c.line_to(bx, by)
	c.stroke()
	c.restore()
	# череп
	c.begin_path()
	c.arc(0, -7, 7.5, 0, TAU)
	c.fill_style = bone
	c.fill()
	c.fill_rect(-4, -2, 8, 4)
	c.fill_style = "#1a1014"
	c.begin_path()
	c.arc(-3, -7, 2.2, 0, TAU)
	c.arc(3, -7, 2.2, 0, TAU)
	c.fill()
	c.fill_style = "#ff3b3b"
	c.fill_rect(-3.5, -7.5, 1, 1)
	c.fill_rect(2.5, -7.5, 1, 1)


static func draw_imp(c: Canvas2D, angle: float, time: float) -> void:
	# крила
	c.fill_style = "#4a1414"
	c.begin_path()
	c.move_to(-6, -2)
	c.line_to(-17, -10)
	c.line_to(-14, 2)
	c.close_path()
	c.move_to(6, -2)
	c.line_to(17, -10)
	c.line_to(14, 2)
	c.close_path()
	c.fill()
	# тіло
	var grad = c.create_radial_gradient(-3, -4, 2, 0, 0, 12)
	grad.add_color_stop(0, "#e8552a")
	grad.add_color_stop(1, "#8a1e10")
	c.begin_path()
	c.arc(0, 0, 10, 0, TAU)
	c.fill_style = grad
	c.fill()
	# роги
	c.fill_style = "#2a1a14"
	c.begin_path()
	c.move_to(-7, -6)
	c.line_to(-9, -15)
	c.line_to(-3, -9)
	c.close_path()
	c.move_to(7, -6)
	c.line_to(9, -15)
	c.line_to(3, -9)
	c.close_path()
	c.fill()
	# очі
	c.fill_style = "#ffd23f"
	c.begin_path()
	c.ellipse(-3.5, -2, 2.2, 1.4, 0.3, 0, TAU)
	c.ellipse(3.5, -2, 2.2, 1.4, -0.3, 0, TAU)
	c.fill()
	# вогонь у лапі
	var fx = cos(angle) * 12
	var fy = sin(angle) * 12
	var flick = 3.5 + sin(time * 12) * 0.8
	c.save()
	c.shadow_color = "#ff7a2f"
	c.shadow_blur = 10
	c.fill_style = "#ffb347"
	c.begin_path()
	c.arc(fx, fy, flick, 0, TAU)
	c.fill()
	c.restore()


static func draw_ghost(c: Canvas2D, angle: float, time: float) -> void:
	var bob = sin(time * 3) * 2
	c.save()
	c.translate(0, bob - 2)
	c.shadow_color = "#8fe3ff"
	c.shadow_blur = 12
	c.fill_style = "rgba(190, 240, 255, 0.8)"
	c.begin_path()
	c.arc(0, -3, 10, PI, 0)
	c.line_to(10, 10)
	# хвилястий низ
	for i in range(4):
		var x0 = 10 - i * 5
		var wave = sin(time * 5 + i) * 1.5
		c.quadratic_curve_to(x0 - 2.5, 6 + wave, x0 - 5, 10)
	c.close_path()
	c.fill()
	c.restore()
	# очі
	var ex = cos(angle) * 1.5
	var ey = sin(angle) * 1.5
	c.fill_style = "#1b2a44"
	c.begin_path()
	c.ellipse(-3.5 + ex, -3 + bob + ey, 2, 3, 0, 0, TAU)
	c.ellipse(3.5 + ex, -3 + bob + ey, 2, 3, 0, 0, TAU)
	c.fill()


static func draw_spider(c: Canvas2D, angle: float, time: float) -> void:
	c.save()
	c.rotate(angle)
	# 8 лапок
	c.stroke_style = "#2a2230"
	c.line_width = 2
	c.line_cap = "round"
	for side in [-1, 1]:
		for i in range(4):
			var wiggle = sin(time * 6 + i * 1.3 + side) * 1.2
			var bx = 3 - i * 3
			c.begin_path()
			c.move_to(bx, 0)
			c.line_to(bx + 3 - i * 1.5, side * (9 + wiggle))
			c.line_to(bx + 5 - i * 3.5, side * (15 + wiggle))
			c.stroke()
	# черевце
	c.begin_path()
	c.ellipse(-6, 0, 8, 6.5, 0, 0, TAU)
	c.fill_style = "#1c1622"
	c.fill()
	c.fill_style = Data.monsters["spider"]["color"]
	c.begin_path()
	c.move_to(-10, 0)
	c.line_to(-6, -2.5)
	c.line_to(-2, 0)
	c.line_to(-6, 2.5)
	c.fill()
	# головогруди й очі
	c.begin_path()
	c.arc(4, 0, 4.5, 0, TAU)
	c.fill_style = "#2e2436"
	c.fill()
	c.fill_style = "#ff3b3b"
	for eye_pos in [[6, -1.6], [6, 1.6], [4.5, -2.8], [4.5, 2.8]]:
		c.fill_rect(eye_pos[0] - 0.8, eye_pos[1] - 0.8, 1.6, 1.6)
	c.restore()


static func draw_golem(c: Canvas2D, angle: float, time: float) -> void:
	var breathe = sin(time * 2) * 0.6
	# кулаки
	var fx = cos(angle) * 4
	var fy = sin(angle) * 4
	c.fill_style = "#7d7163"
	c.stroke_style = "rgba(0,0,0,0.5)"
	c.line_width = 1.5
	for s in [-1, 1]:
		c.begin_path()
		c.rect(s * 13 - 4 + fx, -2 + fy, 8, 8)
		c.fill()
		c.stroke()
	# кам'яний тулуб
	c.fill_style = Data.monsters["golem"]["color"]
	c.begin_path()
	c.move_to(-10, -8 - breathe)
	c.line_to(10, -9 - breathe)
	c.line_to(12, 6)
	c.line_to(7, 12)
	c.line_to(-8, 12)
	c.line_to(-12, 5)
	c.close_path()
	c.fill()
	c.stroke()
	c.stroke_style = "rgba(0,0,0,0.35)"
	c.line_width = 1
	c.begin_path()
	c.move_to(-11, 2)
	c.line_to(0, 4)
	c.line_to(11, 1)
	c.move_to(0, 4)
	c.line_to(-1, 12)
	c.stroke()
	c.fill_style = "rgba(80, 130, 60, 0.7)"
	c.begin_path()
	c.ellipse(-6, -7 - breathe, 4, 2, 0, 0, TAU)
	c.fill()
	# голова
	c.fill_style = "#948878"
	c.fill_rect(-6, -16 - breathe, 12, 9)
	c.save()
	c.shadow_color = "#ff9a3c"
	c.shadow_blur = 8
	c.fill_style = "#ffb347"
	c.fill_rect(-4, -13 - breathe, 3, 2)
	c.fill_rect(1, -13 - breathe, 3, 2)
	c.fill_rect(-1, 0, 2, 5)
	c.restore()


static func draw_lich(c: Canvas2D, angle: float, time: float) -> void:
	var hover = sin(time * 2.5) * 1.5
	c.save()
	c.translate(0, hover)
	# мантія
	c.fill_style = "#2a1840"
	c.begin_path()
	c.move_to(-11, 12)
	c.line_to(-7, -4)
	c.line_to(7, -4)
	c.line_to(11, 12)
	c.quadratic_curve_to(0, 8, -11, 12)
	c.fill()
	c.stroke_style = Data.monsters["lich"]["color"]
	c.line_width = 1
	c.stroke()
	# посох
	var sx = cos(angle) * 13
	var sy = sin(angle) * 13
	c.stroke_style = "#4a3a2a"
	c.line_width = 2
	c.begin_path()
	c.move_to(sx * 0.2, sy * 0.2 + 2)
	c.line_to(sx, sy)
	c.stroke()
	c.save()
	c.shadow_color = Data.monsters["lich"]["color"]
	c.shadow_blur = 12
	c.fill_style = "#e6d4ff"
	c.begin_path()
	c.arc(sx, sy, 2.5 + sin(time * 10) * 0.5, 0, TAU)
	c.fill()
	c.restore()
	# череп
	c.begin_path()
	c.arc(0, -8, 6.5, 0, TAU)
	c.fill_style = "#ddd6c4"
	c.fill()
	c.fill_style = "#1a1014"
	c.begin_path()
	c.arc(-2.5, -8, 1.8, 0, TAU)
	c.arc(2.5, -8, 1.8, 0, TAU)
	c.fill()
	c.fill_style = "#7dffb0"
	c.fill_rect(-3, -8.5, 1, 1)
	c.fill_rect(2, -8.5, 1, 1)
	# корона
	c.fill_style = "#c9a227"
	c.begin_path()
	c.move_to(-6, -12)
	c.line_to(-5, -17)
	c.line_to(-2.5, -13.5)
	c.line_to(0, -18)
	c.line_to(2.5, -13.5)
	c.line_to(5, -17)
	c.line_to(6, -12)
	c.close_path()
	c.fill()
	c.restore()


static func draw_beholder(c: Canvas2D, angle: float, time: float) -> void:
	var bob = sin(time * 2) * 1.5
	c.save()
	c.translate(0, bob - 1)
	# вісім стебелець
	for i in range(8):
		var a = -PI / 2.0 + (i - 3.5) * 0.36
		var sway = sin(time * 2.6 + i * 1.7) * 0.18
		var len = 15 + (i % 2) * 2.5
		var ex = cos(a + sway) * len
		var ey = sin(a + sway) * len
		var bx = cos(a - sway) * len * 0.6
		var by = sin(a - sway) * len * 0.6
		c.stroke_style = "#6a2a3a"
		c.line_width = 1.6
		c.begin_path()
		c.move_to(cos(a) * 8, sin(a) * 8)
		c.quadratic_curve_to(bx, by, ex, ey)
		c.stroke()
		c.fill_style = "#f2e6e0"
		c.begin_path()
		c.arc(ex, ey, 2.1, 0, TAU)
		c.fill()
		c.fill_style = "#1a1014"
		c.begin_path()
		c.arc(ex + cos(angle) * 0.8, ey + sin(angle) * 0.8, 0.9, 0, TAU)
		c.fill()
	# тіло
	var grad = c.create_radial_gradient(-3, -4, 2, 0, 0, 12)
	grad.add_color_stop(0, "#c9506a")
	grad.add_color_stop(1, "#4e1022")
	c.begin_path()
	c.arc(0, 0, 11.5, 0, TAU)
	c.fill_style = grad
	c.fill()
	c.stroke_style = "rgba(0,0,0,0.5)"
	c.line_width = 1.2
	c.stroke()
	# паща
	c.fill_style = "#1c070d"
	c.begin_path()
	c.ellipse(0, 6.2, 7, 3.2, 0, 0, TAU)
	c.fill()
	c.fill_style = "#efe6d2"
	for i in range(5):
		var tx = -5 + i * 2.5
		c.begin_path()
		c.move_to(tx - 1, 3.4)
		c.line_to(tx + 1, 3.4)
		c.line_to(tx, 5.6)
		c.fill()
	for i in range(4):
		var tx = -3.75 + i * 2.5
		c.begin_path()
		c.move_to(tx - 0.9, 9)
		c.line_to(tx + 0.9, 9)
		c.line_to(tx, 7.1)
		c.fill()
	# велике центральне око
	var px = cos(angle) * 2.2
	var py = sin(angle) * 1.6
	c.fill_style = "#fff4ea"
	c.begin_path()
	c.ellipse(0, -3, 6.2, 4.6, 0, 0, TAU)
	c.fill()
	c.save()
	c.shadow_color = Data.monsters["eye"]["color"]
	c.shadow_blur = 8
	c.fill_style = Data.monsters["eye"]["color"]
	c.begin_path()
	c.arc(px, py - 3, 3.2, 0, TAU)
	c.fill()
	c.restore()
	c.fill_style = "#12080c"
	c.begin_path()
	c.ellipse(px * 1.2, py * 1.2 - 3, 1, 2.6, 0, 0, TAU)
	c.fill()
	c.stroke_style = "#3a0c18"
	c.line_width = 1.5
	c.begin_path()
	c.ellipse(0, -3, 6.2, 4.6, 0, PI * 1.1, PI * 1.9)
	c.stroke()
	c.restore()


static func draw_slime(c: Canvas2D, angle: float, time: float) -> void:
	# дерев'яна рама
	c.fill_style = "#5a3f26"
	c.stroke_style = "rgba(0,0,0,0.5)"
	c.line_width = 1.2
	c.fill_rect(-12, 4, 24, 5)
	c.stroke_rect(-12, 4, 24, 5)
	c.fill_style = "#3a2818"
	for wx in [-9, 9]:
		c.begin_path()
		c.arc(wx, 10, 3.5, 0, TAU)
		c.fill()
	# важіль
	c.save()
	c.rotate(angle)
	c.stroke_style = "#7a5a36"
	c.line_width = 3
	c.begin_path()
	c.move_to(-8, 0)
	c.line_to(10, 0)
	c.stroke()
	c.fill_style = "#4a3420"
	c.begin_path()
	c.arc(-9, 0, 4.5, 0, TAU)
	c.fill()
	c.restore()
	# живий слиз
	var wob = sin(time * 4) * 0.8
	var grad = c.create_radial_gradient(-3, -6, 1, 0, -2, 11)
	grad.add_color_stop(0, "#d8ffb0")
	grad.add_color_stop(1, "#3f9a2a")
	c.fill_style = grad
	c.begin_path()
	c.move_to(-10, 4)
	c.quadratic_curve_to(-11 - wob, -10, 0, -11 + wob)
	c.quadratic_curve_to(11 + wob, -10, 10, 4)
	c.close_path()
	c.fill()
	c.fill_style = "#1a2a10"
	c.begin_path()
	c.arc(-3.5, -4, 1.6, 0, TAU)
	c.arc(3.5, -4, 1.6, 0, TAU)
	c.fill()
	c.fill_style = "rgba(230,255,200,0.6)"
	var ph = fmod(time * 0.8, 1.0)
	c.begin_path()
	c.arc(4 - ph * 2, -8 - ph * 6, 1.3 * (1 - ph) + 0.3, 0, TAU)
	c.fill()


static func draw_vampire(c: Canvas2D, angle: float, time: float) -> void:
	# плащ
	var flap = sin(time * 3) * 1.5
	c.fill_style = "#12080c"
	c.begin_path()
	c.move_to(-5, -6)
	c.line_to(-15 - flap, 12)
	c.line_to(0, 9)
	c.line_to(15 + flap, 12)
	c.line_to(5, -6)
	c.close_path()
	c.fill()
	c.fill_style = "#8a1024"
	c.begin_path()
	c.move_to(-4, -4)
	c.line_to(-10 - flap, 10)
	c.line_to(0, 7)
	c.line_to(10 + flap, 10)
	c.line_to(4, -4)
	c.close_path()
	c.fill()
	# комір
	c.fill_style = "#12080c"
	c.begin_path()
	c.move_to(-8, -3)
	c.line_to(-9, -13)
	c.line_to(-3, -6)
	c.line_to(3, -6)
	c.line_to(9, -13)
	c.line_to(8, -3)
	c.close_path()
	c.fill()
	# обличчя
	c.begin_path()
	c.ellipse(0, -8, 5.5, 6.5, 0, 0, TAU)
	c.fill_style = "#e8dde0"
	c.fill()
	c.fill_style = "#1a0a10"
	c.begin_path()
	c.move_to(-5.5, -10)
	c.quadratic_curve_to(0, -17, 5.5, -10)
	c.line_to(0, -11.5)
	c.close_path()
	c.fill()
	# очі
	var ex = cos(angle) * 0.8
	var ey = sin(angle) * 0.8
	c.save()
	c.shadow_color = "#ff2040"
	c.shadow_blur = 6
	c.fill_style = "#ff2848"
	c.fill_rect(-3 + ex - 0.8, -8.5 + ey - 0.8, 1.8, 1.6)
	c.fill_rect(2 + ex - 0.8, -8.5 + ey - 0.8, 1.8, 1.6)
	c.restore()
	# ікла
	c.fill_style = "#ffffff"
	c.begin_path()
	c.move_to(-1.8, -4.5)
	c.line_to(-1.2, -2.6)
	c.line_to(-0.6, -4.5)
	c.move_to(0.6, -4.5)
	c.line_to(1.2, -2.6)
	c.line_to(1.8, -4.5)
	c.fill()


static func draw_plate(c: Canvas2D, angle: float, time: float) -> void:
	var sway = sin(time * 2.2) * 0.8
	# меч
	c.save()
	c.rotate(angle)
	c.fill_style = "#dfe6f2"
	c.fill_rect(6, -1.5, 15, 3)
	c.fill_style = "#6b4a2b"
	c.fill_rect(3, -4, 3, 8)
	c.restore()
	# нагрудник
	c.fill_style = "#6c7688"
	c.stroke_style = "rgba(0,0,0,0.55)"
	c.line_width = 1.3
	for sx in [-1, 1]:
		c.begin_path()
		c.ellipse(sx * 10, -2 + sway * sx * 0.3, 5, 4, 0, 0, TAU)
		c.fill()
		c.stroke()
	c.fill_style = Data.monsters["plate"]["color"]
	c.begin_path()
	c.move_to(-8, -5)
	c.line_to(8, -5)
	c.line_to(7, 7)
	c.line_to(0, 11)
	c.line_to(-7, 7)
	c.close_path()
	c.fill()
	c.stroke()
	c.stroke_style = "rgba(255,255,255,0.3)"
	c.begin_path()
	c.move_to(0, -4)
	c.line_to(0, 9)
	c.stroke()
	# шолом
	c.fill_style = "#7e889a"
	c.begin_path()
	c.arc(0, -10 + sway * 0.3, 6, 0, TAU)
	c.fill()
	c.stroke_style = "rgba(0,0,0,0.55)"
	c.stroke()
	c.fill_style = "#0a0a10"
	c.fill_rect(-4, -11 + sway * 0.3, 8, 2.5)
	c.save()
	c.shadow_color = "#7fd4ff"
	c.shadow_blur = 6
	c.fill_style = "#9fe4ff"
	c.fill_rect(-3, -10.5 + sway * 0.3, 1.5, 1.5)
	c.fill_rect(1.5, -10.5 + sway * 0.3, 1.5, 1.5)
	c.restore()


static func draw_witch(c: Canvas2D, angle: float, time: float) -> void:
	# капелюх
	c.fill_style = "#2a1a3a"
	c.begin_path()
	c.ellipse(-4, -9, 9, 2.5, -0.2, 0, TAU)
	c.fill()
	c.begin_path()
	c.move_to(-9, -10)
	c.quadratic_curve_to(-5, -20, 2, -24)
	c.line_to(0, -10)
	c.close_path()
	c.fill()
	c.fill_style = "#c9a227"
	c.fill_rect(-8, -12, 8, 1.8)
	# котел
	c.fill_style = "#16141a"
	c.begin_path()
	c.move_to(-12, -2)
	c.quadratic_curve_to(-13, 12, 0, 12)
	c.quadratic_curve_to(13, 12, 12, -2)
	c.close_path()
	c.fill()
	c.stroke_style = "rgba(255,255,255,0.12)"
	c.line_width = 1
	c.stroke()
	c.fill_style = "#16141a"
	c.fill_rect(-9, 10, 2.5, 4)
	c.fill_rect(6.5, 10, 2.5, 4)
	# зілля
	c.save()
	c.shadow_color = Data.monsters["witch"]["color"]
	c.shadow_blur = 10
	c.fill_style = Data.monsters["witch"]["color"]
	c.begin_path()
	c.ellipse(0, -2, 11.5, 3.5, 0, 0, TAU)
	c.fill()
	c.restore()
	c.fill_style = "#d8ffb0"
	for i in range(3):
		var ph = fmod(time * 0.9 + float(i) / 3.0, 1.0)
		c.begin_path()
		c.arc(-6 + i * 6, -3 - ph * 9, 1.8 * (1 - ph) + 0.4, 0, TAU)
		c.fill()


static func draw_orc(c: Canvas2D, angle: float, time: float) -> void:
	var d = cos(angle)
	var e = sin(angle)
	# руки
	c.fill_style = "#5a7f30"
	c.stroke_style = "rgba(0,0,0,0.5)"
	c.line_width = 1.3
	for s in [-1, 1]:
		c.begin_path()
		c.ellipse(s * 12 + d * 2, 1 + e * 2, 4, 5, 0, 0, TAU)
		c.fill()
		c.stroke()
	# тулуб
	c.fill_style = Data.monsters["orc"]["color"]
	c.begin_path()
	c.ellipse(0, 2, 10, 10, 0, 0, TAU)
	c.fill()
	c.stroke()
	c.fill_style = "#6b4a2b"
	c.begin_path()
	c.move_to(-9, 4)
	c.line_to(9, 1)
	c.line_to(8, 7)
	c.line_to(-8, 10)
	c.close_path()
	c.fill()
	# голова
	c.fill_style = "#7fae48"
	c.begin_path()
	c.arc(0, -9, 6.5, 0, TAU)
	c.fill()
	c.stroke()
	c.fill_style = "#ffcf3f"
	c.fill_rect(-3.5, -10.5, 2, 1.6)
	c.fill_rect(1.5, -10.5, 2, 1.6)
	c.fill_style = "#f2ead8"
	c.begin_path()
	c.move_to(-3, -6)
	c.line_to(-2.3, -9)
	c.line_to(-1.5, -6)
	c.move_to(1.5, -6)
	c.line_to(2.3, -9)
	c.line_to(3, -6)
	c.fill()


static func draw_grave(c: Canvas2D, time: float) -> void:
	c.stroke_style = "rgba(0,0,0,0.55)"
	c.line_width = 1.2
	# горбики землі
	c.fill_style = "#3b3228"
	for pos in [[-9, 9], [9, 9], [0, 12]]:
		c.begin_path()
		c.ellipse(pos[0], pos[1], 6.5, 2.8, 0, 0, TAU)
		c.fill()
	# бічні надгробки
	c.fill_style = "#6d7a73"
	for s in [-1, 1]:
		var gx = s * 9
		c.begin_path()
		c.move_to(gx - 5, 9)
		c.line_to(gx - 5, -1)
		c.arc(gx, -1, 5, PI, 0)
		c.line_to(gx + 5, 9)
		c.close_path()
		c.fill()
		c.stroke()
		c.fill_style = "rgba(0,0,0,0.35)"
		c.fill_rect(gx - 2.5, 0, 5, 1.2)
		c.fill_rect(gx - 2.5, 3, 5, 1.2)
		c.fill_style = "#6d7a73"
	# хрест
	c.fill_style = Data.monsters["grave"]["color"]
	c.fill_rect(-2, -15, 4, 27)
	c.fill_rect(-7, -9, 14, 4)
	c.stroke_rect(-2, -15, 4, 27)
	c.stroke_rect(-7, -9, 14, 4)
	# туман
	c.save()
	c.global_alpha = 0.25 + sin(time * 1.5) * 0.08
	c.fill_style = "#9dffc4"
	for i in range(3):
		var ph = fmod(time * 0.3 + float(i) / 3.0, 1.0)
		c.begin_path()
		c.ellipse(-12 + ph * 24, 10 - i * 2, 7, 2.2, 0, 0, TAU)
		c.fill()
	c.restore()
