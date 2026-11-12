# VeloFinder CH – PubliBike / Velospot Karte

Eine **statische Website für GitHub Pages** mit einer interaktiven Schweizer Karte, anklickbaren PubliBike- und Velospot-Stationen und API-basierten Verfügbarkeitszahlen. Ohne Datenbank, ohne API-Key.

## Was die Website kann

- Schweizer Karte mit **Leaflet + OpenStreetMap**, zoombar und verschiebbar
- Farbig markierte Stationen mit der **Anzahl verfügbarer Fahrzeuge im Punkt**
- Stations-Cluster beim Herauszoomen: **Cluster-Zahl = Stationen, nicht Velos**
- Anklicken einer Station für Velo-Gesamtzahl, normale Velos, E-Bikes und Routen-Link
- Suche nach Stationsnamen, Strassen, PLZ und Städten
- Stadt-/Ortsfilter, Filter „Verfügbar“ und „E-Bikes“, Standort-Funktion
- **Automatische Aktualisierung alle 2 Minuten**, manueller Refresh frühestens nach 60 Sekunden
- Mobile Ansicht und verständliche Fehlermeldung, wenn keine Live-Daten vorliegen

**Wichtig:** Die API wurde anhand aktueller Dokumentation und externer Quellen eingebunden. Ein direkter Live-Aufruf war in der Entwicklungsumgebung nicht möglich. Ob CORS und alle Response-Felder in deinem Browser wie erwartet funktionieren, muss nach dem Veröffentlichen geprüft werden. Die Webseite **erfindet keine Zahlen**: nicht gemeldete Verfügbarkeiten werden mit `–` bzw. `?` angezeigt.

## 1. Auf GitHub Pages veröffentlichen

1. Auf https://github.com ein neues **öffentliches** Repository erstellen, z. B. `publibike-karte`.
2. Die fünf für die Webseite benötigten Dateien `index.html`, `styles.css`, `app.js`, `data.js`, `favicon.svg` in die Wurzel des Repositories hochladen. Die Datei `README.md` ist optional, aber empfehlenswert.
3. Im Repository **Settings → Pages → Build and deployment → Deploy from a branch** auswählen.
4. Branch **main**, Ordner **/(root)** wählen und speichern.
5. Die Karte unter `https://DEIN-NAME.github.io/publibike-karte/` aufrufen.

Du kannst auch einfach **alle Dateien** aus dem ZIP im Repository hochladen – `worker.js` wird von GitHub Pages nicht ausgeführt, beeinträchtigt die Website aber nicht.

## 2. APIs und Datenfelder

Die Website versucht folgende Quellen **in dieser Reihenfolge**:

1. **Neu, kombiniert:** `https://rest.publibike.ch/v1/public/all/stations` – enthält gemäß aktuellem Integrationsprojekt sowohl `velospot.responseData` als auch `publibike.stations`.
2. **Älter:** `https://api.publibike.ch/v1/public/partner/stations` – alle sichtbaren PubliBike-Stationen mit `vehicles`.
3. **Fallback:** `https://api.publibike.ch/v1/gbfs/v2/gbfs.json` – GBFS-Auto-Discovery; `station_information` plus `station_status`.

Die Werte werden in `data.js` auf ein gemeinsames Datenmodell normalisiert. Fehlende Werte werden nicht als `0` dargestellt.

**API-Regel:** Für `/public/partner/stations` gibt PubliBike ein maximales Abrufintervall von einmal pro Minute vor. Die Website aktualisiert alle 2 Minuten.

**Besonderheit:** Die neue Velospot-Antwort unterscheidet sich vom Legacy-Schema. Falls der Anbieter das Schema verändert, muss eventuell die Feldzuordnung in `data.js` angepasst werden. E-Bike-Zahlen werden nur angezeigt, wenn sie von der Quelle abgeleitet werden können.

## 3. Wenn der Browser die Daten blockiert (CORS)

GitHub Pages kann keinen Node.js-Server ausführen. Die neue PubliBike-API meldet aktuell CORS-Unterstützung; falls sie sich ändert, kannst du einen **kostenlosen Cloudflare Worker** als kleinen API-Proxy verwenden.

1. Auf https://dash.cloudflare.com bei **Workers & Pages** einen neuen Worker erstellen.
2. Die vorliegende Datei `worker.js` als Worker-Code einsetzen und bereitstellen (JavaScript Module-Syntax).
3. Optional in den Worker-Einstellungen eine Textvariable `ALLOWED_ORIGIN` mit dem genauen Ursprung deiner Website setzen, z. B. `https://DEIN-NAME.github.io` (ohne Pfad). Ohne diese Variable erlaubt der Worker CORS für alle Ursprünge.
4. In `app.js` ganz oben die Zeile `const CUSTOM_API_URL = '';` ändern in:

   ```javascript
   const CUSTOM_API_URL = 'https://DEIN-WORKER.DEIN-SUBDOMAIN.workers.dev/stations';
   ```

5. `app.js` neu auf GitHub hochladen und Seite aktualisieren.

Der Worker verwendet einen 60-Sekunden-Cache. Er gibt nur die feste PubliBike-API weiter, keine beliebigen Webadressen.

## 4. Lokaler Test

In diesem Ordner einen kleinen lokalen Server starten:

```bash
python3 -m http.server 8000
```

Dann `http://localhost:8000` im Browser öffnen. Für die Standort-Funktion ist `localhost` oder HTTPS nötig. JavaScript-Parser-Tests:

```bash
node tests/test-data.js
```

## Grenzen und Quellen

- Die auf der Karte sichtbaren Zahlen sind **Momentaufnahmen**, keine Reservierungsgarantie.
- Eine Schweizer Station ohne vollständige, öffentlich gelieferte Belegung erscheint gegebenenfalls mit `?`.
- Die Verfügbarkeit kann zwischen zwei Aktualisierungen schwanken.
- Die Website ist ein unabhängiges Projekt und keine offizielle PubliBike-Anwendung.
- Die Karte benötigt Internet für Kartenkacheln (OpenStreetMap), Leaflet-Bibliotheken und die API.
- Externe Kartenkacheln unterliegen den Nutzungsregeln von OpenStreetMap; bei sehr grossem Traffic einen Tile-Dienst mit passendem Nutzungsvertrag verwenden.

**Quellen:**

- PubliBike API Dokumentation: https://api.publibike.ch/v1/static/api.html
- PubliBike / Velospot neue API – Integration: https://github.com/mr-deamon/publibike_stations
- GBFS-Verzeichnis: https://mobilitydatabase.org/feeds/gbfs/gbfs-publibike
- PubliBike-Standortkarte: https://www.publibike.ch/de/karte
- Leaflet: https://leafletjs.com
- OpenStreetMap: https://www.openstreetmap.org/copyright

MIT-artiges privates Demo-Projekt. Keine offizielle Beziehung zu PubliBike. Eigenständiges Design, keine offiziellen Logos verwendet.

## Veröffentlicht auf GitHub

Dieses Projekt befindet sich im Unterordner `publibike-karte/` des öffentlichen Repositories `Brotesser8/hnkrspiel`. Der bestehende GitHub-Pages-Workflow veröffentlicht auch diesen Ordner. Die voraussichtliche URL ist https://brotesser8.github.io/hnkrspiel/publibike-karte/ . Die tatsächliche Pages-Auslieferung und Live-API-Verbindung müssen separat verifiziert werden.


## Öffentlicher Verkehr (ÖV)

Die Webseite zeigt neben PubliBike/Velospot eine anklickbare ÖV-Kartenebene für Züge, Busse, Trams, Schiffe, Seilbahnen und weitere Kategorien. Dazu fragt `transit.js` die öffentliche [Transport API](https://transport.opendata.ch/docs.html) über HTTPS/CORS ab; ein API-Schlüssel ist nicht nötig.

- Pro Kartenausschnitt wird eine begrenzte Auswahl wichtiger und lokaler Haltestellen über `/stationboard` und `/locations` abgefragt (max. 14). **Das ist keine vollständige landesweite Fahrzeugliste.**
- Wenn die Abfahrts- oder Ankunftsprognose vorhanden ist, wird sie für die Berechnung verwendet; andernfalls die Planzeit. Die Position wird geradlinig zwischen aufeinanderfolgenden Haltestellen interpoliert, sobald genügend Informationen über den Fahrtverlauf (`passList`) verfügbar sind.
- Die Fahrzeugmarker sind **keine echten GPS-Positionen** und die Linien auf der Karte **keine echte Fahrweg-Geometrie**. Bei unzureichenden Informationen werden keine erfundenen bewegten Fahrzeuge eingeblendet; einzelne Haltestellenpositionen können kurz um die angegebene Zeit erscheinen.
- Bei Klick auf ein Fahrzeug erscheinen Linie, Fahrtrichtung, Datenqualität und Haltefolge. Filter und separate Schalter für ÖV und Mietvelos stehen links.
- Die Markerposition wird lokal alle sechs Sekunden animiert, die Fahrplandaten werden nach Möglichkeit nur etwa alle drei Minuten beziehungsweise bei einem signifikanten Kartenausschnitt-Wechsel erneuert. Bitte das offene API nicht häufig pollen.

**Offene Daten:** [Opendata.ch Transport API](https://transport.opendata.ch/), Fahrplandaten und Echtzeitprognosen von [opentransportdata.swiss](https://opentransportdata.swiss/). Die nationale GTFS-RT-Schnittstelle publiziert keine Vehicle-Positions: [Dokumentation](https://opentransportdata.swiss/de/cookbook/event-cookbook/gtfs-sa/).

Für eine umfassendere, öffentlich betriebene ÖV-Karte mit simulierten Fahrzeugpositionen siehe auch das [Kartenbeispiel der Transport API](https://transport.opendata.ch/examples/map.html).
