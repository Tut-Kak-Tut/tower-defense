class_name MapDraw
extends RefCounted
# Статичні функції для малювання мапи: коридор, брами, завали, факели, Серце, віньєтка, дальність.
# Перенесено з web/js/game.js (buildMapLayer, drawGate, drawRubble, drawHeart, drawTorches, drawVignette, drawRange, drawBeamLine).

static func build_map_layer(c: Canvas2D, map: GameMap) -> void:
	# ніші: кам'яна кладка на всю мапу
	c.fill_style = '#131017'
	c.fill_rect(0, 0, map.cols * map.cell, map.rows * map.cell)

	var BH = map.cell / 2.0
	var BW = map.cell
	var w = map.cols * map.cell
	var h = map.rows * map.cell

	for by in range(int(h / BH) + 1):
		var off = BW / 2.0 if (by % 2) else 0.0
		for bx in range(-1, int(w / BW) + 2):
			var x = bx * BW + off
			var y = by * BH
			var n = Data._hash(bx, by, 1)
			var l = 10 + int(n * 6)
			c.fill_style = "hsl(270, 12%, " + str(l) + "%)"
			c.fill_rect(x + 1, y + 1, BW - 2, BH - 2)
			c.fill_style = 'rgba(255,255,255,0.05)'
			c.fill_rect(x + 1, y + 1, BW - 2, 1)
			c.fill_style = 'rgba(0,0,0,0.35)'
			c.fill_rect(x + 1, y + BH - 2, BW - 2, 1)

			# тріщина або мох на деяких цеглинах
			var m = Data._hash(bx, by, 2)
			if m < 0.12:
				c.stroke_style = 'rgba(0,0,0,0.5)'
				c.line_width = 1.0
				c.begin_path()
				c.move_to(x + 6 + m * 60, y + 2)
				c.line_to(x + 12 + m * 40, y + BH / 2.0)
				c.line_to(x + 8 + m * 80, y + BH - 3)
				c.stroke()
			elif m > 0.96:
				c.fill_style = 'rgba(70, 110, 60, 0.3)'
				c.begin_path()
				c.ellipse(x + BW * Data._hash(bx, by, 3), y + BH - 3, 7, 3, 0, 0, TAU)
				c.fill()

	# коридор: кам'яні плити
	for r in range(map.rows):
		for col in range(map.cols):
			if not map.is_path(col, r):
				continue
			var x = col * map.cell
			var y = r * map.cell
			var l = 27 + int(Data._hash(col, r, 4) * 6)
			c.fill_style = "hsl(30, 8%, " + str(l) + "%)"
			c.fill_rect(x, y, map.cell, map.cell)

			# шви між плитами
			c.stroke_style = 'rgba(0,0,0,0.35)'
			c.line_width = 1.0
			c.stroke_rect(x + 0.5, y + 0.5, map.cell - 1, map.cell - 1)
			c.begin_path()
			c.move_to(x + map.cell / 2.0, y)
			c.line_to(x + map.cell / 2.0, y + map.cell)
			c.move_to(x, y + map.cell / 2.0)
			c.line_to(x + map.cell, y + map.cell / 2.0)
			c.stroke()

			# камінці/плями
			for i in range(3):
				var k = Data._hash(col, r, 10 + i)
				c.fill_style = 'rgba(0,0,0,0.18)' if k > 0.5 else 'rgba(255,255,255,0.06)'
				c.fill_rect(x + Data._hash(col, r, 20 + i) * (map.cell - 4),
					y + Data._hash(col, r, 30 + i) * (map.cell - 4), 2 + k * 3, 2)

	# тінь від стін на краях коридору
	var SH = 9.0
	for r in range(map.rows):
		for col in range(map.cols):
			if not map.is_path(col, r):
				continue
			var x = col * map.cell
			var y = r * map.cell
			var sides = [
				[0, -1, x, y, x, y + SH, x, y, map.cell, SH],
				[0, 1, x, y + map.cell, x, y + map.cell - SH, x, y + map.cell - SH, map.cell, SH],
				[-1, 0, x, y, x + SH, y, x, y, SH, map.cell],
				[1, 0, x + map.cell, y, x + map.cell - SH, y, x + map.cell - SH, y, SH, map.cell],
			]
			for side in sides:
				var dc = side[0]
				var dr = side[1]
				var x0 = side[2]
				var y0 = side[3]
				var x1 = side[4]
				var y1 = side[5]
				var rx = side[6]
				var ry = side[7]
				var rw = side[8]
				var rh = side[9]
				if map.is_path(col + dc, r + dr):
					continue
				var grad = c.create_linear_gradient(x0, y0, x1, y1)
				grad.add_color_stop(0, 'rgba(0,0,0,0.55)')
				grad.add_color_stop(1, 'rgba(0,0,0,0)')
				c.fill_style = grad
				c.fill_rect(rx, ry, rw, rh)

	# завали
	for rc in map.rocks:
		draw_rubble(c, rc[0], rc[1], map)

	# входи в підземелля — кована ґрата на краю
	var entries = {}  # 'c,r' -> [точка входу, наступна точка, індекси шляхів]
	for i in range(map.route_points.size()):
		var p = map.route_points[i]
		var key = "%d,%d" % [p[0][0], p[0][1]]
		if not entries.has(key):
			entries[key] = [p[0], p[1], []]
		entries[key][2].append(i)

	for key in entries:
		var entry = entries[key]
		var c_pos = entry[0]
		var next_pos = entry[1]
		var routes = entry[2]
		var col_pos = int(c_pos[0])
		var row_pos = int(c_pos[1])
		draw_gate(c, map, col_pos, row_pos)

		if map.route_points.size() > 1:
			# мітка — на першій клітинці коридору за брамою
			var lc = col_pos + signi(int(next_pos[0]) - col_pos)
			var lr = row_pos + signi(int(next_pos[1]) - row_pos)
			c.font = 'bold 15px Cinzel, Georgia, serif'
			c.text_align = 'center'
			c.text_baseline = 'middle'
			c.fill_style = 'rgba(255, 210, 150, 0.55)'
			var route_labels = ""
			for ri in routes:
				if route_labels:
					route_labels += "·"
				route_labels += map.route_letter(ri)
			c.fill_text(route_labels, lc * map.cell + map.cell / 2.0, lr * map.cell + map.cell / 2.0)


static func draw_gate(c: Canvas2D, map: GameMap, col: int, row: int) -> void:
	# Кована ґрата входу. Намальована для лівого краю; для верхнього/нижнього — повернута всередину мапи.
	var left = col == -1
	var top = row == -1
	c.save()

	if left:
		c.translate(0, row * map.cell + map.cell / 2.0)
	else:
		c.translate(col * map.cell + map.cell / 2.0, top and 0 or map.rows * map.cell)

	if left:
		c.rotate(0)
	elif top:
		c.rotate(PI / 2.0)
	else:
		c.rotate(-PI / 2.0)

	var sy = -map.cell / 2.0
	c.fill_style = '#0a080c'
	c.fill_rect(0, sy + 2, 10, map.cell - 4)
	c.fill_style = '#5a5060'
	for i in range(4):
		c.fill_rect(1, sy + 6 + i * 8, 10, 2)
	c.fill_rect(3, sy + 2, 2, map.cell - 4)
	c.fill_rect(8, sy + 2, 2, map.cell - 4)
	c.fill_rect(0, sy, 12, 3)
	c.fill_rect(0, sy + map.cell - 3, 12, 3)
	c.restore()


static func draw_rubble(c: Canvas2D, col: int, row: int, map: GameMap) -> void:
	# Завал на клітинці: тінь і кілька уламків-багатокутників
	var x0 = col * map.cell
	var y0 = row * map.cell
	c.fill_style = 'rgba(0,0,0,0.45)'
	c.fill_rect(x0 + 2, y0 + 2, map.cell - 4, map.cell - 4)

	for k in range(5):
		var cx = x0 + 8 + Data._hash(col, row, 10 + k) * (map.cell - 16)
		var cy = y0 + 10 + Data._hash(col, row, 20 + k) * (map.cell - 18)
		var rad = 6 + Data._hash(col, row, 30 + k) * 7
		var rot = Data._hash(col, row, 40 + k) * PI
		var sides = 5 + int(Data._hash(col, row, 50 + k) * 3)
		c.fill_style = "hsl(25, 6%, " + str(int(20 + Data._hash(col, row, 60 + k) * 14)) + "%)"
		c.begin_path()
		for s in range(sides):
			var a = rot + float(s) / float(sides) * TAU
			var rr = rad * (0.75 + Data._hash(col * 7 + s, row, 70 + k) * 0.35)
			var px = cx + cos(a) * rr
			var py = cy + sin(a) * rr
			if s == 0:
				c.move_to(px, py)
			else:
				c.line_to(px, py)
		c.close_path()
		c.fill()
		c.fill_style = 'rgba(255,255,255,0.07)'
		c.fill_rect(cx - rad * 0.4, cy - rad * 0.6, rad * 0.8, 2)


static func draw_heart(c: Canvas2D, map: GameMap, heart_flash: float, time: float) -> void:
	# Серце Підземелля — пульсує; спалахує червоним при ударі.
	var heart = map.route_points[0]
	var ec = int(heart[heart.size() - 1][0])
	var er = int(heart[heart.size() - 1][1])
	var x = (ec - 1) * map.cell + map.cell / 2.0
	var y = er * map.cell + map.cell / 2.0
	var hurt = heart_flash / 0.5
	var beat = 1.35 + 0.12 * pow(maxf(0, sin(time * 4)), 3) + hurt * 0.2

	c.save()
	c.global_composite_operation = 'lighter'
	var glow = c.create_radial_gradient(x, y, 4, x, y, 70)
	if hurt > 0:
		glow.add_color_stop(0, 'rgba(255,60,60,' + str(0.55 + hurt * 0.3) + ')')
	else:
		glow.add_color_stop(0, 'rgba(170,70,255,0.6)')
	glow.add_color_stop(1, 'rgba(0,0,0,0)')
	c.fill_style = glow
	c.fill_rect(x - 70, y - 70, 140, 140)
	c.restore()

	c.save()
	c.translate(x, y)
	c.scale(beat, beat)
	c.shadow_color = '#ff3b3b' if hurt > 0 else '#b35cff'
	c.shadow_blur = 25
	var body = c.create_radial_gradient(-4, -5, 1, 0, 0, 16)
	body.add_color_stop(0, '#ffc2ea')
	if hurt > 0:
		body.add_color_stop(0.45, '#ff2a48')
	else:
		body.add_color_stop(0.45, '#d43cb4')
	body.add_color_stop(1, '#5a0f48')
	c.fill_style = body
	c.begin_path()
	c.move_to(0, 13)
	c.bezier_curve_to(-18, 2, -12, -14, 0, -6)
	c.bezier_curve_to(12, -14, 18, 2, 0, 13)
	c.fill()
	c.restore()


static func draw_torches(c: Canvas2D, map: GameMap, time: float) -> void:
	for torch in map.torches:
		var col = int(torch[0])
		var row = int(torch[1])
		var x = col * map.cell + map.cell / 2.0
		var y = row * map.cell + 10
		var f = sin(time * 9 + col * 3) * 0.5 + sin(time * 23 + row) * 0.5

		c.save()
		c.global_composite_operation = 'lighter'
		var rad = 85 + f * 6
		var light = c.create_radial_gradient(x, y, 2, x, y, rad)
		light.add_color_stop(0, 'rgba(255,150,60,0.32)')
		light.add_color_stop(1, 'rgba(0,0,0,0)')
		c.fill_style = light
		c.fill_rect(x - rad, y - rad, rad * 2, rad * 2)
		c.restore()

		c.fill_style = '#3a2a1c'
		c.fill_rect(x - 2, y, 4, 9)
		c.fill_style = '#1e1a22'
		c.fill_rect(x - 4, y - 1, 8, 3)
		c.save()
		c.shadow_color = '#ff8c2f'
		c.shadow_blur = 12
		c.fill_style = '#ff9a3c'
		c.begin_path()
		c.move_to(x - 4, y - 1)
		c.quadratic_curve_to(x - 3 + f, y - 10 - f * 2, x + f * 1.5, y - 13 - f * 2)
		c.quadratic_curve_to(x + 3 + f, y - 8, x + 4, y - 1)
		c.fill()
		c.fill_style = '#ffe28a'
		c.begin_path()
		c.ellipse(x, y - 4, 1.8, 3.5, 0, 0, TAU)
		c.fill()
		c.restore()


static func draw_vignette(c: Canvas2D, w: int, h: int) -> void:
	var vignette = c.create_radial_gradient(float(w) / 2.0, float(h) / 2.0, float(h) * 0.35,
		float(w) / 2.0, float(h) / 2.0, float(w) * 0.62)
	vignette.add_color_stop(0, 'rgba(0,0,0,0)')
	vignette.add_color_stop(1, 'rgba(0,0,0,0.7)')
	c.fill_style = vignette
	c.fill_rect(0, 0, w, h)


static func draw_range(c: Canvas2D, x: float, y: float, range: float, ok: bool, min_range: float = 0) -> void:
	# Зона дії; min_range — мертва зона під монстром (px), лишається незафарбованою.
	c.begin_path()
	c.arc(x, y, range, 0, TAU)
	if min_range > 0:
		c.arc(x, y, min_range, 0, TAU, true)
	c.fill_style = 'rgba(255,255,255,0.12)' if ok else 'rgba(239,71,111,0.12)'
	c.fill()
	c.stroke_style = 'rgba(255,255,255,0.6)' if ok else 'rgba(239,71,111,0.7)'
	c.line_width = 1.5
	c.stroke()


static func draw_beam_line(c: Canvas2D, t, ok: bool) -> void:
	# Куди б'є біхолдер: смуга на ширину променя + пунктир по осі (t — Tower).
	var end: Vector2 = t.beam_end()
	c.save()
	c.line_cap = 'round'
	c.stroke_style = 'rgba(255,77,109,0.16)' if ok else 'rgba(239,71,111,0.25)'
	c.line_width = (float(t.def.get("beamWidth", 0)) * 2.0 + 0.5) * t.map.cell
	c.begin_path()
	c.move_to(t.x, t.y)
	c.line_to(end.x, end.y)
	c.stroke()
	c.stroke_style = 'rgba(255,200,210,0.75)' if ok else 'rgba(239,71,111,0.8)'
	c.line_width = 1.5
	c.set_line_dash([6, 5])
	c.line_dash_offset = -Canvas2D.now() * 20
	c.stroke()
	c.restore()
