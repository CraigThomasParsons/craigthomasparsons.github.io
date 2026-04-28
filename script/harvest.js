/**
 * Gold harvesting. A peasant can be sent to a Gold Mine (right-click on the
 * mine while the peasant is selected). The peasant then loops:
 *   1. Walk to a tile adjacent to the mine.
 *   2. Enter the mine (sprite hidden) for a couple of seconds.
 *   3. Walk to the Town Hall.
 *   4. Deposit gold (+RTS.Resources.gain).
 *   5. Repeat until interrupted (a different right-click order, or peasant
 *      removed from selection won't stop it but a new move command will).
 */
(function() {
    const TILE = 16;
    const HARVEST_AMOUNT = 25;
    const MINE_DURATION = 2500;
    const DEPOSIT_PAUSE = 700;

    // peasantId -> {active: bool, mine: buildingRecord}
    const jobs = new Map();

    // Track which perimeter tile around a building each peasant is currently
    // walking toward / standing on, so multiple harvesters spread across
    // distinct tiles instead of all piling onto the closest one and blocking
    // each other forever via the collision retry loop.
    //
    // Shape: WeakMap<buildingRecord, Map<"row,col", peasantId>>
    const buildingClaims = new WeakMap();
    // peasantId -> Set of buildingRecord we currently hold a claim on (so we
    // can release them on cancellation without scanning every building).
    const peasantClaimedBuildings = new Map();

    function tileKey(row, col) { return row + ',' + col; }

    function getClaimMap(building) {
        let m = buildingClaims.get(building);
        if (!m) { m = new Map(); buildingClaims.set(building, m); }
        return m;
    }

    /**
     * Claim a perimeter tile for `peasant` on `building`. Releases any
     * previous tile this peasant held on this same building first (so a
     * second mining trip doesn't double-claim).
     */
    function claimPerimeterTile(building, peasant, row, col) {
        const m = getClaimMap(building);
        // Drop our prior tile on this building, if any.
        for (const [key, owner] of m) {
            if (owner === peasant.id) m.delete(key);
        }
        m.set(tileKey(row, col), peasant.id);
        let set = peasantClaimedBuildings.get(peasant.id);
        if (!set) { set = new Set(); peasantClaimedBuildings.set(peasant.id, set); }
        set.add(building);
    }

    /**
     * Release every perimeter-tile claim held by this peasant across all
     * buildings (called on harvest cancel/exit so a later harvester can use
     * the tile we were standing on).
     */
    function releaseAllClaims(peasantId) {
        const set = peasantClaimedBuildings.get(peasantId);
        if (!set) return;
        for (const building of set) {
            const m = buildingClaims.get(building);
            if (!m) continue;
            for (const [key, owner] of m) {
                if (owner === peasantId) m.delete(key);
            }
        }
        peasantClaimedBuildings.delete(peasantId);
    }

    /**
     * True if `(row, col)` is claimed by some *other* peasant on `building`.
     * The peasant's own prior claim (if any) doesn't count as blocking.
     */
    function tileClaimedByOther(building, peasant, row, col) {
        const m = buildingClaims.get(building);
        if (!m) return false;
        const owner = m.get(tileKey(row, col));
        return !!(owner && owner !== peasant.id);
    }

    function status(msg) {
        if (window.RTS && window.RTS.HUD && window.RTS.HUD.setStatus) {
            window.RTS.HUD.setStatus(msg);
        }
    }

    function gridSearch() { return window.RTS && window.RTS.gridSearch; }

    function gridSize() {
        const s = gridSearch();
        return s && s.graph && s.graph.grid ? s.graph.grid.length : 64;
    }

    function isWalkable(row, col) {
        const s = gridSearch();
        const size = gridSize();
        if (row < 0 || col < 0 || row >= size || col >= size) return false;
        return s ? s.isWalkable(row, col) : false;
    }

    function findTownHall() {
        const list = (window.RTS && window.RTS.Building && window.RTS.Building.list()) || [];
        return list.find(function(b) { return b.type === 'town_hall' && b.complete; }) || null;
    }

    /**
     * Build the list of perimeter tiles around `building` that are walkable.
     * Returned tiles are sorted by Manhattan distance from the peasant (so
     * that the path-finding pass tries the closest candidates first).
     */
    function perimeterCandidates(building, fromPeasant) {
        const tiles = building.def.tiles;
        const r0 = building.row;
        const c0 = building.col;
        const list = [];
        for (let c = c0 - 1; c <= c0 + tiles; c++) {
            list.push({ row: r0 - 1, col: c });
            list.push({ row: r0 + tiles, col: c });
        }
        for (let r = r0; r < r0 + tiles; r++) {
            list.push({ row: r, col: c0 - 1 });
            list.push({ row: r, col: c0 + tiles });
        }
        const pRow = Math.floor(fromPeasant.offsetTop / TILE);
        const pCol = Math.floor(fromPeasant.offsetLeft / TILE);
        return list
            .filter(function(c) { return isWalkable(c.row, c.col); })
            .map(function(c) {
                c.dist = Math.abs(c.row - pRow) + Math.abs(c.col - pCol);
                return c;
            })
            .sort(function(a, b) { return a.dist - b.dist; });
    }

    /**
     * Find a path from the peasant to *any* reachable tile on the perimeter
     * of `building`. Tries perimeter tiles closest-first, skipping tiles
     * already claimed by *other* harvesters on the same building. Returns
     * the path on success and claims the chosen tile for this peasant; the
     * claim survives across the harvest cycle until the peasant is
     * cancelled or the loop exits, so other harvesters keep avoiding the
     * tile while we mine/deposit on it.
     *
     * Falls back to claimed tiles only if no unclaimed perimeter tile is
     * reachable, so the peasant still makes some progress instead of
     * stalling silently.
     */
    function findPathToBuilding(peasant, building) {
        const s = gridSearch();
        if (!s) return null;
        const candidates = perimeterCandidates(building, peasant);
        if (!candidates.length) return null;
        const startNode = s.nodeFromUnit(peasant);
        const tryCandidates = function(allowClaimed) {
            for (let i = 0; i < candidates.length; i++) {
                const c = candidates[i];
                if (!allowClaimed && tileClaimedByOther(building, peasant, c.row, c.col)) {
                    continue;
                }
                const $cell = $('#cell_' + c.row + '_' + c.col);
                if (!$cell.length) continue;
                const path = s.nodeToNode(startNode, $cell);
                if (path && path.length) {
                    claimPerimeterTile(building, peasant, c.row, c.col);
                    return path;
                }
            }
            return null;
        };
        return tryCandidates(false) || tryCandidates(true);
    }

    /**
     * Animate a peasant along an already-computed path. Resolves with `true`
     * only when the peasant actually finishes at the target tile, or
     * `false` if the walk was interrupted (e.g. the player issued a Move
     * order mid-trip — `$(unit).stop(true, false)` empties the queue and
     * fires `.done()` even though the peasant didn't arrive). Without this
     * check the harvest loop would happily proceed to "ghost mine" /
     * "ghost deposit" wherever the peasant happened to stop.
     */
    function walkPeasantPath(peasant, path) {
        return new Promise(function(resolve) {
            if (!path || !path.length || typeof window.moveUnit !== 'function') {
                return resolve(false);
            }
            // Cancel any in-flight animation for this peasant before queuing a
            // new one (so the new walk starts immediately). Pair the queue
            // stop with a sprite-timer stop so we don't leak a ticking frame
            // timer between the cancelled walk and the new one — `moveUnit`
            // will restart it.
            $(peasant).stop(true, false);
            if (window.RTS && window.RTS.Sprite) {
                window.RTS.Sprite.stop(peasant);
            }
            window.moveUnit(path, peasant);
            // A* GridNodes use `x` for row and `y` for col (see
            // `js/astar/astar.js` Graph init + `cell_<x>_<y>` id format in
            // grid.js). Compare against the peasant's tile after the
            // animation queue empties — equal means real arrival, mismatch
            // means we were interrupted (e.g. player issued a Move order).
            const target = path[path.length - 1];
            const targetRow = target && typeof target.x === 'number' ? target.x : null;
            const targetCol = target && typeof target.y === 'number' ? target.y : null;
            $(peasant).promise().done(function() {
                if (targetRow == null) return resolve(false);
                const pRow = Math.round(peasant.offsetTop / TILE);
                const pCol = Math.round(peasant.offsetLeft / TILE);
                resolve(pRow === targetRow && pCol === targetCol);
            });
        });
    }

    /**
     * Wait `ms` milliseconds, but bail out early if the job is cancelled.
     * Resolves true if the wait completed, false if the job was cancelled.
     */
    function wait(ms, job) {
        return new Promise(function(resolve) {
            const tick = 100;
            let elapsed = 0;
            const id = setInterval(function() {
                if (!job.active) { clearInterval(id); resolve(false); return; }
                elapsed += tick;
                if (elapsed >= ms) { clearInterval(id); resolve(true); }
            }, tick);
        });
    }

    /**
     * Spawn a small "+25g" floater above the peasant.
     */
    function showFloater(peasant, text) {
        const main = document.getElementById('main');
        if (!main) return;
        const f = document.createElement('div');
        f.className = 'gold-floater';
        f.textContent = text;
        f.style.left = (peasant.offsetLeft) + 'px';
        f.style.top = (peasant.offsetTop - 4) + 'px';
        main.appendChild(f);
        setTimeout(function() {
            if (f.parentNode) f.parentNode.removeChild(f);
        }, 1100);
    }

    function clearVisuals(peasant) {
        peasant.style.opacity = '';
        peasant.classList.remove('peasant-mining');
        peasant.classList.remove('peasant-carrying-gold');
    }

    /**
     * True if the peasant element is still in the DOM and hasn't been
     * despawned by another system.
     */
    function peasantAlive(peasant) {
        return !!(peasant && peasant.isConnected);
    }

    async function harvestLoop(peasant, mine) {
        const job = { active: true, mine: mine };
        jobs.set(peasant.id, job);

        try {
            while (job.active) {
                if (!peasantAlive(peasant)) return;

                const townHall = findTownHall();
                if (!townHall) {
                    status('Need a Town Hall to deposit gold.');
                    return;
                }

                // Walk to the mine via *any* reachable perimeter tile.
                const minePath = findPathToBuilding(peasant, mine);
                if (!minePath) {
                    status('Cannot reach the Gold Mine.');
                    return;
                }
                status('Peasant heading to the Gold Mine…');
                const arrivedMine = await walkPeasantPath(peasant, minePath);
                if (!job.active || !peasantAlive(peasant)) return;
                if (!arrivedMine) return;

                // Enter the mine.
                peasant.classList.add('peasant-mining');
                peasant.style.opacity = '0';
                status('Mining gold…');
                await wait(MINE_DURATION, job);
                if (!peasantAlive(peasant)) return;
                peasant.style.opacity = '';
                peasant.classList.remove('peasant-mining');
                if (!job.active) return;
                peasant.classList.add('peasant-carrying-gold');

                // Walk back to the town hall (re-find each trip — building
                // list could have changed; e.g. the player built another).
                const hallPath = findPathToBuilding(peasant, townHall);
                if (!hallPath) {
                    status('Cannot reach the Town Hall.');
                    return;
                }
                status('Returning to the Town Hall…');
                const arrivedHall = await walkPeasantPath(peasant, hallPath);
                if (!job.active || !peasantAlive(peasant)) return;
                if (!arrivedHall) return;

                // Deposit.
                peasant.classList.remove('peasant-carrying-gold');
                if (window.RTS && window.RTS.Resources) {
                    window.RTS.Resources.gain({ gold: HARVEST_AMOUNT });
                }
                showFloater(peasant, '+' + HARVEST_AMOUNT + 'g');
                status('+' + HARVEST_AMOUNT + ' gold deposited.');
                await wait(DEPOSIT_PAUSE, job);
            }
        } catch (e) {
            console.warn('Harvest loop error', e);
        } finally {
            if (peasantAlive(peasant)) clearVisuals(peasant);
            // Only delete if this is still the active job (a new harvest may
            // have replaced it).
            if (jobs.get(peasant.id) === job) {
                jobs.delete(peasant.id);
                releaseAllClaims(peasant.id);
            }
        }
    }

    function startMining(peasant, mine) {
        if (!peasant || !mine) return;
        if (mine.type !== 'gold_mine') return;
        cancelFor(peasant);
        harvestLoop(peasant, mine);
    }

    function cancelFor(peasant) {
        if (!peasant) return;
        const id = typeof peasant === 'string' ? peasant : peasant.id;
        const job = jobs.get(id);
        if (job) job.active = false;
        jobs.delete(id);
        releaseAllClaims(id);
        const el = typeof peasant === 'string' ? document.getElementById(peasant) : peasant;
        if (el) clearVisuals(el);
    }

    function isHarvesting(peasant) {
        if (!peasant) return false;
        const job = jobs.get(peasant.id);
        return !!(job && job.active);
    }

    window.RTS = window.RTS || {};
    window.RTS.Harvest = { startMining, cancelFor, isHarvesting };
})();
