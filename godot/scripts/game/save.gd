class_name SaveStore extends RefCounted
# Автосейв у user://saves/<slot>.json: 1:1 з web/js/save.js (SAVE_VERSION = 1) + прогрес рівнів.

const SAVE_VERSION := 1
const DIR := "user://saves"
const PROGRESS := "user://progress.json"
const BEST := "user://best.json"


static func slot_for(level_id: String, endless: bool) -> String:
	if level_id != "":
		return "level-" + level_id
	return "endless" if endless else "campaign"


static func _path(slot: String) -> String:
	return "%s/%s.json" % [DIR, slot]


static func _read(path: String):
	if not FileAccess.file_exists(path):
		return null
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		return null
	return JSON.parse_string(f.get_as_text())


static func _write(path: String, v) -> void:
	DirAccess.make_dir_recursive_absolute(path.get_base_dir())
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f != null:
		f.store_string(JSON.stringify(v))


static func load_save(slot: String):
	var s = _read(_path(slot))
	if s is Dictionary and int(s.get("v", -1)) == SAVE_VERSION:
		return s
	return null


static func delete_save(slot: String) -> void:
	if FileAccess.file_exists(_path(slot)):
		DirAccess.remove_absolute(_path(slot))


static func snapshot(game) -> Dictionary:
	var ts: Array = []
	for t in game.towers:
		ts.append({"type": t.type, "col": t.col, "row": t.row, "level": t.level, "spent": t.spent, "aim": t.aim,
			"dir": t.dir, "boulders": t.boulders, "deaths": t.deaths})
	return {
		"v": SAVE_VERSION, "mode": game.mode, "wave": game.wave, "money": game.money, "lives": game.lives,
		"auto": game.auto, "over": game.over, "seen": game.seen.keys(), "stats": game.stats, "towers": ts,
	}


# Зберегти, якщо набіг не йде; поразка чи пройдений рівень стирають сейв.
static func autosave(game) -> void:
	if game.slot == "":
		return
	if game.over == "lose" or (game.over == "win" and game.mode == "level"):
		delete_save(game.slot)
		return
	if game.wave_active:
		return
	_write(_path(game.slot), snapshot(game))


# Відновити збережену гру поверх щойно створеної GameState.create(); false — сейву нема або він не підходить.
static func restore(game) -> bool:
	var loaded = load_save(game.slot)
	if loaded == null:
		return false
	var s: Dictionary = loaded
	var d = Engine.get_main_loop().root.get_node("Data")
	var towers: Array = []
	for td in s["towers"]:
		if not d.monsters.has(td["type"]):
			delete_save(game.slot)   # зіпсований сейв — починаємо заново
			return false
		var t = game.new_tower(td["type"], int(td["col"]), int(td["row"]))
		t.level = mini(int(d.cfg["MAX_LEVEL"]), int(td["level"]))
		t.spent = float(td["spent"])
		if Tower.TARGET_MODES.has(td.get("aim", "")):
			t.aim = td["aim"]
		if t.def.get("fixedDir", false) and td.has("dir"):
			t.set_dir(int(td["dir"]))
		if td.has("boulders") and t.def.get("attack") == "manual":
			t.boulders = float(td["boulders"])
		if td.has("deaths") and t.def.get("attack") == "grave":
			t.deaths = int(td["deaths"])
		towers.append(t)
	game.mode = s["mode"]
	game.wave = int(s["wave"])
	game.money = int(s["money"])
	game.lives = int(s["lives"])
	game.auto = bool(s["auto"])
	game.over = s["over"] if s["over"] != null else ""
	game.seen = {}
	for type in s["seen"]:
		if d.adventurers.has(type):
			game.seen[type] = true
	game.stats = s["stats"]
	game.towers = towers
	game.auto_timer = game.AUTO_DELAY
	return true


static func levels_done() -> Array:
	var v = _read(PROGRESS)
	return v if v is Array else []


static func mark_level_done(id: String) -> void:
	var done := levels_done()
	if done.has(id):
		return
	done.append(id)
	_write(PROGRESS, done)


static func load_best() -> int:
	var v = _read(BEST)
	return int(v) if v != null else 0


static func save_best(wave: int) -> void:
	if wave > load_best():
		_write(BEST, wave)
