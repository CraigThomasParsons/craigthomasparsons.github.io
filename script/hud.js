/**
 * Bottom HUD: status messages and a selection info line.
 * The minimap lives in its own module (minimap.js) and is rendered separately
 * in the top-right corner.
 */
(function() {
    let buildingSelection = null;

    function setStatus(msg) {
        const el = document.getElementById('hud-status');
        if (!el) return;
        el.textContent = msg;
        el.classList.remove('hud-status-flash');
        // Force a reflow so the animation restarts.
        void el.offsetWidth;
        el.classList.add('hud-status-flash');
    }

    function setBuildingSelection(record) {
        buildingSelection = record;
        refreshSelectionInfo();
    }

    function refreshSelectionInfo() {
        const name = document.getElementById('hud-selection-name');
        const stats = document.getElementById('hud-selection-stats');
        if (!name || !stats) return;

        const peasants = document.querySelectorAll('.peasant.unitSelected');

        // Peasant selection takes precedence (and clears building selection
        // separately via building.js's MutationObserver).
        if (peasants.length === 1) {
            buildingSelection = null;
            name.textContent = 'Peasant';
            stats.textContent = ' — worker, can construct buildings';
            return;
        }
        if (peasants.length > 1) {
            buildingSelection = null;
            name.textContent = peasants.length + ' Peasants';
            stats.textContent = ' — workers';
            return;
        }

        if (buildingSelection) {
            const def = buildingSelection.def;
            name.textContent = def.label;
            const state = buildingSelection.complete ? 'built' : 'under construction';
            const desc = def.description ? ' — ' + def.description : '';
            stats.textContent = '(' + state + ')' + desc + '  ·  cannot be moved';
            return;
        }

        name.textContent = 'No selection';
        stats.textContent = ' — click a peasant or building to select it';
    }

    function init() {
        // Watch for any selection changes on the map.
        const main = document.getElementById('main');
        if (main && window.MutationObserver) {
            const observer = new MutationObserver(refreshSelectionInfo);
            observer.observe(main, {
                attributes: true,
                attributeFilter: ['class'],
                subtree: true,
                childList: true,
            });
        }
        refreshSelectionInfo();
        setStatus('Welcome, commander. Click your Town Hall to start building.');
    }

    window.RTS = window.RTS || {};
    window.RTS.HUD = { setStatus, setBuildingSelection };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
