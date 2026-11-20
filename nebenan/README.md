# FREQUENCY. — An Internet Exploration Device

**Website:** https://brotesser8.github.io/hnkrspiel/nebenan/

FREQUENCY ersetzt die frühere Website NEBENAN. vollständig, ohne andere Unterordner des Repositories zu verändern. Eine interaktive Entdeckungsmaschine mit sechs klar getrennten Kanälen. Keine Endlos-Timeline, keine eigene Nutzeridentität, keine Anmeldung, keine Tracking-Software.

## Die sechs Kanäle

| Kanal | Interaktionen | API |
| --- | --- | --- |
| Elsewhere | Weltweite Städte suchen, Live-Wetter, 6-Tages-Prognose, lokale Uhrzeit, modellierte Luftqualität, Feiertage | Open-Meteo Forecast, Geocoding und Air Quality; Nager.Date |
| Art room | Themen und Kunst auswählen, gemeinfreie Originalkunst betrachten und speichern | Art Institute of Chicago REST + IIIF |
| Page turner | Bücher nach Thema oder freiem Suchtext, Cover und Autoren, Fundstücke merken | Open Library Search + Covers |
| Planet pulse | Erdbeben und Naturereignisse nach Quelle auswählen, Punkte im geografischen Koordinatenraster und Originalmeldung anklicken | USGS Earthquake GeoJSON; NASA EONET v3 |
| Now playing | Meistgespielte Songs in sieben Apple-Music-Regionen, Originaltitel und Quelllinks | Apple Marketing Tools RSS |
| Side quest → MIXUP | Eigenes Bilderquiz aus 15 Kategorien und selbst erstellten Themen, Bild-Effekte, Hinweise, Punktestand | Wikimedia Action API, Art Institute of Chicago, Open Library und FlagCDN |

Die Merkliste nutzt ausschliesslich den Browser-Speicher localStorage. Die Webseite benötigt keinen Account und keinen eigenen Server.

## Gratis, Fair Use und Datenqualität

Alle verwendeten Endpunkte sind ohne eigenen API-Key nutzbar. Eine öffentliche API ist aber **niemals garantiert unbegrenzt**: Open-Meteo ist im nichtkommerziellen Rahmen kostenlos mit Gratisnutzungsgrenzen; andere Dienste können Fair-Use-Regeln, Ratenbegrenzungen oder Ausfälle haben. Die App lädt Daten nur für den benötigten Kanal, benutzt Caches und dedupliziert parallele Requests.

Die Wetterangaben sind Modellwerte, kein Ersatz für lokale amtliche Messstationen. Auch der Europäische Luftqualitätsindex ist modelliert. Feiertage können regional beschränkt sein. Der USGS-Feed zeigt Erdbeben ab Magnitude 2,5 und ist kein Warnsystem. NASA EONET ist ein kuratierter Katalog. Die Apple Charts sind Storefront-Rankings und keine Echtzeitbeobachtungen individueller Menschen.

Bildrechte: Kunst aus dem Art Institute wird anhand des Felds is_public_domain gefiltert. Bei Pokémon-Grafiken, Buch- und Musikcovern sowie Hundefotos gelten die Rechte der jeweiligen Quellen, nicht die MIT-Lizenz des Quellcodes.

## Architektur

- Statische HTML/CSS/JavaScript-Module ohne Framework oder Backend
- Sechs zugängliche ARIA-Tabs inklusive Tastatur-Pfeilnavigation, Fokusindikatoren
- Datenadapter pro Dienst, Anfragen mit Timeout, Caching und Deduplikation
- Abfrage-Token verhindern, dass alte API-Antworten eine neuere Auswahl überschreiben
- Sichere externe Links (HTTPS, noopener noreferrer)
- API-Ausfälle werden angezeigt, keine erfundenen Live-Werte
- Responsives Layout für Smartphones, Tablets und Desktop
- Keine Kartenkacheln oder Kartendaten-CDNs mehr

## Tests

Mit Node.js 22+ im Hauptverzeichnis des Repositories:

    node --check nebenan/app.mjs
    node --check nebenan/api.mjs
    node --check nebenan/core.mjs
    node --test nebenan/tests/core.test.mjs

Browser-Tests mit Playwright und Chrome:

    npm install --no-save playwright@1.58.2
    PLAYWRIGHT_CHANNEL=chrome node nebenan/tests/browser-smoke.mjs

Die Browsertests verwenden bewusst simulierte externe Antworten, damit CI keine öffentlichen API-Dienste unnötig belastet. Das bestätigt UI- und Datenadapterfunktionen, aber nicht die zukünftige Echtzeit-Erreichbarkeit fremder Anbieter.

Der bestehende GitHub-Pages-Workflow veröffentlicht den Ordner unter /hnkrspiel/nebenan/. FREQUENCY checks prüft bei Änderungen an diesem Projekt Unit- und Browsertests. Alle anderen Projekte und Ordner im Repository bleiben unverändert.

**Quellcode-Lizenz:** MIT. Drittanbieterdaten, Abbildungen und Marken ausgenommen.

## MIXUP – Ratespiel mit eigenen Themen

Unter https://brotesser8.github.io/hnkrspiel/nebenan/guess/ liegt jetzt das vollständige Ratespiel. Es ist über den FREQUENCY-Kanal «Side quest» und im oberen Menü erreichbar. Der Spieleinstieg mit ?quick=1 startet direkt einen Standardmix; im Editor kannst du beliebig viele Kombinationen aus 15 integrierten Themen (mit mehr als 200 Begriffen) und bis zu zwölf selbst angelegten Themen speichern. Eigene Themen brauchen mindestens vier Begriffe. Jeder Begriff kann einen Wikipedia-Seitentitel und optional ein eigenes HTTPS-Bild angeben. Auswahl, eigene Themen und Rekordpunkte bleiben im lokalen Browser erhalten. Keine Bild-Uploads oder Backends.

Das Rätsel prüft Bildquellen über die Wikimedia Action API (origin=*), FlagCDN, Open Library und das Art Institute of Chicago. Jeder Blick zeigt einen Quellen-/Lizenzlink. Bei nicht ladbaren Medien werden alternative Fragen versucht und andernfalls ein expliziter Emoji-Ersatz angezeigt. Endpunkte unterliegen Fair Use und ihre Erreichbarkeit kann nicht garantiert werden.
