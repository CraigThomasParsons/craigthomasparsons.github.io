/**
 * Resources HUD: gold, lumber, stone and food. Buildings cost resources
 * to place and farms add to the food cap.
 *
 * Other modules read `RTS.Resources.state`, call `canAfford(cost)` /
 * `spend(cost)` and listen for changes with `onChange(cb)`.
 */
(function() {
    const ICONS = {
        gold: { img: 'assets/ui/gold_icon_1.png', label: 'Gold' },
        lumber: { img: 'assets/ui/lumber_icon_1.png', label: 'Lumber' },
        // No bundled icons for stone/food — fall back to Material Icons.
        stone: { material: 'terrain', label: 'Stone' },
        food: { material: 'restaurant', label: 'Food' },
    };

    const state = {
        gold: 1000,
        lumber: 500,
        stone: 200,
        food: 4,        // current population
        foodCap: 8,     // population cap
    };

    const listeners = [];
    function notify() {
        listeners.forEach(function(cb) {
            try { cb(state); } catch (e) { console.warn(e); }
        });
    }

    function canAfford(cost) {
        if (!cost) return true;
        if (cost.gold && state.gold < cost.gold) return false;
        if (cost.lumber && state.lumber < cost.lumber) return false;
        if (cost.stone && state.stone < cost.stone) return false;
        if (cost.food && (state.food + cost.food) > state.foodCap) return false;
        return true;
    }

    function spend(cost) {
        if (!canAfford(cost)) return false;
        if (cost.gold) state.gold -= cost.gold;
        if (cost.lumber) state.lumber -= cost.lumber;
        if (cost.stone) state.stone -= cost.stone;
        if (cost.food) state.food += cost.food;
        notify();
        return true;
    }

    function gain(delta) {
        if (delta.gold) state.gold += delta.gold;
        if (delta.lumber) state.lumber += delta.lumber;
        if (delta.stone) state.stone += delta.stone;
        if (delta.foodCap) state.foodCap += delta.foodCap;
        if (delta.food) state.food += delta.food;
        notify();
    }

    function buildBar() {
        const bar = document.createElement('div');
        bar.id = 'resource-bar';
        bar.className = 'resource-bar';

        ['gold', 'lumber', 'stone', 'food'].forEach(function(key) {
            const def = ICONS[key];
            const cell = document.createElement('div');
            cell.className = 'resource-cell';
            cell.dataset.res = key;

            if (def.img) {
                const img = document.createElement('img');
                img.src = def.img;
                img.className = 'resource-icon';
                img.alt = def.label;
                cell.appendChild(img);
            } else {
                const i = document.createElement('i');
                i.className = 'material-icons resource-icon-mat';
                i.textContent = def.material;
                cell.appendChild(i);
            }

            const value = document.createElement('span');
            value.className = 'resource-value';
            value.id = 'res-' + key;
            cell.appendChild(value);
            bar.appendChild(cell);
        });

        document.body.appendChild(bar);
        return bar;
    }

    function render() {
        const g = document.getElementById('res-gold');
        const l = document.getElementById('res-lumber');
        const s = document.getElementById('res-stone');
        const f = document.getElementById('res-food');
        if (g) g.textContent = state.gold;
        if (l) l.textContent = state.lumber;
        if (s) s.textContent = state.stone;
        if (f) f.textContent = state.food + ' / ' + state.foodCap;
    }

    function init() {
        buildBar();
        listeners.push(render);
        render();
    }

    window.RTS = window.RTS || {};
    window.RTS.Resources = {
        state,
        canAfford,
        spend,
        gain,
        onChange: function(cb) { listeners.push(cb); },
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
