# MATCHA RUSH 🍵 — Vanilla Run

**Ein origineller echter 3D-Endless-Runner im Stil des Drei-Spuren-Runner-Genres.** Sammle detailliert modellierte Vanilla-Matcha-Lattes statt Münzen, springe über Barrieren, rolle unter Schildern durch und weiche dem Mint Express aus. Alle fünf vom Nutzer gewünschten Power-ups sind enthalten – mit eigener 3D-Mechanik. Läuft ohne Login, Backend oder Build in modernen WebGL-Browsern.

**GitHub Pages:** https://brotesser8.github.io/hnkrspiel/matcha-rush/

## Steuerung

| Aktion | Desktop | Touchgerät |
| --- | --- | --- |
| Linke Spur | A / ← | nach links wischen / ← |
| Rechte Spur | D / → | nach rechts wischen / → |
| Springen | W / ↑ / Leertaste | nach oben wischen / ↑ |
| Rollen / Rutschen | S / ↓ | nach unten wischen / ↓ |
| Pause / Weiter | P / Escape | Pause-Button |
| Neustart | Button auf dem Pause- oder Game-Over-Bildschirm | derselbe Button |

Du siehst deinen Runner von hinten, die Gleise und Hindernisse sind **echte Three.js-3D-Meshes** mit Perspektive, animierter Kamera, Fog, Licht und scrollender Low-Poly-Stadt. Es werden **keine fertigen Subway-Surfers-Modelle, Logos oder Assets** verwendet.

## Die Vanilla-Matchas

Jeder Becher besteht aus originalen, wiederverwendbaren 3D-Geometrien: kantiger transparenter Becher, Milch-/Matchaschichten, transparenter Kunststoff, sichtbare Eiswürfel, luftige Vanille-Schaumhaube, gedrehter Strohhalm, Rand und kleines Blattlogo. Die Becher drehen sich, schweben leicht und erzeugen beim Aufsammeln Partikel. Alle eingesammelten Becher erhöhen den Score und werden für die persönliche Bilanz gezählt.

## Alle fünf Power-ups

| Power-up | Was tatsächlich passiert |
| --- | --- |
| **Vanilla Boost** (Schuhe) | Für **12 Sekunden** trägt der Runner vergrösserte Matcha-Sneaker und kann deutlich höher springen |
| **Double Matcha Jet** | Für **9 Sekunden** fliegt der Runner über den Hindernissen; zwei grosse 3D-Matcha-Becher an seinem Rücken treiben ihn mit grünen Strahlen an. Extra hohe Becher erscheinen auf der Flugroute |
| **Matcha Mouth** (Magnet) | **12 Sekunden** lang geht der animierte Mund des Runners auf; Vanilla-Matchas in Reichweite werden räumlich zum Mund gezogen und automatisch eingesammelt |
| **2× Multiplier** | **13 Sekunden** lang werden Distanz- und Matcha-Score verdoppelt. Das HUD zeigt einen sichtbaren Countdown |
| **Giant Matcha Launch** (Pogo) | Ein riesiger Vanille-Matcha-Becher schleudert den Runner **sofort einmalig** hoch in die Luft. Keine Dauerwirkung – dafür eine hohe Flugkurve und eine Reihe Bonus-Matchas |

### Hindernisse

- **Crate:** darüber springen oder die Spur wechseln
- **Barrier:** darüber springen oder ausweichen
- **Slide arch:** darunter rollen, darüber springen oder ausweichen
- **Mint Express train:** die Spur wechseln oder über den Zug fliegen (Jetpack / besonders hohe Flugbahn)

Es werden pro Hindernisreihe höchstens **zwei der drei Spuren** blockiert, damit immer mindestens eine freie Spur existiert. Die Geschwindigkeit steigt mit der Laufdauer bis zu einem Maximum an.

## Highscores

- Matchas und Laufdistanz bringen Score; 2× wirkt auf beide Quellen.
- Persönlicher Rekord, beste Distanz, gesamte gesammelte Matchas und Anzahl Läufe werden **nur lokal** über localStorage gespeichert.
- Nach einer Kollision erscheint der Game-Over-Bildschirm mit Score, Matchas und Distanz.
- Kein Online-Leaderboard, keine persönlichen Daten und keine eingebauten Käufe.

## Starten und Tests

Statische Dateien, **Three.js 0.160.1** per gepinnter Import-Map über jsDelivr. Das CDN benötigt eine Internetverbindung. Lokal im Repository-Verzeichnis:

```bash
python3 -m http.server 8000
# http://localhost:8000/matcha-rush/
```

**Unit- und Strukturtests (Node 22+):**

```bash
node --check matcha-rush/main.js
node --check matcha-rush/models.js
node --check matcha-rush/world.js
node --check matcha-rush/logic.mjs
node --test matcha-rush/tests/logic.test.mjs matcha-rush/tests/structure.test.mjs
```

**Echte Browser-E2E-Tests:** Um die WebGL-Welt, 3D-Modellansicht, Sprung, Rutschen, alle fünf Effekte, Kollision, Pause, Neustart und Mobile-Buttons zu testen:

```bash
npm install --no-save playwright@1.58.2
npx playwright install chromium
node matcha-rush/tests/browser-smoke.mjs
```

GitHub Actions führt diese Tests separat aus (`.github/workflows/matcha-checks.yml` und `.github/workflows/matcha-browser.yml`). Screenshots werden als CI-Artefakte gespeichert.

**Technische Hinweise:** Rendering benötigt WebGL; Performance kann je nach GPU und Gerät schwanken. Automatisierte Desktop- und Mobile-Chromium-Tests prüfen zentrale Gameplay-Wege, ersetzen aber nicht Tests auf jeder möglichen Hardware. Die Musik ist nicht aus externen Spielen übernommen: optionale, selbst synthetisierte Soundeffekte sind eingebaut.

## Struktur

```text
matcha-rush/
├── index.html
├── style.css
├── main.js               # Three.js-Engine, Steuerung, Kollisionen und HUD
├── logic.mjs             # testbare Physik- und Powerup-Regeln
├── models.js             # vollständig eigene Low-Poly-3D-Modelle
├── world.js              # rollende Gleise, Stadt, Häuser, Pflanzen, Licht
├── favicon.svg
└── tests/
    ├── logic.test.mjs
    ├── structure.test.mjs
    └── browser-smoke.mjs
```

Das Spiel wird in einem **eigenen Unterordner** von Brotesser8/hnkrspiel veröffentlicht; andere Projekte im Repository werden nicht geändert.
