extends Node
# Мова інтерфейсу (укр/рос). Не називати функцію `tr` — це вбудований метод Object.

signal lang_changed

const SETTINGS_PATH := "user://settings.cfg"

var lang := "uk"


func _init() -> void:
	var cf := ConfigFile.new()
	if cf.load(SETTINGS_PATH) == OK:
		var l = cf.get_value("ui", "lang", "uk")
		lang = "ru" if l == "ru" else "uk"


func t(uk: String, ru: String) -> String:
	return ru if lang == "ru" else uk


# Рядок або Dictionary {"uk", "ru"} (так їх пише export_data.js) -> рядок за мовою.
func txt(v) -> String:
	if v is Dictionary and (v.has("uk") or v.has("ru")):
		return str(v.get(lang, v.get("uk", "")))
	return str(v)


func set_lang(l: String) -> void:
	if l == lang:
		return
	lang = l
	var cf := ConfigFile.new()
	cf.load(SETTINGS_PATH)
	cf.set_value("ui", "lang", lang)
	cf.save(SETTINGS_PATH)
	lang_changed.emit()
