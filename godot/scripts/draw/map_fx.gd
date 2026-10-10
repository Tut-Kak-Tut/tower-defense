extends Node2D
class_name MapFx
# Динамічні ефекти: факели (under), віньєтка + Серце (over).
# Перемальовується кожен кадр через queue_redraw() у _process.

var map: GameMap = null
var _add_layer: Node2D
var heart_flash := 0.0
@export var part := "under"  # "under" — факели; "over" — віньєтка + Серце


func _ready() -> void:
	_add_layer = Canvas2D.make_add_layer(self)
	if map == null:
		map = GameMap.for_level("")


func _process(delta: float) -> void:
	# Зменшення heart_flash з часом
	if heart_flash > 0:
		heart_flash -= delta * 4  # спадає на 4 за секунду до 0
	queue_redraw()


func _draw() -> void:
	if map == null:
		return

	var t0 := Time.get_ticks_usec()
	var c = Canvas2D.new(self, _add_layer)
	var w = int(map.cols * map.cell)
	var h = int(map.rows * map.cell)
	var time = Canvas2D.now()

	if part == "under":
		# факели під монстрами
		MapDraw.draw_torches(c, map, time)
	else:
		# віньєтка й Серце над усім
		MapDraw.draw_vignette(c, w, h)
		MapDraw.draw_heart(c, map, heart_flash, time)
	Canvas2D.prof_add(part, t0)


func damage_heart(amount: float = 1.0) -> void:
	heart_flash = 0.5
