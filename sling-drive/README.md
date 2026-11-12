# ROAD EVOLVE — Open-World-3D-Autospiel

Eigenständiges, vollständig selbst programmiertes Mobile-Arcade-Spiel, inspiriert vom Genre der Car-Evolve-Slingshot-Spiele. Keine Originalgrafiken, keine kopierten Assets und keine Verbindung zu Car Evolve / Heseri Games.

## Spielen

Seite `index.html` öffnen. Die Welt wird vollständig mit **WebGL** gerendert – ohne externe JavaScript-Bibliotheken, CDN, Downloads oder API-Keys.

- **Start:** Finger / Maustaste auf der Szene halten und loslassen; länger halten gibt mehr Schub. Auf PC auch Leertaste halten und loslassen.
- **Lenken:** Während der Fahrt seitlich auf der Szene ziehen oder A/D/Pfeiltasten verwenden; die Wiesen neben der Strasse sind befahrbar.
- **Ziel:** So weit wie möglich fahren, Münzen einsammeln, Rampen überspringen und die Zielmarke erreichen.
- **Upgrades:** Schleuder (Launch-Power), Auto (Motor und sichtbar stärkerer Sportwagen), Einkommen (mehr Münzen). Fortschritt bleibt mit `localStorage` im Browser gespeichert.
- **Neue Level:** Nach Erreichen des Ziels wird die nächste längere Strecke freigeschaltet.

## Technik

Reales, perspektivisches WebGL 3D: Vertexbeleuchtung, Tiefentest, Nebel, laufend generierte Hügellandschaften und Strassen, Bäume, Felsen, Goldmünzen, sichtbare 3D-Räder, Kamera-Nachführung, Schwerkraft und Sprungrampen. Mobiles Responsive-Layout, deutscher UI-Text und Einstellungen.

### Hosting

Die drei Dateien `index.html`, `style.css`, `game.js` im selben öffentlichen GitHub-Pages-Ordner ablegen. Keine Build-Tools erforderlich.

**Hinweis:** Das Spiel ist eine eigenständige Hommage an das Genre, kein Nachbau der Original-App und keine vollständige physikalische Fahrzeug-Simulation.
