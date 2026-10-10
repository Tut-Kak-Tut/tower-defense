class_name GameMap extends RefCounted
# Мапа рівня (або стандартна): шляхи, коридор, завали, факели. 1:1 з ROUTES/ROCKS/TORCHES/PATH_CELLS у web/js.

var level = null   # Dictionary рівня або null
var route_points: Array = []    # [шлях][точка] = [col, row]
var route_weights: Array = []
var routes: Array = []          # [{px: Array[Vector2], len: Array[float]}]
var rocks: Array = []           # [[c, r]]
var torches: Array = []
var path_cells: Dictionary = {}   # Vector2i -> true
var rock_cells: Dictionary = {}   # Vector2i -> true
var cell: float = 40.0
var cols: int = 20
var rows: int = 12


static func for_level(level_id: String) -> GameMap:
	var data = Engine.get_main_loop().root.get_node("Data")
	var m := GameMap.new()
	m.cell = float(data.cfg["CELL"])
	m.cols = int(data.cfg["COLS"])
	m.rows = int(data.cfg["ROWS"])
	if level_id != "" and data.levels.has(level_id):
		var lv: Dictionary = data.levels[level_id]
		m.level = lv
		m.torches = lv["torches"]
		m.rocks = lv["rocks"]
		for p in lv["paths"]:
			m.route_points.append(p["points"])
			m.route_weights.append(p["weight"])
	else:
		m.torches = data.cfg["DEFAULT_TORCHES"]
		m.route_points = [data.cfg["DEFAULT_PATH"]]
		m.route_weights = [1]
	for points in m.route_points:
		var px: Array[Vector2] = []
		for pt in points:
			px.append(m.cell_center(int(pt[0]), int(pt[1])))
		var len: Array[float] = []
		len.resize(px.size())
		len.fill(0.0)
		for i in range(1, px.size()):
			len[i] = len[i - 1] + px[i].distance_to(px[i - 1])
		m.routes.append({"px": px, "len": len})
		for i in range(points.size() - 1):
			var c := int(points[i][0])
			var r := int(points[i][1])
			var c2 := int(points[i + 1][0])
			var r2 := int(points[i + 1][1])
			var dc := signi(c2 - c)
			var dr := signi(r2 - r)
			m.path_cells[Vector2i(c, r)] = true
			while c != c2 or r != r2:
				c += dc
				r += dr
				m.path_cells[Vector2i(c, r)] = true
	for rk in m.rocks:
		m.rock_cells[Vector2i(int(rk[0]), int(rk[1]))] = true
	return m


func cell_center(col: int, row: int) -> Vector2:
	return Vector2(col * cell + cell / 2.0, row * cell + cell / 2.0)


func route_letter(i: int) -> String:
	return char(65 + i)


func in_bounds(col: int, row: int) -> bool:
	return col >= 0 and col < cols and row >= 0 and row < rows


func is_path(col: int, row: int) -> bool:
	return path_cells.has(Vector2i(col, row))


func is_rock(col: int, row: int) -> bool:
	return rock_cells.has(Vector2i(col, row))


func can_place_cell(col: int, row: int) -> bool:
	return in_bounds(col, row) and not is_path(col, row) and not is_rock(col, row)


func route_len(i: int) -> float:
	var l: Array = routes[i]["len"]
	return l[l.size() - 1]


# Позиція на шляху за пройденою відстанню (як Enemy.setProgress). Повертає
# {pos: Vector2, dir: float, wp: int, progress: float} — progress обмежений [0, len-1].
func point_at(route: int, progress: float) -> Dictionary:
	var px: Array = routes[route]["px"]
	var len: Array = routes[route]["len"]
	var p := maxf(0.0, minf(progress, route_len(route) - 1.0))
	var i := 1
	while i < len.size() - 1 and len[i] <= p:
		i += 1
	var a: Vector2 = px[i - 1]
	var b: Vector2 = px[i]
	var k: float = (p - len[i - 1]) / (len[i] - len[i - 1])
	return {"pos": a + (b - a) * k, "dir": atan2(b.y - a.y, b.x - a.x), "wp": i, "progress": p}
