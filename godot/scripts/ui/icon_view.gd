class_name IconView extends Control
# Малювання іконки монстра або авантюриста через Canvas2D

@export var kind := "tower":  # "tower" або "enemy"
	set(v):
		kind = v
		queue_redraw()
@export var id := "":
	set(v):
		id = v
		queue_redraw()

var _canvas: Canvas2D = null


func _ready() -> void:
	_canvas = Canvas2D.new(self)
	resized.connect(queue_redraw)


func _draw() -> void:
	if id.is_empty():
		return

	# CanvasItem очищає команди перед кожним _draw, тож малюємо щоразу;
	# перемальовка — лише коли викликали queue_redraw (зміна id/розміру).
	_canvas = Canvas2D.new(self)

	_canvas.translate(size.x / 2.0, size.y / 2.0)

	if kind == "tower":
		_draw_tower_icon()
	elif kind == "enemy":
		_draw_enemy_icon()


func _draw_tower_icon() -> void:
	var scale_factor = size.x / 40.0
	_canvas.scale(scale_factor, scale_factor)
	_canvas.translate(0, -2)
	MonsterDraw.draw_kind(_canvas, id, -PI / 2.0, Canvas2D.now())


func _draw_enemy_icon() -> void:
	var data = Engine.get_main_loop().root.get_node("Data")
	var def = data.adventurers.get(id, {})
	if def.is_empty():
		# Заглушка - нарисуй коло
		_canvas.fill_style = "#999"
		_canvas.begin_path()
		_canvas.arc(0, 0, 10, 0, TAU)
		_canvas.fill()
		return

	var radius = def.get("radius", 5.0)
	var color = def.get("color", "#fff")

	# Усі авантюристи однакового розміру в іконці
	var k = size.x * 0.36 / radius / (2.1 if id == "wagon" else (1.5 if id == "knight" else 1.0))
	_canvas.scale(k, k)
	_canvas.rotate(-PI / 2.0)

	# Спробуй використати AdventurerDraw якщо він є
	if AdventurerDraw != null:
		AdventurerDraw.draw_adventurer(_canvas, id, radius, color, Canvas2D.now())
	else:
		# Заглушка - коло
		_canvas.fill_style = color
		_canvas.begin_path()
		_canvas.arc(0, 0, radius, 0, TAU)
		_canvas.fill()
