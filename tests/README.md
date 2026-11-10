# Regressziós tesztcsomag (CEG)

Futtatás (Node + Playwright szükséges):

    node tests/run-all.js index.html

Minden teszt tiszta oldalbetöltéssel fut; JS-hiba vagy elbukott ellenőrzés esetén hibakóddal lép ki.
Ellenőrzi: indulás, 35 körös automata csata (sakktábla és szabad mozgás), összesítés (sumFuel),
konvoj-elrendezés, OP jelölt cellák (cvTurn), AI-kísérők kikerülése (escAvoid),
a `fixture_kampany.json` kampány-mentés betöltése, kampány esemény → csata → vége, mentő-függvények.
A játékérzetet és az egyensúlyt nem méri. Az escAvoid-teszt véletlen-alapú (a feltétel: a kikerüléssel legfeljebb a fele átfedés).

Bővítés (13 teszt): mentőakció (TF24 → vontatás → D7 feltöltés a fixture-ből), torpedó (FAT 12 / LUT 18 cella, kilövés), LUT és légperiszkóp (elérhetőség, akku, kártya).
Ismert gyenge pont: a „kampány esemény → csata → vége” teszt csak azt nézi, hogy a CAMP.end() hiba nélkül lefut; hogy a csata zárul-e, nem.

Bővítés (17 teszt, v1.14.431): a jelentés eseménytára (EVL) egyezik-e a napló szöveges elemzésével egy automata csatában (ágyú, süllyedés, légi); kanyar-kocka 90° szabály (diceNo90); beállítás-kereső (cfgFilter).
