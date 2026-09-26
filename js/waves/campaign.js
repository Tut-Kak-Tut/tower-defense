// ================================== КАМПАНІЯ ==================================
// Усі 100 набігів кампанії (CAMPAIGN_WAVES у config.js). Кожен набіг — ланцюжок WaveBuilder (клас — у wave.js поруч).
//
// ЯК ЗРОБИТИ / ЗМІНИТИ НАБІГ
//
//   new WaveBuilder(12)                                   // 1. номер набігу (1…100, кожен рівно один раз)
//     .buff({ hp: 1.2 })                                  // 2. (необов'язково) баф усьому набігу
//     .squad().add('tank', 1, 1.5).add('normal', 5, 0.7)  // 3. загони: кожен рядок — один загін
//     .squad(3).add('priest', 1, 1)
//     .squad(2.5).add('fast', 6, 0.4, { speed: 1.2 })     //    4-й аргумент add — баф лише цій групі
//     .build();                                           // 4. обов'язково в кінці
//
//   .squad(пауза)  — починає новий загін; пауза — секунди після попереднього загону (за замовчуванням 2.5).
//                    У першого загону набігу пауза не діє — він виходить одразу.
//   .add(хто, скільки, інтервал, баф?) — група в поточному загоні:
//                    хто       — id авантюриста: 'normal' воїн, 'fast' злодій, 'tank' паладин, 'gnome' гном,
//                                'priest' жрець, 'mage' маг, 'scout' розвідник, 'knight' вершник, 'jester' шут,
//                                'blade' майстер меча, 'hero' герой-бос (усі — у js/adventurers/adventurers.js);
//                    скільки   — ціле число від 1;
//                    інтервал  — секунди між появою авантюристів цієї групи.
//                    Кілька add в одному загоні йдуть одна за одною без паузи. У загоні ніхто не обганяє того, хто
//                    попереду, тож порядок add = стрій: спершу авангард (паладин/гном/вершник), далі основа, в кінці тил (жрець/маг).
//   .buff({ hp, speed, reward, armor }) — множники: { hp: 1.5 } — +50% здоров'я, { reward: 2 } — удвічі більше душ.
//                    Баф набігу й баф групи перемножуються. Воїн, що лишається після вершника, успадковує баф вершника.
//
// ЩО ВАРТО ЗНАТИ
//   - Сила авантюристів (HP, швидкість, душі, броня) на кожному набігу береться з їхніх setWave у
//     js/adventurers/adventurers.js — тут задається лише склад і бафи.
//   - Бос-набіги за традицією кожен 10-й (герой в оточенні), але це лише звичка — будь-який набіг може бути будь-яким.
//   - Новий авантюрист з'явиться в кампанії лише там, куди ти його впишеш (setUnlockWave стосується тільки безкінечного).
//   - Помилка (невідомий id, дробова кількість, невідомий баф, повтор номера, пропущений набіг) — у консолі F12,
//     з номером набігу й групи.
//   - Набіги після 100-го будує генератор (endless.js), але будь-який з них можна задати й тут — тоді генератор його не чіпає.

new WaveBuilder(1)
  .squad().add('normal', 2, 0.9)
  .build();

new WaveBuilder(2)
  .squad().add('normal', 2, 0.9)
  .squad(2).add('normal', 2, 0.9)
  .build();

new WaveBuilder(3)
  .squad().add('fast', 6, 1)
  .build();

new WaveBuilder(4)
  .squad().add('normal', 4, 0.8)
  .squad().add('fast', 5, 0.45)
  .build();

new WaveBuilder(5)
  .squad().add('tank', 1, 1.5).add('normal', 3, 0.8)
  .squad().add('fast', 4, 0.45)
  .build();

new WaveBuilder(6)
  .squad().add('tank', 1, 1.5).add('fast', 4, 0.45)
  .squad().add('tank', 1, 1.5).add('normal', 4, 0.8).add('fast', 1, 0.45)
  .build();

new WaveBuilder(7)
  .squad().add('tank', 1, 1.5).add('normal', 4, 0.8)
  .squad().add('tank', 1, 1.5).add('normal', 4, 0.8)
  .squad().add('tank', 1, 1.5).add('normal', 4, 0.8)
  .build();

new WaveBuilder(8)
  .squad().add('tank', 1, 1.5).add('fast', 10, 0.4, { speed: 1.05 })
  .squad().add('tank', 1, 1.5).add('fast', 10, 0.4, { speed: 1.05 })
  .build();

new WaveBuilder(9)
  .squad().add('tank', 4, 1.2).add('normal', 10, 0.7)
  .build();

new WaveBuilder(10)
  .squad().add('normal', 5, 0.8)
  .squad().add('tank', 2, 1.2).add('hero', 1, 1)
  .squad().add('fast', 4, 0.45)
  .squad().add('normal', 5, 0.8)
  .build();

new WaveBuilder(11)   // новий: Гном-латник
  .squad().add('gnome', 3, 0.94).add('normal', 4, 0.66)
  .squad(2.36).add('gnome', 3, 0.94).add('normal', 4, 0.66)
  .squad(2.36).add('gnome', 3, 0.94).add('normal', 4, 0.66)
  .build();

new WaveBuilder(12)
  .squad().add('normal', 7, 0.66)
  .squad(2.35).add('gnome', 3, 0.94).add('normal', 4, 0.66)
  .squad(2.35).add('tank', 1, 1.5).add('normal', 6, 0.66)
  .squad(2.35).add('fast', 8, 0.42)
  .build();

new WaveBuilder(13)
  .squad().add('fast', 8, 0.42)
  .squad(2.34).add('fast', 8, 0.42)
  .squad(2.34).add('normal', 7, 0.65)
  .squad(2.34).add('tank', 1, 1.5).add('normal', 6, 0.65)
  .squad(2.34).add('gnome', 3, 0.94).add('normal', 4, 0.65)
  .build();

new WaveBuilder(14)
  .squad().add('normal', 7, 0.65)
  .squad(2.32).add('normal', 7, 0.65)
  .squad(2.32).add('fast', 9, 0.42)
  .squad(2.32).add('fast', 9, 0.42)
  .squad(2.32).add('gnome', 3, 0.93).add('normal', 4, 0.65)
  .build();

new WaveBuilder(15)
  .squad().add('tank', 1, 1.48).add('normal', 6, 0.65)
  .squad(2.31).add('gnome', 3, 0.93).add('normal', 4, 0.65)
  .squad(2.31).add('gnome', 3, 0.93).add('normal', 4, 0.65)
  .build();

new WaveBuilder(16)
  .squad().add('gnome', 3, 0.92).add('normal', 5, 0.64)
  .squad(2.3).add('fast', 9, 0.41)
  .squad(2.3).add('gnome', 3, 0.92).add('normal', 5, 0.64)
  .squad(2.3).add('gnome', 3, 0.92).add('normal', 5, 0.64)
  .squad(2.3).add('fast', 9, 0.41)
  .build();

new WaveBuilder(17)
  .squad().add('tank', 1, 1.46).add('normal', 6, 0.64)
  .squad(2.29).add('fast', 9, 0.41)
  .squad(2.29).add('tank', 1, 1.46).add('normal', 6, 0.64)
  .squad(2.29).add('tank', 1, 1.46).add('normal', 6, 0.64)
  .squad(2.29).add('fast', 9, 0.41)
  .squad(2.29).add('tank', 1, 1.46).add('normal', 6, 0.64)
  .build();

new WaveBuilder(18)
  .squad().add('tank', 1, 1.46).add('normal', 6, 0.64)
  .squad(2.27).add('normal', 8, 0.64)
  .squad(2.27).add('normal', 8, 0.64)
  .squad(2.27).add('tank', 1, 1.46).add('normal', 6, 0.64)
  .squad(2.27).add('tank', 1, 1.46).add('normal', 6, 0.64)
  .squad(2.27).add('normal', 8, 0.64)
  .build();

new WaveBuilder(19)
  .squad().add('fast', 10, 0.41)
  .squad(2.26).add('tank', 1, 1.45).add('normal', 6, 0.63)
  .squad(2.26).add('fast', 10, 0.41)
  .squad(2.26).add('fast', 10, 0.41)
  .squad(2.26).add('fast', 10, 0.41)
  .squad(2.26).add('fast', 10, 0.41)
  .build();

new WaveBuilder(20)
  .squad().add('normal', 8, 0.63)
  .squad(2.25).add('gnome', 2, 0.9).add('hero', 1, 1.8)
  .squad(2.25).add('fast', 7, 0.41)
  .squad(2.25).add('normal', 8, 0.63)
  .build();

new WaveBuilder(21)
  .squad().add('gnome', 3, 0.9).add('normal', 5, 0.63)
  .squad(2.24).add('gnome', 3, 0.9).add('normal', 5, 0.63)
  .squad(2.24).add('tank', 1, 1.43).add('normal', 7, 0.63)
  .squad(2.24).add('tank', 1, 1.43).add('normal', 7, 0.63)
  .squad(2.24).add('tank', 1, 1.43).add('normal', 7, 0.63)
  .squad(2.24).add('fast', 10, 0.4)
  .build();

new WaveBuilder(22)   // новий: Жрець
  .squad().add('tank', 1, 1.42).add('normal', 5, 0.62).add('priest', 2, 0.89)
  .squad(2.23).add('tank', 1, 1.42).add('normal', 7, 0.62)
  .squad(2.23).add('normal', 9, 0.62)
  .squad(2.23).add('normal', 9, 0.62)
  .squad(2.23).add('tank', 1, 1.42).add('normal', 5, 0.62).add('priest', 2, 0.89)
  .squad(2.23).add('tank', 1, 1.42).add('normal', 7, 0.62)
  .squad(2.23).add('normal', 9, 0.62)
  .build();

new WaveBuilder(23)
  .squad().add('fast', 10, 0.4)
  .squad(2.21).add('gnome', 3, 0.89).add('normal', 5, 0.62)
  .squad(2.21).add('normal', 9, 0.62)
  .squad(2.21).add('gnome', 3, 0.89).add('normal', 5, 0.62)
  .squad(2.21).add('normal', 9, 0.62)
  .squad(2.21).add('fast', 10, 0.4)
  .squad(2.21).add('gnome', 3, 0.89).add('normal', 5, 0.62)
  .build();

new WaveBuilder(24)
  .squad().add('tank', 1, 1.41).add('normal', 7, 0.62)
  .squad(2.2).add('tank', 1, 1.41).add('normal', 5, 0.62).add('priest', 2, 0.88)
  .squad(2.2).add('tank', 1, 1.41).add('normal', 7, 0.62)
  .squad(2.2).add('tank', 1, 1.41).add('normal', 5, 0.62).add('priest', 2, 0.88)
  .squad(2.2).add('normal', 9, 0.62)
  .squad(2.2).add('gnome', 4, 0.88).add('normal', 5, 0.62)
  .squad(2.2).add('fast', 11, 0.4)
  .build();

new WaveBuilder(25)
  .squad().add('fast', 11, 0.39)
  .squad(2.19).add('fast', 11, 0.39)
  .squad(2.19).add('normal', 9, 0.61)
  .squad(2.19).add('normal', 9, 0.61)
  .squad(2.19).add('tank', 1, 1.4).add('normal', 7, 0.61)
  .build();

new WaveBuilder(26)
  .squad().add('tank', 1, 1.39).add('normal', 5, 0.61).add('priest', 2, 0.87)
  .squad(2.17).add('tank', 1, 1.39).add('normal', 7, 0.61)
  .squad(2.17).add('gnome', 4, 0.87).add('normal', 5, 0.61)
  .squad(2.17).add('tank', 1, 1.39).add('normal', 5, 0.61).add('priest', 2, 0.87)
  .squad(2.17).add('tank', 1, 1.39).add('normal', 5, 0.61).add('priest', 2, 0.87)
  .squad(2.17).add('fast', 11, 0.39)
  .squad(2.17).add('normal', 9, 0.61)
  .squad(2.17).add('normal', 9, 0.61)
  .build();

new WaveBuilder(27)
  .squad().add('fast', 11, 0.39)
  .squad(2.16).add('tank', 1, 1.38).add('normal', 6, 0.61).add('priest', 2, 0.86)
  .squad(2.16).add('normal', 9, 0.61)
  .squad(2.16).add('tank', 1, 1.38).add('normal', 6, 0.61).add('priest', 2, 0.86)
  .squad(2.16).add('fast', 11, 0.39)
  .squad(2.16).add('fast', 11, 0.39)
  .squad(2.16).add('tank', 1, 1.38).add('normal', 6, 0.61).add('priest', 2, 0.86)
  .squad(2.16).add('tank', 1, 1.38).add('normal', 6, 0.61).add('priest', 2, 0.86)
  .build();

new WaveBuilder(28)
  .squad().add('normal', 9, 0.6)
  .squad(2.15).add('normal', 9, 0.6)
  .squad(2.15).add('gnome', 4, 0.86).add('normal', 6, 0.6)
  .squad(2.15).add('tank', 1, 1.38).add('normal', 8, 0.6)
  .squad(2.15).add('gnome', 4, 0.86).add('normal', 6, 0.6)
  .squad(2.15).add('normal', 9, 0.6)
  .squad(2.15).add('normal', 9, 0.6)
  .squad(2.15).add('normal', 9, 0.6)
  .squad(2.15).add('normal', 9, 0.6)
  .build();

new WaveBuilder(29)
  .squad().add('tank', 1, 1.37).add('normal', 6, 0.6).add('priest', 2, 0.85)
  .squad(2.14).add('normal', 10, 0.6)
  .squad(2.14).add('normal', 10, 0.6)
  .squad(2.14).add('normal', 10, 0.6)
  .squad(2.14).add('tank', 1, 1.37).add('normal', 8, 0.6)
  .squad(2.14).add('tank', 1, 1.37).add('normal', 8, 0.6)
  .squad(2.14).add('tank', 1, 1.37).add('normal', 8, 0.6)
  .squad(2.14).add('fast', 12, 0.38)
  .squad(2.14).add('normal', 10, 0.6)
  .build();

new WaveBuilder(30)
  .squad().add('normal', 10, 0.59)
  .squad(2.13).add('gnome', 2, 0.85).add('hero', 1, 1.7).add('priest', 1, 0.85)
  .squad(2.13).add('fast', 8, 0.38)
  .squad(2.13).add('normal', 10, 0.59)
  .build();

new WaveBuilder(31)
  .squad().add('normal', 10, 0.59)
  .squad(2.11).add('tank', 1, 1.35).add('normal', 8, 0.59)
  .squad(2.11).add('normal', 10, 0.59)
  .squad(2.11).add('gnome', 4, 0.84).add('normal', 6, 0.59)
  .squad(2.11).add('fast', 12, 0.38)
  .squad(2.11).add('fast', 12, 0.38)
  .squad(2.11).add('tank', 1, 1.35).add('normal', 8, 0.59)
  .squad(2.11).add('tank', 1, 1.35).add('normal', 8, 0.59)
  .squad(2.11).add('gnome', 4, 0.84).add('normal', 6, 0.59)
  .build();

new WaveBuilder(32)
  .squad().add('tank', 1, 1.34).add('normal', 6, 0.59).add('priest', 2, 0.84)
  .squad(2.1).add('tank', 1, 1.34).add('normal', 8, 0.59)
  .squad(2.1).add('gnome', 4, 0.84).add('normal', 6, 0.59)
  .squad(2.1).add('fast', 12, 0.38)
  .squad(2.1).add('normal', 10, 0.59)
  .squad(2.1).add('tank', 1, 1.34).add('normal', 8, 0.59)
  .squad(2.1).add('fast', 12, 0.38)
  .squad(2.1).add('tank', 1, 1.34).add('normal', 6, 0.59).add('priest', 2, 0.84)
  .squad(2.1).add('tank', 1, 1.34).add('normal', 6, 0.59).add('priest', 2, 0.84)
  .build();

new WaveBuilder(33)   // новий: Бойовий маг
  .squad().add('gnome', 2, 0.83).add('normal', 6, 0.58).add('mage', 2, 0.83)
  .squad(2.09).add('fast', 12, 0.38)
  .squad(2.09).add('normal', 10, 0.58)
  .squad(2.09).add('tank', 1, 1.34).add('normal', 6, 0.58).add('priest', 2, 0.83)
  .squad(2.09).add('tank', 1, 1.34).add('normal', 6, 0.58).add('priest', 2, 0.83)
  .squad(2.09).add('tank', 1, 1.34).add('normal', 8, 0.58)
  .squad(2.09).add('tank', 1, 1.34).add('normal', 8, 0.58)
  .squad(2.09).add('tank', 1, 1.34).add('normal', 6, 0.58).add('priest', 2, 0.83)
  .squad(2.09).add('gnome', 2, 0.83).add('normal', 6, 0.58).add('mage', 2, 0.83)
  .build();

new WaveBuilder(34)
  .squad().add('gnome', 4, 0.83).add('normal', 6, 0.58)
  .squad(2.07).add('tank', 1, 1.33).add('normal', 8, 0.58)
  .squad(2.07).add('gnome', 2, 0.83).add('normal', 6, 0.58).add('mage', 2, 0.83)
  .squad(2.07).add('fast', 13, 0.37)
  .squad(2.07).add('tank', 1, 1.33).add('normal', 6, 0.58).add('priest', 2, 0.83)
  .squad(2.07).add('gnome', 4, 0.83).add('normal', 6, 0.58)
  .squad(2.07).add('tank', 1, 1.33).add('normal', 6, 0.58).add('priest', 2, 0.83)
  .squad(2.07).add('gnome', 4, 0.83).add('normal', 6, 0.58)
  .squad(2.07).add('tank', 1, 1.33).add('normal', 8, 0.58)
  .build();

new WaveBuilder(35)
  .squad().add('normal', 11, 0.58)
  .squad(2.06).add('tank', 1, 1.32).add('normal', 6, 0.58).add('priest', 2, 0.82)
  .squad(2.06).add('fast', 13, 0.37)
  .squad(2.06).add('gnome', 4, 0.82).add('normal', 6, 0.58)
  .squad(2.06).add('gnome', 4, 0.82).add('normal', 6, 0.58)
  .squad(2.06).add('tank', 1, 1.32).add('normal', 8, 0.58)
  .build();

new WaveBuilder(36)
  .squad().add('gnome', 4, 0.82).add('normal', 6, 0.57)
  .squad(2.05).add('normal', 11, 0.57)
  .squad(2.05).add('normal', 11, 0.57)
  .squad(2.05).add('gnome', 2, 0.82).add('normal', 6, 0.57).add('mage', 2, 0.82)
  .squad(2.05).add('tank', 1, 1.31).add('normal', 9, 0.57)
  .squad(2.05).add('tank', 1, 1.31).add('normal', 9, 0.57)
  .squad(2.05).add('fast', 13, 0.37)
  .squad(2.05).add('gnome', 2, 0.82).add('normal', 6, 0.57).add('mage', 2, 0.82)
  .squad(2.05).add('fast', 13, 0.37)
  .build();

new WaveBuilder(37)
  .squad().add('normal', 11, 0.57)
  .squad(2.04).add('tank', 1, 1.3).add('normal', 9, 0.57)
  .squad(2.04).add('fast', 13, 0.37)
  .squad(2.04).add('tank', 1, 1.3).add('normal', 7, 0.57).add('priest', 2, 0.81)
  .squad(2.04).add('gnome', 4, 0.81).add('normal', 7, 0.57)
  .squad(2.04).add('tank', 1, 1.3).add('normal', 7, 0.57).add('priest', 2, 0.81)
  .squad(2.04).add('normal', 11, 0.57)
  .squad(2.04).add('normal', 11, 0.57)
  .squad(2.04).add('gnome', 2, 0.81).add('normal', 7, 0.57).add('mage', 2, 0.81)
  .squad(2.04).add('fast', 13, 0.37)
  .build();

new WaveBuilder(38)
  .squad().add('tank', 1, 1.3).add('normal', 7, 0.57).add('priest', 2, 0.81)
  .squad(2.03).add('gnome', 2, 0.81).add('normal', 7, 0.57).add('mage', 2, 0.81)
  .squad(2.03).add('gnome', 4, 0.81).add('normal', 7, 0.57)
  .squad(2.03).add('tank', 1, 1.3).add('normal', 7, 0.57).add('priest', 2, 0.81)
  .squad(2.03).add('gnome', 2, 0.81).add('normal', 7, 0.57).add('mage', 2, 0.81)
  .squad(2.03).add('tank', 1, 1.3).add('normal', 9, 0.57)
  .squad(2.03).add('tank', 1, 1.3).add('normal', 9, 0.57)
  .squad(2.03).add('tank', 1, 1.3).add('normal', 7, 0.57).add('priest', 2, 0.81)
  .squad(2.03).add('tank', 1, 1.3).add('normal', 7, 0.57).add('priest', 2, 0.81)
  .squad(2.03).add('tank', 1, 1.3).add('normal', 7, 0.57).add('priest', 2, 0.81)
  .build();

new WaveBuilder(39)
  .squad().add('fast', 13, 0.36)
  .squad(2.01).add('gnome', 4, 0.8).add('normal', 7, 0.56)
  .squad(2.01).add('tank', 1, 1.29).add('normal', 9, 0.56)
  .squad(2.01).add('gnome', 4, 0.8).add('normal', 7, 0.56)
  .squad(2.01).add('gnome', 2, 0.8).add('normal', 7, 0.56).add('mage', 2, 0.8)
  .squad(2.01).add('gnome', 2, 0.8).add('normal', 7, 0.56).add('mage', 2, 0.8)
  .squad(2.01).add('normal', 11, 0.56)
  .squad(2.01).add('tank', 1, 1.29).add('normal', 7, 0.56).add('priest', 2, 0.8)
  .squad(2.01).add('normal', 11, 0.56)
  .build();

new WaveBuilder(40)
  .squad().add('normal', 11, 0.56)
  .squad(2).add('gnome', 2, 0.8).add('hero', 1, 1.6).add('priest', 1, 0.8)
  .squad(2).add('fast', 9, 0.36)
  .squad(2).add('normal', 11, 0.56)
  .build();

new WaveBuilder(41)
  .squad().add('normal', 11, 0.56)
  .squad(1.99).add('tank', 1, 1.27).add('normal', 9, 0.56)
  .squad(1.99).add('gnome', 2, 0.79).add('normal', 7, 0.56).add('mage', 2, 0.79)
  .squad(1.99).add('gnome', 2, 0.79).add('normal', 7, 0.56).add('mage', 2, 0.79)
  .squad(1.99).add('tank', 1, 1.27).add('normal', 7, 0.56).add('priest', 2, 0.79)
  .squad(1.99).add('fast', 14, 0.36)
  .squad(1.99).add('tank', 1, 1.27).add('normal', 7, 0.56).add('priest', 2, 0.79)
  .squad(1.99).add('tank', 1, 1.27).add('normal', 7, 0.56).add('priest', 2, 0.79)
  .squad(1.99).add('gnome', 2, 0.79).add('normal', 7, 0.56).add('mage', 2, 0.79)
  .squad(1.99).add('fast', 14, 0.36)
  .build();

new WaveBuilder(42)
  .squad().add('fast', 14, 0.36)
  .squad(1.98).add('normal', 11, 0.55)
  .squad(1.98).add('normal', 11, 0.55)
  .squad(1.98).add('gnome', 2, 0.79).add('normal', 7, 0.55).add('mage', 2, 0.79)
  .squad(1.98).add('gnome', 5, 0.79).add('normal', 7, 0.55)
  .squad(1.98).add('tank', 1, 1.26).add('normal', 7, 0.55).add('priest', 2, 0.79)
  .squad(1.98).add('normal', 11, 0.55)
  .squad(1.98).add('gnome', 2, 0.79).add('normal', 7, 0.55).add('mage', 2, 0.79)
  .squad(1.98).add('normal', 11, 0.55)
  .squad(1.98).add('tank', 1, 1.26).add('normal', 7, 0.55).add('priest', 2, 0.79)
  .build();

new WaveBuilder(43)
  .squad().add('tank', 1, 1.26).add('normal', 9, 0.55)
  .squad(1.96).add('fast', 14, 0.35)
  .squad(1.96).add('gnome', 5, 0.79).add('normal', 7, 0.55)
  .squad(1.96).add('fast', 14, 0.35)
  .squad(1.96).add('tank', 1, 1.26).add('normal', 9, 0.55)
  .squad(1.96).add('tank', 1, 1.26).add('normal', 7, 0.55).add('priest', 2, 0.79)
  .squad(1.96).add('tank', 1, 1.26).add('normal', 9, 0.55)
  .squad(1.96).add('tank', 1, 1.26).add('normal', 9, 0.55)
  .squad(1.96).add('gnome', 2, 0.79).add('normal', 7, 0.55).add('mage', 2, 0.79)
  .squad(1.96).add('tank', 1, 1.26).add('normal', 9, 0.55)
  .build();

new WaveBuilder(44)   // новий: Ельф-розвідник
  .squad().add('scout', 7, 0.47)
  .squad(1.95).add('scout', 9, 0.47)
  .squad(1.95).add('gnome', 5, 0.78).add('normal', 7, 0.55)
  .squad(1.95).add('gnome', 5, 0.78).add('normal', 7, 0.55)
  .squad(1.95).add('normal', 11, 0.55)
  .squad(1.95).add('tank', 1, 1.25).add('normal', 7, 0.55).add('priest', 2, 0.78)
  .squad(1.95).add('normal', 11, 0.55)
  .squad(1.95).add('tank', 1, 1.25).add('normal', 7, 0.55).add('priest', 2, 0.78)
  .squad(1.95).add('tank', 1, 1.25).add('normal', 9, 0.55)
  .squad(1.95).add('tank', 1, 1.25).add('normal', 7, 0.55).add('priest', 2, 0.78)
  .build();

new WaveBuilder(45)
  .squad().add('normal', 12, 0.54)
  .squad(1.94).add('tank', 1, 1.24).add('normal', 7, 0.54).add('priest', 2, 0.78)
  .squad(1.94).add('tank', 1, 1.24).add('normal', 9, 0.54)
  .squad(1.94).add('normal', 12, 0.54)
  .squad(1.94).add('tank', 1, 1.24).add('normal', 9, 0.54)
  .squad(1.94).add('fast', 14, 0.35)
  .build();

new WaveBuilder(46)
  .squad().add('normal', 12, 0.54)
  .squad(1.93).add('tank', 1, 1.23).add('normal', 9, 0.54)
  .squad(1.93).add('gnome', 2, 0.77).add('normal', 7, 0.54).add('mage', 2, 0.77)
  .squad(1.93).add('tank', 1, 1.23).add('normal', 9, 0.54)
  .squad(1.93).add('gnome', 5, 0.77).add('normal', 7, 0.54)
  .squad(1.93).add('fast', 14, 0.35)
  .squad(1.93).add('normal', 12, 0.54)
  .squad(1.93).add('scout', 9, 0.46)
  .squad(1.93).add('normal', 12, 0.54)
  .squad(1.93).add('gnome', 5, 0.77).add('normal', 7, 0.54)
  .build();

new WaveBuilder(47)
  .squad().add('tank', 1, 1.22).add('normal', 7, 0.54).add('priest', 2, 0.77)
  .squad(1.91).add('tank', 1, 1.22).add('normal', 7, 0.54).add('priest', 2, 0.77)
  .squad(1.91).add('fast', 14, 0.34)
  .squad(1.91).add('tank', 1, 1.22).add('normal', 9, 0.54)
  .squad(1.91).add('scout', 9, 0.46)
  .squad(1.91).add('gnome', 5, 0.77).add('normal', 7, 0.54)
  .squad(1.91).add('tank', 1, 1.22).add('normal', 9, 0.54)
  .squad(1.91).add('fast', 14, 0.34)
  .squad(1.91).add('gnome', 2, 0.77).add('normal', 7, 0.54).add('mage', 2, 0.77)
  .build();

new WaveBuilder(48)
  .squad().add('tank', 1, 1.22).add('normal', 9, 0.53)
  .squad(1.9).add('gnome', 2, 0.76).add('normal', 7, 0.53).add('mage', 2, 0.76)
  .squad(1.9).add('gnome', 5, 0.76).add('normal', 7, 0.53)
  .squad(1.9).add('fast', 14, 0.34)
  .squad(1.9).add('tank', 1, 1.22).add('normal', 7, 0.53).add('priest', 2, 0.76)
  .squad(1.9).add('fast', 14, 0.34)
  .squad(1.9).add('tank', 1, 1.22).add('normal', 7, 0.53).add('priest', 2, 0.76)
  .squad(1.9).add('normal', 12, 0.53)
  .squad(1.9).add('gnome', 5, 0.76).add('normal', 7, 0.53)
  .build();

new WaveBuilder(49)
  .squad().add('fast', 14, 0.34)
  .squad(1.89).add('tank', 1, 1.21).add('normal', 7, 0.53).add('priest', 2, 0.76)
  .squad(1.89).add('normal', 12, 0.53)
  .squad(1.89).add('gnome', 5, 0.76).add('normal', 7, 0.53)
  .squad(1.89).add('fast', 14, 0.34)
  .squad(1.89).add('fast', 14, 0.34)
  .squad(1.89).add('gnome', 5, 0.76).add('normal', 7, 0.53)
  .squad(1.89).add('tank', 1, 1.21).add('normal', 9, 0.53)
  .squad(1.89).add('tank', 1, 1.21).add('normal', 9, 0.53)
  .squad(1.89).add('fast', 14, 0.34)
  .build();

new WaveBuilder(50)
  .squad().add('normal', 12, 0.52)
  .squad(1.88).add('gnome', 3, 0.75).add('hero', 1, 1.5).add('priest', 1, 0.75)
  .squad(1.88).add('scout', 7, 0.45)
  .squad(1.88).add('normal', 12, 0.52)
  .build();

new WaveBuilder(51)
  .squad().add('gnome', 2, 0.74).add('normal', 7, 0.52).add('mage', 2, 0.74)
  .squad(1.86).add('tank', 1, 1.19).add('normal', 9, 0.52)
  .squad(1.86).add('tank', 1, 1.19).add('normal', 9, 0.52)
  .squad(1.86).add('scout', 9, 0.45)
  .squad(1.86).add('gnome', 2, 0.74).add('normal', 7, 0.52).add('mage', 2, 0.74)
  .squad(1.86).add('fast', 14, 0.34)
  .squad(1.86).add('tank', 1, 1.19).add('normal', 9, 0.52)
  .squad(1.86).add('tank', 1, 1.19).add('normal', 7, 0.52).add('priest', 2, 0.74)
  .squad(1.86).add('scout', 9, 0.45)
  .squad(1.86).add('gnome', 5, 0.74).add('normal', 7, 0.52)
  .build();

new WaveBuilder(52)
  .squad().add('normal', 12, 0.52)
  .squad(1.85).add('normal', 12, 0.52)
  .squad(1.85).add('fast', 14, 0.33)
  .squad(1.85).add('tank', 1, 1.18).add('normal', 7, 0.52).add('priest', 2, 0.74)
  .squad(1.85).add('gnome', 2, 0.74).add('normal', 7, 0.52).add('mage', 2, 0.74)
  .squad(1.85).add('tank', 1, 1.18).add('normal', 10, 0.52)
  .squad(1.85).add('scout', 10, 0.44)
  .squad(1.85).add('gnome', 2, 0.74).add('normal', 7, 0.52).add('mage', 2, 0.74)
  .squad(1.85).add('normal', 12, 0.52)
  .squad(1.85).add('fast', 14, 0.33)
  .build();

new WaveBuilder(53)
  .squad().add('tank', 1, 1.18).add('normal', 7, 0.51).add('priest', 2, 0.73)
  .squad(1.84).add('scout', 10, 0.44)
  .squad(1.84).add('gnome', 5, 0.73).add('normal', 7, 0.51)
  .squad(1.84).add('tank', 1, 1.18).add('normal', 10, 0.51)
  .squad(1.84).add('scout', 10, 0.44)
  .squad(1.84).add('tank', 1, 1.18).add('normal', 10, 0.51)
  .squad(1.84).add('gnome', 5, 0.73).add('normal', 7, 0.51)
  .squad(1.84).add('gnome', 2, 0.73).add('normal', 7, 0.51).add('mage', 2, 0.73)
  .squad(1.84).add('tank', 1, 1.18).add('normal', 7, 0.51).add('priest', 2, 0.73)
  .build();

new WaveBuilder(54)
  .squad().add('gnome', 5, 0.73).add('normal', 7, 0.51)
  .squad(1.82).add('tank', 1, 1.17).add('normal', 7, 0.51).add('priest', 2, 0.73)
  .squad(1.82).add('tank', 1, 1.17).add('normal', 10, 0.51)
  .squad(1.82).add('fast', 14, 0.33)
  .squad(1.82).add('tank', 1, 1.17).add('normal', 10, 0.51)
  .squad(1.82).add('fast', 14, 0.33)
  .squad(1.82).add('normal', 12, 0.51)
  .squad(1.82).add('gnome', 5, 0.73).add('normal', 7, 0.51)
  .squad(1.82).add('scout', 10, 0.44)
  .build();

new WaveBuilder(55)   // новий: Вершник
  .squad().add('knight', 2, 0.87).add('normal', 7, 0.51)
  .squad(1.81).add('tank', 1, 1.16).add('normal', 7, 0.51).add('priest', 2, 0.72)
  .squad(1.81).add('gnome', 2, 0.72).add('normal', 7, 0.51).add('mage', 2, 0.72)
  .squad(1.81).add('knight', 2, 0.87).add('normal', 7, 0.51)
  .build();

new WaveBuilder(56)
  .squad().add('fast', 15, 0.32)
  .squad(1.8).add('knight', 2, 0.86).add('gnome', 2, 0.72).add('normal', 7, 0.5).add('mage', 2, 0.72).add('priest', 2, 0.72)
  .squad(1.8).add('fast', 15, 0.32)
  .squad(1.8).add('fast', 15, 0.32)
  .squad(1.8).add('scout', 10, 0.43)
  .squad(1.8).add('gnome', 5, 0.72).add('normal', 7, 0.5)
  .squad(1.8).add('gnome', 5, 0.72).add('normal', 7, 0.5)
  .build();

new WaveBuilder(57)
  .squad().add('knight', 2, 0.86).add('normal', 7, 0.5)
  .squad(1.79).add('fast', 15, 0.32)
  .squad(1.79).add('fast', 15, 0.32)
  .squad(1.79).add('gnome', 5, 0.71).add('normal', 7, 0.5)
  .squad(1.79).add('knight', 2, 0.86).add('gnome', 2, 0.71).add('normal', 7, 0.5).add('mage', 2, 0.71).add('priest', 2, 0.71)
  .squad(1.79).add('gnome', 2, 0.71).add('normal', 7, 0.5).add('mage', 2, 0.71)
  .squad(1.79).add('scout', 10, 0.43)
  .build();

new WaveBuilder(58)
  .squad().add('tank', 1, 1.14).add('normal', 10, 0.5)
  .squad(1.77).add('knight', 2, 0.85).add('gnome', 2, 0.71).add('normal', 7, 0.5).add('mage', 2, 0.71).add('priest', 2, 0.71)
  .squad(1.77).add('tank', 1, 1.14).add('normal', 10, 0.5)
  .squad(1.77).add('tank', 1, 1.14).add('normal', 10, 0.5)
  .squad(1.77).add('tank', 1, 1.14).add('normal', 10, 0.5)
  .squad(1.77).add('knight', 2, 0.85).add('normal', 7, 0.5)
  .squad(1.77).add('tank', 1, 1.14).add('normal', 7, 0.5).add('priest', 2, 0.71)
  .build();

new WaveBuilder(59)
  .squad().add('normal', 12, 0.49)
  .squad(1.76).add('knight', 2, 0.85).add('gnome', 2, 0.71).add('normal', 7, 0.49).add('mage', 2, 0.71).add('priest', 2, 0.71)
  .squad(1.76).add('tank', 1, 1.13).add('normal', 10, 0.49)
  .squad(1.76).add('knight', 2, 0.85).add('gnome', 2, 0.71).add('normal', 7, 0.49).add('mage', 2, 0.71).add('priest', 2, 0.71)
  .squad(1.76).add('gnome', 5, 0.71).add('normal', 7, 0.49)
  .squad(1.76).add('normal', 12, 0.49)
  .squad(1.76).add('gnome', 5, 0.71).add('normal', 7, 0.49)
  .build();

new WaveBuilder(60)
  .squad().add('normal', 12, 0.49)
  .squad(1.75).add('knight', 3, 0.84).add('hero', 2, 1.4).add('priest', 1, 0.7)
  .squad(1.75).add('scout', 7, 0.42)
  .squad(1.75).add('normal', 12, 0.49)
  .build();

new WaveBuilder(61)
  .squad().add('tank', 1, 1.11).add('normal', 10, 0.49)
  .squad(1.74).add('gnome', 2, 0.7).add('normal', 7, 0.49).add('mage', 2, 0.7)
  .squad(1.74).add('gnome', 2, 0.7).add('normal', 7, 0.49).add('mage', 2, 0.7)
  .squad(1.74).add('scout', 10, 0.42)
  .squad(1.74).add('gnome', 5, 0.7).add('normal', 7, 0.49)
  .squad(1.74).add('fast', 15, 0.31)
  .squad(1.74).add('fast', 15, 0.31)
  .squad(1.74).add('scout', 10, 0.42)
  .squad(1.74).add('tank', 1, 1.11).add('normal', 10, 0.49)
  .build();

new WaveBuilder(62)
  .squad().add('knight', 3, 0.83).add('gnome', 3, 0.69).add('normal', 8, 0.48).add('mage', 3, 0.69).add('priest', 3, 0.69)
  .squad(1.72).add('normal', 13, 0.48)
  .squad(1.72).add('knight', 3, 0.83).add('gnome', 3, 0.69).add('normal', 8, 0.48).add('mage', 3, 0.69).add('priest', 3, 0.69)
  .squad(1.72).add('scout', 10, 0.41)
  .build();

new WaveBuilder(63)
  .squad().add('fast', 15, 0.31)
  .squad(1.71).add('fast', 15, 0.31)
  .squad(1.71).add('tank', 1, 1.1).add('normal', 10, 0.48)
  .squad(1.71).add('gnome', 3, 0.69).add('normal', 8, 0.48).add('mage', 3, 0.69)
  .squad(1.71).add('tank', 1, 1.1).add('normal', 10, 0.48)
  .squad(1.71).add('tank', 1, 1.1).add('normal', 10, 0.48)
  .squad(1.71).add('gnome', 5, 0.69).add('normal', 8, 0.48)
  .squad(1.71).add('gnome', 3, 0.69).add('normal', 8, 0.48).add('mage', 3, 0.69)
  .squad(1.71).add('fast', 15, 0.31)
  .build();

new WaveBuilder(64)
  .squad().add('knight', 3, 0.82).add('normal', 8, 0.48)
  .squad(1.7).add('fast', 15, 0.31)
  .squad(1.7).add('tank', 1, 1.09).add('normal', 10, 0.48)
  .squad(1.7).add('knight', 3, 0.82).add('gnome', 3, 0.68).add('normal', 8, 0.48).add('mage', 3, 0.68).add('priest', 3, 0.68)
  .squad(1.7).add('gnome', 5, 0.68).add('normal', 8, 0.48)
  .build();

new WaveBuilder(65)
  .squad().add('normal', 13, 0.47)
  .squad(1.69).add('scout', 10, 0.41)
  .squad(1.69).add('gnome', 5, 0.68).add('normal', 8, 0.47)
  .squad(1.69).add('normal', 13, 0.47)
  .squad(1.69).add('knight', 3, 0.81).add('gnome', 3, 0.68).add('normal', 8, 0.47).add('mage', 3, 0.68).add('priest', 3, 0.68)
  .build();

new WaveBuilder(66)   // новий: Шут
  .squad().add('jester', 3, 0.6)
  .squad(1.67).add('knight', 3, 0.8).add('gnome', 3, 0.67).add('normal', 8, 0.47).add('mage', 3, 0.67).add('priest', 3, 0.67)
  .squad(1.67).add('knight', 3, 0.8).add('gnome', 3, 0.67).add('normal', 8, 0.47).add('mage', 3, 0.67).add('priest', 3, 0.67)
  .squad(1.67).add('tank', 1, 1.07).add('normal', 10, 0.47)
  .build();

new WaveBuilder(67)
  .squad().add('gnome', 3, 0.67).add('normal', 8, 0.47).add('mage', 3, 0.67)
  .squad(1.66).add('tank', 1, 1.06).add('normal', 8, 0.47).add('priest', 3, 0.67)
  .squad(1.66).add('jester', 5, 0.6)
  .squad(1.66).add('knight', 3, 0.8).add('normal', 8, 0.47)
  .squad(1.66).add('jester', 5, 0.6)
  .squad(1.66).add('tank', 1, 1.06).add('normal', 8, 0.47).add('priest', 3, 0.67)
  .build();

new WaveBuilder(68)
  .squad().add('jester', 5, 0.59)
  .squad(1.65).add('tank', 1, 1.06).add('normal', 8, 0.46).add('priest', 3, 0.66)
  .squad(1.65).add('fast', 15, 0.3)
  .squad(1.65).add('fast', 15, 0.3)
  .squad(1.65).add('tank', 1, 1.06).add('normal', 10, 0.46)
  .squad(1.65).add('gnome', 5, 0.66).add('normal', 8, 0.46)
  .squad(1.65).add('gnome', 3, 0.66).add('normal', 8, 0.46).add('mage', 3, 0.66)
  .squad(1.65).add('tank', 1, 1.06).add('normal', 8, 0.46).add('priest', 3, 0.66)
  .squad(1.65).add('knight', 3, 0.79).add('normal', 8, 0.46)
  .build();

new WaveBuilder(69)
  .squad().add('knight', 3, 0.79).add('gnome', 3, 0.66).add('normal', 8, 0.46).add('mage', 3, 0.66).add('priest', 3, 0.66)
  .squad(1.64).add('tank', 1, 1.05).add('normal', 10, 0.46)
  .squad(1.64).add('jester', 5, 0.59)
  .squad(1.64).add('gnome', 3, 0.66).add('normal', 8, 0.46).add('mage', 3, 0.66)
  .squad(1.64).add('gnome', 5, 0.66).add('normal', 8, 0.46)
  .squad(1.64).add('gnome', 5, 0.66).add('normal', 8, 0.46)
  .build();

new WaveBuilder(70)
  .squad().add('normal', 13, 0.45)
  .squad(1.62).add('knight', 3, 0.78).add('hero', 2, 1.3).add('priest', 2, 0.65)
  .squad(1.62).add('scout', 8, 0.39)
  .squad(1.62).add('normal', 13, 0.45)
  .build();

new WaveBuilder(71)
  .squad().add('normal', 13, 0.45)
  .squad(1.61).add('gnome', 5, 0.65).add('normal', 8, 0.45)
  .squad(1.61).add('knight', 3, 0.77).add('normal', 8, 0.45)
  .squad(1.61).add('scout', 10, 0.39)
  .squad(1.61).add('gnome', 3, 0.65).add('normal', 8, 0.45).add('mage', 3, 0.65)
  .squad(1.61).add('jester', 5, 0.58)
  .squad(1.61).add('scout', 10, 0.39)
  .build();

new WaveBuilder(72)
  .squad().add('knight', 3, 0.77).add('normal', 8, 0.45)
  .squad(1.6).add('jester', 5, 0.58)
  .squad(1.6).add('gnome', 5, 0.64).add('normal', 8, 0.45)
  .squad(1.6).add('gnome', 5, 0.64).add('normal', 8, 0.45)
  .squad(1.6).add('tank', 1, 1.02).add('normal', 8, 0.45).add('priest', 3, 0.64)
  .squad(1.6).add('knight', 3, 0.77).add('gnome', 3, 0.64).add('normal', 8, 0.45).add('mage', 3, 0.64).add('priest', 3, 0.64)
  .build();

new WaveBuilder(73)
  .squad().add('scout', 11, 0.38)
  .squad(1.59).add('normal', 13, 0.44)
  .squad(1.59).add('jester', 5, 0.57)
  .squad(1.59).add('tank', 1, 1.02).add('normal', 8, 0.44).add('priest', 3, 0.64)
  .squad(1.59).add('scout', 11, 0.38)
  .squad(1.59).add('gnome', 5, 0.64).add('normal', 8, 0.44)
  .squad(1.59).add('tank', 1, 1.02).add('normal', 8, 0.44).add('priest', 3, 0.64)
  .squad(1.59).add('fast', 16, 0.29)
  .squad(1.59).add('knight', 3, 0.76).add('normal', 8, 0.44)
  .build();

new WaveBuilder(74)
  .squad().add('tank', 1, 1.01).add('normal', 8, 0.44).add('priest', 3, 0.63)
  .squad(1.57).add('gnome', 5, 0.63).add('normal', 8, 0.44)
  .squad(1.57).add('gnome', 5, 0.63).add('normal', 8, 0.44)
  .squad(1.57).add('gnome', 5, 0.63).add('normal', 8, 0.44)
  .squad(1.57).add('normal', 13, 0.44)
  .squad(1.57).add('normal', 13, 0.44)
  .squad(1.57).add('jester', 5, 0.57)
  .squad(1.57).add('tank', 1, 1.01).add('normal', 8, 0.44).add('priest', 3, 0.63)
  .squad(1.57).add('tank', 1, 1.01).add('normal', 8, 0.44).add('priest', 3, 0.63)
  .build();

new WaveBuilder(75)
  .squad().add('knight', 3, 0.75).add('normal', 8, 0.44)
  .squad(1.56).add('knight', 3, 0.75).add('gnome', 3, 0.63).add('normal', 8, 0.44).add('mage', 3, 0.63).add('priest', 3, 0.63)
  .build();

new WaveBuilder(76)
  .squad().add('jester', 5, 0.56)
  .squad(1.55).add('gnome', 5, 0.62).add('normal', 8, 0.43)
  .squad(1.55).add('normal', 13, 0.43)
  .squad(1.55).add('normal', 13, 0.43)
  .squad(1.55).add('scout', 11, 0.37)
  .squad(1.55).add('tank', 1, 0.99).add('normal', 11, 0.43)
  .squad(1.55).add('knight', 3, 0.74).add('normal', 8, 0.43)
  .squad(1.55).add('tank', 1, 0.99).add('normal', 11, 0.43)
  .build();

new WaveBuilder(77)   // новий: Майстер меча
  .squad().add('blade', 5, 0.49).add('normal', 5, 0.43)
  .squad(1.54).add('tank', 1, 0.98).add('normal', 8, 0.43).add('priest', 3, 0.61)
  .squad(1.54).add('knight', 3, 0.74).add('blade', 5, 0.49).add('priest', 3, 0.61)
  .squad(1.54).add('scout', 11, 0.37)
  .squad(1.54).add('scout', 11, 0.37)
  .squad(1.54).add('knight', 3, 0.74).add('blade', 5, 0.49).add('priest', 3, 0.61)
  .build();

new WaveBuilder(78)
  .squad().add('tank', 1, 0.98).add('normal', 11, 0.43)
  .squad(1.52).add('gnome', 3, 0.61).add('normal', 8, 0.43).add('mage', 3, 0.61)
  .squad(1.52).add('jester', 5, 0.55)
  .squad(1.52).add('scout', 11, 0.37)
  .squad(1.52).add('knight', 3, 0.73).add('gnome', 3, 0.61).add('normal', 8, 0.43).add('mage', 3, 0.61).add('priest', 3, 0.61)
  .squad(1.52).add('tank', 1, 0.98).add('normal', 11, 0.43)
  .build();

new WaveBuilder(79)
  .squad().add('blade', 5, 0.48).add('normal', 8, 0.42)
  .squad(1.51).add('tank', 1, 0.97).add('normal', 11, 0.42)
  .squad(1.51).add('scout', 11, 0.36)
  .squad(1.51).add('blade', 5, 0.48).add('normal', 8, 0.42)
  .squad(1.51).add('tank', 1, 0.97).add('normal', 11, 0.42)
  .squad(1.51).add('jester', 5, 0.54)
  .squad(1.51).add('jester', 5, 0.54)
  .squad(1.51).add('knight', 3, 0.73).add('blade', 5, 0.48).add('priest', 3, 0.6)
  .build();

new WaveBuilder(80)
  .squad().add('normal', 14, 0.42)
  .squad(1.5).add('knight', 3, 0.72).add('hero', 2, 1.2).add('priest', 2, 0.6)
  .squad(1.5).add('scout', 8, 0.36)
  .squad(1.5).add('normal', 14, 0.42)
  .build();

new WaveBuilder(81)
  .squad().add('jester', 5, 0.54)
  .squad(1.49).add('normal', 14, 0.42)
  .squad(1.49).add('knight', 3, 0.71).add('normal', 8, 0.42)
  .squad(1.49).add('normal', 14, 0.42)
  .squad(1.49).add('gnome', 3, 0.59).add('normal', 8, 0.42).add('mage', 3, 0.59)
  .squad(1.49).add('gnome', 5, 0.59).add('normal', 8, 0.42)
  .squad(1.49).add('jester', 5, 0.54)
  .build();

new WaveBuilder(82)
  .squad().add('knight', 3, 0.71).add('gnome', 3, 0.59).add('normal', 8, 0.41).add('mage', 3, 0.59).add('priest', 3, 0.59)
  .squad(1.47).add('normal', 14, 0.41)
  .squad(1.47).add('gnome', 5, 0.59).add('normal', 8, 0.41)
  .squad(1.47).add('jester', 5, 0.53)
  .squad(1.47).add('normal', 14, 0.41)
  .squad(1.47).add('tank', 1, 0.94).add('normal', 8, 0.41).add('priest', 3, 0.59)
  .squad(1.47).add('gnome', 5, 0.59).add('normal', 8, 0.41)
  .build();

new WaveBuilder(83)
  .squad().add('gnome', 6, 0.58).add('normal', 8, 0.41)
  .squad(1.46).add('knight', 3, 0.7).add('gnome', 3, 0.58).add('normal', 8, 0.41).add('mage', 3, 0.58).add('priest', 3, 0.58)
  .squad(1.46).add('jester', 6, 0.53)
  .squad(1.46).add('normal', 14, 0.41)
  .squad(1.46).add('knight', 3, 0.7).add('gnome', 3, 0.58).add('normal', 8, 0.41).add('mage', 3, 0.58).add('priest', 3, 0.58)
  .build();

new WaveBuilder(84)
  .squad().add('scout', 11, 0.35)
  .squad(1.45).add('blade', 6, 0.46).add('normal', 8, 0.41)
  .squad(1.45).add('fast', 17, 0.26)
  .squad(1.45).add('gnome', 6, 0.58).add('normal', 8, 0.41)
  .squad(1.45).add('jester', 6, 0.52)
  .squad(1.45).add('fast', 17, 0.26)
  .squad(1.45).add('tank', 1, 0.93).add('normal', 8, 0.41).add('priest', 3, 0.58)
  .squad(1.45).add('gnome', 3, 0.58).add('normal', 8, 0.41).add('mage', 3, 0.58)
  .build();

new WaveBuilder(85)
  .squad().add('knight', 3, 0.69).add('blade', 6, 0.46).add('priest', 3, 0.57)
  .squad(1.44).add('tank', 1, 0.92).add('normal', 8, 0.4).add('priest', 3, 0.57)
  .squad(1.44).add('blade', 6, 0.46).add('normal', 8, 0.4)
  .squad(1.44).add('gnome', 6, 0.57).add('normal', 8, 0.4)
  .build();

new WaveBuilder(86)
  .squad().add('tank', 1, 0.91).add('normal', 11, 0.4)
  .squad(1.43).add('gnome', 6, 0.57).add('normal', 8, 0.4)
  .squad(1.43).add('tank', 1, 0.91).add('normal', 11, 0.4)
  .squad(1.43).add('tank', 1, 0.91).add('normal', 8, 0.4).add('priest', 3, 0.57)
  .squad(1.43).add('knight', 3, 0.68).add('blade', 6, 0.46).add('priest', 3, 0.57)
  .squad(1.43).add('normal', 14, 0.4)
  .squad(1.43).add('blade', 6, 0.46).add('normal', 8, 0.4)
  .squad(1.43).add('tank', 1, 0.91).add('normal', 11, 0.4)
  .squad(1.43).add('scout', 11, 0.34)
  .build();

new WaveBuilder(87)
  .squad().add('jester', 6, 0.51)
  .squad(1.41).add('jester', 6, 0.51)
  .squad(1.41).add('scout', 11, 0.34)
  .squad(1.41).add('scout', 11, 0.34)
  .squad(1.41).add('tank', 1, 0.9).add('normal', 11, 0.4)
  .squad(1.41).add('knight', 3, 0.68).add('blade', 6, 0.45).add('priest', 3, 0.56)
  .build();

new WaveBuilder(88)
  .squad().add('knight', 3, 0.67).add('gnome', 3, 0.56).add('normal', 8, 0.39).add('mage', 3, 0.56).add('priest', 3, 0.56)
  .squad(1.4).add('gnome', 6, 0.56).add('normal', 8, 0.39)
  .squad(1.4).add('fast', 17, 0.25)
  .squad(1.4).add('knight', 3, 0.67).add('gnome', 3, 0.56).add('normal', 8, 0.39).add('mage', 3, 0.56).add('priest', 3, 0.56)
  .squad(1.4).add('knight', 3, 0.67).add('blade', 6, 0.45).add('priest', 3, 0.56)
  .build();

new WaveBuilder(89)
  .squad().add('knight', 3, 0.67).add('gnome', 3, 0.55).add('normal', 8, 0.39).add('mage', 3, 0.55).add('priest', 3, 0.55)
  .squad(1.39).add('fast', 17, 0.25)
  .squad(1.39).add('tank', 1, 0.89).add('normal', 11, 0.39)
  .squad(1.39).add('normal', 14, 0.39)
  .squad(1.39).add('gnome', 6, 0.55).add('normal', 8, 0.39)
  .squad(1.39).add('jester', 6, 0.5)
  .squad(1.39).add('jester', 6, 0.5)
  .build();

new WaveBuilder(90)
  .squad().add('normal', 14, 0.39)
  .squad(1.38).add('knight', 3, 0.66).add('hero', 2, 1.1).add('priest', 2, 0.55)
  .squad(1.38).add('scout', 9, 0.33)
  .squad(1.38).add('normal', 14, 0.39)
  .build();

new WaveBuilder(91)
  .squad().add('knight', 3, 0.65).add('gnome', 3, 0.54).add('normal', 9, 0.38).add('mage', 3, 0.54).add('priest', 3, 0.54)
  .squad(1.36).add('jester', 6, 0.49)
  .squad(1.36).add('gnome', 6, 0.54).add('normal', 9, 0.38)
  .squad(1.36).add('scout', 11, 0.33)
  .squad(1.36).add('scout', 11, 0.33)
  .squad(1.36).add('knight', 3, 0.65).add('normal', 9, 0.38)
  .build();

new WaveBuilder(92)
  .squad().add('gnome', 3, 0.54).add('normal', 9, 0.38).add('mage', 3, 0.54)
  .squad(1.35).add('normal', 14, 0.38)
  .squad(1.35).add('knight', 3, 0.65).add('gnome', 3, 0.54).add('normal', 9, 0.38).add('mage', 3, 0.54).add('priest', 3, 0.54)
  .squad(1.35).add('tank', 1, 0.86).add('normal', 11, 0.38)
  .squad(1.35).add('knight', 3, 0.65).add('blade', 6, 0.43).add('priest', 3, 0.54)
  .squad(1.35).add('knight', 3, 0.65).add('normal', 9, 0.38)
  .build();

new WaveBuilder(93)
  .squad().add('knight', 3, 0.64).add('gnome', 3, 0.53).add('normal', 9, 0.37).add('mage', 3, 0.53).add('priest', 3, 0.53)
  .squad(1.34).add('fast', 17, 0.24)
  .squad(1.34).add('gnome', 3, 0.53).add('normal', 9, 0.37).add('mage', 3, 0.53)
  .squad(1.34).add('knight', 3, 0.64).add('gnome', 3, 0.53).add('normal', 9, 0.37).add('mage', 3, 0.53).add('priest', 3, 0.53)
  .squad(1.34).add('knight', 3, 0.64).add('gnome', 3, 0.53).add('normal', 9, 0.37).add('mage', 3, 0.53).add('priest', 3, 0.53)
  .build();

new WaveBuilder(94)
  .squad().add('blade', 6, 0.42).add('normal', 9, 0.37)
  .squad(1.33).add('knight', 3, 0.64).add('gnome', 3, 0.53).add('normal', 9, 0.37).add('mage', 3, 0.53).add('priest', 3, 0.53)
  .squad(1.33).add('knight', 3, 0.64).add('gnome', 3, 0.53).add('normal', 9, 0.37).add('mage', 3, 0.53).add('priest', 3, 0.53)
  .squad(1.33).add('jester', 6, 0.48)
  .build();

new WaveBuilder(95)
  .squad().add('gnome', 3, 0.52).add('normal', 9, 0.37).add('mage', 3, 0.52)
  .squad(1.31).add('scout', 12, 0.31)
  .squad(1.31).add('scout', 12, 0.31)
  .squad(1.31).add('knight', 3, 0.63).add('gnome', 3, 0.52).add('normal', 9, 0.37).add('mage', 3, 0.52).add('priest', 3, 0.52)
  .build();

new WaveBuilder(96)
  .squad().add('tank', 1, 0.83).add('normal', 9, 0.36).add('priest', 3, 0.52)
  .squad(1.3).add('knight', 3, 0.62).add('normal', 9, 0.36)
  .squad(1.3).add('tank', 1, 0.83).add('normal', 9, 0.36).add('priest', 3, 0.52)
  .squad(1.3).add('gnome', 6, 0.52).add('normal', 9, 0.36)
  .squad(1.3).add('tank', 1, 0.83).add('normal', 12, 0.36)
  .squad(1.3).add('knight', 3, 0.62).add('gnome', 3, 0.52).add('normal', 9, 0.36).add('mage', 3, 0.52).add('priest', 3, 0.52)
  .build();

new WaveBuilder(97)
  .squad().add('scout', 12, 0.31)
  .squad(1.29).add('knight', 3, 0.62).add('normal', 9, 0.36)
  .squad(1.29).add('blade', 6, 0.41).add('normal', 9, 0.36)
  .squad(1.29).add('fast', 18, 0.23)
  .squad(1.29).add('normal', 15, 0.36)
  .squad(1.29).add('fast', 18, 0.23)
  .squad(1.29).add('tank', 1, 0.82).add('normal', 12, 0.36)
  .squad(1.29).add('tank', 1, 0.82).add('normal', 12, 0.36)
  .build();

new WaveBuilder(98)
  .squad().add('normal', 15, 0.36)
  .squad(1.27).add('knight', 3, 0.61).add('normal', 9, 0.36)
  .squad(1.27).add('tank', 1, 0.82).add('normal', 9, 0.36).add('priest', 3, 0.51)
  .squad(1.27).add('tank', 1, 0.82).add('normal', 12, 0.36)
  .squad(1.27).add('fast', 18, 0.23)
  .squad(1.27).add('tank', 1, 0.82).add('normal', 12, 0.36)
  .squad(1.27).add('scout', 12, 0.31)
  .squad(1.27).add('normal', 15, 0.36)
  .squad(1.27).add('jester', 6, 0.46)
  .build();

new WaveBuilder(99)
  .squad().add('tank', 1, 0.81).add('normal', 9, 0.35).add('priest', 3, 0.51)
  .squad(1.26).add('knight', 3, 0.61).add('blade', 6, 0.4).add('priest', 3, 0.51)
  .squad(1.26).add('knight', 3, 0.61).add('gnome', 3, 0.51).add('normal', 9, 0.35).add('mage', 3, 0.51).add('priest', 3, 0.51)
  .squad(1.26).add('tank', 1, 0.81).add('normal', 12, 0.35)
  .squad(1.26).add('fast', 18, 0.23)
  .squad(1.26).add('jester', 6, 0.45)
  .build();

new WaveBuilder(100)
  .squad().add('normal', 15, 0.35)
  .squad(1.25).add('knight', 3, 0.6).add('hero', 2, 1).add('priest', 2, 0.5)
  .squad(1.25).add('scout', 9, 0.3)
  .squad(1.25).add('normal', 15, 0.35)
  .build();
