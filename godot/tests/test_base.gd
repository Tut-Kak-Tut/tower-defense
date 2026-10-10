extends RefCounted
# Базовий клас тестів: збої копляться в failures.

var failures: Array = []
var checks := 0


func fail(msg: String) -> void:
	failures.append(msg)


func assert_true(c: bool, msg: String) -> void:
	checks += 1
	if not c:
		fail(msg)


func assert_eq(a, b, msg: String) -> void:
	checks += 1
	if (a is float or a is int) and (b is float or b is int):
		a = float(a)
		b = float(b)
	if a != b:
		fail("%s: %s != %s" % [msg, str(a), str(b)])


func assert_near(a, b, eps: float, msg: String) -> void:
	checks += 1
	if absf(float(a) - float(b)) >= eps:
		fail("%s: %s != %s" % [msg, str(a), str(b)])
