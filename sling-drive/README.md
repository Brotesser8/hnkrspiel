# SLING DRIVE 🏎️ — Launch. Upgrade. Win.

**Ein neues, eigenständiges 3D-Mobile-Arcade-Spiel** im freundlichen Low-Poly-Stil. In diesem Projekt tritt ein Auto gegen immer grössere Distanzen an: mit einer Schleuder losschiessen, Münzen auf der Strecke sammeln, Hindernissen ausweichen, upgraden und das Levelziel erreichen.

## Spielen

Unter `https://brotesser8.github.io/hnkrspiel/sling-drive/` oder die Datei `index.html` auf einem lokalen Webserver öffnen (z. B. `python3 -m http.server 8000`, dann `/sling-drive/`).

### Steuerung

- **Handy:** Auf die 3D-Szene drücken, nach unten ziehen und loslassen, um den Schleuderschub zu bestimmen. Während der Fahrt über die Szene seitwärts ziehen oder die grossen Pfeiltasten verwenden, um das Auto zu lenken.
- **Computer:** In die Szene klicken und loslassen oder die Leertaste zum Starten drücken. Danach Pfeiltasten nach links/rechts verwenden.

## Fortschritt

- **Schleuder:** Mehr Startgeschwindigkeit.
- **Auto:** Weniger Verzögerung, längere Strecke.
- **Einkommen:** Mehr Münzen am Ende eines Versuchs.

Alle Upgrades, freigeschalteten Level und Münzen werden lokal im Browser (`localStorage`) gespeichert. Bei jedem abgeschlossenen Level wird ein längeres Ziel freigeschaltet. Das Spiel ist kostenlos, ohne Werbung und ohne Tracking.

## Technik

- Reines HTML/CSS/JavaScript mit **Three.js 0.160.1** als Browser-Modul von jsDelivr oder Unpkg.
- Die 3D-Fahrzeuge, Schleuder, Münzen, Strasse, Bäume und Hügel werden zur Laufzeit geometrisch erzeugt. Es werden keine urheberrechtlich fremden Spielmodelle oder Texturen genutzt.
- Kompatibel mit GitHub Pages. Eine Internetverbindung wird zum Laden von Three.js benötigt; kein Server, kein API-Key.

Version 1.0.0 — 12. November 2026