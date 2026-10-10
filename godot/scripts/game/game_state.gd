class_name GameState extends RefCounted
# Стан гри й ігровий цикл (без малювання): 1:1 з web/js/game.js 25–255.

const AUTO_DELAY := 3.0
const BREWABLE_EXCLUDE := ["web", "haunt", "buff", "manual", "grave"]

var mode: String = "campaign"   # 'campaign' | 'endless' | 'level'
var level_id: String = ""
var slot: String = "campaign"
var save_enabled: bool = true
var map: GameMap
var money: int
var lives: int
var wave: int = 0               # номер останньої запущеної хвилі
var wave_active: bool = false
var spawn_queue: Array = []
var spawn_timer: float = 0.0
var last_in_squad: Array = []
var enemies: Array = []
var towers: Array = []
var projectiles: Array = []
var effects: Array = []
var speed: float = 1.0
var paused: bool = false
var auto: bool = false
var auto_timer: float = 0.0
var heart_flash: float = 0.0
var over: String = ""           # "" | 'win' | 'lose'
var seen: Dictionary = {}       # тип авантюриста -> true
var stats: Dictionary = {}      # тип монстра -> {round, total, kills}
var rng_state: int = 0


static func _data() -> Node:
	return Engine.get_main_loop().root.get_node("Data")


static func create(p_mode: String, p_level_id: String = "") -> GameState:
	var g := GameState.new()
	var d := _data()
	g.mode = p_mode
	g.level_id = p_level_id
	g.map = GameMap.for_level(p_level_id)
	if p_mode == "level" and g.map.level != null:
		g.money = int(g.map.level["money"])
		g.lives = int(g.map.level["lives"])
	else:
		g.money = int(d.cfg["START_MONEY"])
		g.lives = int(d.cfg["START_LIVES"])
	g.slot = SaveStore.slot_for(p_level_id, p_mode == "endless")
	g.rng_state = int(Time.get_ticks_usec()) & 0xFFFFFFFF
	return g


func seed_rng(s: int) -> void:
	rng_state = s & 0xFFFFFFFF


# mulberry32 (Math.imul: множення за модулем 2^64 у int64 зберігає молодші 32 біти)
func rng() -> float:
	rng_state = (rng_state + 0x6D2B79F5) & 0xFFFFFFFF
	var t := rng_state
	t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
	t = (t ^ (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF))) & 0xFFFFFFFF
	return float((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0


func max_waves() -> float:
	if mode == "endless":
		return INF
	if mode == "level":
		return float(map.level["waves"])
	return float(_data().cfg["CAMPAIGN_WAVES"])


func in_bounds(col: int, row: int) -> bool:
	return map.in_bounds(col, row)


func tower_at(col: int, row: int):
	for t in towers:
		if t.col == col and t.row == row:
			return t
	return null


func can_place(col: int, row: int) -> bool:
	return map.can_place_cell(col, row) and tower_at(col, row) == null


# "" — можна поселити; інакше причина: "money" | "limit" | "unique"
func can_afford(type: String) -> String:
	var def: Dictionary = _data().monsters[type]
	if money < int(def["cost"]):
		return "money"
	if towers.size() >= int(_data().cfg["MAX_TOWERS"]):
		return "limit"
	if def.get("unique", false):
		for t in towers:
			if t.type == type:
				return "unique"
	return ""


func place_tower(type: String, col: int, row: int) -> bool:
	if not can_place(col, row) or can_afford(type) != "":
		return false
	money -= int(_data().monsters[type]["cost"])
	var t := new_tower(type, col, row)
	towers.append(t)
	if not stats.has(type):
		stats[type] = {"round": 0, "total": 0, "kills": 0}
	if t.def.get("attack") == "buff" and wave_active:
		brew(t)   # відьма, поселена під час набігу, варить одразу
	_autosave()
	return true


# Кладовище рахує смерті авантюристів у своїй території; кожна every-та дає душі.
func grave_death(e) -> void:
	for t in towers:
		if t.def.get("attack") != "grave" or not t.reaches(e):
			continue
		t.deaths += 1
		if t.deaths < _data().grave_every(t.def, wave):
			continue
		t.deaths = 0
		var souls := int(t.stats()["souls"])
		money += souls
		effects.append({"kind": "souls", "x": t.x, "y": t.y - 14, "text": "+%d 👻" % souls, "color": "#9dffc4", "t": 1.4, "max": 1.4})


# Зілля відьми: випадковим монстрам, що б'ють, — по черзі частота атаки, урон, частота...
func brew(witch) -> void:
	var pool: Array = towers.filter(func(t): return not (t.def.get("attack") in BREWABLE_EXCLUDE))
	var s: Dictionary = _data().tower_stats(witch.def, witch.level)
	var i := 0
	while i < int(s["targets"]) and pool.size() > 0:
		var idx := int(floor(rng() * pool.size()))
		var t = pool[idx]
		pool.remove_at(idx)
		t.buffs.append({"kind": "dmg" if i % 2 == 1 else "rate", "v": s["buff"], "from": weakref(witch)})
		i += 1


func throw_boulder(t) -> bool:
	if not wave_active or over != "" or t.boulders <= 0:
		return false
	t.boulders -= 1
	projectiles.append(Boulder.new(t))
	return true


func new_tower(type: String, col: int, row: int) -> Tower:
	var t := Tower.new(type, col, row, map)
	if t.def.get("fixedDir", false):
		t.set_dir(best_dir(col, row, t.def))
	return t


func best_dir(col: int, row: int, def: Dictionary) -> int:
	var best := 3
	var best_n := -1
	for i in Rules.DIRS.size():
		var n := beam_coverage(col, row, float(def["range"]), float(def.get("beamWidth", 0)), i)
		if n > best_n:
			best_n = n
			best = i
	return best


# Скільки клітинок коридору накриває смуга з клітинки col,row у бік dir.
func beam_coverage(col: int, row: int, range_cells: float, half: float, dir: int) -> int:
	var d: Dictionary = Rules.DIRS[dir]
	var n := 0
	for key in map.path_cells:
		var c: int = key.x
		var r: int = key.y
		var along: int = (c - col) * d["dx"] + (r - row) * d["dy"]
		var side: int = absi((c - col) * d["dy"] - (r - row) * d["dx"])
		if along >= 1 and along <= range_cells and side <= half:
			n += 1
	return n


func upgrade_tower(tower) -> bool:
	var cost = tower.upgrade_cost()
	if cost == null or money < int(cost):
		return false
	money -= int(cost)
	tower.spent += cost
	tower.level += 1
	if tower.def.get("attack") == "manual":
		tower.boulders += _data().targets_at(tower.def, tower.level) - _data().targets_at(tower.def, tower.level - 1)
	_autosave()
	return true


func sell_tower(tower) -> void:
	money += tower.sell_value()
	towers = towers.filter(func(t): return t != tower)
	for t in towers:
		t.buffs = t.buffs.filter(func(b): return b["from"].get_ref() != tower)   # зілля вигнаної відьми вивітрюється
	_autosave()


func start_wave() -> void:
	if wave_active or over != "" or wave >= max_waves():
		return
	wave += 1
	for st in stats.values():
		st["round"] = 0
	spawn_queue = _data().wave_spawns(wave, map.route_weights)
	last_in_squad = []
	for t in towers:
		t.buffs = []
	for t in towers:
		if t.def.get("attack") == "buff":
			brew(t)
	spawn_timer = float(spawn_queue[0]["delay"])
	wave_active = true


func update(dt: float) -> void:
	if auto and not wave_active:
		auto_timer -= dt
		if auto_timer <= 0:
			start_wave()

	# поява ворогів
	if spawn_queue.size() > 0:
		spawn_timer -= dt
		while spawn_queue.size() > 0 and spawn_timer <= 0:
			var s: Dictionary = spawn_queue.pop_front()
			seen[s["type"]] = true
			var e := Enemy.new(s["type"], wave, s["buff"], map)
			e.bind(self)
			e.set_route(s["route"])
			if s["cargo"] != null:
				e.cargo = s["cargo"]
			var sq: int = s["squad"]
			e.leader = last_in_squad[sq] if sq < last_in_squad.size() else null
			while last_in_squad.size() <= sq:
				last_in_squad.append(null)
			last_in_squad[sq] = e
			enemies.append(e)
			if spawn_queue.size() > 0:
				spawn_timer += float(spawn_queue[0]["delay"])

	for e in enemies:
		e.update(dt, self)
	for t in towers:
		t.update(dt, self)
	for p in projectiles:
		p.update(dt, self)
	for fx in effects:
		fx["t"] -= dt
	heart_flash = maxf(0.0, heart_flash - dt)

	var born: Array = []   # ті, хто з'явився із загиблих (воїн вершника, половинки шута)
	var kept: Array = []
	for e in enemies:
		if e.dead:
			money += e.reward
			grave_death(e)
			born.append_array(e.spawn_on_death())
		elif e.escaped:
			lives -= lives if e.def.get("fatal", false) else e.life_dmg   # телега — одразу поразка
			heart_flash = 0.5
		else:
			kept.append(e)
	enemies = kept
	for e in born:
		seen[e.type] = true
		e.bind(self)
	enemies.append_array(born)
	projectiles = projectiles.filter(func(p): return not p.done)
	effects = effects.filter(func(fx): return fx["t"] > 0)

	if lives <= 0:
		lives = 0
		over = "lose"
		_autosave()   # поразка стирає сейв
		return

	if wave_active and spawn_queue.is_empty() and enemies.is_empty():
		wave_active = false
		last_in_squad = []   # розриває посилання на загиблих
		auto_timer = AUTO_DELAY
		var cfg: Dictionary = _data().cfg
		money += int(cfg["WAVE_BONUS"]) + wave * int(cfg["WAVE_BONUS_PER"])
		# орк між набігами обтесує ще один валун
		for t in towers:
			if t.def.get("attack") == "manual":
				t.boulders = minf(_data().targets_at(t.def, t.level), t.boulders + 1)
		if save_enabled:
			if mode == "endless":
				SaveStore.save_best(wave)
			if wave >= max_waves() and mode == "level":
				SaveStore.mark_level_done(level_id)
		if wave >= max_waves():
			over = "win"
		_autosave()


# Після перемоги в кампанії — грати далі тим самим підземеллям.
func continue_endless() -> void:
	mode = "endless"
	over = ""
	_autosave()


func _autosave() -> void:
	if save_enabled:
		SaveStore.autosave(self)
