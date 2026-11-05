# 🍟 Kartoffel-Krawall

Ein kostenloses, deutschsprachiges Browser-Partyspiel für 1–8 Spieler – ohne Installation und ohne Accounts.

## Spielen
Die Seite \`index.html\` im Browser öffnen. Eine Person klickt **Lobby erstellen**, teilt den sechstelligen Code oder Einladungslink, die anderen klicken **Beitreten**. Der Host startet die 90-Sekunden-Runde. Auch allein sind Trainingsrunden mit Bots möglich.

- **WASD / Pfeiltasten**: Laufen
- **Leertaste**: Turbo-Ramme
- **Handy**: Joystick links, Turbo-Knopf rechts
- **Pommes** sammeln und **in der Fritteuse in der Mitte einzahlen**. Beim Turbo-Rammen verlieren Gegner einen Teil ihrer Pommes!
- **🌟** 3 Pommes, **🌶️** Tempoboost, **💣** Verlust und Betäubung

## Multiplayer-Technik
Das Spiel nutzt PeerJS und WebRTC. Ein Spieler ist Host und simuliert die Runde; Freunde verbinden sich per Lobby-Code über den öffentlichen PeerJS-Signalisierungsdienst. Es ist kein eigener Server, Konto oder API-Schlüssel nötig. Der Host muss im Spiel bleiben und alle Spieler brauchen eine Internetverbindung. Manche restriktiven Netzwerke blockieren WebRTC; der öffentliche PeerJS-Dienst hat keine Verfügbarkeitsgarantie. Das Spiel verwendet keine dauerhafte Spieldatenbank.

## Hosting
Statische Dateien; geeignet für GitHub Pages oder jeden HTTPS-Webhost. Der Ordner \`party-panik/\` enthält alles Nötige. In GitHub: **Settings → Pages → Deploy from a branch → main → /(root) → Save**. Danach erreichbar unter \`https://brotesser8.github.io/hnkrspiel/party-panik/\`. Wenn Pages noch nicht eingerichtet ist, kannst du die öffentliche GitHub-Datei über einen HTML-Preview-Host testen.

## Datenschutz
Spitzname wird nur lokal im Browser gespeichert und während der Partie an die Mitspieler übertragen. Der PeerJS-Signalisierungsdienst verarbeitet Verbindungsmetadaten; Browser senden WebRTC-Verbindungsdaten direkt zwischen Teilnehmern.

MIT-Lizenz für den hier neu erstellten Spielcode.