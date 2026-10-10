extends Node2D
# Демо: 13 монстрів рівнів 1/5/10 (MonsterDraw.draw_tower) + ряд IconView для монстрів і авантюристів

const LEVELS := [1, 5, 10]
const CELL_W := 90.0
const CELL_H := 100.0
const SCALE := 1.5

var frame_count: int = 0
var towers: Array = []   # [col][row] -> Tower
var layer: Node2D


func _ready() -> void:
	layer = Canvas2D.make_add_layer(self)
	var data = Rules.data()
	var map := GameMap.for_level("")
	var order: Array = data.monster_order
	for i in range(order.size()):
		for j in range(LEVELS.size()):
			var t := Tower.new(order[i], 0, 0, map)
			t.level = LEVELS[j]
			t.x = 0.0
			t.y = 0.0
			towers.append(t)

	var y: float = 4.0 * CELL_H + 50.0
	var x: float = 20.0
	for id in order:
		_add_icon("tower", id, x, y)
		x += 52.0
	y += 60.0
	x = 20.0
	for id in data.adventurer_order:
		_add_icon("enemy", id, x, y)
		x += 52.0


func _add_icon(kind: String, id: String, x: float, y: float) -> void:
	var v := IconView.new()
	v.kind = kind
	v.id = id
	v.position = Vector2(x, y)
	v.size = Vector2(48, 48)
	add_child(v)


func _process(_dt: float) -> void:
	frame_count += 1
	queue_redraw()
	for child in get_children():
		if child is IconView:
			child.queue_redraw()
	if frame_count == 60:
		_take_screenshot()


func _draw() -> void:
	var c := Canvas2D.new(self, layer)
	var time: float = Canvas2D.now()
	c.fill_style = "#1a1410"
	c.fill_rect(0, 0, 1280, 720)

	c.fill_style = "#e8d9a8"
	c.font = "14px Georgia"
	c.text_align = "left"
	c.text_baseline = "top"
	c.fill_text("Монстри: рівні 1 / 5 / 10 (x1.5)", 20, 4)

	var order: Array = Rules.data().monster_order
	for i in range(order.size()):
		for j in range(LEVELS.size()):
			var t: Tower = towers[i * LEVELS.size() + j]
			var cx: float = 20.0 + CELL_W * 0.5 + j * CELL_W + (i % 4) * CELL_W * 3.0
			var cy: float = 30.0 + CELL_H * 0.5 + (i / 4) * CELL_H
			c.save()
			c.translate(cx, cy)
			c.scale(SCALE, SCALE)
			MonsterDraw.draw_tower(c, t, time)
			c.restore()


func _take_screenshot() -> void:
	await RenderingServer.frame_post_draw
	var img: Image = get_viewport().get_texture().get_image()
	var err: int = img.save_png("user://monsters_demo.png")
	print("Screenshot: ", "ok" if err == OK else "fail %d" % err)
