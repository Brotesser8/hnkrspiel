# 🍔 PANIK AM HERD — 3D Kochsimulator

Ein kostenloses, deutschsprachiges **Singleplayer-3D-Browsergame aus der Ego-Perspektive**. Keine Registrierung, keine Bibliotheken und keine Server nötig.

## Jetzt spielen

https://brotesser8.github.io/hnkrspiel/party-panik/

## So geht's

1. **Ein Brötchen-Unterteil greifen**: Die farbigen Zutatenschalen stehen links an der Wand. Ziele auf eine Zutat und klicke.
2. **Fleisch braten**: Patty greifen und am Grill `E` drücken. Nach etwa **6 Sekunden** ist es gar; nach rund 19 Sekunden verbrennt es. Nimm es rechtzeitig herunter.
3. **Gemüse schneiden**: Salat oder Tomate auf das Brett legen (`E`) und anschließend dreimal mit `E` schneiden.
4. **Burger stapeln**: Lege Zutaten durch Anvisieren des Tellers und `E` in der Reihenfolge der angezeigten Bestellung auf den Teller. Es gibt Classic, Garden, Double und Monster Burger.
5. **Servieren**: Greife den ganzen Teller, trage ihn zum Ausgabefenster und stelle ihn mit `E` ab. Anschließend durch `E` servieren und kassieren.

## Steuerung

| Aktion | PC | Touchscreen |
|---|---|---|
| Laufen | WASD / Pfeiltasten | Joystick links |
| Umschauen | Maus (Pointer-Lock) | Rechte Bildschirmhälfte ziehen |
| Aufheben / Abstellen | Linksklick | Greifen |
| Station benutzen / Kochen / schneiden | E oder Leertaste | Benutzen |
| Werfen | Q | Werfen |
| Teller leeren | R | Leeren |
| Pause | Esc | ⏸ |

## Was ist enthalten?

- Komplett selbst erstellte Low-Poly-3D-Küche mit Kühlschrank, Zutatenregal, Herd, Abzugshaube, Schneidebrett, Servicefenster, Kunden, Tischen, Deckenlampen, Geschirr, Küchendekoration und einer sichtbaren Hand.
- Echte 3D-Objekte für Zutaten und gebaute Burger; Greifen, Ablegen und Werfen mit leichter Schwerkraft und Auftreffen auf Arbeitsflächen.
- Zeitabhängige Bratstufen (roh / gebraten / verbrannt), schrittweises Schneiden, physisch tragbarer Burger-Teller und genaue Rezeptkontrolle.
- Schichtdauer 5 Minuten, Bestellungen mit Geduldszeit, Trinkgeld, Kasse und lokal gespeicherter Bestwert.
- WebGL 1, keine Fremd-CDNs und kein Backend.

## Grenzen

Es handelt sich um eine eigenständige, browserbasierte Umsetzung **inspiriert vom Genre** der chaotischen Kochsimulatoren, nicht um eine Kopie von *One-Armed Cook*. Die Physik ist bewusst leichtgewichtig (keine Ragdoll-, Joint- oder vollständige Starrkörpersimulation). WebGL und Hardwarebeschleunigung müssen im Browser verfügbar sein. Browser können unterschiedlich auf Pointer-Lock, Sound und Touch reagieren. Die Spielmechaniken sind automatisiert geprüft worden; vollständige Fehlerfreiheit auf jedem Gerät lässt sich nicht garantieren.

## Entwicklung und Deployment

`index.html` und `game.js` im selben Verzeichnis hosten, idealerweise mit HTTPS. GitHub Pages stellt automatisch das Repository bereit. Das WebGL-Rendering ist selbst implementiert, der Quellcode kann ohne Build-Schritt betrieben werden.

Lizenz: MIT (siehe `LICENSE`).