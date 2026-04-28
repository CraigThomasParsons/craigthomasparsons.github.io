# Warcraft-ish (RTS Experiment)

A simple browser-based RTS-style experiment using HTML, CSS, jQuery, Materialize, and an A* path-finding implementation. Originally hosted on GitHub Pages.

## Project Structure

- `index.html` — main page
- `css/` — stylesheets (`style.css`, `grid.css`, Materialize)
- `js/` — vendored libraries (jQuery, Materialize, A*)
- `jquery/` — jQuery UI assets
- `script/` — game scripts:
  - `script.js` — main game loop, camera, `moveUnit` (jQuery-animate based). When a peasant's next tile stays occupied for ~6 retries (~0.9s), `_walkSegment` calls `GraphSearch.findPathAvoiding` to compute a fresh A* path that walls off every other peasant's current tile and resumes movement toward the original destination, instead of waiting the full ~4.5s and giving up. Capped at 4 reroutes per movement order.
  - `grid.js` — A* pathfinding, mouse handlers, `RTS.gridSearch`. Right-clicking with multiple peasants selected triggers a *spread group move*: `findSpreadDestinations(centerRow, centerCol, count, ignoreIds)` BFS-fans outward from the click (8-connected) to gather one walkable, non-occupied tile per selected unit (skipping walls and tiles held by non-selected peasants), and a greedy nearest-tile assignment routes each peasant via `nodeToCoord` so they don't all queue onto a single tile and time out under collision.
  - `clickndragbox.js` — drag-select rectangle for units
  - `resources.js` — `RTS.Resources` (gold/lumber/stone/food + cost helpers)
  - `hud.js` — top resource bar + slim bottom status/selection bar (`RTS.HUD`)
  - `minimap.js` — top-right minimap (`RTS.Minimap`)
  - `building.js` — building catalog, placement, ghost preview, construction timer, building selection, `placeStaticBuilding` for starting buildings (`RTS.Building`). Build toolbar is anchored to the **Town Hall**: clicking a completed Town Hall shows the build buttons; selecting a peasant or any other building hides them. When the player confirms a placement tile, `pickBuilder(row, col)` auto-picks the nearest non-mining peasant (cancelling a harvest job if no idle peasant is available) and walks them to the build site.
  - `harvest.js` — peasant gold harvesting loop (`RTS.Harvest`): right-click a gold mine with peasants selected to start mining; loop walks to mine → hides peasant ~2.5s → walks to town hall → +25 gold. Tracks per-mine perimeter-tile claims (`buildingClaims`) so multiple harvesters spread across distinct tiles instead of piling onto the closest one and blocking each other via the collision retry loop. `walkPeasantPath` resolves true only if the peasant's actual tile equals the path's last node — interrupted walks (e.g. player issued a Move order mid-trip) resolve false so the loop terminates cleanly instead of "ghost mining" wherever the peasant happened to stop.
  - `sprite.js` — peasant walking animation (`RTS.Sprite`). Drives an 8-direction walk cycle off `assets/sprites/peasant_sheet.png` (a 32×32-frame Warcraft 1 sprite sheet from spriters-resource). Hooked into `moveUnit` via animation `start`/queue callbacks: each path segment picks a direction from its movement vector, the frame timer cycles 5 walk frames at ~140ms, and the unit returns to the still pose (frame 0) when its animation queue empties.
  - `collision.js` — unit-vs-unit collision tracking (`RTS.Collision`). Tracks each peasant's current tile (derived from `offsetTop/Left`) plus a per-unit *reservation* on the tile it's currently animating into. `moveUnit` consults `isOccupied(row, col, exceptUnit)` before each tile step and waits (up to ~4.5s, retrying every 150ms) if blocked, so two peasants never end up stacked on the same 16×16 tile. Mining peasants (class `peasant-mining`, hidden inside the mine) are skipped so multiple harvesters can take turns at the same perimeter tile. Each new movement order bumps a session counter so stale waiters from a cancelled order exit silently.
- `assets/` — images and other media
- `server.js` — minimal Node static file server used in development on Replit

## Running on Replit

The site is fully static. A small Node HTTP server (`server.js`) serves the project root on `0.0.0.0:5000` with cache disabled so the Replit preview always shows the latest changes.

Workflow: `Start application` — runs `node server.js` and listens on port 5000 (webview).

## Deployment

Configured as a static deployment with `publicDir: "."` so the entire repository is published as-is.
