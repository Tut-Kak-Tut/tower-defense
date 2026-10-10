extends Node
# Дані балансу з res://data/*.json і функції сили/набігів (1:1 з web/js).

var cfg: Dictionary = {}
var monsters: Dictionary = {}
var monster_order: Array = []
var level_stats: Array = []
var roles: Dictionary = {}
var adventurers: Dictionary = {}
var adventurer_order: Array = []
var enemy_unlock: Dictionary = {}
var spawn_gap: Dictionary = {}
var wave_stats: Array = []
var waves: Dictionary = {}   # int -> {groups, buff}
var levels: Dictionary = {}
var level_order: Array = []


func _init() -> void:
	cfg = _load("config")
	var m := _load("monsters")
	monsters = m.get("monsters", {})
	monster_order = m.get("order", [])
	level_stats = m.get("LEVEL_STATS", [])
	roles = m.get("ROLES", {})
	var a := _load("adventurers")
	adventurers = a.get("adventurers", {})
	adventurer_order = a.get("order", [])
	enemy_unlock = a.get("ENEMY_UNLOCK", {})
	spawn_gap = a.get("SPAWN_GAP", {})
	wave_stats = a.get("WAVE_STATS", [])
	var w := _load("waves")
	for k in w.get("waves", {}):
		var wv: Dictionary = w["waves"][k]
		var groups: Array = []
		for g in wv["groups"]:
			var gg: Array = (g as Array).duplicate()
			gg[1] = int(gg[1])
			groups.append(gg)
		waves[int(k)] = {"groups": groups, "buff": wv.get("buff", {})}
	var lv := _load("levels")
	levels = lv.get("levels", {})
	level_order = lv.get("order", [])


func _load(name: String) -> Dictionary:
	var path := "res://data/%s.json" % name
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		push_error("Немає файлу даних: " + path)
		return {}
	var v = JSON.parse_string(f.get_as_text())
	if v == null:
		push_error("Помилка JSON: " + path)
		return {}
	return v


# Точна копія hash() з web/js/config.js.
# Ім'я `hash` збігається з глобальною функцією GDScript, тому всередині викликати `_hash`.
func hash(a, b, seed := 0) -> float:
	return _hash(a, b, seed)


func _hash(a, b, seed := 0) -> float:
	var x: int = int(float(a) * 374761393.0 + float(b) * 668265263.0 + float(seed) * 2246822519.0)
	var h: int = x & 0xFFFFFFFF
	h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
	return float((h ^ (h >> 16)) & 0xFFFFFFFF) / 4294967296.0


# --- монстри ---

func level_value(def: Dictionary, key: String, level: int) -> float:
	var arr = def["levels"].get(key)
	if arr is Array and level - 1 < arr.size() and arr[level - 1] != null:
		return float(arr[level - 1])
	var v = def.get(key)
	if v == null or (v is bool and not v):
		return 0.0
	return float(v)


func tower_stats(def: Dictionary, level: int) -> Dictionary:
	var s := {}
	for key in level_stats:
		s[key] = level_value(def, key, level)
	var cr = def.get("chainRange")
	s["chain"] = s["targets"] - 1 if cr != null and float(cr) != 0.0 else 0.0
	return s


func targets_at(def: Dictionary, level: int) -> float:
	return level_value(def, "targets", level)


# Кладовище: скільки смертей треба на набігу wave.
func grave_every(def: Dictionary, wave: int) -> int:
	return int(def["every"]) + int(floor(max(0, wave - 1) / float(def["everyGrow"])))


# --- авантюристи ---

func stats_at(type: String, n: int) -> Dictionary:
	var def: Dictionary = adventurers[type]
	var s := {}
	for key in wave_stats:
		var base = def.get(key)
		var pts: Array = [[1.0, float(base) if base != null else 0.0]]
		for p in def["waves"]:
			if p[1].has(key):
				pts.append([float(p[0]), float(p[1][key])])
		if pts.size() == 1:
			s[key] = pts[0][1]
			continue
		var i := 1
		while i < pts.size() - 1 and pts[i][0] < n:
			i += 1
		var w0: float = pts[i - 1][0]
		var v0: float = pts[i - 1][1]
		var w1: float = pts[i][0]
		var v1: float = pts[i][1]
		s[key] = v0 + (v1 - v0) * (n - w0) / (w1 - w0)
	return s


func adventurer_stats(type: String, n: int, buff := {}) -> Dictionary:
	var s := stats_at(type, n)
	if n > int(cfg["CAMPAIGN_WAVES"]):
		push_error("Безкінечний режим не підтримано (набіг %d)" % n)
	for key in buff:
		s[key] = s[key] * float(buff[key])
	if buff.has("reward"):
		s["splitReward"] = s["splitReward"] * float(buff["reward"])
	return s


# --- набіги ---

func wave_groups(n: int) -> Array:
	if waves.has(n):
		return waves[n]["groups"]
	push_error("Набіг %d не задано (безкінечний не в MVP)" % n)
	return []


func wave_buff(n: int) -> Dictionary:
	return waves[n]["buff"] if waves.has(n) else {}


func merge_buff(a: Dictionary, b: Dictionary) -> Dictionary:
	var out := a.duplicate()
	for key in b:
		var cur = out.get(key, 0.0)
		out[key] = (float(cur) if cur != null and float(cur) != 0.0 else 1.0) * float(b[key])
	return out


func route_for(n: int, squad: int, weights: Array) -> int:
	if weights.size() < 2:
		return 0
	var total := 0.0
	for w in weights:
		total += float(w)
	var x: float = _hash(n, squad, 7) * total
	for i in weights.size():
		x -= float(weights[i])
		if x < 0:
			return i
	return weights.size() - 1


func wave_spawns(n: int, weights := [1]) -> Array:
	var wb := wave_buff(n)
	var out: Array = []
	var squad := 0
	var groups := wave_groups(n)
	for gi in groups.size():
		var g: Array = groups[gi]
		var type: String = g[0]
		var count: int = int(g[1])
		var interval: float = float(g[2])
		var gap = g[3] if g.size() > 3 else null
		var gb = g[4] if g.size() > 4 else null
		var cargo = g[5] if g.size() > 5 else null
		if gap != null and gi > 0:
			squad += 1
		var buff: Dictionary = merge_buff(wb, gb) if gb != null and not gb.is_empty() else wb
		var route := route_for(n, squad, weights)
		for i in count:
			var delay: float
			if i == 0:
				delay = 0.0 if gi == 0 else (float(gap) if gap != null else interval)
			else:
				delay = interval
			out.append({"type": type, "delay": delay, "squad": squad, "buff": buff, "cargo": cargo, "route": route})
	return out
