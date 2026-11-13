# WINDOW — Geh raus, wenn's gut ist.

Eine eigenständige, responsive Outdoor-Planer-Web-App. WINDOW sucht anhand echter stündlicher Prognosen das **beste Zeitfenster zum Spazieren, Joggen, Velofahren oder Draussensitzen**. Ohne Login, Datenbank, Build-Schritt oder API-Key.

**Online (nach GitHub-Pages-Deployment):** https://brotesser8.github.io/hnkrspiel/window/

## Features

- Globale Ortssuche mit Tastaturbedienung sowie optionale Standortfreigabe
- Prognose für die kommenden 48 Stunden inklusive gefühlter Temperatur, Regenwahrscheinlichkeit, Wind, Wetterlage, US-AQI und UV
- Aktivitätsspezifischer **WINDOW Score von 0–100** als transparente *Heuristik*, keine amtliche Gefahrenklasse
- Suche nach den besten zusammenhängenden Zeitfenstern von 1, 2 oder 3 Stunden
- Filter für heute / morgen / gesamte 48 Stunden und drei **nicht überlappende** Alternativen
- Interaktive stündliche Prognose, klare Lade-/Fehlerzustände und mobile Darstellung
- Kein Tracking, keine Cookies, keine Speicherung des genauen Standorts

## APIs

Alle Anfragen laufen direkt im Browser über HTTPS:

1. [Open-Meteo Geocoding](https://open-meteo.com/en/docs/geocoding-api) — Ortssuche
2. [Open-Meteo Forecast](https://open-meteo.com/en/docs) — stündliche Wetterprognose
3. [Open-Meteo Air Quality](https://open-meteo.com/en/docs/air-quality-api) — modellierter US-Luftqualitätsindex und UV

**Kein API-Key nötig bei nicht-kommerzieller Nutzung im kostenlosen Tarif.** Bitte beachte die geltenden Nutzungsbedingungen, Freikontingente und erforderliche Quellenangaben von Open-Meteo. Datenlizenz: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Die Attribution ist auch im Footer eingebaut.

Die Luftdaten stammen aus **Modellprognosen**, nicht aus einer lokalen Messstation; örtliche Verhältnisse können abweichen. Fällt die Luftqualitäts-API aus, bleiben Wetter und Empfehlungen nutzbar, die fehlenden Werte werden als **„–“** ausgewiesen. Wetterdaten werden nicht erfunden. Die Rangfolge wird aus noch kommenden Stunden der lokalen Ortszeit gebildet.

## Wie die Bewertung funktioniert

Die reine Bewertungslogik liegt in [logic.mjs](./logic.mjs), getrennt vom DOM-Code. Die Basis jeder Stunde ist 100; Abzüge entstehen u. a. bei:

- höherem Regenrisiko bzw. gemeldeter Niederschlagsmenge
- gefühlter Temperatur ausserhalb des Aktivitäts-Komfortbereichs
- zu viel Wind (beim Velofahren stärker)
- erhöhtem US-AQI (beim Joggen stärker)
- starker UV-Strahlung, Gewittern oder Eis-/Schneewetter
- Dunkelheit (beim Draussensitzen stärker)

Der Wert eines mehrstündigen Zeitfensters ist der Mittelwert der Stundenwerte mit kleinem Abzug für starke Schwankungen. Der beste Zeitraum wird nach Score gereiht, bei Gleichstand gewinnt die frühere Startzeit. Alternativen dürfen nicht überlappen.

Der Score ist bewusst **kein Sicherheitsversprechen**. Bei gefährlichen Wetterlagen und empfindlicher Gesundheit immer amtliche Warnungen und fachliche Empfehlungen beachten.

## Lokal starten

Der App-Code benötigt keine Abhängigkeiten und keinen Build:

```bash
python3 -m http.server 8000
# Öffnen: http://localhost:8000/window/
```

Für die Standortfunktion braucht es einen sicheren Kontext (HTTPS oder localhost).

### Tests

```bash
node --test window/tests/logic.test.mjs
node --check window/app.js
node --check window/logic.mjs
```

## Deployment

Die vorhandene GitHub-Actions-Pages-Pipeline des Repositories veröffentlicht alle Unterordner automatisch bei einem Push auf `main`. Es ist keine Änderung an Workflow oder Root-Spiel nötig.

## Dateistruktur

```text
window/
├── index.html        # zugängliches semantisches Markup
├── styles.css        # responsive Designsystem
├── app.js            # APIs, Suche, Darstellung, Interaktionen
├── logic.mjs         # unabhängig testbare Bewertungslogik
├── favicon.svg
└── tests/
    └── logic.test.mjs
```

Bei technischer Nichterreichbarkeit einzelner externer Dienste zeigt WINDOW sinnvolle Fehlerzustände und bietet einen manuellen Refresh. Die App pollt im sichtbaren Browser maximal ungefähr alle 15 Minuten; sie ist kein Warn-/Alarmdienst.
