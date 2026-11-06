# ⚓ Pirate Vault — Chest Opening Simulator

Ein kostenloser, **inoffizieller Fan-Simulator** für Schatztruhen mit transparenten Wahrscheinlichkeiten. Keine Echtgeldzahlungen, keine realen Fortnite-Gegenstände, kein Login.

**Live:** https://brotesser8.github.io/hnkrspiel/pirate-vault/

## Wahrscheinlichkeit pro Truhe

Alle 2.000 möglichen Lose sind gleich wahrscheinlich:

| Ergebnis | Lose | Wahrscheinlichkeit |
| --- | ---: | ---: |
| Pirate Shop Access Token (virtuell) | 1 | 0,05% = 1:2.000 |
| A$AP Rocky Skin (virtuell) | 1 | 0,05% = 1:2.000 |
| Rare Treasure (virtuell) | 18 | 0,90% |
| Kein Gewinn | 1.980 | 99,00% |
| **Gesamt** | **2.000** | **100,00%** |

Daraus folgen: **1%** Gewinnchance, davon sind **10%** Supreme, und von den Supreme-Gewinnen sind **50%** Token bzw. **50%** Skin.

Die Ziehung verwendet `crypto.getRandomValues()` und Rejection Sampling, damit bei der Abbildung auf die Zahlen `0..1999` kein Modulo-Bias auftritt. Jedes Öffnen ist unabhängig; es gibt keine Garantien, kein Pity-System und keine versteckten Modifikatoren.

## Funktionen

- Animierte SVG-Schatztruhe, Partikeleffekte, Sound und Drop-Enthüllung
- Einzelöffnung und zehn unabhängige Öffnungen per Button
- Sammlung, Statistiken und Verlauf der letzten 40 Öffnungen
- Lokale Speicherung via `localStorage`, keine Datenbank oder Accounts
- Responsive Smartphone- und Desktop-Oberfläche
- Exakte Drop-Tabelle und Erklärungen im Spiel
- Nur eine `index.html`, keine Abhängigkeiten

## Hinweis

Dieses Fan-Projekt gewährt **keine echten Fortnite-Access-Tokens oder Skins** und steht in keiner offiziellen Verbindung zu Epic Games, Fortnite oder A$AP Rocky. Die Bezeichnungen dienen lediglich der Beschreibung fiktiver simulierter Gegenstände.