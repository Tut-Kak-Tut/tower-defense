class_name EffectsDraw
# Ефекти, снаряди й валуни. Переклад drawEffect (web/js/game.js), Projectile.draw і Boulder.draw (web/js/entities.js).


# Короткі ефекти: fx.t спадає від fx.max до 0.
static func draw_effect(c: Canvas2D, fx: Dictionary, time: float) -> void:
	var k: float = fx["t"] / fx["max"]   # 1 -> 0
	var kind: String = fx.get("kind", "")
	c.save()
	if kind == "beam":
		# промінь біхолдера: широкий «погляд» + сяйво + яскраве ядро
		c.global_composite_operation = "lighter"
		c.line_cap = "round"
		c.stroke_style = fx["color"]
		c.begin_path()
		c.move_to(fx["x"], fx["y"])
		c.line_to(fx["x2"], fx["y2"])
		if fx.get("w", 0) != 0:
			c.global_alpha = k * 0.18
			c.line_width = fx["w"] * 2 * (0.6 + 0.4 * k)
			c.stroke()
		c.global_alpha = k * 0.5
		c.line_width = 9 * k + 2
		c.stroke()
		c.stroke_style = "#fff0f2"
		c.global_alpha = k
		c.line_width = 2
		c.stroke()
	elif kind == "bolt":
		# блискавка лича: ламана з випадковими зламами між цілями
		c.global_composite_operation = "lighter"
		c.stroke_style = "#efe2ff"
		c.shadow_color = fx["color"]
		c.shadow_blur = 10
		c.global_alpha = k
		c.line_width = 2
		var pts: Array = fx["points"]
		c.begin_path()
		c.move_to(pts[0]["x"], pts[0]["y"])
		for i in range(1, pts.size()):
			var a: Dictionary = pts[i - 1]
			var b: Dictionary = pts[i]
			for j in range(1, 4):
				var t := j / 4.0
				var off := (randf() - 0.5) * 10.0
				c.line_to(a["x"] + (b["x"] - a["x"]) * t + off, a["y"] + (b["y"] - a["y"]) * t + off)
			c.line_to(b["x"], b["y"])
		c.stroke()
	elif kind == "cone":
		# постріл павука: нитки віялом від павука, за ними — напівпрозорий слід конуса
		var reach: float = fx["r"] * minf(1.0, (1.0 - k) * 3.0)
		var half: float = fx["half"]
		c.translate(fx["x"], fx["y"])
		c.rotate(fx["a"])
		c.global_alpha = k * 0.25
		c.fill_style = fx["color"]
		c.begin_path()
		c.move_to(0, 0)
		c.arc(0, 0, reach, -half, half)
		c.close_path()
		c.fill()
		c.global_alpha = k * 0.9
		c.stroke_style = "#eef6e4"
		c.line_width = 1
		c.begin_path()
		var n := 7
		for i in n:
			var a := -half + (2.0 * half) * i / (n - 1)
			c.move_to(0, 0)
			c.line_to(cos(a) * reach, sin(a) * reach)
		# поперечні нитки — дугами між променями
		for f in [0.45, 0.75, 1.0]:
			for i in n:
				var a := -half + (2.0 * half) * i / (n - 1)
				var px: float = cos(a) * reach * f
				var py: float = sin(a) * reach * f
				if i == 0:
					c.move_to(px, py)
				else:
					c.line_to(px, py)
		c.stroke()
	elif kind == "spark":
		# розсіяна магія чи відбитий снаряд: кілька іскор урізнобіч
		c.stroke_style = fx["color"]
		c.global_alpha = k
		c.line_width = 1.5
		c.begin_path()
		for i in 6:
			var a: float = i * PI / 3.0 + fx["x"]
			var r1 := 6.0 + (1.0 - k) * 6.0
			var r2 := r1 + 5.0
			c.move_to(fx["x"] + cos(a) * r1, fx["y"] + sin(a) * r1)
			c.line_to(fx["x"] + cos(a) * r2, fx["y"] + sin(a) * r2)
		c.stroke()
	elif kind == "slash":
		# замах живих лат: світла дуга поперек цілі
		c.stroke_style = fx["color"]
		c.global_alpha = k
		c.line_width = 3 * k + 1
		c.line_cap = "round"
		var sweep := (1.0 - k) * 1.6
		c.begin_path()
		c.arc(fx["x"], fx["y"], maxf(12.0, fx["r"]), fx["a"] - 1.3 + sweep, fx["a"] - 0.2 + sweep)
		c.stroke()
	elif kind == "souls":
		# душі з кладовища: напис спливає вгору й тане
		c.global_alpha = minf(1.0, k * 2.0)
		c.fill_style = fx["color"]
		c.shadow_color = fx["color"]
		c.shadow_blur = 8
		c.font = "bold 14px Cinzel, Georgia, serif"
		c.text_align = "center"
		c.fill_text(fx["text"], fx["x"], fx["y"] - (1.0 - k) * 22.0)
	elif kind == "quake":
		# удар голема: кільце, що розходиться по землі
		c.stroke_style = fx["color"]
		c.global_alpha = k * 0.8
		c.line_width = 4 * k + 1
		c.begin_path()
		c.arc(fx["x"], fx["y"], fx["r"] * (1.0 - k * 0.7), 0, TAU)
		c.stroke()
	else:
		# вибух фаєрбола, хвиля лікування
		c.begin_path()
		c.arc(fx["x"], fx["y"], fx["r"] * (1.0 - k * 0.5), 0, TAU)
		c.global_alpha = k * 0.5
		c.fill_style = fx["color"]
		c.fill()
	c.restore()


static func draw_projectile(c: Canvas2D, p, time: float) -> void:
	if p is Boulder:
		draw_boulder(c, p, time)
		return
	c.save()
	c.translate(p.x, p.y)
	if p.lob:
		# тінь на землі й грудка слизу над нею — висота за дугою польоту
		var k: float = minf(1.0, p.flown / maxf(p.dist0, p.flown + 1.0))
		var h: float = sin(PI * k) * p.dist0 * 0.25
		c.begin_path()
		c.ellipse(0, 3, 5, 2, 0, 0, TAU)
		c.fill_style = "rgba(0,0,0,0.35)"
		c.fill()
		c.begin_path()
		c.ellipse(0, -h, 6, 5 + sin(time * 20.0) * 0.6, 0, 0, TAU)
		c.fill_style = p.color
		c.fill()
		c.fill_style = "rgba(230,255,200,0.7)"
		c.fill_rect(-3, -h - 3, 2, 2)
	elif p.kind == "archer":
		# стріла: древко + наконечник + оперення
		c.rotate(p.angle)
		c.stroke_style = "#c8b58e"
		c.line_width = 1.5
		c.begin_path()
		c.move_to(-10, 0)
		c.line_to(2, 0)
		c.stroke()
		c.fill_style = "#9aa3ad"
		c.begin_path()
		c.move_to(5, 0)
		c.line_to(1, -2.5)
		c.line_to(1, 2.5)
		c.fill()
		c.fill_style = "#8b1e3f"
		c.fill_rect(-10, -2, 3, 4)
	else:
		# фаєрбол імпа або крижана куля привида — з сяйвом
		var fire: bool = p.kind == "cannon"
		c.shadow_color = p.color
		c.shadow_blur = 14 if fire else 10
		var rad := 5.5 if fire else 4.0
		var grad := c.create_radial_gradient(0, 0, 0, 0, 0, rad)
		grad.add_color_stop(0, "#fff3b0" if fire else "#ffffff")
		grad.add_color_stop(1, p.color)
		c.fill_style = grad
		c.begin_path()
		c.arc(0, 0, rad, 0, TAU)
		c.fill()
	c.restore()


static func draw_boulder(c: Canvas2D, b, _time: float) -> void:
	c.save()
	c.translate(b.x, b.y)
	c.rotate(b.spin)
	c.begin_path()
	c.arc(0, 0, 9, 0, TAU)
	c.fill_style = "#8a8076"
	c.fill()
	c.stroke_style = "rgba(0,0,0,0.6)"
	c.line_width = 1.5
	c.stroke()
	c.begin_path()   # тріщини, що крутяться разом із каменем
	c.move_to(-5, -3)
	c.line_to(0, 0)
	c.line_to(3, 6)
	c.move_to(0, 0)
	c.line_to(6, -4)
	c.stroke()
	c.restore()
