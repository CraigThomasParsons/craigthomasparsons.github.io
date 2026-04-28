/**
 * Unit collision tracking. Two peasants must never occupy the same 16x16
 * tile at the same time, so the movement code consults this module before
 * stepping into the next tile of a path.
 *
 * The module tracks two things:
 *
 *   1. The *current* tile of every peasant (derived from offsetTop/Left
 *      whenever it is queried — no need to keep it in sync explicitly).
 *   2. A *reservation* per moving unit: the tile it is currently animating
 *      into. While a unit holds a reservation on tile T, no other unit may
 *      step into T (so two peasants targeting the same tile won't both
 *      animate into it and end up stacked).
 *
 * It also exposes a small "session" helper used by `moveUnit` to discard
 * stale waiting timers when a new movement order is issued.
 */
(function() {
    const TILE = 16;

    // unit.id -> { row, col }
    const reservations = new Map();

    // unit.id -> latest movement session id. `moveUnit` bumps this each time
    // a new path is issued; pending wait callbacks compare against the value
    // they were created with and bail out if it has moved on.
    const sessions = new Map();
    let nextSession = 1;

    function tileOf(el) {
        if (!el) return null;
        return {
            row: Math.round(el.offsetTop / TILE),
            col: Math.round(el.offsetLeft / TILE),
        };
    }

    function reserve(unit, row, col) {
        if (!unit) return;
        reservations.set(unit.id, { row: row, col: col });
    }

    function clearReservation(unit) {
        if (!unit) return;
        const id = typeof unit === 'string' ? unit : unit.id;
        reservations.delete(id);
    }

    /**
     * True if any *other* unit currently sits on (or is reserving) the tile
     * (row, col). Pass the requesting unit so we don't flag the unit's own
     * tile as occupied.
     */
    function isOccupied(row, col, exceptUnit) {
        const exceptId = exceptUnit ? exceptUnit.id : null;

        // Other units physically standing on the tile right now.
        const units = document.querySelectorAll('.peasant');
        for (let i = 0; i < units.length; i++) {
            const u = units[i];
            if (u.id === exceptId) continue;
            if (!u.isConnected) continue;
            // Mining peasants are visually inside the gold mine (opacity 0)
            // and don't block — otherwise a second peasant could never share
            // the perimeter tile with the entering one.
            if (u.classList.contains('peasant-mining')) continue;
            const t = tileOf(u);
            if (t && t.row === row && t.col === col) return true;
        }

        // In-flight reservations from other moving units.
        for (const entry of reservations) {
            const id = entry[0];
            const res = entry[1];
            if (id === exceptId) continue;
            if (res.row === row && res.col === col) return true;
        }

        return false;
    }

    /**
     * Begin a new movement session for `unit`. Any pending waiters from
     * older sessions will see their session id is stale and stop trying.
     */
    function newSession(unit) {
        const id = nextSession++;
        if (unit) sessions.set(unit.id, id);
        return id;
    }

    function isSessionCurrent(unit, sessionId) {
        if (!unit) return false;
        return sessions.get(unit.id) === sessionId;
    }

    window.RTS = window.RTS || {};
    window.RTS.Collision = {
        tileOf: tileOf,
        reserve: reserve,
        clear: clearReservation,
        isOccupied: isOccupied,
        newSession: newSession,
        isSessionCurrent: isSessionCurrent,
    };
})();
