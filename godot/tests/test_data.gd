extends "res://tests/test_base.gd"

var D
var I
var ref: Dictionary


func _init() -> void:
	var root: Window = Engine.get_main_loop().root
	D = root.get_node("Data")
	I = root.get_node("I18n")
	var f := FileAccess.open("res://tests/fixtures/web_reference.json", FileAccess.READ)
	ref = JSON.parse_string(f.get_as_text()) if f else {}
	assert_true(not ref.is_empty(), "немає фікстури")


func test_counts():
	assert_eq(D.monsters.size(), 13, "монстрів")
	assert_eq(D.adventurers.size(), 13, "авантюристів")
	assert_eq(D.waves.size(), 100, "набігів")
	return true


func test_i18n():
	var old: String = I.lang
	I.lang = "uk"
	assert_eq(I.txt({"uk": "а", "ru": "б"}), "а", "txt uk")
	assert_eq(I.t("а", "б"), "а", "t uk")
	I.lang = "ru"
	assert_eq(I.txt({"uk": "а", "ru": "б"}), "б", "txt ru")
	assert_eq(I.t("а", "б"), "б", "t ru")
	assert_eq(I.txt(5), "5", "txt str")
	I.lang = old
	return true


func test_hash():
	for r in ref["hash"]:
		var v: float = D.hash(r[0], r[1], r[2])
		assert_near(v, r[3], 1e-12, "hash(%s,%s,%s)" % [r[0], r[1], r[2]])
	return true


func test_tower_stats():
	for id in ref["tower_stats"]:
		var lv: Array = ref["tower_stats"][id]
		for L in range(1, 11):
			var got: Dictionary = D.tower_stats(D.monsters[id], L)
			var exp: Dictionary = lv[L - 1]
			for k in exp:
				assert_near(got.get(k, INF), exp[k], 1e-9, "tower_stats %s L%d %s" % [id, L, k])
	return true


func test_adventurer_stats():
	for type in ref["adventurer_stats"]:
		for n in ref["adventurer_stats"][type]:
			var exp: Dictionary = ref["adventurer_stats"][type][n]
			var got: Dictionary = D.adventurer_stats(type, int(n), {})
			for k in exp:
				assert_near(got.get(k, INF), exp[k], 1e-9, "adventurer_stats %s %s %s" % [type, n, k])
	return true


func _buff_eq(a, b, msg: String) -> void:
	var da: Dictionary = a if a is Dictionary else {}
	var db: Dictionary = b if b is Dictionary else {}
	assert_eq(da.size(), db.size(), msg + " buff size")
	for k in db:
		assert_near(da.get(k, INF), db[k], 1e-9, msg + " buff " + k)


func test_wave_spawns():
	for lid in ref["wave_spawns"]:
		var weights: Array = [1]
		if lid != "default":
			weights = []
			for p in D.levels[lid]["paths"]:
				weights.append(float(p["weight"]))
		for n in ref["wave_spawns"][lid]:
			var exp: Array = ref["wave_spawns"][lid][n]
			var got: Array = D.wave_spawns(int(n), weights)
			var msg := "spawns %s/%s" % [lid, n]
			assert_eq(got.size(), exp.size(), msg + " size")
			if got.size() != exp.size():
				continue
			for i in exp.size():
				var e: Dictionary = exp[i]
				var g: Dictionary = got[i]
				var m := "%s[%d]" % [msg, i]
				assert_eq(g["type"], e["type"], m + " type")
				assert_near(g["delay"], e["delay"], 1e-9, m + " delay")
				assert_eq(g["squad"], int(e["squad"]), m + " squad")
				assert_eq(g["route"], int(e["route"]), m + " route")
				_buff_eq(g["buff"], e.get("buff"), m)
				var ec = e.get("cargo")
				var gc = g["cargo"]
				assert_eq(str(gc if gc != null else []), str(ec if ec != null else []), m + " cargo")
	return true
