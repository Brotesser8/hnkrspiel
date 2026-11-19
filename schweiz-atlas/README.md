# GELÄNDE. — Schweizer Datenatlas

Ein bewusst schlicht gestalteter, **nichtkommerzieller Schweizer Datenatlas** auf GitHub Pages.

**Live:** https://brotesser8.github.io/hnkrspiel/schweiz-atlas/

## Was funktioniert

- **Amtliche Karte:** swisstopo-Kartenkacheln, Luftbild sowie zuschaltbare WMS-Kartenlayer (Geologie und Landschaftsschutz).
- **Standort:** zehn Orts-Presets, eine amtliche GeoAdmin-Ortssuche und frei wählbare Kartenpunkte.
- **Höhe:** genaue Höhenangabe eines ausgewählten Schweizer Punkts via GeoAdmin.
- **Geländeprofil:** Start/Ziel auf der Karte setzen; swisstopo ermittelt Höhenpunkte, die als eigenes Diagramm gezeichnet werden.
- **Erdbeben:** neueste **bis zu 35 Treffer** aus dem USGS-Katalog in einem Schweizer Kartenausschnitt für die vergangenen 365 Tage. **Nicht** mit dem vollständigen nationalen Erdbebenkatalog des SED gleichsetzen.
- **Natur:** bis zu acht GBIF-Fundmeldungen aus einem rechteckigen Ausschnitt um den Kartenpunkt; angezeigt werden bis zu vier unterschiedliche Arten. Fundmeldungen sind **keine** Aussage darüber, welche Arten gegenwärtig anwesend sind.
- **Wissen:** nächstgelegener Wikipedia-Artikel über die GeoSearch-Schnittstelle.
- **Schweiz in Zahlen:** letzter verfügbarer Bevölkerungswert aus World Bank Indicators, inklusive Datenjahr.
- **Feiertage:** Nager.Date Community API v4, inkl. Unterscheidung national/kantonal (Feiertagsangaben sind nicht rechtsverbindlich).
- **Recherche:** Direktlinks zu offiziellen Schweizer Karten für Solar, Geologie, Landschaftsschutz, STAC-Downloads.
- **Quellenkatalog:** alle **32** ursprünglich genannten Quellen mit transparentem Status, Suche und Filter.

Die App verwendet **keinen Server, keinen eigenen Proxy und keinen API-Key**. Daten werden ausschliesslich bei Start, manuellem Ortswechsel oder manuell angestossener Aktualisierung geladen. Eine Zwischenspeicherung von zwölf Minuten verhindert unnötige Mehrfachabfragen. Ein Fehler eines Datenanbieters wird lokal angezeigt; andere Teile der Seite bleiben benutzbar.

## Was »keine API mit Limit« hier bedeutet

Eine absolut **unbegrenzte** öffentliche API kann niemand seriös garantieren: Anbieter dürfen Fair-Use-, Infrastruktur- oder Missbrauchsschutz anwenden. Darum sind **Anbieter mit veröffentlichten festen Gratis-Aufrufkontingenten, expliziten Ratenlimits oder verpflichtendem API-Key** von den automatischen Abfragen ausgeschlossen. Der Quellenkatalog kennzeichnet diese als **Mit Limit**. Die Gruppe **Offenes Portal** wird verlinkt, aber nicht aktiv abgefragt, wenn ein sauberer Browser-Endpunkt nicht verifiziert ist.

Auch aktive Dienste können unerreichbar sein, CORS einschränken oder ihre API verändern. Zahlen werden **niemals gefälscht**. Die App zeigt dann »nicht verfügbar« statt erfundener Ersatzwerte. Der Atlas ist ein Entdeckungs- und Informationswerkzeug, kein behördlicher Warndienst.

Die Schweizer Kartendienste unterliegen den [GeoAdmin-Nutzungsbedingungen](https://www.geo.admin.ch/de/nutzungsbedingungen-geodaten). Kartendaten: © swisstopo / Schweizerische Eidgenossenschaft. Weitere Daten: USGS, GBIF, Wikimedia, World Bank, Nager.Date.

## Technische Entscheidung

Reines HTML, CSS und moderne JavaScript-Module, ohne Framework, Build-System oder Tracking. Die Karte verwendet Leaflet 1.9.4 von einem öffentlichen CDN und die amtlichen WMTS/XYZ/WMS-Kartenkacheln. Kartendarstellung und Datenabfrage sind voneinander getrennt. Externe HTTP-Anfragen haben einen Timeout von 11,5 Sekunden. Veraltete Standort-Abfragen dürfen keine neueren Ergebnisse überschreiben.

### Lokale Tests

Mit Node.js 22+ im Repository-Hauptverzeichnis:

~~~sh
node --test schweiz-atlas/tests/core.test.mjs
node --check schweiz-atlas/app.mjs
node --check schweiz-atlas/services.mjs
node --check schweiz-atlas/catalogue.mjs
~~~

Optionaler Browsertest mit gemockten API-Antworten:

~~~sh
npm install --no-save playwright@1.58.2
npx playwright install chromium
node schweiz-atlas/tests/browser-smoke.mjs
~~~

Der Browsertest überprüft UI, Suche, Kartenlayer, Profil, Filtern und Mobilansicht. **Mock-Daten im Test** beweisen weder aktuelle Erreichbarkeit noch inhaltliche Korrektheit externer Produktions-APIs; dafür sind zusätzliche Live-Smoke-Checks nötig.

### Veröffentlichung

Dieses Repository besitzt bereits einen GitHub-Pages-Workflow, der beim Push auf \`main\` alle statischen Unterordner publiziert. Deshalb wird für GELÄNDE keine weitere Deployment-Konfiguration benötigt. Die bestehende Henkerspiel-Seite wird nicht überschrieben.

## Datenschutz

Keine Analytics, keine Cookies durch die Anwendung. Browseranfragen gehen allerdings an öffentliche Karten-/Datenanbieter sowie an das Leaflet-CDN. Diese erhalten dabei übliche technische Verbindungsdaten. Die Anwendung speichert keine eigenen Standortprofile.
