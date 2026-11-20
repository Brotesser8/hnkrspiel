# MIXUP – Rate einfach alles

**Spiel:** https://brotesser8.github.io/hnkrspiel/nebenan/guess/

Ein kostenloses Bilder-Ratespiel für FREQUENCY mit 15 kuratierten Kategorien und über 200 Rätselbegriffen. Unter anderem Tiere, Essen, Flaggen, Architektur, Weltraum, Fahrzeuge, Technik, Sportarten, Instrumente, Natur, Pflanzen, berühmte Kunst, Buchcover und Dinosaurier.

## So funktioniert es

1. Wähle beliebige Kategorien aus, oder verwende «Alle auswählen».
2. Optional: Lege unter «Deine eigenen Themen» weitere Kategorien mit mindestens vier eigenen Begriffen an. Eine Zeile entspricht einem Begriff; nach einem senkrechten Strich kann der passende englische oder deutsche Wikipedia-Seitentitel angegeben werden, optional nach einem weiteren Strich ein eigenes HTTPS-Bild. Beispiel: Matterhorn | Matterhorn | https://example.org/photo.jpg. Die Bildrechte für eigene URLs liegen in deiner Verantwortung.
3. Stelle 5, 10 oder 20 Runden ein, wähle Multiple Choice oder selber schreiben, und kombiniere Silhouette, Weichzeichner oder verdeckte Bildfelder mit optionalem 20-/40-Sekunden-Timer.
4. Hole bis zu zwei Hinweise für je −25 Punkte. Multiple-Choice-Antworten geben normalerweise 100 Punkte, freie Eingabe 150 Punkte. Ein Zeitbonus kann hinzukommen.
5. Am Ende: Punktestand, Trefferquote, beste Serie und Rückblick auf die Fragen.

Der Mix, eigene Themen und Bestwert werden **ausschliesslich lokal im Browser** gespeichert. Das Spiel läuft ohne Registrierung, ohne Werbung und ohne eigenen Server.

## Quellen und Einschränkungen

- [MediaWiki Action API](https://www.mediawiki.org/wiki/API:Pageimages) für Wikipedia-Artikelbilder ohne API-Key, anonym mit CORS-Parameter origin=*.
- [Wikimedia Commons](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia) / Wikipedia-Bilddateiseiten für Lizenzen und Namensnennung.
- [Art Institute of Chicago](https://api.artic.edu/docs/) für nach Werkstitel gefundene, als gemeinfrei gekennzeichnete Gemälde.
- [Open Library](https://openlibrary.org/developers/api) für Buchcover. Cover können urheberrechtlich geschützt sein.
- [FlagCDN](https://flagcdn.com/) für Flaggenbilder.

Die externen Dienste sind kostenlos beziehungsweise öffentlich, aber nicht unbegrenzt garantiert: Es gelten Fair-Use- und mögliche Drosselungsregeln. Bilder und Antworten werden nur bei Bedarf abgerufen und teilweise gecacht. Wenn ein Bild fehlt oder die Quelle nicht funktioniert, versucht das Spiel weitere Fragen; andernfalls weist es explizit auf den Emoji-Ersatzmodus hin.

Buchcover und Wikipedia-Fotos haben eigene Bildrechte, die beim jeweiligen Quellenlink nachgesehen werden können. Der Spielcode steht unter der MIT-Lizenz des FREQUENCY-Projekts; externe Bilder sind davon ausgenommen.

## Testen

Node.js 22+:

    node --check nebenan/guess/game.mjs
    node --test nebenan/guess/tests/data.test.mjs

Chrome + Playwright:

    npm install --no-save playwright@1.58.2
    PLAYWRIGHT_CHANNEL=chrome node nebenan/guess/tests/browser-smoke.mjs

Die automatisierten Browsertests simulieren externe APIs, damit keine offenen Dienste im CI belastet werden. Die Tests decken Spielschritte, Punktelogik, eigene Themen, lokale Persistenz, Bildmasken, freie Eingabe und mobile Breiten ab. Die zukünftige Erreichbarkeit öffentlicher Anbieter lässt sich damit nicht dauerhaft garantieren.
