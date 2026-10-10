extends Node2D
class_name MapLayer
# СтатичнаMap (коридор, брами, завали) — малюється один раз у _draw().

var map: GameMap = null
var _add_layer: Node2D


func _ready() -> void:
	_add_layer = Canvas2D.make_add_layer(self)
	if map == null:
		map = GameMap.for_level("")
	queue_redraw()


func _draw() -> void:
	if map == null:
		return

	var c = Canvas2D.new(self, _add_layer)
	MapDraw.build_map_layer(c, map)
