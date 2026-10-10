extends Node2D
# Демо для map_draw: показує коридор, брами, факели, Серце.
# Запуск: "$G" --path godot res://scenes/dev/map_demo.tscn --quit-after 120
# Скріншот: user://map_demo.png

var map: GameMap = null
var map_layer: MapLayer = null
var map_fx_under: MapFx = null
var map_fx_over: MapFx = null
var frame_count := 0


func _ready() -> void:
	# Читаємо параметр --level= з аргументів командного рядка
	var level_id := ""
	var args = OS.get_cmdline_user_args()
	for arg in args:
		if arg.begins_with("--level="):
			level_id = arg.trim_prefix("--level=")
			break

	# Ініціалізуємо карту
	map = GameMap.for_level(level_id)

	# Створюємо дочірні вузли
	map_layer = MapLayer.new()
	map_layer.map = map
	add_child(map_layer)

	map_fx_under = MapFx.new()
	map_fx_under.map = map
	map_fx_under.part = "under"
	add_child(map_fx_under)

	map_fx_over = MapFx.new()
	map_fx_over.map = map
	map_fx_over.part = "over"
	add_child(map_fx_over)

	# Встановлюємо розмір вікна
	var w = int(map.cols * map.cell)
	var h = int(map.rows * map.cell)
	get_window().size = Vector2i(w, h)


func _process(_dt: float) -> void:
	frame_count += 1

	# На 60-му кадрі — скріншот
	if frame_count == 60:
		await get_tree().process_frame
		var img = get_viewport().get_texture().get_image()
		img.save_png("user://map_demo.png")
		print("Скріншот збережено: user://map_demo.png")
		get_tree().quit()
