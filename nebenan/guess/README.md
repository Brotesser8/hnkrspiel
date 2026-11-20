# ALMOST. — The guessing lab

**Play:** https://brotesser8.github.io/hnkrspiel/nebenan/guess/

A new game replacing MIXUP, without silhouettes, image APIs, photos, or external maps. Four distinct estimation mechanics:

- **Scale it**: Resize a landmark silhouette relative to another whose height is known. All objects are original schematic SVGs and share one baseline. The target's real height and the true ratio remain hidden until after submitting.
- **Far apart**: Estimate great-circle distances between cities in kilometres. Distances use curated city-centre coordinates and the Haversine formula, never road routes.
- **Time machine**: Move a marker between 1800 and 2026 to estimate the year when a historical event occurred.
- **Outside now**: Guess the current Open-Meteo model temperature of a random city. Data loads ONLY if weather is selected and is cached for approximately ten minutes.

Players can choose any combination and 5, 8, or 12 rounds. Mouse, touch, and keyboard are supported. Hints reduce the score by 30%. Results are computed from the actual estimation error: an exact result scores 1000 points, and the score decreases continuously with error.

Up to 20 user-defined height comparisons, game settings and best scores are stored only in the browser's localStorage without an account.

## Sources and accuracy

Height data is curated and links to original owners where available: Tour Eiffel 330 m; Burj Khalifa 828 m; Tokyo Skytree 634 m; Elizabeth Tower approx. 96 m (UK Parliament). Other sources are shown at the end of each question. The silhouettes are clearly stylized vectors, not architectural scale models.

Date questions cite archives, NASA, CERN and other linked historical sources. Geographical distances are approximate geodesic distances between named city-centre coordinates, not claimed travel distance.

The noncommercial Open-Meteo tier has finite fair-use limits: the live temperature mode only requests weather when selected, never sends API keys, and displays an honest skip if the service fails. No weather figures are invented. The broader FREQUENCY website retains its independent APIs.

## Tests

Node.js 22+ from repository root:

    node --check nebenan/guess/game.mjs
    node --test nebenan/guess/tests/data.test.mjs

Playwright browser tests use mocked weather responses to avoid burdening the open APIs and test desktop/mobile game interactions.

MIT source code license; linked factual material remains under its respective terms.
