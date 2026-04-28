/**
 * Minimap. Renders a small top-down view of the map showing terrain (walls
 * vs. walkable), placed buildings, peasants, and the current camera viewport.
 * Click anywhere on the minimap to jump the camera there.
 */
(function() {
    const TILE = 16;
    let canvas, ctx;
    let scaleX = 1, scaleY = 1;
    let main;

    function getGridSize() {
        const search = window.RTS && window.RTS.gridSearch;
        if (search && search.graph && search.graph.grid) {
            return search.graph.grid.length;
        }
        return main ? Math.floor(main.offsetWidth / TILE) : 64;
    }

    function draw() {
        if (!ctx || !main) return;
        const w = canvas.width;
        const h = canvas.height;
        const size = getGridSize();
        if (!size) return;

        scaleX = w / size;
        scaleY = h / size;

        // Background.
        ctx.fillStyle = '#234c1f';
        ctx.fillRect(0, 0, w, h);

        const search = window.RTS && window.RTS.gridSearch;
        if (search && search.graph && search.graph.grid) {
            const grid = search.graph.grid;
            ctx.fillStyle = '#1a1a1a';
            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    const node = grid[r] && grid[r][c];
                    if (node && node.weight === 0) {
                        ctx.fillRect(c * scaleX, r * scaleY, Math.ceil(scaleX), Math.ceil(scaleY));
                    }
                }
            }
        }

        // Buildings on top of the wall layer (so they look distinct).
        if (window.RTS && window.RTS.Building) {
            const list = window.RTS.Building.list();
            list.forEach(function(b) {
                ctx.fillStyle = b.el && b.el.classList.contains('building-construction')
                    ? '#a37b1f'
                    : '#d6a634';
                ctx.fillRect(
                    b.col * scaleX,
                    b.row * scaleY,
                    Math.ceil(b.def.tiles * scaleX),
                    Math.ceil(b.def.tiles * scaleY)
                );
            });
        }

        // Peasants.
        const peasants = document.querySelectorAll('.peasant');
        peasants.forEach(function(p) {
            const left = p.offsetLeft;
            const top = p.offsetTop;
            ctx.fillStyle = p.classList.contains('unitSelected') ? '#7CFC00' : '#e9e0c8';
            const x = (left / TILE) * scaleX;
            const y = (top / TILE) * scaleY;
            ctx.fillRect(x - 1, y - 1, 3, 3);
        });

        // Camera viewport rectangle.
        const mapW = main.offsetWidth;
        const mapH = main.offsetHeight;
        const viewW = Math.min(window.innerWidth, mapW);
        const viewH = Math.min(window.innerHeight, mapH);
        const vx = (window.scrollX / mapW) * w;
        const vy = (window.scrollY / mapH) * h;
        const vw = (viewW / mapW) * w;
        const vh = (viewH / mapH) * h;
        ctx.strokeStyle = '#f3c14b';
        ctx.lineWidth = 1;
        ctx.strokeRect(vx + 0.5, vy + 0.5, vw, vh);
    }

    function jumpTo(event) {
        if (!main) return;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const size = getGridSize();
        const tileCol = Math.floor((x / canvas.width) * size);
        const tileRow = Math.floor((y / canvas.height) * size);
        const targetX = tileCol * TILE - window.innerWidth / 2;
        const targetY = tileRow * TILE - window.innerHeight / 2;
        window.scrollTo({
            left: Math.max(0, Math.min(main.offsetWidth - window.innerWidth, targetX)),
            top: Math.max(0, Math.min(main.offsetHeight - window.innerHeight, targetY)),
            behavior: 'smooth',
        });
    }

    function init() {
        canvas = document.getElementById('minimap');
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        main = document.getElementById('main');

        canvas.addEventListener('click', jumpTo);
        canvas.addEventListener('mousedown', function(e) { e.stopPropagation(); });

        // Keep things responsive without burning CPU: redraw a few times a second.
        setInterval(draw, 200);

        // Quick redraws on user input so the camera box keeps up.
        window.addEventListener('scroll', draw);
        window.addEventListener('resize', draw);
        draw();
    }

    window.RTS = window.RTS || {};
    window.RTS.Minimap = { redraw: draw };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
