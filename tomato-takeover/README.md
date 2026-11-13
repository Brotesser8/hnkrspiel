# 🍅 TOMATO TAKEOVER — Throw. Film. Go Viral.

Ein eigenständiges, kostenloses **First-Person-3D-Low-Poly-Arcade-Spiel** für GitHub Pages: In einer bunten Welt wirfst du cartoonhafte Tomaten auf **fiktive** Passanten und Stars, filmst die Aktionen, postest sie auf einem **simulierten Ingame-Social-Netzwerk** und finanzierst mit Werbeeinnahmen, wiederkehrenden Followern und viralen Videos neue Events.

**Nach der Pages-Veröffentlichung:** https://brotesser8.github.io/hnkrspiel/tomato-takeover/

Kein Login, keine API-Keys, keine Datenbank auf einem Server, kein Build-Schritt. Für Three.js wird beim ersten Laden eine Internetverbindung benötigt.

## Was drinsteckt

### Die 3D-Welt

Originale prozedurale Low-Poly-Geometrien mit animierten Figuren, Gesichtern, Outfit-Varianten, Bäumen, Autos, Gebäuden, Bühne, Markt, Metro, Licht und Atmosphäre. Drei First-Person-Levels:

| Ort | Inhalt | Reise | Eintritt |
| --- | --- | ---: | ---: |
| Neon District | Stadt, Passanten, Streamer NOVA BYTE, Markt | kostenlos zurück | kostenlos |
| PixelFest | Konzert mit LUNA LOOPS, 3D-Bühne und Publikum | $24 | $95 einmalig |
| Capitol Plaza | Satirischer Präsidentenauftritt mit PRESIDENT PIXEL, Bühne und Security | $32 | $180 einmalig |

Für die Metro wird bei jedem Hinweg bezahlt; einmal gekaufte Tickets/Pässe gelten dauerhaft. Die Rückfahrt in den Stadt-Hub ist zur Vermeidung von Softlocks kostenfrei.

Alle dargestellten Charaktere, Prominenten und Orte sind **frei erfunden**. Das Spiel zeigt harmlose Slapstick-Reaktionen, keine realen Personen oder realen Veranstaltungen.

### Tomaten werfen

- **WASD** laufen, **Shift** sprinten, Maus drehen, **Linksklick/Leertaste** werfen.
- Auf Touchgeräten: Steuerkreuz links, Wischen im 3D-Bild rechts, die grossen WERFEN- und AUFNAHME-Buttons.
- Projektilphysik mit Schwerkraft, Segment-Kollision, begrenzter Reichweite, genauerer Zielhilfe am Fadenkreuz und cartoonhaften Splatter-Partikeln.
- 18 Starttomaten; ein Paket mit 6 kostet $18. Als Anti-Softlock gibt es bei vollständiger Mittellosigkeit und leerem Rucksack nach einer Minute einen kostenlosen Dreierpack.
- «Daily Hustle»: Drei zivile Treffer geben $30 Startbonus.

### Filme & SplatStream

- **R** startet/stopp eine Aufnahme von maximal **18 Sekunden**.
- Die tatsächlichen 3D-Frames werden für stabile Videoaufnahmen in ein separates 2D-Canvas gezeichnet. `HTMLCanvasElement.captureStream()` und `MediaRecorder` erzeugen daraus ein echtes Video mit eingebranntem Trefferzähler und Creator-Wasserzeichen (kein Fake-Video).
- Nach Ende: Video im Vorschauplayer ansehen, **posten** oder **verwerfen**.
- Beim Posten werden simulierte Views, Likes, Follower und Einnahmen berechnet. Ein Fame-Multiplikator gilt für Streamer, Sänger und fiktive Politiker.
- **Genau 5 % Chance** auf extrem viral **bei Clips mit mindestens einem Passanten-Treffer und ohne bekannte Person**. Die Berechnung ist als pure Funktion getestet. Clips mit Prominenten haben höhere Basisreichweite, aber nicht die zusätzliche 5-%-Lotterie für normale Clips.
- Monetarisierung: **$8 pro 1.000 simulierten Views**. Auf weitere Uploads steigen bestehende Fans ein; etwa alle 45 Sekunden kommen wiederholte Aufrufe und Werbeeinnahmen für alte Clips hinzu.
- Anzeigen und Clips sind **ausschliesslich im Spiel**. Es werden keine Videos in reale soziale Netzwerke hochgeladen.

### Persistenz

- Cash, Follower, Tickets und Post-Metadaten werden lokal in `localStorage` gespeichert.
- Aufgenommene Videos werden lokal in **IndexedDB** abgelegt. Ohne diese Browserfunktion funktionieren Videos während der Sitzung, bleiben aber nach Reload eventuell nicht verfügbar.
- Maximal 18 Feed-Einträge werden in den Metadaten gehalten. **Keine automatische Cloud-Synchronisation**.
- Kein externes Tracking. Three.js selbst wird über jsDelivr geladen.

## Technische Struktur

```text
tomato-takeover/
├── index.html                  Spiel, HUD, Aufnahme, Social-Panel, Karten
├── style.css                   responsive HUD + Menüs + Mobile Controls
├── app.js                      Three.js Runtime, Gameplay, Recording, Feed
├── world.js                    eigene Level, animierte Low-Poly-Figuren
├── logic.mjs                   Economy, Viral-Chance, Save-Sanitizing, Reisen
├── favicon.svg
└── tests/
    ├── economy.test.mjs        Echte Logiktests (u.a. exakte 5 % Viral)
    └── structure.test.mjs      Dateiverknüpfungen / Runtime-Features
```

Verwendet **Three.js 0.160.1** über eine gepinnte Import-Map, ohne Framework oder externe 3D-Modelle. Dependency: https://threejs.org/docs/ (MIT-Lizenz).

## Start & Tests

Im Repository-Hauptordner lokal starten:

```sh
python3 -m http.server 8000
# Browser: http://localhost:8000/tomato-takeover/
```

Tests mit Node.js 22:

```sh
node --check tomato-takeover/app.js
node --check tomato-takeover/world.js
node --check tomato-takeover/logic.mjs
node --test tomato-takeover/tests/*.test.mjs
```

Der separate Workflow `.github/workflows/tomato-checks.yml` prüft den Code auf GitHub vor und nach dem Merge. Der existierende GitHub-Pages-Workflow veröffentlicht automatisch den neuen Unterordner; die anderen Apps werden nicht bearbeitet.

## Technische Anforderungen / Grenzen

- Ein moderner WebGL-fähiger Browser und Internet beim ersten Laden der Three.js-Bibliothek.
- **Aufnahmen:** Chrome/Edge/Firefox oder ein aktueller Safari mit funktionierendem `MediaRecorder` und `canvas.captureStream`. Nicht jeder Browser unterstützt dieselben Video-Codecs. Die App prüft Verfügbarkeit, bietet unterschiedliche MIME-Typen an und meldet Fehler statt einer erfundenen Aufnahme.
- Mobile Touch-Steuerung ist implementiert, Desktop-Tastatur/Maus ist für längere Sessions empfohlen. Bei schwachen Geräten kann 3D-Performance abweichen.
- **Konkret prüfen vor Veröffentlichung:** Desktop bewegen, zielen, werfen, treffen, 5–8 Sekunden aufnehmen, Vorschau abspielen und posten, im Feed erneut abspielen, Ticket kaufen/reisen, speichern & neu laden und ein mobiles Touchgerät prüfen. Ein bestandener Logiktest allein beweist keine Fehlerfreiheit aller Browser.
- Einnahmen, Zahlen und Viralität sind komplett **simuliert**; es fliesst kein echtes Geld.
- Der Wurf auf Passanten ist eine absurde, harmlose Arcade-Parodie – keine Aufforderung, echte Personen zu belästigen.

## Nicht mitgelöscht

Bei diesem Wechsel wurde **RIFT** mitsamt Test-Workflow entfernt. Die bestehenden Projekte `window/`, `sportspy/`, `publibike-karte/` usw. bleiben bestehen.
