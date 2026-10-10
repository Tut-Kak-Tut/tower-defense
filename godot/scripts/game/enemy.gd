class_name Enemy extends RefCounted
# Авантюрист: рух по шляху, статуси, урон. 1:1 з Enemy у web/js/entities.js (без draw).
# Публічні property (геттери): hidden, left, speed.
# hit() бере game (у вебі — глобал) з необов'язкового 4-го параметра, інакше зі слабкого посилання,
# яке ставить bind(game) (його викликає GameState при додаванні; також update(dt, game) і spawn_on_death).

var type: String
var def: Dictionary
var map: GameMap
var origin: String    # тип-прабатько: воїн вершника й діти шута рахуються в рядку свого прабатька
var wave: int
var buff: Dictionary
var color: String
var radius: float
var base_speed: float
var leader = null     # хто йде попереду в загоні — його не обганяємо
var reward: int
var split_reward: int
var max_hp: int
var hp: float
var armor: float
var max_shield: int
var shield: float
var since_hit := 0.0
var life_dmg: int
var stealth: bool
var revealed := 0.0
var heal_timer := 0.0
var route := 0
var x: float
var y: float
var wp := 1
var progress := 0.0
var slow_factor := 1.0
var slow_timer := 0.0
var stun_timer := 0.0
var webbed := false
var hasted := 0.0
var haste_mul := 1.0
var guarded := false
var summoned := false
var gen := 0
var cargo = null      # Array типів або null
var poison_dps := 0.0
var poison_timer := 0.0
var poison_src := ""
var frail := 0.0
var frail_timer := 0.0
var dir := 0.0
var dead := false
var escaped := false
var _game_ref: WeakRef = null

var hidden: bool:
	get: return stealth and revealed <= 0

# скільки лишилося до Серця — порівнюване між шляхами різної довжини
var left: float:
	get: return map.route_len(route) - progress

# поточна швидкість ходу: сповільнення та прискорення носія прапора (не складається з іншими)
var speed: float:
	get: return 0.0 if stun_timer > 0 else base_speed * slow_factor * (haste_mul if hasted > 0 else 1.0)


func bind(g) -> void:
	_game_ref = weakref(g) if g != null else null


func _init(p_type: String, p_wave := 1, p_buff := {}, p_map: GameMap = null) -> void:
	var d := Rules.data()
	map = p_map if p_map != null else GameMap.for_level("")
	def = d.adventurers[p_type]
	var s: Dictionary = d.adventurer_stats(p_type, p_wave, p_buff)
	type = p_type
	origin = p_type
	wave = p_wave
	buff = p_buff
	color = def["color"]
	radius = float(def["radius"])
	base_speed = s["speed"]
	reward = int(roundf(s["reward"]))
	split_reward = int(roundf(s["splitReward"]))
	max_hp = int(roundf(s["hp"]))
	hp = max_hp
	armor = s["armor"]
	max_shield = int(roundf(max_hp * float(def.get("shield", 0)))) if wave >= int(def.get("shieldWave", 0)) else 0
	shield = max_shield
	life_dmg = int(def.get("lifeDmg", 1))
	stealth = bool(def.get("stealth", false))
	heal_timer = float(def["heal"]["every"]) if def.get("heal") else 0.0
	var p0: Vector2 = map.routes[0]["px"][0]
	x = p0.x
	y = p0.y


# носій прапора стоїть, поки під стягом лише носії, а хтось інший ще живий чи тільки з'явиться
func waits_escort(game) -> bool:
	var rad := float(def["haste"]["radius"]) * map.cell
	var advs: Dictionary = Rules.data().adventurers
	var others := false
	for sp in game.spawn_queue:
		if not advs[sp["type"]].get("haste"):
			others = true
			break
	for e in game.enemies:
		if e.def.get("haste") or not Rules.alive(e):
			continue
		if Vector2(e.x - x, e.y - y).length() <= rad:
			return false
		others = true
	return others


func update(dt: float, game) -> void:
	bind(game)
	var cfg: Dictionary = Rules.data().cfg
	var c := map.cell
	if revealed > 0:
		revealed -= dt
	if hasted > 0:
		hasted -= dt
	if def.get("haste"):
		# стяг носія прапора: пришвидшує всіх поруч, крім інших носіїв
		var hs: Dictionary = def["haste"]
		var hrad := float(hs["radius"]) * c
		for e in game.enemies:
			if e.def.get("haste") or not Rules.alive(e) or Vector2(e.x - x, e.y - y).length() > hrad:
				continue
			e.hasted = 0.2
			e.haste_mul = float(hs["mul"])
	if def.get("undying"):
		guarded = Rules.has_guards(self, game)
	if frail_timer > 0:
		frail_timer -= dt
		if frail_timer <= 0:
			frail = 0.0
	since_hit += dt
	if def.get("shieldRegen") and since_hit >= float(cfg["SHIELD_REGEN_DELAY"]):
		shield = minf(max_shield, shield + max_shield * float(def["shieldRegen"]) * dt)
	if slow_timer > 0:
		slow_timer -= dt
		if slow_timer <= 0:
			slow_factor = 1.0
	if poison_timer > 0:
		poison_timer -= dt
		hit(poison_dps * dt, true, poison_src, game)
		if poison_timer <= 0:
			poison_dps = 0.0
	if def.get("heal"):
		heal_timer -= dt
		if heal_timer <= 0:
			var h: Dictionary = def["heal"]
			heal_timer += float(h["every"])
			var rad := float(h["radius"]) * c
			for e in game.enemies:
				if e.dead or e.escaped or Vector2(e.x - x, e.y - y).length() > rad:
					continue
				e.hp = minf(e.max_hp, e.hp + e.max_hp * float(h["amount"]))
			game.effects.append({"kind": "heal", "x": x, "y": y, "r": rad, "t": 0.5, "max": 0.5, "color": "#9dffb0"})
	# цілий щит паладина поруч знімає павутину
	if stun_timer > 0 and webbed and Rules.web_proof(self, game):
		stun_timer = 0.0
		webbed = false
	if stun_timer > 0:
		stun_timer -= dt
		return
	if def.get("haste") and waits_escort(game):
		return
	var spd := speed
	# стрій: наздогнавши попереднього в загоні, не обганяємо його (загиблого пропускаємо)
	while leader != null and not Rules.alive(leader):
		leader = leader.leader
	var lead = leader
	# (лідер позаду — його відкинуло валуном — не гальмує)
	if lead != null and lead.progress >= progress and lead.progress - progress < float(cfg["FORMATION_GAP"]):
		spd = minf(spd, lead.speed)
	var px: Array = map.routes[route]["px"]
	var move := spd * dt
	while move > 0 and wp < px.size():
		var t: Vector2 = px[wp]
		var dx := t.x - x
		var dy := t.y - y
		var d := sqrt(dx * dx + dy * dy)
		dir = atan2(dy, dx)   # лише для малювання — куди дивиться
		if d <= move:
			x = t.x
			y = t.y
			move -= d
			progress += d
			wp += 1
		else:
			x += dx / d * move
			y += dy / d * move
			progress += move
			move = 0.0
	if wp >= px.size():
		escaped = true


# Поставити на відстань p від входу свого шляху (не далі кінця).
func set_progress(p: float) -> void:
	var r := map.point_at(route, p)
	var pos: Vector2 = r["pos"]
	x = pos.x
	y = pos.y
	dir = r["dir"]
	wp = r["wp"]
	progress = r["progress"]


# Перевести на шлях i і поставити на відстань p від його входу.
func set_route(i: int, p := 0.0) -> void:
	route = i
	set_progress(p)


# Хто з'являється, коли цей авантюрист гине (воїн з-під вершника, половинки шута).
func spawn_on_death() -> Array:
	var out: Array = []
	var c := map.cell
	var cg: Array = cargo if cargo != null else def.get("spawn", [])
	for i in cg.size():
		out.append(_make(cg[i], progress - c - i * c * 0.6))
	if def.get("split") and gen < int(def["split"]):
		# шут розпадається на двох з половиною здоров'я; душі — лише за найменших
		for off in [-8.0, 8.0]:
			var e := _make(type, progress + off)
			e.gen = gen + 1
			e.max_hp = maxi(1, int(roundf(max_hp / 2.0)))
			e.hp = e.max_hp
			e.radius = radius * 0.8
			e.revealed = revealed
			e.reward = split_reward if e.gen == int(def["split"]) else 0
			out.append(e)
	return out


func _make(p_type: String, p_progress: float) -> Enemy:
	var e := Enemy.new(p_type, wave, buff, map)
	e.origin = origin
	e.summoned = true
	e.leader = leader
	e._game_ref = _game_ref
	e.set_route(route, p_progress)   # породжені йдуть тим самим шляхом
	return e


# pierce — урон крізь броню (отрута, монстри з armorPierce); src — тип монстра, якому зарахувати урон і вбивство
func hit(damage: float, pierce := false, src := "", p_game = null) -> void:
	var game = p_game if p_game != null else (_game_ref.get_ref() if _game_ref != null else null)
	var mdef = Rules.data().monsters.get(src) if src != "" else null
	if mdef != null and mdef.get("armorPierce"):
		pierce = true
	if dead:
		return
	var magic: bool = mdef != null and bool(mdef.get("magic", false))
	since_hit = 0.0
	damage *= 1.0 + frail
	if magic:
		# магічний щит бойового мага поруч (чи власний) — найсильніший, не складаються
		var cut := 0.0
		for e in (game.enemies if game != null else [self]):
			var w = e.def.get("magicWard")
			if w and Rules.alive(e) and Vector2(e.x - x, e.y - y).length() <= float(w["radius"]) * map.cell:
				cut = maxf(cut, float(w["cut"]))
		if cut > 0:
			damage *= 1.0 - cut
			if game != null and game.rng() < 0.3:
				game.effects.append({"kind": "spark", "x": x, "y": y, "t": 0.25, "max": 0.25, "color": "#c78cff"})
	if not pierce and armor != 0.0 and not (magic and def.get("physArmor", false)):
		damage = maxf(damage * 0.2, damage - armor)
	var dealt := 0.0
	# спершу — власний щит, потім щит паладина, в ауру якого потрапив
	var gs: Array = [self]
	if game != null:
		gs.append_array(Rules.shield_guards(self, game))
	for g in gs:
		if damage <= 0:
			break
		if g.shield <= 0:
			continue
		var absorbed := minf(g.shield, damage)
		g.shield -= absorbed
		g.since_hit = 0.0
		damage -= absorbed
		dealt += absorbed
	var before := hp
	hp -= damage
	# носій прапора не падає, поки за ним є кому йти
	if hp < 1 and def.get("undying") and game != null and Rules.has_guards(self, game):
		hp = minf(before, 1.0)
	dealt += maxf(0.0, before - maxf(0.0, hp))
	if hp <= 0:
		dead = true
	if src != "" and game != null and game.stats.has(src):
		var st: Dictionary = game.stats[src]
		st["round"] += dealt
		st["total"] += dealt
		if dead:
			st["kills"] += 1


func slow(factor: float, time: float) -> void:
	if def.get("slowImmune"):
		return
	slow_factor = minf(slow_factor, factor)
	slow_timer = maxf(slow_timer, time)


func make_frail(amount: float, time: float) -> void:
	frail = maxf(frail, amount)
	frail_timer = maxf(frail_timer, time)


func stun(time: float, p_webbed := false) -> void:
	# боса оглушення тримає вдвічі коротше
	var t := time / 2.0 if def.get("boss") else time
	if t < stun_timer:
		return
	stun_timer = t
	webbed = p_webbed


func poison(dps: float, time: float, src := "") -> void:
	if dps >= poison_dps:
		poison_src = src
	poison_dps = maxf(poison_dps, dps)
	poison_timer = maxf(poison_timer, time)
