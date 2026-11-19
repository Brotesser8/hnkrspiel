# NEBENAN. — Ein Weltlabor für alles Mögliche

**Live (nach erfolgreichem Pages-Deploy):** https://brotesser8.github.io/hnkrspiel/nebenan/

Eine eigenständige, bewusst spielerische Webanwendung im bestehenden Repository. **Der vorhandene Schweizer Atlas \`schweiz-atlas/\` und das Henkerspiel bleiben unangetastet.**

## Die Idee

Ein Land auswählen oder mit dem Globus den nächsten Länder-Mittelpunkt entdecken. Die Auswahl steuert **Länderfakten, lokale UTC-Offset-Anzeige, eine kuratierte Musikchart, Feiertage, Wechselkurse und Weltbank-Statistiken**. Unabhängige Karten zeigen **globale Erdbeben, NASA-Naturereignisse und Vorbeiflüge von Asteroiden**. Ein ÖV-Planer berechnet ausdrücklich angeforderte Verbindungen; ein Länderquiz, ein Pokémon-Schattenspiel und ein Hundebild sorgen für den etwas unsinnigeren Teil.

Das ist kein «alles live»-Fake: Jeder externe Wert hat eine Quelle, Fehler werden angezeigt, und für nicht verfügbare Daten werden keine Ersatzwerte erfunden.

## Eingesetzte Quellen

| Quelle | Einsatz | Eigenschaft |
|---|---|---|
| [countries.dev](https://countries.dev/docs/rate-limits) | Weltweite Länder, Hauptstädte, Flaggen, Bevölkerungsreferenzen, Währungen | Kein Key und keine Kontingent-Tiers, aber Missbrauchsschutz |
| [Apple Marketing Tools RSS](https://performance-partners.apple.com/tools) | Regionales Apple-Music-**Most-Played-Ranking** | Öffentlicher RSS-/JSON-Feed ohne persönlichen Nutzerzugang; CORS/Region kann blockieren |
| [Frankfurter](https://frankfurter.dev/) | Aktuelle veröffentlichte Währungs-Referenzkurse | Keine Tages-/Monatskontingente, Missbrauchs-Ratenlimit |
| [Nager.Date](https://nagerholidays.com/) | Feiertage in ausgewählten Ländern | Freie Community API v4; Gültigkeit ist nicht rechtsverbindlich |
| [World Bank Indicators](https://data.worldbank.org/) | Bevölkerung und Anteil der Internetnutzung mit Datenjahr | Öffentlicher Statistikdienst |
| [USGS Earthquake](https://earthquake.usgs.gov/earthquakes/feed/) | Globale Erdbebenfeeds ab Magnitude 2,5 | Öffentliche Feeds, keine persönlichen Warnungen |
| [NASA EONET](https://eonet.gsfc.nasa.gov/) | Von NASA kuratierte Naturereignisse | Offener NASA-Ereigniskatalog |
| [NASA/JPL CNEOS](https://ssd-api.jpl.nasa.gov/doc/cad.html) | Erdnahe Annäherungen in 7 Tagen | Nur ein Request je erneuter Aktion, JPL-Fair-Use |
| [Transitous](https://transitous.org/api/) | Internationale ÖV-Routen | Offenes, **nichtkommerzielles** Routing, nur per Klick. Siehe Lizenzhinweise |
| [PokéAPI](https://pokeapi.co/docs/v2) | Pokémon-Schattenrätsel | Laut Dokumentation ohne Ratenlimit, trotzdem sparsam nutzen |
| [Dog CEO](https://dog.ceo/dog-api/) | Zufalls-Hundefoto | Öffentlicher Bilddienst, nur auf Knopfdruck |
| [OpenStreetMap](https://www.openstreetmap.org/copyright) | Weltkarte | Öffentliche Kartenkacheln mit Nutzungsregeln und Attribution |

**Keine garantierte unlimitierte öffentliche API:** Anbieter können Ressourcen schützen, drosseln, Dienste ändern oder sperren. Das Projekt verzichtet auf APIs mit kostenpflichtigem Pflicht-Key oder festen monatlichen Freikontingenten. Kein heimliches Retry-Spamming, keine Polling-Schleifen für API-Calls, keine Produktions-Scraper. *Transitous* nennt >720 Planungs-Requests pro 24 Stunden als bedeutende Ressourcenlast: Die Anwendung stellt nur ausdrücklich ausgelöste Planungsanfragen. Für grössere Nutzung wäre eine selbst gehostete Instanz erforderlich.

Eine Musikchart misst nur das Ranking im entsprechenden **Apple-Music-Storefront**, nicht die gerade laufenden Songs oder die Hörgewohnheiten individueller Personen. Das Bild der Weltkarte verwendet **Länder-Mittelpunkte**, keine Punkt-in-Polygon-Bestimmung: ein Kartenklick wählt den nächstgelegenen Mittelpunkt. Die Uhr zeigt einen UTC-Offset aus der Länderquelle, *nicht* garantiert die aktuelle Sommerzeit. Bevölkerungsdaten der Länder-API sind nicht zwingend aktuell; Weltbank-Zahlen zeigen ihr Datenjahr.


## Karten-Navigation 2.0

Die neue Weltkarte ist der Hauptbestandteil des Interfaces. Sie hat jetzt:

- **Echte Länderflächen statt nächstgelegener Zentren:** Vereinfachte Natural-Earth/World-Atlas-110m-Grenzen werden über die öffentliche TopoJSON-CDN-Version geladen und zu GeoJSON umgewandelt. Klick auf eine Landfläche wählt das entsprechende Land anhand des numerischen ISO-Codes. Ein Klick aufs Meer wählt **kein** zufälliges Land. Grenzen sind vereinfacht, besonders kleine Staaten können fehlen.
- **Datenebenen direkt auf der Karte:** „Alle“, „Erdbeben“, „Natur“, „Nur Länder“. Ereignismarker kommen aus den bereits für die Seite geladenen USGS- und NASA-EONET-Antworten – **keine zusätzlichen API-Requests**. Der Marker zeigt Details und gegebenenfalls einen Quellenlink.
- **Bedienhilfen:** Zoom per Mausrad, Touch-Pinch und +/−, Weltansicht, Koordinaten unter dem Mauszeiger, sichtbare Zoomstufe, Massstabsleiste, Legende, Länder-Tooltip, interaktive Hilfe und Kontrastmodus.
- **Grossansicht mit Escape-Taste**, auch auf Mobilgeräten. Animationen respektieren „Reduzierte Bewegung“.
- **Stabileres Rendering:** Der Lade-/Fehlerhinweis liegt ausserhalb des Leaflet-Containers, Länder- und Ereignisebenen haben getrennte Karten-Panes, Grösse wird bei Layoutänderungen neu berechnet. Bei Ausfall der Kartentiles bleiben vorhandene Länder- und Ereignis-Geometrien bedienbar. „Erneut laden“ ist ein manueller Versuch.

Die Grenzen stammen aus [world-atlas](https://github.com/topojson/world-atlas) auf Grundlage von Natural Earth und sind nicht für rechtliche Grenzaussagen geeignet. Sie werden einmal beim Besuch über jsDelivr geladen. Bei Ausfall bleiben die Suche, Länderinformationen und Datenmodule erreichbar. Die Kartenkacheln und die Ausgabe von Country-Facts benötigen Internetzugang.

### Kartentests

Der neue Test \`nebenan/tests/map-data.test.mjs\` validiert TopoJSON-Umwandlung, Länderkennungen, EONET-Koordinaten und USGS-Events. Der Playwright-Browsertest prüft zusätzlich Kachel-Ladezustand, Ländergrenzen, Karte anklicken, Ebenenwechsel, Zoom, Hilfe, Kontrast, Grossansicht und mobile Überläufe. Die Tests verwenden künstliche Beispieldaten und ersetzen keine manuelle Live-API-Prüfung.

## Datenschutz & Technik

- Keine Registrierung, keine App-eigenen Cookies, keine Analytics.
- Statische HTML/CSS/ES-Module ohne Framework oder Backend, für GitHub Pages.
- Blattkarte Leaflet 1.9.4 und OSM-Tiles (nur interaktive Kartenansicht).
- Antwort-Cache pro URL, Requests mit Timeout, Länderwechsel-Token gegen veraltete Antwort.
- Netzwerkadressen und technische Daten sind für die externen API-Anbieter und CDN erreichbar.
- Links immer HTTPS, neue Tabs mit \`noopener noreferrer\`.
- Kein persönlicher Standort wird abgefragt.

### Lokal prüfen

Mit Node.js 22+ im Repository-Hauptverzeichnis:

~~~sh
node --check nebenan/app.mjs
node --check nebenan/map-ui.mjs
node --check nebenan/map-data.mjs
node --check nebenan/api.mjs
node --check nebenan/core.mjs
node --check nebenan/tests/browser-smoke.mjs
node --test nebenan/tests/*.test.mjs
~~~

Browser-End-to-End-Tests verwenden Playwright mit **gemockten** Daten (damit kein CI-Lauf öffentliche APIs belastet):

~~~sh
npm install --no-save playwright@1.58.2
npx playwright install chromium
node nebenan/tests/browser-smoke.mjs
~~~

Alle Commits in \`nebenan/\` starten den automatisierten GitHub-Actions-Lauf [nebenan-checks.yml](../.github/workflows/nebenan-checks.yml). Screenshots für Desktop und Mobilgerät liegen als Actions-Artefakt vor. Externe Anbieter werden **nicht** im CI belastet; Produktions-API-Änderungen oder CORS-Probleme sind damit ausdrücklich **nicht** ausgeschlossen.

## Veröffentlichung & Lizenz

Das Repository \`Brotesser8/hnkrspiel\` hat bereits einen GitHub-Pages-Workflow, der alle Unterordner publiziert. NEBENAN. liegt deshalb automatisch unter \`/hnkrspiel/nebenan/\`; andere Projekte werden nicht verändert.

Quellcode im Ordner unter MIT-Lizenz. Für Transitous: nichtkommerzielle Nutzung, Attribution [Transitous Datenquellen](https://transitous.org/sources/), Quellcode öffentlich auf GitHub, Kontakt via [GitHub Issues](https://github.com/Brotesser8/hnkrspiel/issues). Für Karten: © OpenStreetMap-Mitwirkende / ODbL. Inhalte externer APIs behalten die jeweiligen Rechte ihrer Anbieter; insbesondere Albumcover und Pokémon-Abbildungen sind **nicht** durch MIT neu lizenziert.
