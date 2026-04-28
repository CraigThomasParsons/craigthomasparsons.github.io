/**
 * Building system: place new buildings on the grid via the Town Hall.
 *
 * Workflow:
 *   1. Click the Town Hall to select it. The build toolbar appears in the
 *      bottom-left (only while a *completed* town hall is selected).
 *   2. Click a building button to enter placement mode. A ghost building
 *      follows the cursor, snapped to the tile grid. It is green when the
 *      footprint is valid, red when blocked by walls or other buildings.
 *   3. Left-click to confirm. A nearby idle peasant is auto-picked as the
 *      builder and walks toward the build site, the construction sprite
 *      appears, the tiles become walls in the path-finder, and after a
 *      short build timer the building completes.
 *   4. Press Esc or right-click to cancel placement. Selecting a peasant
 *      (or any non-town-hall building) hides the toolbar.
 */
(function() {
    const TILE = 16;
    const SPRITE_DIR = 'assets/tilesets/forest/human/buildings/';
    const NEUTRAL_DIR = 'assets/tilesets/forest/neutral/buildings/';

    const BUILDINGS = {
        town_hall: {
            label: 'Town Hall',
            sprite: SPRITE_DIR + 'town_hall.png',
            construction: SPRITE_DIR + 'town_hall_construction.png',
            tiles: 4,
            buildTime: 8000,
            cost: { gold: 1200, lumber: 800 },
            description: 'Center of operations. Trains peasants.',
        },
        gold_mine: {
            label: 'Gold Mine',
            sprite: NEUTRAL_DIR + 'gold_mine.png',
            tiles: 4,
            // Can't be built by the player — exists as a resource node.
            hidden: true,
            description: 'Send peasants here to mine gold.',
        },
        barracks: {
            label: 'Barracks',
            sprite: SPRITE_DIR + 'barracks.png',
            construction: SPRITE_DIR + 'barracks_construction.png',
            tiles: 4,
            buildTime: 7000,
            cost: { gold: 700, lumber: 450 },
        },
        farm: {
            label: 'Farm',
            sprite: SPRITE_DIR + 'farm.png',
            construction: SPRITE_DIR + 'farm_construction.png',
            tiles: 3,
            buildTime: 4000,
            cost: { gold: 500, lumber: 250 },
            // Adds +4 to food cap when complete.
            grants: { foodCap: 4 },
        },
        lumber_mill: {
            label: 'Lumber Mill',
            sprite: SPRITE_DIR + 'lumber_mill.png',
            construction: SPRITE_DIR + 'lumber_mill_construction.png',
            tiles: 4,
            buildTime: 6000,
            cost: { gold: 600, lumber: 450 },
        },
        blacksmith: {
            label: 'Blacksmith',
            sprite: SPRITE_DIR + 'blacksmith.png',
            construction: SPRITE_DIR + 'blacksmith_construction.png',
            tiles: 3,
            buildTime: 6000,
            cost: { gold: 800, lumber: 450, stone: 50 },
        },
        church: {
            label: 'Church',
            sprite: SPRITE_DIR + 'church.png',
            construction: SPRITE_DIR + 'church_construction.png',
            tiles: 4,
            buildTime: 7000,
            cost: { gold: 900, lumber: 500, stone: 50 },
        },
        stable: {
            label: 'Stable',
            sprite: SPRITE_DIR + 'stable.png',
            construction: SPRITE_DIR + 'stable_construction.png',
            tiles: 4,
            buildTime: 7000,
            cost: { gold: 1000, lumber: 300 },
        },
        tower: {
            label: 'Tower',
            sprite: SPRITE_DIR + 'tower.png',
            construction: SPRITE_DIR + 'tower_construction.png',
            tiles: 3,
            buildTime: 5000,
            cost: { gold: 550, lumber: 200, stone: 100 },
        },
    };

    function costString(cost) {
        if (!cost) return '';
        const parts = [];
        if (cost.gold) parts.push(cost.gold + 'g');
        if (cost.lumber) parts.push(cost.lumber + 'w');
        if (cost.stone) parts.push(cost.stone + 's');
        return parts.join(' ');
    }

    function status(msg) {
        if (window.RTS && window.RTS.HUD && window.RTS.HUD.setStatus) {
            window.RTS.HUD.setStatus(msg);
        }
    }

    // Active placement: { type, def, ghostEl }
    let placement = null;
    // List of placed buildings: { type, def, row, col, el }
    const buildings = [];

    /**
     * Convert a page coordinate into a grid tile (row, col) inside #main.
     * Returns null if outside the map.
     */
    function pageToTile(pageX, pageY) {
        const main = document.getElementById('main');
        if (!main) return null;
        const rect = main.getBoundingClientRect();
        const localX = pageX - (rect.left + window.scrollX);
        const localY = pageY - (rect.top + window.scrollY);
        if (localX < 0 || localY < 0 || localX >= main.offsetWidth || localY >= main.offsetHeight) {
            return null;
        }
        return {
            col: Math.floor(localX / TILE),
            row: Math.floor(localY / TILE),
        };
    }

    function gridSize() {
        const main = document.getElementById('main');
        return main ? Math.floor(main.offsetWidth / TILE) : 0;
    }

    function isFootprintValid(row, col, tiles) {
        const size = gridSize();
        if (row < 0 || col < 0 || row + tiles > size || col + tiles > size) {
            return false;
        }
        const search = window.RTS && window.RTS.gridSearch;
        if (!search) return false;
        for (let r = row; r < row + tiles; r++) {
            for (let c = col; c < col + tiles; c++) {
                if (!search.isWalkable(r, c)) return false;
            }
        }
        return true;
    }

    function selectedPeasants() {
        return document.querySelectorAll('.peasant.unitSelected');
    }

    function ensureGhost(def) {
        if (placement && placement.ghostEl) return placement.ghostEl;
        const ghost = document.createElement('div');
        ghost.className = 'building-ghost building-ghost-invalid';
        ghost.style.width = (def.tiles * TILE) + 'px';
        ghost.style.height = (def.tiles * TILE) + 'px';
        ghost.style.backgroundImage = "url('" + def.sprite + "')";
        ghost.style.backgroundSize = '100% 100%';
        ghost.style.position = 'absolute';
        ghost.style.pointerEvents = 'none';
        ghost.style.display = 'none';
        document.getElementById('main').appendChild(ghost);
        return ghost;
    }

    function updateGhost(pageX, pageY) {
        if (!placement) return;
        const tile = pageToTile(pageX, pageY);
        if (!tile) {
            placement.ghostEl.style.display = 'none';
            placement.lastTile = null;
            return;
        }
        // Center the footprint on the cursor tile.
        const offset = Math.floor(placement.def.tiles / 2);
        const row = Math.max(0, tile.row - offset);
        const col = Math.max(0, tile.col - offset);
        placement.lastTile = { row, col };
        placement.ghostEl.style.display = 'block';
        placement.ghostEl.style.left = (col * TILE) + 'px';
        placement.ghostEl.style.top = (row * TILE) + 'px';

        const valid = isFootprintValid(row, col, placement.def.tiles);
        placement.ghostEl.classList.toggle('building-ghost-valid', valid);
        placement.ghostEl.classList.toggle('building-ghost-invalid', !valid);
        placement.lastValid = valid;
    }

    function startPlacement(type) {
        const def = BUILDINGS[type];
        if (!def) return;
        // The toolbar is now driven by a Town Hall selection, so we no
        // longer require a peasant to be selected to start placement —
        // we pick a builder automatically when the player confirms the
        // tile (see `pickBuilder` below). We do still need *some* peasant
        // alive to actually construct it.
        if (document.querySelectorAll('.peasant').length === 0) {
            status('You need a peasant to build anything.');
            return;
        }
        if (window.RTS && window.RTS.Resources && !window.RTS.Resources.canAfford(def.cost)) {
            status('Not enough resources for ' + def.label + ' (' + costString(def.cost) + ').');
            return;
        }
        cancelPlacement();
        placement = { type, def, ghostEl: null, lastTile: null, lastValid: false };
        placement.ghostEl = ensureGhost(def);
        status('Placing ' + def.label + ' — left-click to confirm, Esc to cancel.');
    }

    /**
     * Pick the best peasant to send to a build site. Prefers a peasant
     * that isn't currently mining (so we don't interrupt active harvest
     * loops). Within each preference bucket, picks the one with the
     * shortest Manhattan distance to (row, col). Returns null if there
     * are no peasants on the map.
     */
    function pickBuilder(row, col) {
        const peasants = Array.from(document.querySelectorAll('.peasant'));
        if (peasants.length === 0) return null;
        const Harvest = window.RTS && window.RTS.Harvest;
        const score = function(p) {
            const pRow = Math.round(p.offsetTop / TILE);
            const pCol = Math.round(p.offsetLeft / TILE);
            return Math.abs(pRow - row) + Math.abs(pCol - col);
        };
        const idle = peasants.filter(function(p) {
            return !(Harvest && Harvest.isHarvesting(p));
        });
        const pool = idle.length ? idle : peasants;
        pool.sort(function(a, b) { return score(a) - score(b); });
        const builder = pool[0];
        // If we had to grab a mining peasant, free them up first so the
        // harvest loop doesn't fight for control of their movement queue.
        if (builder && Harvest && Harvest.isHarvesting(builder)) {
            Harvest.cancelFor(builder);
        }
        return builder;
    }

    function cancelPlacement() {
        if (placement && placement.ghostEl && placement.ghostEl.parentNode) {
            placement.ghostEl.parentNode.removeChild(placement.ghostEl);
        }
        placement = null;
    }

    /**
     * Place a building at the given grid coordinates and start the build timer.
     */
    function placeBuilding(type, def, row, col, builder) {
        const search = window.RTS && window.RTS.gridSearch;
        if (!search) return;

        // Charge the cost up front; bail out if we somehow can't afford it
        // (e.g. resources changed between starting and confirming placement).
        if (window.RTS && window.RTS.Resources) {
            if (!window.RTS.Resources.spend(def.cost)) {
                status('Not enough resources for ' + def.label + '.');
                return;
            }
        }

        // Mark tiles as walls in the path-finder.
        for (let r = row; r < row + def.tiles; r++) {
            for (let c = col; c < col + def.tiles; c++) {
                search.setWall(r, c, true);
            }
        }

        // Create construction sprite.
        const el = document.createElement('div');
        el.className = 'building building-construction';
        el.style.width = (def.tiles * TILE) + 'px';
        el.style.height = (def.tiles * TILE) + 'px';
        el.style.left = (col * TILE) + 'px';
        el.style.top = (row * TILE) + 'px';
        el.style.backgroundImage = "url('" + def.construction + "')";
        el.style.backgroundSize = '100% 100%';
        el.dataset.type = type;
        document.getElementById('main').appendChild(el);

        const record = { type, def, row, col, el, complete: false };
        buildings.push(record);
        attachClickHandler(record);

        // Send the builder peasant toward the build site if we have one.
        if (builder && window.moveUnit && search.search) {
            try {
                // Target a tile just below the building's bottom-left corner.
                const targetRow = Math.min(gridSize() - 1, row + def.tiles);
                const targetCol = col;
                const $endCell = $('#cell_' + targetRow + '_' + targetCol);
                if ($endCell.length) {
                    const path = search.nodeToNode(search.nodeFromUnit(builder), $endCell);
                    if (path && path.length) {
                        window.moveUnit(path, builder);
                    }
                }
            } catch (e) {
                console.warn('Builder pathing failed', e);
            }
        }

        // After the build timer, swap to the completed sprite and grant
        // anything the building gives the player (e.g. farms add food cap).
        setTimeout(function() {
            el.classList.remove('building-construction');
            el.classList.add('building-complete');
            el.style.backgroundImage = "url('" + def.sprite + "')";
            record.complete = true;
            if (def.grants && window.RTS && window.RTS.Resources) {
                window.RTS.Resources.gain(def.grants);
            }
            status(def.label + ' complete.');
            refreshAllButtons();
            // Refresh selection panel if this building is currently selected.
            if (selectedBuilding === record && window.RTS && window.RTS.HUD &&
                window.RTS.HUD.setBuildingSelection) {
                window.RTS.HUD.setBuildingSelection(record);
            }
        }, def.buildTime);

        status(def.label + ' under construction… (-' + costString(def.cost) + ')');
        refreshAllButtons();
    }

    /**
     * Place a fully-built, free-of-charge building immediately. Used for the
     * starting town hall and the gold mine. The building is selectable but
     * does not move and does not deduct resources.
     */
    function placeStaticBuilding(type, row, col) {
        const def = BUILDINGS[type];
        if (!def) return null;
        const search = window.RTS && window.RTS.gridSearch;

        // Mark tiles as walls so units path around the structure.
        if (search) {
            for (let r = row; r < row + def.tiles; r++) {
                for (let c = col; c < col + def.tiles; c++) {
                    search.setWall(r, c, true);
                }
            }
        }

        const el = document.createElement('div');
        el.className = 'building building-complete';
        el.style.width = (def.tiles * TILE) + 'px';
        el.style.height = (def.tiles * TILE) + 'px';
        el.style.left = (col * TILE) + 'px';
        el.style.top = (row * TILE) + 'px';
        el.style.backgroundImage = "url('" + def.sprite + "')";
        el.style.backgroundSize = '100% 100%';
        el.dataset.type = type;
        document.getElementById('main').appendChild(el);

        const record = { type, def, row, col, el, complete: true, starting: true };
        buildings.push(record);
        attachClickHandler(record);
        return record;
    }

    /**
     * Update the enabled state of every build button based on the current
     * resources. Also updates each button's tooltip with the cost.
     */
    function refreshAllButtons() {
        const bar = document.getElementById('build-toolbar');
        if (!bar) return;
        const buttons = bar.querySelectorAll('.build-btn[data-type]');
        const Res = window.RTS && window.RTS.Resources;
        buttons.forEach(function(btn) {
            const def = BUILDINGS[btn.dataset.type];
            if (!def) return;
            const affordable = !Res || Res.canAfford(def.cost);
            btn.classList.toggle('build-btn-disabled', !affordable);
            btn.title = def.label + ' — ' + costString(def.cost);
        });
    }

    // ----- Building selection -----
    let selectedBuilding = null;

    function clearPeasantSelection() {
        const peasants = document.querySelectorAll('.peasant.unitSelected');
        peasants.forEach(function(p) {
            if (typeof window.unSelectUnit === 'function') {
                window.unSelectUnit(p.id);
            } else {
                p.classList.remove('unitSelected');
            }
        });
    }

    function selectBuilding(record) {
        if (selectedBuilding && selectedBuilding.el) {
            selectedBuilding.el.classList.remove('building-selected');
        }
        selectedBuilding = record;
        if (record && record.el) {
            record.el.classList.add('building-selected');
        }
        clearPeasantSelection();
        if (window.RTS && window.RTS.HUD && window.RTS.HUD.setBuildingSelection) {
            window.RTS.HUD.setBuildingSelection(record);
        }
    }

    function clearBuildingSelection() {
        if (selectedBuilding && selectedBuilding.el) {
            selectedBuilding.el.classList.remove('building-selected');
        }
        selectedBuilding = null;
        if (window.RTS && window.RTS.HUD && window.RTS.HUD.setBuildingSelection) {
            window.RTS.HUD.setBuildingSelection(null);
        }
    }

    function attachClickHandler(record) {
        if (!record.el) return;
        record.el.classList.add('building-clickable');
        record.el.addEventListener('mousedown', function(e) {
            // Don't intercept clicks during placement (would block placement clicks).
            if (placement) return;
            // Right-click is reserved for movement/harvest orders.
            if (e.button === 2) return;
            e.stopPropagation();
            e.preventDefault();
            selectBuilding(record);
        });

        // Right-click on a building issues an order using selected peasants.
        // Currently only the gold mine has an order: start harvesting.
        record.el.addEventListener('contextmenu', function(e) {
            if (placement) return;
            e.preventDefault();
            e.stopPropagation();
            if (record.type !== 'gold_mine') return;
            const peasants = document.querySelectorAll('.peasant.unitSelected');
            if (peasants.length === 0) {
                if (window.RTS && window.RTS.HUD) {
                    window.RTS.HUD.setStatus('Select a peasant first to mine gold.');
                }
                return;
            }
            if (window.RTS && window.RTS.Harvest) {
                peasants.forEach(function(p) {
                    window.RTS.Harvest.startMining(p, record);
                });
            }
        });
    }

    /**
     * Handle a left-click during placement. Returns true if the click was consumed.
     */
    function handleMouseDown(event) {
        if (!placement) return false;

        // Right-click cancels.
        if (event.button === 2 || event.which === 3) {
            cancelPlacement();
            return true;
        }

        // Only handle left-clicks.
        if (event.button !== 0 && event.which !== 1) {
            return true; // consume but don't act
        }

        updateGhost(event.pageX, event.pageY);
        if (!placement.lastTile || !placement.lastValid) {
            // Invalid spot — keep placement mode active so user can try again.
            return true;
        }

        const { row, col } = placement.lastTile;
        const def = placement.def;
        const type = placement.type;
        const builder = pickBuilder(row, col);

        cancelPlacement();
        placeBuilding(type, def, row, col, builder);
        return true;
    }

    /**
     * Build the toolbar UI and wire it into the document.
     */
    function buildToolbar() {
        const bar = document.createElement('div');
        bar.id = 'build-toolbar';
        bar.className = 'build-toolbar build-toolbar-hidden';

        const label = document.createElement('div');
        label.className = 'build-toolbar-label';
        label.textContent = 'Build:';
        bar.appendChild(label);

        Object.keys(BUILDINGS).forEach(function(type) {
            const def = BUILDINGS[type];
            if (def.hidden) return; // skip non-buildable entries (e.g. gold_mine)
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'build-btn';
            btn.title = def.label;
            btn.dataset.type = type;
            btn.style.backgroundImage = "url('" + def.sprite + "')";
            const span = document.createElement('span');
            span.textContent = def.label;
            btn.appendChild(span);
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                startPlacement(type);
            });
            // Stop mouse-down on the toolbar from bubbling to the map (which
            // would start a selection box).
            btn.addEventListener('mousedown', function(e) { e.stopPropagation(); });
            bar.appendChild(btn);
        });

        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'build-btn build-btn-cancel';
        cancel.textContent = 'Cancel (Esc)';
        cancel.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            cancelPlacement();
        });
        cancel.addEventListener('mousedown', function(e) { e.stopPropagation(); });
        bar.appendChild(cancel);

        document.body.appendChild(bar);
        return bar;
    }

    function refreshToolbarVisibility(bar) {
        // The build toolbar is now anchored to the Town Hall, not to
        // selected peasants — click your Town Hall to bring up the build
        // options. Only a *completed* town hall qualifies; a town hall
        // still under construction can't yet act as a build menu.
        const showing = !!(selectedBuilding
            && selectedBuilding.type === 'town_hall'
            && selectedBuilding.complete);
        bar.classList.toggle('build-toolbar-hidden', !showing);
        if (!showing) {
            cancelPlacement();
        }
    }

    function init() {
        const bar = buildToolbar();

        // Refresh button availability whenever resources change.
        if (window.RTS && window.RTS.Resources) {
            window.RTS.Resources.onChange(refreshAllButtons);
        }
        refreshAllButtons();

        // Watch for class changes inside #main so we can show/hide the toolbar
        // when peasants are selected/deselected.
        const main = document.getElementById('main');
        if (main && window.MutationObserver) {
            const observer = new MutationObserver(function() {
                refreshToolbarVisibility(bar);
            });
            observer.observe(main, {
                attributes: true,
                attributeFilter: ['class'],
                subtree: true,
                childList: true,
            });
        }

        // Initial state.
        refreshToolbarVisibility(bar);

        // Track ghost position with the cursor.
        document.addEventListener('mousemove', function(e) {
            if (!placement) return;
            updateGhost(e.pageX, e.pageY);
        });

        // Esc cancels placement.
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' || e.key === 'Esc') {
                cancelPlacement();
            }
        });

        // Right-click during placement also cancels (and suppresses the
        // pathfinding right-click behavior in grid.js).
        document.addEventListener('contextmenu', function(e) {
            if (placement) {
                e.preventDefault();
                cancelPlacement();
            }
        });

        // Drop in the starting town hall + gold mine.
        spawnStartingStructures();

        // Clear building selection when the player picks a peasant.
        watchPeasantSelection();
    }

    /**
     * Search outward from a target tile until we find a footprint of `tiles`
     * tiles that is fully walkable and not overlapping anything else.
     * Returns {row, col} or null if nothing was found within `maxRadius`.
     */
    function findOpenSpot(targetRow, targetCol, tiles, maxRadius) {
        if (isFootprintValid(targetRow, targetCol, tiles)) {
            return { row: targetRow, col: targetCol };
        }
        for (let r = 1; r <= maxRadius; r++) {
            // Walk the perimeter of a square at distance r.
            for (let dr = -r; dr <= r; dr++) {
                for (let dc = -r; dc <= r; dc++) {
                    // Only the outer ring this radius.
                    if (Math.abs(dr) !== r && Math.abs(dc) !== r) continue;
                    const row = targetRow + dr;
                    const col = targetCol + dc;
                    if (isFootprintValid(row, col, tiles)) {
                        return { row, col };
                    }
                }
            }
        }
        return null;
    }

    /**
     * Place the starting town hall and the gold mine on the map. Searches
     * outward from preferred tiles to find walkable ground.
     */
    function spawnStartingStructures() {
        const size = gridSize();
        const search = window.RTS && window.RTS.gridSearch;
        if (!size || !search || !search.graph || !search.graph.grid) {
            // Grid not ready yet; try again shortly.
            return setTimeout(spawnStartingStructures, 200);
        }

        // Town hall — preferred near the starting peasants on the bottom-left.
        const townHallSpot = findOpenSpot(56, 8, BUILDINGS.town_hall.tiles, 12);
        if (townHallSpot) {
            placeStaticBuilding('town_hall', townHallSpot.row, townHallSpot.col);
        } else {
            console.warn('Could not find a spot for the town hall.');
        }

        // Gold mine — placed a few tiles away from the town hall (or fallback).
        const mineTarget = townHallSpot
            ? { row: townHallSpot.row + 8, col: townHallSpot.col }
            : { row: 64, col: 4 };
        const mineSpot = findOpenSpot(mineTarget.row, mineTarget.col, BUILDINGS.gold_mine.tiles, 16);
        if (mineSpot) {
            placeStaticBuilding('gold_mine', mineSpot.row, mineSpot.col);
        } else {
            console.warn('Could not find a spot for the gold mine.');
        }
    }

    /**
     * When the player selects any peasant via the existing selectUnit flow,
     * clear our building selection so the HUD reflects the unit instead.
     */
    function watchPeasantSelection() {
        const main = document.getElementById('main');
        if (!main || !window.MutationObserver) return;
        const observer = new MutationObserver(function() {
            if (!selectedBuilding) return;
            const hasPeasantSelected = document.querySelector('.peasant.unitSelected');
            if (hasPeasantSelected) {
                clearBuildingSelection();
            }
        });
        observer.observe(main, {
            attributes: true,
            attributeFilter: ['class'],
            subtree: true,
        });
    }

    window.RTS = window.RTS || {};
    window.RTS.Building = {
        BUILDINGS,
        startPlacement,
        cancelPlacement,
        handleMouseDown,
        isPlacing: function() { return placement !== null; },
        list: function() { return buildings.slice(); },
        placeStatic: placeStaticBuilding,
        selectBuilding,
        clearBuildingSelection,
        getSelectedBuilding: function() { return selectedBuilding; },
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
