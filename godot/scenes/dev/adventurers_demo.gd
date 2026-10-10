extends Node2D

var enemies: Array = []
var frame_count := 0
var screenshot_saved := false
var screen_size := Vector2(1280, 720)


func _ready() -> void:
	var map = GameMap.for_level("")
	var adv_order: Array = Rules.data().adventurer_order

	# Grid 5x3, wider spacing
	for i in range(adv_order.size()):
		var row = i / 5
		var col = i % 5
		var e = Enemy.new(adv_order[i], 10, {}, map)
		e.x = 120.0 + col * 220.0
		e.y = 100.0 + row * 180.0
		# Enlarge for visibility
		e.radius = 20.0
		enemies.append(e)

	# Additional state examples
	# Stunned
	var stunned = Enemy.new("normal", 10, {}, map)
	stunned.x = 120.0
	stunned.y = 460.0
	stunned.radius = 20.0
	stunned.stun_timer = 1.0
	enemies.append(stunned)

	# Invisible-revealed
	var hidden = Enemy.new("scout", 10, {}, map)
	hidden.x = 340.0
	hidden.y = 460.0
	hidden.radius = 20.0
	hidden.stealth = true
	hidden.revealed = 1.0
	enemies.append(hidden)

	# Shielded
	var shielded = Enemy.new("tank", 10, {}, map)
	shielded.x = 560.0
	shielded.y = 460.0
	shielded.radius = 20.0
	shielded.shield = shielded.max_shield
	enemies.append(shielded)

	# Wounded (40% HP)
	var wounded = Enemy.new("hero", 10, {}, map)
	wounded.x = 780.0
	wounded.y = 460.0
	wounded.radius = 20.0
	wounded.hp = wounded.max_hp * 0.4
	enemies.append(wounded)

	# Poisoned
	var poisoned = Enemy.new("blade", 10, {}, map)
	poisoned.x = 1000.0
	poisoned.y = 460.0
	poisoned.radius = 20.0
	poisoned.poison_timer = 2.0
	poisoned.poison_dps = 5.0
	enemies.append(poisoned)

	print("Adventurers demo loaded: %d enemies" % enemies.size())


func _process(_delta: float) -> void:
	frame_count += 1
	if frame_count == 60 and not screenshot_saved:
		var img = get_viewport().get_texture().get_image()
		if img != null:
			img.save_png("user://adventurers_demo.png")
			print("Screenshot saved to user://adventurers_demo.png")
			screenshot_saved = true
	queue_redraw()


func _draw() -> void:
	var canvas = Canvas2D.new(self)
	var time = Canvas2D.now()

	# Background
	canvas.fill_style = '#1a1a1a'
	canvas.fill_rect(0, 0, screen_size.x, screen_size.y)

	# Draw all enemies
	for e in enemies:
		AdventurerDraw.draw_enemy(canvas, e, time)
