# Regressziós tesztcsomag (CEG)

Futtatás (Node + Playwright szükséges):

    node tests/run-all.js index.html

Minden teszt tiszta oldalbetöltéssel fut; JS-hiba vagy elbukott ellenőrzés esetén hibakóddal lép ki.
Ellenőrzi: indulás, 35 körös automata csata (sakktábla és szabad mozgás), összesítés (sumFuel),
konvoj-elrendezés, OP jelölt cellák (cvTurn), AI-kísérők kikerülése (escAvoid),
a `fixture_kampany.json` kampány-mentés betöltése, kampány esemény → csata → vége, mentő-függvények.
A játékérzetet és az egyensúlyt nem méri. Az escAvoid-teszt véletlen-alapú (a feltétel: a kikerüléssel legfeljebb a fele átfedés).
