class_name Canvas2D
extends RefCounted
# Обгортка API CanvasRenderingContext2D над CanvasItem.draw_*. Виклики — лише з _draw() item.
# Назви: JS camelCase -> snake_case (fillRect -> fill_rect, globalAlpha -> global_alpha ...).

const RADIAL_RINGS := 8
const SHADOW_STEPS := [1.0 / 3.0, 2.0 / 3.0, 1.0]
const NAMED := {
	"white": Color(1, 1, 1), "black": Color(0, 0, 0), "transparent": Color(0, 0, 0, 0),
	"red": Color(1, 0, 0), "gray": Color(0.5, 0.5, 0.5), "grey": Color(0.5, 0.5, 0.5),
}

static var _color_cache: Dictionary = {}
static var _bold_font: Font = null
static var prof: Dictionary = {}  # бенчмарк: шар -> сумарний час _draw, мкс


static func prof_add(key: String, t0: int) -> void:
	prof[key] = prof.get(key, 0) + Time.get_ticks_usec() - t0

# ---- стан ----
var fill_style: Variant = "#000000"
var stroke_style: Variant = "#000000"
var line_width := 1.0
var global_alpha := 1.0
var line_cap := "butt"
var global_composite_operation := "source-over"
var shadow_color: Variant = "rgba(0,0,0,0)"
var shadow_blur := 0.0
var font := "10px sans-serif"
var text_align := "start"
var text_baseline := "alphabetic"
var line_dash_offset := 0.0
var transform := Transform2D.IDENTITY
var _dash: Array = []
var _stack: Array = []

var item: CanvasItem
var add_item: CanvasItem
var subpaths: Array = []  # [{pts: PackedVector2Array, closed: bool}] у координатах item (трансформ застосовано)
var _add_ops: Array = []


class CanvasGradient extends RefCounted:
	var radial := false
	var p0 := Vector2.ZERO
	var p1 := Vector2.ZERO
	var r0 := 0.0
	var r1 := 0.0
	var stops: Array = []  # [[t, Color]]

	func add_color_stop(t: float, css: Variant) -> void:
		var col: Color = css if css is Color else Canvas2D.parse_color(str(css))
		stops.append([t, col])
		stops.sort_custom(func(a, b): return a[0] < b[0])

	func color_at(p: Vector2) -> Color:
		if stops.is_empty():
			return Color(0, 0, 0, 0)
		var t := _t(p)
		if t <= stops[0][0]:
			return stops[0][1]
		for i in range(1, stops.size()):
			if t <= stops[i][0]:
				var a = stops[i - 1]
				var b = stops[i]
				var span: float = b[0] - a[0]
				return (a[1] as Color).lerp(b[1], 0.0 if span <= 0.0 else (t - a[0]) / span)
		return stops[stops.size() - 1][1]

	func _t(p: Vector2) -> float:
		var d := p1 - p0
		if not radial:
			var l2 := d.length_squared()
			return 0.0 if l2 <= 0.0 else clampf((p - p0).dot(d) / l2, 0.0, 1.0)
		# |p - (p0 + t d)| = r0 + t dr
		var dr := r1 - r0
		var m := p - p0
		var a := d.dot(d) - dr * dr
		var b := m.dot(d) + r0 * dr
		var c := m.dot(m) - r0 * r0
		if absf(a) < 1e-6:
			return 0.0 if absf(b) < 1e-9 else clampf(c / (2.0 * b), 0.0, 1.0)
		var disc := b * b - a * c
		if disc < 0.0:
			return 1.0
		var s := sqrt(disc)
		var t1 := (b + s) / a
		var t2 := (b - s) / a
		var best := maxf(t1, t2)
		if r0 + best * dr < 0.0:
			best = minf(t1, t2)
		return clampf(best, 0.0, 1.0)


func _init(p_item: CanvasItem = null, p_add_item: CanvasItem = null) -> void:
	item = p_item
	add_item = p_add_item
	if add_item != null:
		# шар додавання перемальовує записані команди у своєму draw (кадр із затримкою максимум 1)
		_add_ops = add_item.get_meta("c2d_ops", [])
		_add_ops.clear()
		add_item.queue_redraw()


## Дочірній вузол з адитивним змішуванням для 'lighter'. Створювати один раз і передавати в Canvas2D.new(self, layer).
static func make_add_layer(parent: Node2D) -> Node2D:
	# повторний виклик (з _draw кожного кадру) повертає той самий шар, а не додає новий
	if parent.has_meta("c2d_add_layer"):
		var existing = parent.get_meta("c2d_add_layer")
		if is_instance_valid(existing):
			return existing
	var layer := Node2D.new()
	var mat := CanvasItemMaterial.new()
	mat.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	layer.material = mat
	layer.set_meta("c2d_ops", [])
	layer.draw.connect(_replay.bind(layer))
	parent.add_child(layer)
	parent.set_meta("c2d_add_layer", layer)
	return layer


static func _replay(layer: Node2D) -> void:
	for op in layer.get_meta("c2d_ops", []):
		layer.callv(op[0], op[1])


static func now() -> float:
	return Time.get_ticks_msec() / 1000.0


# ---- колір ----
static func parse_color(s: String) -> Color:
	if _color_cache.has(s):
		return _color_cache[s]
	var col := _parse_color_uncached(s.strip_edges().to_lower())
	_color_cache[s] = col
	return col


static func _num(tok: String, pct_scale: float) -> float:
	tok = tok.strip_edges()
	if tok.ends_with("%"):
		return tok.trim_suffix("%").to_float() / 100.0 * pct_scale
	return tok.to_float()


static func _parse_color_uncached(s: String) -> Color:
	if NAMED.has(s):
		return NAMED[s]
	if s.begins_with("#"):
		var h := s.substr(1)
		if h.length() == 3 or h.length() == 4:
			var e := ""
			for ch in h:
				e += ch + ch
			h = e
		if (h.length() == 6 or h.length() == 8) and h.is_valid_hex_number():
			return Color.html("#" + h)
		return Color.MAGENTA
	var open := s.find("(")
	if open > 0 and s.ends_with(")"):
		var fn := s.substr(0, open).strip_edges()
		var body := s.substr(open + 1, s.length() - open - 2).replace("/", " ").replace(",", " ")
		var toks: Array = []
		for t in body.split(" ", false):
			toks.append(t)
		if toks.size() < 3:
			return Color.MAGENTA
		var a := 1.0
		if toks.size() >= 4:
			a = clampf(_num(toks[3], 1.0), 0.0, 1.0)
		if fn == "rgb" or fn == "rgba":
			return Color(_num(toks[0], 255.0) / 255.0, _num(toks[1], 255.0) / 255.0, _num(toks[2], 255.0) / 255.0, a)
		if fn == "hsl" or fn == "hsla":
			var hue := fposmod(_num(toks[0], 360.0), 360.0)
			var sat := clampf(_num(toks[1], 1.0), 0.0, 1.0)
			var lit := clampf(_num(toks[2], 1.0), 0.0, 1.0)
			var amp := sat * minf(lit, 1.0 - lit)
			var rgb: Array = []
			for n in [0.0, 8.0, 4.0]:
				var k := fposmod(n + hue / 30.0, 12.0)
				rgb.append(lit - amp * maxf(-1.0, minf(minf(k - 3.0, 9.0 - k), 1.0)))
			return Color(rgb[0], rgb[1], rgb[2], a)
	return Color.MAGENTA


func create_radial_gradient(x0: float, y0: float, r0: float, x1: float, y1: float, r1: float) -> CanvasGradient:
	var g := CanvasGradient.new()
	g.radial = true
	g.p0 = Vector2(x0, y0)
	g.p1 = Vector2(x1, y1)
	g.r0 = r0
	g.r1 = r1
	return g


func create_linear_gradient(x0: float, y0: float, x1: float, y1: float) -> CanvasGradient:
	var g := CanvasGradient.new()
	g.p0 = Vector2(x0, y0)
	g.p1 = Vector2(x1, y1)
	return g


func _color(v: Variant) -> Color:
	var col: Color
	if v is Color:
		col = v
	else:
		col = parse_color(str(v))
	col.a *= global_alpha
	return col


# ---- стан ----
func save() -> void:
	_stack.append({
		"fill_style": fill_style, "stroke_style": stroke_style, "line_width": line_width,
		"global_alpha": global_alpha, "line_cap": line_cap, "op": global_composite_operation,
		"shadow_color": shadow_color, "shadow_blur": shadow_blur, "font": font,
		"text_align": text_align, "text_baseline": text_baseline, "dash": _dash.duplicate(),
		"dash_offset": line_dash_offset, "transform": transform,
	})


func restore() -> void:
	if _stack.is_empty():
		return
	var s: Dictionary = _stack.pop_back()
	fill_style = s["fill_style"]
	stroke_style = s["stroke_style"]
	line_width = s["line_width"]
	global_alpha = s["global_alpha"]
	line_cap = s["line_cap"]
	global_composite_operation = s["op"]
	shadow_color = s["shadow_color"]
	shadow_blur = s["shadow_blur"]
	font = s["font"]
	text_align = s["text_align"]
	text_baseline = s["text_baseline"]
	_dash = s["dash"]
	line_dash_offset = s["dash_offset"]
	transform = s["transform"]


func set_line_dash(arr: Array) -> void:
	_dash = arr.duplicate()


func get_line_dash() -> Array:
	return _dash.duplicate()


# ---- трансформації ----
func translate(x: float, y: float) -> void:
	transform = transform.translated_local(Vector2(x, y))


func rotate(a: float) -> void:
	transform = transform.rotated_local(a)


func scale(x: float, y: float) -> void:
	transform = transform.scaled_local(Vector2(x, y))


## Як у вебі: [a c e; b d f].
func set_transform(a: float, b: float, c: float, d: float, e: float, f: float) -> void:
	transform = Transform2D(Vector2(a, b), Vector2(c, d), Vector2(e, f))


func reset_transform() -> void:
	transform = Transform2D.IDENTITY


func _scale_factor() -> float:
	return sqrt(absf(transform.determinant()))


# ---- шлях ----
func begin_path() -> void:
	subpaths = []


func _tp(x: float, y: float) -> Vector2:
	return transform * Vector2(x, y)


func _open_sub() -> Variant:
	if subpaths.is_empty():
		return null
	var s: Dictionary = subpaths[subpaths.size() - 1]
	return null if s["closed"] else s


func move_to(x: float, y: float) -> void:
	subpaths.append({"pts": PackedVector2Array([_tp(x, y)]), "closed": false})


func _move_to_raw(p: Vector2) -> void:
	subpaths.append({"pts": PackedVector2Array([p]), "closed": false})


func line_to(x: float, y: float) -> void:
	var s = _open_sub()
	if s == null:
		if subpaths.is_empty():
			move_to(x, y)
			return
		# після close_path новий підшлях стартує з початку попереднього
		_move_to_raw(subpaths[subpaths.size() - 1]["pts"][0])
		s = subpaths[subpaths.size() - 1]
	s["pts"].append(_tp(x, y))


func close_path() -> void:
	var s = _open_sub()
	if s != null and s["pts"].size() > 1:
		s["closed"] = true


func _segments(r_px: float, sweep: float) -> int:
	var full := clampi(int(ceil(r_px * 1.2)), 8, 64)
	return maxi(1, int(ceil(full * absf(sweep) / TAU)))


func arc(x: float, y: float, r: float, a0: float, a1: float, ccw: bool = false) -> void:
	ellipse(x, y, r, r, 0.0, a0, a1, ccw)


func ellipse(x: float, y: float, rx: float, ry: float, rot: float, a0: float, a1: float, ccw: bool = false) -> void:
	var tq := Time.get_ticks_usec()
	ellipse0(x, y, rx, ry, rot, a0, a1, ccw)
	Canvas2D.prof_add("~ell", tq)


func ellipse0(x: float, y: float, rx: float, ry: float, rot: float, a0: float, a1: float, ccw: bool = false) -> void:
	var sweep := a1 - a0
	var full := absf(sweep) >= TAU - 1e-6
	if full:
		sweep = -TAU if ccw else TAU
	elif not ccw and sweep < 0.0:
		sweep = fposmod(sweep, TAU)
	elif ccw and sweep > 0.0:
		sweep = -fposmod(-sweep, TAU)
	var n := _segments(maxf(rx, ry) * _scale_factor(), sweep)
	var pts := PackedVector2Array()
	var cr := cos(rot)
	var sr := sin(rot)
	var count := n if full else n + 1
	for i in count:
		var a := a0 + sweep * float(i) / float(n)
		var lx := rx * cos(a)
		var ly := ry * sin(a)
		pts.append(_tp(x + lx * cr - ly * sr, y + lx * sr + ly * cr))
	if full:
		subpaths.append({"pts": pts, "closed": true})
		return
	var s = _open_sub()
	if s == null:
		subpaths.append({"pts": pts, "closed": false})
	else:
		s["pts"].append_array(pts)


func _cur_local() -> Vector2:
	var s = _open_sub()
	if s == null:
		return Vector2.ZERO
	return transform.affine_inverse() * s["pts"][s["pts"].size() - 1]


func quadratic_curve_to(cx: float, cy: float, x: float, y: float) -> void:
	if _open_sub() == null:
		move_to(cx, cy)
	var p0 := _cur_local()
	var c := Vector2(cx, cy)
	var p1 := Vector2(x, y)
	var n := _segments((p0.distance_to(c) + c.distance_to(p1)) * _scale_factor() / 6.0, TAU)
	for i in range(1, n + 1):
		var t := float(i) / n
		var u := 1.0 - t
		var p := p0 * (u * u) + c * (2.0 * u * t) + p1 * (t * t)
		line_to(p.x, p.y)


func bezier_curve_to(c1x: float, c1y: float, c2x: float, c2y: float, x: float, y: float) -> void:
	if _open_sub() == null:
		move_to(c1x, c1y)
	var p0 := _cur_local()
	var c1 := Vector2(c1x, c1y)
	var c2 := Vector2(c2x, c2y)
	var p1 := Vector2(x, y)
	var n := _segments((p0.distance_to(c1) + c1.distance_to(c2) + c2.distance_to(p1)) * _scale_factor() / 6.0, TAU)
	for i in range(1, n + 1):
		var t := float(i) / n
		var u := 1.0 - t
		var p := p0 * (u * u * u) + c1 * (3.0 * u * u * t) + c2 * (3.0 * u * t * t) + p1 * (t * t * t)
		line_to(p.x, p.y)


func rect(x: float, y: float, w: float, h: float) -> void:
	subpaths.append({"pts": PackedVector2Array([_tp(x, y), _tp(x + w, y), _tp(x + w, y + h), _tp(x, y + h)]), "closed": true})
	move_to(x, y)


# ---- малювання ----
func _emit(method: String, args: Array) -> void:
	prof["~emits"] = prof.get("~emits", 0) + 1000
	if item == null:
		return
	if global_composite_operation == "lighter" and add_item != null:
		_add_ops.append([method, args])
		add_item.set_meta("c2d_ops", _add_ops)
	else:
		item.callv(method, args)


func _has_shadow() -> bool:
	if shadow_blur <= 0.0:
		return false
	var sc: Color = shadow_color if shadow_color is Color else parse_color(str(shadow_color))
	return sc.a > 0.0


func _shadow_col() -> Color:
	var sc: Color = shadow_color if shadow_color is Color else parse_color(str(shadow_color))
	sc.a *= 0.25 * global_alpha
	return sc


func _clean(pts: PackedVector2Array) -> PackedVector2Array:
	var out := PackedVector2Array()
	for p in pts:
		if out.is_empty() or not out[out.size() - 1].is_equal_approx(p):
			out.append(p)
	if out.size() > 1 and out[0].is_equal_approx(out[out.size() - 1]):
		out.remove_at(out.size() - 1)
	return out


func _fill_poly(pts: PackedVector2Array, col: Color) -> void:
	var tq := Time.get_ticks_usec()
	_fill_poly0(pts, col)
	Canvas2D.prof_add("~poly", tq)
	Canvas2D.prof_add("~polyN", Time.get_ticks_usec() - 1)


func _fill_poly0(pts: PackedVector2Array, col: Color) -> void:
	if pts.size() < 3 or col.a <= 0.0:
		return
	if not Geometry2D.triangulate_polygon(pts).is_empty():
		_emit("draw_colored_polygon", [pts, col])
		return
	# самоперетин: віялом від першої вершини
	for i in range(1, pts.size() - 1):
		var tri := PackedVector2Array([pts[0], pts[i], pts[i + 1]])
		if absf((tri[1] - tri[0]).cross(tri[2] - tri[0])) > 1e-4:
			_emit("draw_colored_polygon", [tri, col])


func _fill_gradient(pts: PackedVector2Array, g: CanvasGradient) -> void:
	var tq := Time.get_ticks_usec()
	_fill_gradient0(pts, g)
	Canvas2D.prof_add("~grad", tq)
	Canvas2D.prof_add("~gradN", Time.get_ticks_usec() - 1)


func _fill_gradient0(pts: PackedVector2Array, g: CanvasGradient) -> void:
	var inv := transform.affine_inverse()
	var centre := Vector2.ZERO
	for p in pts:
		centre += p
	centre /= pts.size()
	var n := pts.size()
	var rings := RADIAL_RINGS
	var cols: Array = []
	var ringpts: Array = []
	for k in range(rings + 1):
		var rp := PackedVector2Array()
		var rc := PackedColorArray()
		for p in pts:
			var q := centre + (p - centre) * (float(k) / rings)
			rp.append(q)
			var c := g.color_at(inv * q)
			c.a *= global_alpha
			rc.append(c)
		ringpts.append(rp)
		cols.append(rc)
	for i in n:
		var j := (i + 1) % n
		_emit("draw_polygon", [PackedVector2Array([centre, ringpts[1][i], ringpts[1][j]]),
			PackedColorArray([cols[0][i], cols[1][i], cols[1][j]])])
		for k in range(1, rings):
			_emit("draw_polygon", [
				PackedVector2Array([ringpts[k][i], ringpts[k + 1][i], ringpts[k + 1][j], ringpts[k][j]]),
				PackedColorArray([cols[k][i], cols[k + 1][i], cols[k + 1][j], cols[k][j]])])


func fill() -> void:
	for s in subpaths:
		var pts := _clean(s["pts"])
		if pts.size() < 3:
			continue
		if _has_shadow():
			var sc := _shadow_col()
			_fill_poly(pts, sc)
			for f in SHADOW_STEPS:
				_stroke_pts(pts, true, shadow_blur * f * _scale_factor(), sc, [])
		if fill_style is CanvasGradient:
			_fill_gradient(pts, fill_style)
		else:
			_fill_poly(pts, _color(fill_style))


func stroke() -> void:
	for s in subpaths:
		var pts: PackedVector2Array = s["pts"]
		if pts.size() < 2:
			continue
		var w := line_width * _scale_factor()
		if _has_shadow():
			for f in SHADOW_STEPS:
				_stroke_pts(pts, s["closed"], w + shadow_blur * f * _scale_factor(), _shadow_col(), _dash)
		if stroke_style is CanvasGradient:
			var g: CanvasGradient = stroke_style
			var inv := transform.affine_inverse()
			var line := pts.duplicate()
			if s["closed"]:
				line.append(pts[0])
			var colors := PackedColorArray()
			for p in line:
				var c := g.color_at(inv * p)
				c.a *= global_alpha
				colors.append(c)
			_emit("draw_polyline_colors", [line, colors, w, true])
		else:
			_stroke_pts(pts, s["closed"], w, _color(stroke_style), _dash)


func _stroke_pts(pts: PackedVector2Array, closed: bool, width: float, col: Color, dash: Array) -> void:
	var tq := Time.get_ticks_usec()
	_stroke_pts0(pts, closed, width, col, dash)
	Canvas2D.prof_add("~strk", tq)
	Canvas2D.prof_add("~strkN", Time.get_ticks_usec() - 1)


func _stroke_pts0(pts: PackedVector2Array, closed: bool, width: float, col: Color, dash: Array) -> void:
	if col.a <= 0.0 or pts.size() < 2:
		return
	var line := pts.duplicate()
	if closed:
		line.append(pts[0])
	var sf := _scale_factor()
	var pattern: Array = []
	for d in dash:
		pattern.append(float(d) * sf)
	var total := 0.0
	for d in pattern:
		total += d
	if pattern.is_empty() or total <= 0.0:
		_emit("draw_polyline", [line, col, width, true])
		if line_cap == "round" and not closed:
			_emit("draw_circle", [line[0], width * 0.5, col])
			_emit("draw_circle", [line[line.size() - 1], width * 0.5, col])
		return
	if pattern.size() % 2 == 1:
		pattern = pattern + pattern
		total *= 2.0
	# розбиття на штрихи
	var idx := 0
	var off := fposmod(line_dash_offset * sf, total)
	while off >= pattern[idx]:
		off -= pattern[idx]
		idx = (idx + 1) % pattern.size()
	var remain: float = pattern[idx] - off
	var on := idx % 2 == 0
	var cur := PackedVector2Array()
	if on:
		cur.append(line[0])
	for i in range(line.size() - 1):
		var a := line[i]
		var b := line[i + 1]
		var seg := a.distance_to(b)
		var pos := 0.0
		while seg - pos > remain:
			pos += remain
			var p := a.lerp(b, pos / seg)
			if on:
				cur.append(p)
				_emit("draw_polyline", [cur, col, width, true])
				cur = PackedVector2Array()
			else:
				cur = PackedVector2Array([p])
			on = not on
			idx = (idx + 1) % pattern.size()
			remain = maxf(pattern[idx], 0.01)
		remain -= seg - pos
		if on:
			cur.append(b)
	if on and cur.size() > 1:
		_emit("draw_polyline", [cur, col, width, true])


func _with_temp_rect(x: float, y: float, w: float, h: float, fn: Callable) -> void:
	var saved := subpaths
	subpaths = []
	rect(x, y, w, h)
	subpaths.pop_back()  # зайвий move_to
	fn.call()
	subpaths = saved


func fill_rect(x: float, y: float, w: float, h: float) -> void:
	_with_temp_rect(x, y, w, h, fill)


func stroke_rect(x: float, y: float, w: float, h: float) -> void:
	_with_temp_rect(x, y, w, h, stroke)


func clear_rect(_x: float, _y: float, _w: float, _h: float) -> void:
	pass


# ---- текст ----
func _font_px() -> float:
	var re := RegEx.new()
	re.compile("(\\d+(?:\\.\\d+)?)px")
	var m := re.search(font)
	return m.get_string(1).to_float() if m else 10.0


func _font_obj() -> Font:
	var lower := font.to_lower()
	if lower.contains("bold") or lower.contains("600") or lower.contains("700"):
		if _bold_font == null:
			var fv := FontVariation.new()
			fv.base_font = ThemeDB.fallback_font
			fv.variation_embolden = 0.6
			_bold_font = fv
		return _bold_font
	return ThemeDB.fallback_font


func fill_text(text: String, x: float, y: float) -> void:
	var tq := Time.get_ticks_usec()
	fill_text0(text, x, y)
	Canvas2D.prof_add("~text", tq)


func fill_text0(text: String, x: float, y: float) -> void:
	if item == null:
		return
	var px := int(round(_font_px()))
	var f := _font_obj()
	var w := f.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, px).x
	var asc := f.get_ascent(px)
	var desc := f.get_descent(px)
	var ox := x
	match text_align:
		"center":
			ox = x - w * 0.5
		"right", "end":
			ox = x - w
	var oy := y
	match text_baseline:
		"middle":
			oy = y + (asc - desc) * 0.5
		"top", "hanging":
			oy = y + asc
		"bottom", "ideographic":
			oy = y - desc
	var col := Color.WHITE if fill_style is CanvasGradient else _color(fill_style)
	_emit("draw_set_transform_matrix", [transform])
	_emit("draw_string", [f, Vector2(ox, oy), text, HORIZONTAL_ALIGNMENT_LEFT, -1, px, col])
	_emit("draw_set_transform_matrix", [Transform2D.IDENTITY])
