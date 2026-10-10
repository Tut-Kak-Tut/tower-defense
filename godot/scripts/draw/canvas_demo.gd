extends Node2D

var layer: Node2D


func _ready() -> void:
	layer = Canvas2D.make_add_layer(self)


func _process(_dt: float) -> void:
	queue_redraw()


func _draw() -> void:
	var c := Canvas2D.new(self, layer)
	var t := Canvas2D.now()
	c.fill_style = "#1a1410"
	c.fill_rect(0, 0, 800, 500)
	# коло з радіальним градієнтом
	var g := c.create_radial_gradient(150, 150, 5, 150, 150, 70)
	g.add_color_stop(0, "rgba(255,220,120,1)")
	g.add_color_stop(1, "rgba(120,30,0,0)")
	c.fill_style = g
	c.begin_path()
	c.arc(150, 150, 70, 0, TAU)
	c.fill()
	# пунктир
	c.save()
	c.stroke_style = "hsl(45, 70%, 60%)"
	c.line_width = 3
	c.set_line_dash([10, 6])
	c.line_dash_offset = -t * 20.0
	c.begin_path()
	c.move_to(260, 60)
	c.line_to(500, 60)
	c.quadratic_curve_to(560, 120, 480, 200)
	c.stroke()
	c.restore()
	# текст
	c.fill_style = "#e8d9a8"
	c.font = "bold 24px Cinzel, Georgia"
	c.text_align = "center"
	c.text_baseline = "middle"
	c.fill_text("Серце Підземелля", 400, 300)
	# тінь
	c.save()
	c.shadow_color = "rgba(255,80,0,1)"
	c.shadow_blur = 14
	c.fill_style = "#c9a227"
	c.begin_path()
	c.ellipse(600, 150, 50, 30, t, 0, TAU)
	c.fill()
	c.restore()
	# lighter
	c.save()
	c.global_composite_operation = "lighter"
	c.fill_style = "rgba(80,120,255,0.5)"
	for i in 3:
		c.begin_path()
		c.arc(300 + i * 40, 400, 50, 0, TAU)
		c.fill()
	c.restore()
