# RIFT — THE PLANET NEVER SLEEPS.

**RIFT** ist ein interaktives 3D-Erd-Observatorium und ein kleines geografisches Ratespiel mit **echten Erdbeben und NASA-Naturereignissen**. Cinematisches Dark-Design, responsive, ohne Registrierung oder API-Schlüssel.

**GitHub Pages:** https://brotesser8.github.io/hnkrspiel/rift/

## Was kann RIFT?

### EXPLORE: den Planeten entdecken

- Frei dreh- und zoombarer 3D-Globus mit atmosphärischem Glow und leuchtenden Eventmarkern
- **USGS:** weltweit gemeldete Erdbeben ab Magnitude 4.5, die letzten sieben Tage
- **NASA EONET:** aktive, jüngst aktualisierte Waldbrände, Stürme und Vulkane mit Punktkoordinaten
- Filter nach Erdbeben, Waldbränden, Stürmen und Vulkanen
- Ereignisse anklicken: der Globus fliegt zur Meldung und zeigt Beschreibung, Magnitude, Tiefe, Datum und Quellenlink
- Globale Statistik: Zahl der Erdbeben, grösste Magnitude, jüngste Meldung, verarbeitete NASA-Ereignisse
- Automatische Aktualisierung in geöffneten Tabs ungefähr alle 10 Minuten, manueller Refresh, eigene Ausfallzustände für die APIs

### SIGNAL HUNT: Geografie als Mission

1. Starte eine Mission aus fünf echten Erdbeben des USGS-Feeds.
2. Erhalte als Hinweis die **Region** (meist Land), Magnitude, Tiefe und Alter der Meldung.
3. Drehe den Globus und **klicke deinen geschätzten Standort** an.
4. Bestätige deinen Tipp. RIFT zeigt die richtige Stelle, eine Verbindung zu deinem Tipp und die Entfernung auf der Erdoberfläche.
5. Sammle maximal **5.000 Punkte pro Runde** (25.000 insgesamt). Ein zusätzlicher Hinweis verrät die Hemisphären, kostet aber 700 Punkte.
6. Nach fünf Runden erhältst du deinen Rang, kannst den Score teilen oder neue zufällig ausgewählte Signale starten.

Die Entfernungen werden über die **Haversine-Formel** auf der Kugel berechnet, nicht aus der Distanz im 2D-Bild. Das Spiel verrät nicht die tatsächlichen Zielkoordinaten vor dem Tipp. Lokal gespeicherter persönlicher Rekord (falls localStorage verfügbar) und optionaler, standardmässig deaktivierter Synth-Sound.

## APIs und Daten

- **USGS Earthquake GeoJSON Feed**, frei und ohne API-Key:
  `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson`
- **NASA EONET API v3**, frei und ohne API-Key:
  `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=30&limit=250`

USGS-GeoJSON: https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php

NASA-EONET-Dokumentation: https://eonet.gsfc.nasa.gov/docs/v3

Der Globus nutzt **Globe.GL** (MIT) als CDN-Bibliothek, mit Three-Globe-Erdtexturen via jsDelivr; WebGL ist erforderlich. Der Rest besteht aus statischem HTML, CSS und Vanilla JS. Kein Token, keine API-Credentials, keine Serverkomponente und kein Build-System nötig.

**Wichtig zur Dateninterpretation:**
- «Live» bedeutet: öffentlich zugängliche **nahezu aktuelle Meldungen**, nicht Sensor-Streaming oder ein amtlicher Alarmdienst. USGS-Angaben können nachträglich korrigiert werden.
- Das NASA-EONET-Ergebnis zeigt nur offene, innerhalb der letzten 30 Tage erfasste Ereignisse. Nur EONET-Geometrien mit echten **Point-Koordinaten** und den drei ausgewählten Kategorien werden dargestellt. Nicht alle Naturereignisse der Erde sind erfasst, und die Quellen unterscheiden sich in ihrer Aktualität.
- Der NASA-Zähler meint die **kartierbaren** Ereignisse, nicht alle API-Datensätze.
- Bei Netzproblemen werden keine erfundenen Events angezeigt. Wenn eine Quelle scheitert, können die anderen Daten weiterhin angezeigt werden. Bei fehlendem WebGL bleibt die Ereignisliste verfügbar, das Geografie-Spiel braucht aber den Globus.
- RIFT dient **Information und Unterhaltung**. Bei akuten Gefahren amtliche Meldungen verwenden; Epizentren und Naturereignisse sind nicht gleichbedeutend mit Gefährdung an einem beliebigen Ort.

## Starten

Im Wurzelverzeichnis des Repositories:

```sh
python3 -m http.server 8000
# http://localhost:8000/rift/
```

Zum Testen mit Node 20+ (auch mit Node 22):

```sh
node --test rift/tests/logic.test.mjs
node --check rift/app.js
node --check rift/logic.mjs
```

## Struktur

```text
rift/
├── index.html        Oberfläche, zugängliche Buttons
├── style.css         Dark-Design und Responsive Layout
├── app.js            API-Requests, WebGL-Globus, Gameplay, UI
├── logic.mjs         USGS-/NASA-Adapter, Distanz und Score
├── favicon.svg       eigenes Icon
├── README.md         Dokumentation
└── tests/
    └── logic.test.mjs
```

Der bestehende GitHub-Pages-Workflow im Repository deployt Unterordner automatisch beim Push auf `main`. Die bisherigen Projekte werden nicht angerührt.

## Lizenz / Hinweise

Eigenständiges Hobbyprojekt. USGS, NASA und Globe.GL sind verlinkte Daten-/Softwarequellen, keine offiziellen Partner oder Unterstützer. Für den Betrieb im grossen Massstab die jeweiligen API-, CDN- und Quellenbedingungen prüfen. Die APIs werden direkt vom Browser aufgerufen; externe Anbieter sehen dabei die üblichen Netzwerkmetadaten wie die IP-Adresse.

Das Spiel und die Geografie-Punkte sind unabhängig von USGS und NASA implementiert.
