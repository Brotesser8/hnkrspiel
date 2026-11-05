# 🍟 Kartoffel-Krawall 3D – POMMES PLANET!

**Low-Poly-Singleplayer-Spiel mit vollständiger 3D-Insel, ohne Accounts und ohne externe Laufzeitbibliotheken.**

**Spielen:** https://brotesser8.github.io/hnkrspiel/party-panik/

## So funktioniert es

Du landest auf einer bunten Insel mit Palmen, Hütten, Marktständen, Leuchtturm, Windmühle, Möbeln, Felsen, Wolken, Wasser und einer riesigen goldenen Fritteuse. Sammle Pommes-Packungen und bringe deinen Beutel zur Fritteuse in der Inselmitte. Du konkurrierst gegen KI-Rivalen, die ebenfalls Pommes sammeln und punkten.

- **WASD / Pfeiltasten**: Spielfigur bewegen.
- **Leertaste / Shift**: Turbo. Rivalen beim Rammen betäuben und deren Pommes herausschlagen.
- **Handy und Tablet**: Touch-Joystick links, Turbo rechts.
- **🍟 Pommes**: +1 im Beutel; **⭐ Gold**: +3; **🌶️ Chili**: Temposchub; **💣 Bombe**: verliert Pommes und betäubt.
- **Fritteuse:** Beutel mit bis zu 8 Pommes einzahlen. Schnell aufeinanderfolgende Einzahlungen ergeben einen **Kombo-Multiplikator bis ×3**.
- **Inselspaß**: 3 computergesteuerte Gegner.
- **Extra scharf**: 5 schnellere Gegner.
- **105 Sekunden** pro Runde. Wer am Ende die meisten Punkte eingezahlt hat, gewinnt.
- Highscore wird lokal im Browser gespeichert. Pause mit Escape, eigener Soundschalter.

## Technik

Die Grafik wird unmittelbar mit **WebGL 1.0** aus dreidimensionalen Polygonen dargestellt. Die gesamte Spiellogik, KI, 3D-Geometrie, Kamera, Shader und Dekoration laufen lokal im Browser. **Kein Multiplayer, keine Anmeldung, kein Server, keine CDN-Abhängigkeit.** HTML/CSS/JS liegen zusammen in **`index.html`**.

Benötigt einen aktuellen Browser mit aktiviertem WebGL und Grafikunterstützung.

## Getestet

- JavaScript-Syntaxcheck
- Desktop- und Mobile-Oberfläche im automatisierten Headless-Browsertest
- KI-Spieler auf beiden Schwierigkeitsgraden
- Bewegung und Turbo
- Sammeln von goldenen Pommes, Einzahlen und Punktestand
- Pause/Fortsetzen, Spielende und erneuter Start
- Validität sämtlicher generierter statischer Geometrie-Koordinaten und Softwareprojektion der 3D-Szene

**Einschränkung der Testumgebung:** Ihr Chromium deaktiviert die echte WebGL-Ausgabe. Die komplette 3D-Szene wurde zusätzlich anhand der generierten Polygon- und Projektionsdaten softwareseitig dargestellt, aber ein echter GPU/WebGL-Render auf unterschiedlichen Endgeräten ist dadurch nicht vollständig nachgewiesen.

## Hosting

Statische GitHub-Pages-Seite unter `party-panik/index.html`. Veröffentlichungen auf `main` werden über `.github/workflows/pages.yml` automatisch deployed.

MIT-Lizenz. © 2026 Brotesser8.
