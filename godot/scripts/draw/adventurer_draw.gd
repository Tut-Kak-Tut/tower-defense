class_name AdventurerDraw
# Малювання авантюристів (Enemy). Переносимо з web/js/entities.js 336-474 і 756-1051.

static func draw_enemy(c: Canvas2D, e, time: float) -> void:
	var r = e.radius
	var cell = GameMap.for_level("").cell  # для CELL константи

	c.begin_path()
	c.ellipse(e.x, e.y + r * 0.6, r, r * 0.45, 0, 0, TAU)
	c.fill_style = 'rgba(0,0,0,0.4)'
	c.fill()

	# фігурка зверху, повернута за напрямком руху (вперед = +x); невидимий ледь мерехтить
	c.save()
	if e.stealth:
		if e.hidden:
			c.global_alpha = 0.28 + sin(time * 6 + e.progress * 0.05) * 0.08
		else:
			c.global_alpha = 0.75
	c.translate(e.x, e.y)
	c.rotate(e.dir)
	draw_adventurer(c, e.type, r, e.color, time)
	c.restore()

	if e.def.get("shieldAura") and e.shield > 0:
		# щит паладина накриває сусідів — блакитне коло
		c.begin_path()
		c.arc(e.x, e.y, float(e.def["shieldAura"]) * cell, 0, TAU)
		c.fill_style = 'rgba(90, 140, 255, 0.06)'
		c.fill()
		c.stroke_style = 'rgba(140, 180, 255, %f)' % [0.3 + sin(time * 3) * 0.1]
		c.line_width = 1.5
		c.stroke()

	if e.def.get("magicWard"):
		# магічний щит бойового мага — фіолетове коло
		c.begin_path()
		c.arc(e.x, e.y, float(e.def["magicWard"]["radius"]) * cell, 0, TAU)
		c.stroke_style = 'rgba(199, 140, 255, %f)' % [0.25 + sin(time * 4 + 1) * 0.08]
		c.line_width = 1
		c.set_line_dash([4.0, 4.0])
		c.stroke()
		c.set_line_dash([])

	if e.def.get("haste"):
		# аура стяга носія прапора — золоте коло
		c.begin_path()
		c.arc(e.x, e.y, float(e.def["haste"]["radius"]) * cell, 0, TAU)
		c.stroke_style = 'rgba(230, 195, 92, %f)' % [0.18 + sin(time * 4) * 0.06]
		c.line_width = 1
		c.stroke()
	elif e.hasted > 0:
		# пришвидшений — золоті риски позаду
		c.save()
		c.translate(e.x, e.y)
		c.rotate(e.dir)
		c.stroke_style = 'rgba(255, 216, 107, 0.6)'
		c.line_width = 1.2
		c.begin_path()
		for oy in [-r * 0.5, 0, r * 0.5]:
			c.move_to(-r - 3, oy)
			c.line_to(-r - 9 + abs(oy) * 0.3, oy)
		c.stroke()
		c.restore()

	if e.shield > 0:
		# магічний щит — мерехтлива синя сфера
		c.begin_path()
		c.arc(e.x, e.y, r + 4, 0, TAU)
		c.fill_style = 'rgba(90, 140, 255, 0.12)'
		c.fill()
		c.stroke_style = 'rgba(140, 180, 255, %f)' % [0.5 + sin(time * 5) * 0.2]
		c.line_width = 1.5
		c.stroke()

	if e.poison_timer > 0:
		# отрута — зелені бульбашки над головою
		c.fill_style = 'rgba(120, 230, 80, 0.8)'
		for i in range(3):
			var ph = fmod(time * 1.5 + float(i) / 3.0, 1.0)
			c.begin_path()
			c.arc(e.x + (i - 1) * 5, e.y - ph * r * 1.2, 1.5 + (1 - ph), 0, TAU)
			c.fill()

	if e.stun_timer > 0 and e.webbed:
		# павутина — білясті нитки навхрест поверх фігурки, що ледь тремтять
		c.save()
		c.translate(e.x, e.y)
		c.stroke_style = 'rgba(235, 245, 225, 0.75)'
		c.line_width = 1
		c.begin_path()
		for i in range(4):
			var a = i * PI / 4.0 + sin(time * 3 + e.progress) * 0.05
			var cc = cos(a) * (r + 3)
			var ss = sin(a) * (r + 3)
			c.move_to(-cc, -ss)
			c.line_to(cc, ss)
		c.stroke()
		c.begin_path()
		c.arc(0, 0, r + 1, 0, TAU)
		c.fill_style = 'rgba(220, 235, 210, 0.18)'
		c.fill()
		c.stroke()
		c.restore()
	elif e.stun_timer > 0:
		# оглушення — зірочки навколо голови
		c.fill_style = '#ffe066'
		for i in range(3):
			var a = time * 6 + i * TAU / 3.0
			c.fill_rect(e.x + cos(a) * r * 0.9 - 1.5, e.y - r * 0.4 + sin(a) * r * 0.35 - 1.5, 3, 3)

	if e.slow_timer > 0:
		# іній від привида
		c.begin_path()
		c.arc(e.x, e.y, r + 2, 0, TAU)
		c.fill_style = 'rgba(143, 227, 255, 0.3)'
		c.fill()
		c.stroke_style = '#caf0f8'
		c.line_width = 1.5
		c.stroke()

	# смужка HP (у боса ширша), над нею — щит
	var w = 44.0 if e.def.get("boss") else 24.0
	var h = 5.0 if e.def.get("boss") else 4.0
	var x = e.x - w / 2.0
	var y = e.y - e.radius - 8
	var frac = maxf(0, e.hp / e.max_hp)
	c.fill_style = '#222'
	c.fill_rect(x, y, w, h)
	if frac > 0.5:
		c.fill_style = '#6ede8a'
	elif frac > 0.25:
		c.fill_style = '#ffd166'
	else:
		c.fill_style = '#ef476f'
	c.fill_rect(x, y, w * frac, h)
	if e.shield > 0:
		c.fill_style = '#7fa8ff'
		c.fill_rect(x, y - 3, w * e.shield / e.max_shield, 2)
	if e.guarded:
		# безсмертний носій прапора — золота рамка смужки
		c.stroke_style = '#ffd86b'
		c.line_width = 1
		c.stroke_rect(x - 0.5, y - 0.5, w + 1, h + 1)


static func draw_adventurer(c: Canvas2D, type: String, r: float, color: String, time: float) -> void:
	var outline = func():
		c.stroke_style = 'rgba(0,0,0,0.55)'
		c.line_width = 1.5
		c.stroke()

	var ellipse = func(x: float, y: float, rx: float, ry: float, fill: String, stroke: bool = true):
		c.begin_path()
		c.ellipse(x, y, rx, ry, 0, 0, TAU)
		c.fill_style = fill
		c.fill()
		if stroke:
			outline.call()

	var sword = func(len: float = 1.2, w: float = 3):
		c.fill_style = '#dfe4ea'
		c.fill_rect(r * 0.1, r * 0.6 - w / 2.0, r * len, w)  # клинок
		c.fill_style = '#6b4a2b'
		c.fill_rect(r * 0.05, r * 0.6 - 3, 2, 6)  # гарда

	var staff = func(orb: String, glow: String):
		c.fill_style = '#6b4a2b'
		c.fill_rect(-r * 0.4, r * 0.6 - 1, r * 1.7, 2)
		c.save()
		c.shadow_color = glow
		c.shadow_blur = 8
		c.begin_path()
		c.arc(r * 1.3, r * 0.6, 2.6, 0, TAU)
		c.fill_style = orb
		c.fill()
		c.restore()

	var body = func():
		ellipse.call(0, 0, r * 0.6, r, color)

	var helmet = func(fill: String):
		ellipse.call(r * 0.1, 0, r * 0.45, r * 0.45, fill)
		c.fill_style = 'rgba(0,0,0,0.6)'
		c.fill_rect(r * 0.3, -r * 0.3, 1.5, r * 0.6)  # прорізь забрала

	var hood = func(fill: String):
		ellipse.call(r * 0.1, 0, r * 0.45, r * 0.45, fill, false)
		c.begin_path()
		c.move_to(-r * 0.2, -r * 0.35)
		c.line_to(-r * 0.75, 0)
		c.line_to(-r * 0.2, r * 0.35)
		c.fill()

	match type:
		'fast':
			c.fill_style = '#cfd6de'
			c.fill_rect(r * 0.2, r * 0.55, r * 0.9, 2)  # кинджал
			body.call()
			hood.call('#2e4a2b')

		'tank':
			sword.call()
			body.call()
			helmet.call('#f2d98a')
			c.save()  # щит паладина зліва-спереду
			c.translate(r * 0.55, -r * 0.7)
			c.fill_style = '#2f5aa8'
			c.stroke_style = '#e6c35c'
			c.line_width = 1.5
			c.begin_path()
			c.ellipse(0, 0, 3, r * 0.55, 0, 0, TAU)
			c.fill()
			c.stroke()
			c.restore()

		'gnome':
			# сокира: руків'я + лезо-півмісяць
			c.fill_style = '#6b4a2b'
			c.fill_rect(-r * 0.1, r * 0.65 - 1, r * 1.2, 2)
			c.begin_path()
			c.arc(r * 1.0, r * 0.65, r * 0.4, -PI / 2.0, PI / 2.0)
			c.fill_style = '#c4ccd4'
			c.fill()
			ellipse.call(0, 0, r * 0.7, r * 0.85, color)  # кремезний у латах
			c.stroke_style = 'rgba(255,255,255,0.25)'  # пластини лат
			c.line_width = 1
			c.begin_path()
			c.move_to(-r * 0.35, -r * 0.6)
			c.line_to(-r * 0.35, r * 0.6)
			c.move_to(-r * 0.05, -r * 0.75)
			c.line_to(-r * 0.05, r * 0.75)
			c.stroke()
			c.begin_path()  # руда борода вперед
			c.move_to(r * 0.3, -r * 0.3)
			c.line_to(r * 0.85, 0)
			c.line_to(r * 0.3, r * 0.3)
			c.fill_style = '#c0562a'
			c.fill()
			helmet.call('#8e98a6')

		'priest':
			staff.call('#fff2a8', '#ffe066')
			body.call()
			ellipse.call(r * 0.1, 0, r * 0.42, r * 0.42, '#f4efe6')  # мітра зверху
			c.stroke_style = '#d4a82a'  # золотий хрест
			c.line_width = 1.5
			c.begin_path()
			c.move_to(r * 0.1 - r * 0.25, 0)
			c.line_to(r * 0.1 + r * 0.25, 0)
			c.move_to(r * 0.1, -r * 0.25)
			c.line_to(r * 0.1, r * 0.25)
			c.stroke()

		'mage':
			staff.call('#c78cff', '#a15cff')
			body.call()
			ellipse.call(r * 0.05, 0, r * 0.75, r * 0.75, '#3a2870')  # широкі криси капелюха
			ellipse.call(r * 0.1, 0, r * 0.32, r * 0.32, '#4d3595', false)
			c.fill_style = '#ffd86b'  # зірка на верхівці
			c.fill_rect(r * 0.1 - 1, -1, 2, 2)

		'scout':
			c.stroke_style = '#8a6a3a'  # лук спереду
			c.line_width = 2
			c.begin_path()
			c.arc(r * 0.2, 0, r * 0.95, -1.0, 1.0)
			c.stroke()
			c.stroke_style = 'rgba(230,230,230,0.6)'
			c.line_width = 1
			c.begin_path()
			c.move_to(r * 0.2 + r * 0.95 * cos(1.0), -r * 0.95 * sin(1.0))
			c.line_to(r * 0.2 + r * 0.95 * cos(1.0), r * 0.95 * sin(1.0))
			c.stroke()
			ellipse.call(-r * 0.15, 0, r * 0.65, r * 1.05, '#24453a', false)  # плащ
			body.call()
			hood.call('#2f5a48')

		'knight':
			# кінь: тулуб, шия з головою вперед, хвіст
			c.fill_style = '#3a2618'
			c.fill_rect(-r * 1.3, -1.5, r * 0.3, 3)
			ellipse.call(0, 0, r * 1.05, r * 0.55, '#6b4528')
			ellipse.call(r * 1.05, 0, r * 0.35, r * 0.22, '#5a3a22')
			# спис уздовж правого боку, вістрям далеко вперед
			c.fill_style = '#8a6a3a'
			c.fill_rect(-r * 0.5, r * 0.45 - 1, r * 1.9, 2)
			c.fill_style = '#dfe4ea'
			c.begin_path()
			c.move_to(r * 1.6, r * 0.45)
			c.line_to(r * 1.35, r * 0.45 - 2.5)
			c.line_to(r * 1.35, r * 0.45 + 2.5)
			c.fill()
			# вершник
			ellipse.call(-r * 0.1, 0, r * 0.35, r * 0.6, color)
			helmet.call('#c4ccd4')
			c.fill_style = '#b22a3a'  # плюмаж
			c.fill_rect(-r * 0.3, -1.5, r * 0.4, 3)

		'hero':
			# червоний плащ позаду
			c.begin_path()
			c.move_to(r * 0.1, -r * 0.8)
			c.quadratic_curve_to(-r * 1.3, -r * 1.0 + sin(time * 4) * 2, -r * 1.15, 0)
			c.quadratic_curve_to(-r * 1.3, r * 1.0 + sin(time * 4 + 1) * 2, r * 0.1, r * 0.8)
			c.fill_style = '#8b1e3f'
			c.fill()
			sword.call(1.5, 4)  # великий меч
			body.call()
			c.stroke_style = '#fff1b8'  # гравіювання на латах
			c.line_width = 1
			c.begin_path()
			c.arc(0, 0, r * 0.4, -PI / 2.0, PI / 2.0)
			c.stroke()
			ellipse.call(r * 0.1, 0, r * 0.42, r * 0.42, '#f0d8a8')  # голова
			c.save()  # корона
			c.translate(r * 0.1, 0)
			c.fill_style = '#ffd23f'
			c.shadow_color = '#ffae00'
			c.shadow_blur = 6
			c.begin_path()
			for i in range(10):
				var a = float(i) / 10.0 * TAU
				var rr = r * 0.28 if i % 2 else r * 0.46
				c.line_to(cos(a) * rr, sin(a) * rr)
			c.close_path()
			c.fill()
			c.restore()
			ellipse.call(r * 0.1, 0, r * 0.2, r * 0.2, '#f0d8a8', false)

		'wagon':
			# кінь у запрягу попереду: голоблі, тулуб, голова
			c.fill_style = '#6b4a2b'
			for side in [-1, 1]:
				c.fill_rect(r * 0.8, side * r * 0.35 - 1, r * 0.9, 2)
			ellipse.call(r * 1.35, 0, r * 0.5, r * 0.26, '#5a3a22')
			ellipse.call(r * 1.9, 0, r * 0.2, r * 0.13, '#4a2f1b')
			# колеса з боків: спиці біжать, поки віз котиться
			var roll = fmod(time * 3, 1.0)
			for wx in [-r * 0.55, r * 0.5]:
				for side in [-1, 1]:
					var wy = side * r * 0.72
					c.fill_style = '#3a2618'
					c.fill_rect(wx - r * 0.3, wy - 2.5, r * 0.6, 5)
					c.fill_style = '#8a6a3a'
					for k in range(3):
						c.fill_rect(wx - r * 0.3 + fmod((float(k) / 3.0 + roll), 1.0) * r * 0.6, wy - 2.5, 1.5, 5)
			# дерев'яний кузов із дошками
			c.begin_path()
			c.rect(-r * 0.95, -r * 0.62, r * 1.8, r * 1.24)
			c.fill_style = '#7a5230'
			c.fill()
			outline.call()
			c.stroke_style = 'rgba(0,0,0,0.3)'
			c.line_width = 1
			c.begin_path()
			for dy in [-0.2, 0.2]:
				c.move_to(-r * 0.95, r * dy)
				c.line_to(r * 0.85, r * dy)
			c.stroke()
			# полотняний тент дугами, ззаду — шоломи тих, хто всередині
			c.begin_path()
			c.rect(-r * 0.55, -r * 0.55, r * 1.3, r * 1.1)
			c.fill_style = '#d8ccb0'
			c.fill()
			outline.call()
			c.stroke_style = 'rgba(90,70,40,0.5)'
			c.begin_path()
			for dx in [-0.2, 0.15, 0.5]:
				c.move_to(r * dx, -r * 0.55)
				c.line_to(r * dx, r * 0.55)
			c.stroke()
			for info in [[-0.75, -0.3, '#8e98a6'], [-0.78, 0.05, '#2e4a2b'], [-0.72, 0.35, '#8e98a6']]:
				ellipse.call(r * info[0], r * info[1] + sin(time * 5 + info[1] * 9) * 0.8, r * 0.17, r * 0.17, info[2])

		'jester':
			body.call()
			c.fill_style = '#f2d24a'  # жовті ромби на строкатому вбранні
			for oy in [-r * 0.5, r * 0.5]:
				c.begin_path()
				c.move_to(-r * 0.2, oy - r * 0.25)
				c.line_to(r * 0.02, oy)
				c.line_to(-r * 0.2, oy + r * 0.25)
				c.line_to(-r * 0.42, oy)
				c.fill()
			for side in [-1, 1]:  # ковпак: два ріжки вбоки-назад з дзвониками
				c.begin_path()
				c.move_to(r * 0.3, side * r * 0.15)
				c.quadratic_curve_to(r * 0.1, side * r * 0.9, -r * 0.55, side * r * 1.0)
				c.line_to(-r * 0.05, side * r * 0.1)
				c.fill_style = '#3a2a7a' if side < 0 else color
				c.fill()
				outline.call()
				c.begin_path()
				c.arc(-r * 0.55, side * r * 1.0, 2.2, 0, TAU)
				c.fill_style = '#ffd86b'
				c.fill()
			ellipse.call(r * 0.15, 0, r * 0.3, r * 0.3, '#f0d8c0')  # обличчя

		'blade':
			ellipse.call(-r * 0.2, 0, r * 0.6, r * 1.0, '#2c3a52', false)  # легкий плащ
			for side in [-1, 1]:  # два клинки навхрест уперед
				c.save()
				c.translate(r * 0.2, side * r * 0.55)
				c.rotate(-side * 0.35)
				c.fill_style = '#eef4ff'
				c.fill_rect(0, -1.2, r * 1.3, 2.4)
				c.fill_style = '#c9a227'
				c.fill_rect(-1, -3, 2.5, 6)
				c.restore()
			body.call()
			ellipse.call(r * 0.1, 0, r * 0.38, r * 0.38, '#2a1e18')  # темне волосся
			ellipse.call(-r * 0.3, 0, r * 0.14, r * 0.14, '#2a1e18')  # вузол на потилиці
			c.fill_style = '#b22a2a'  # червона пов'язка
			c.fill_rect(r * 0.05, -r * 0.38, 2, r * 0.76)

		'banner':
			# древко вздовж руки, стяг за спиною майорить
			c.fill_style = '#6b4a2b'
			c.fill_rect(-r * 1.1, r * 0.55 - 1, r * 1.6, 2)
			var wave = sin(time * 6) * r * 0.15
			c.begin_path()
			c.move_to(-r * 0.3, r * 0.55)
			c.quadratic_curve_to(-r * 0.7, r * 0.9 + wave, -r * 1.1, r * 1.35)
			c.line_to(-r * 1.1, r * 0.55)
			c.close_path()
			c.fill_style = '#c23a2e'
			c.fill()
			c.fill_style = '#ffd86b'  # вістря древка
			c.begin_path()
			c.arc(r * 0.55, r * 0.55, 2, 0, TAU)
			c.fill()
			body.call()
			helmet.call('#b8a070')

		_:  # 'normal' — воїн
			sword.call()
			body.call()
			helmet.call('#8e98a6')
