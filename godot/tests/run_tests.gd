extends SceneTree
# Запуск: godot --headless --path godot -s res://tests/run_tests.gd

func _init() -> void:
	_run.call_deferred()


func _run() -> void:
	await process_frame
	var total := 0
	var failures: Array = []
	var dir := DirAccess.open("res://tests")
	var files: Array = []
	for f in dir.get_files():
		if f.begins_with("test_") and f.ends_with(".gd") and f != "test_base.gd":
			files.append(f)
	files.sort()
	for f in files:
		var t = load("res://tests/" + f).new()
		for m in t.get_method_list():
			if String(m["name"]).begins_with("test_"):
				var ret = t.call(m["name"])
				if ret is String and ret != "":
					t.fail(ret)
				elif not (ret is bool and ret):
					# тест-метод має закінчуватися `return true`; інакше він перервався (SCRIPT ERROR)
					t.fail("%s не дійшов до кінця" % m["name"])
		total += t.checks
		for msg in t.failures:
			failures.append("%s: %s" % [f, msg])
	if failures.is_empty():
		print("OK ", total)
		quit(0)
	else:
		for msg in failures.slice(0, 50):
			printerr("FAIL ", msg)
		printerr("FAILED ", failures.size(), " of ", total)
		quit(1)
