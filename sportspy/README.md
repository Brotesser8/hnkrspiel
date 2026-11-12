# SportSpy

**Swiss sports. Ohne Ablenkung.** SportSpy ist eine responsive Web-App mit kostenfreien Schweizer Sportdaten. Sie wird als Unterseite der bestehenden GitHub-Pages-Website `hnkrspiel` veröffentlicht.

**Website:** https://brotesser8.github.io/hnkrspiel/sportspy/

## Ligen

| Sport | Liga | Quelle |
| --- | --- | --- |
| Eishockey | National League | SIHF |
| Fussball | Super League | ESPN (öffentliche, undokumentierte Schnittstelle) |
| Eishockey | Swiss League | SIHF |
| Eishockey | MyHockey League | SIHF |

Die Daten sind **keine garantierten Live-Ticker**. GitHub Actions aktualisiert den Daten-Snapshot ungefähr alle 30 Minuten. GitHub kann die Ausführung geplanter Jobs verzögern. Bei ausfallenden Datenquellen zeigt die Oberfläche den Zustand an, statt Ersatzresultate zu erfinden.

## Funktionen

- Echte Light- und Dark-Mode-Themes mit Speicherung pro Browser
- Spieltag auswählen und Tagesansicht, nächste Spiele oder vergangene Resultate anzeigen
- Ligafilter, Eishockey-/Fussballfilter und Teamsuche
- Tabellen für alle vier Ligen
- Lokale Favoriten (im Browser gespeichert)
- Uhrzeiten in `Europe/Zurich`, auch bei Sommerzeit
- Mobil, Tablet und Desktop; Tastatur- und Screenreader-Basisunterstützung
- Keine bezahlte API und kein API-Key im Browser

## Architektur

```
sportspy/
  index.html           # Web-Oberfläche
  styles.css           # Licht- und Dunkelmodus
  app.js               # Darstellung, Navigation, Filter, Favoriten
  favicon.svg          # SportSpy-Augenmarke
  scripts/refresh.mjs  # Server-seitiger API-Abruf in GitHub Actions
  data/snapshot.json   # Wird beim Deploy automatisch erzeugt
.github/workflows/pages.yml # Deploy + Aktualisierung alle 30 Minuten
```

Die Browseroberfläche lädt ausschliesslich `./data/snapshot.json` vom selben GitHub-Pages-Origin, damit kein CORS-Problem entsteht. Die ursprüngliche Startseite und sämtliche anderen Unterordner des `hnkrspiel`-Repos bleiben erhalten.

## API-Quellen und Einschränkungen

1. **SIHF** (https://data.sihf.ch/statistic/api/cms) — `results` und `standing` mit Saison- und Ligafiltern. Die Quelle ist frei abrufbar, aber API-Verfügbarkeit und Nutzungsbedingungen können sich ändern.
2. **ESPN** (https://site.api.espn.com/apis/site/v2/sports/soccer/sui.1/scoreboard und https://site.api.espn.com/apis/v2/sports/soccer/sui.1/standings) — frei zugängliche JSON-Endpunkte ohne Key. ESPN dokumentiert diese jedoch nicht als offiziell unterstützte Entwickler-API.

Die Synchronisation begrenzt SIHF-Anfragen, verwendet Zeitlimits, validiert Saison und Liga und behält bei einem Ausfall ältere Daten, sofern vorhanden. Jede Datenfamilie speichert ihren letzten tatsächlichen Aktualisierungszeitpunkt.

## Lokal testen

Die statische Website benötigt nur einen lokalen HTTP-Server. Vom Repo-Hauptverzeichnis aus:

```bash
python3 -m http.server 8080
```

Danach `http://localhost:8080/sportspy/` aufrufen. Daten erscheinen, sobald `sportspy/data/snapshot.json` existiert. Mit Node 20+ kann der Generator manuell ausgeführt werden:

```bash
node sportspy/scripts/refresh.mjs
```

Die JSON-Datei wird beim automatischen GitHub-Pages-Deploy erzeugt und für den nächsten Ausfall regelmässig in den Branch gesichert. Die Seite selbst benötigt keinen Server, keine NPM-Abhängigkeiten und keine API-Schlüssel.

## GitHub Pages

Die bereits vorhandene GitHub-Pages-Workflowdatei wird weiterverwendet. Änderungen an `main`, manuelle `workflow_dispatch`-Starts sowie das 30-Minuten-Schedule starten die Veröffentlichung. Der bisherige Henkerspiel-Startbildschirm und die bestehenden Websites bleiben unverändert.
