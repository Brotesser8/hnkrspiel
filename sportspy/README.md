# SportSpy

**Swiss sports. Ohne Ablenkung.** SportSpy ist eine responsive Web-App mit kostenfreien Schweizer Sportdaten. Sie wird als Unterseite der bestehenden GitHub-Pages-Website `hnkrspiel` veröffentlicht.

**Website:** https://brotesser8.github.io/hnkrspiel/sportspy/

## Ligen

| Sport | Liga | Quelle |
| --- | --- | --- |
| Eishockey | National League | SIHF |
| Fussball | Super League | Open-Matchday (CSV-Datenfeed) + TheSportsDB (ergänzende Anspielzeiten) |
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
2. **Open-Matchday** (https://github.com/oladeeayo/open-matchday) — kostenloses, täglich aktualisiertes CSV-Feed der Schweizer Super League, erreichbar über raw.githubusercontent.com; die Daten dürfen mit Quellenangabe für nicht-kommerzielle Anwendungen genutzt werden. Die Tabelle berechnet SportSpy aus den Resultaten (3/1/0 Punkte; bei punktgleichen Teams können offizielle Tiebreaker abweichen).
3. **TheSportsDB** (https://www.thesportsdb.com/) — freie öffentliche V1-JSON-API für ergänzende Anspielzeiten der nächsten Spiele (API-Schlüssel 3 ist öffentlich). Wenn diese API ausfällt, bleiben die Ergebnisse und Spieltage von Open-Matchday verfügbar.

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


## Design-Version 3: Liga für Liga statt überfülltes Dashboard

- **Startseite:** vier übersichtliche Liga-Karten und maximal drei Spiel-Vorschauen.
- **Liga-Detailseite:** getrennte Tabs für **Heute**, **Nächste Spiele**, **Resultate** und **Tabelle**.
- **Teamwappen:** SIHF-Bilder für Eishockeyteams anhand ihrer SIHF-Team-ID und die Swiss-Super-League-Logos von [FootyLogos](https://www.footylogos.com/competition/swiss-football-league). Die Wappen bleiben Marken der jeweiligen Vereine. Bei fehlenden/beschädigten Bilddateien wird ein lesbares Teamkürzel angezeigt.
- **Light/Dark:** gespeicherte Auswahl im lokalen Browser, mit Rückfall auf die Systempräferenz.
- **Direkte Links:** z. B. `#liga/national/tabelle` oder `#liga/super/naechste`; Browser-Zurück funktioniert.
- **Favoriten:** Sterne neben jedem Team und auf Tabellenzeilen; gespeichert im Browser.
- **GitHub Pages:** weiterhin 100 % statisch; bestehende Spiele im Hauptrepo werden nicht verändert.

Die Website lädt Teamwappen als Bilder von externen Hosts. Falls ein Drittanbieter die URL-Struktur oder Hotlink-Regeln ändert, erscheinen automatisch die Teamkürzel statt defekter Bilder.
