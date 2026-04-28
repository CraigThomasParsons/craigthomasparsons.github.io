/**
 * Peasant sprite animation. Drives the walking animation by:
 *   - Picking a direction (S/SE/E/NE/N + W/SW/NW mirrors) from the unit's
 *     movement vector each time it starts a new path segment.
 *   - Cycling through the 5 walk frames for that direction at a steady tick.
 *   - Returning to a still pose (frame 0 of last direction) once the path
 *     animation queue is empty.
 *
 * Sprite sheet: assets/sprites/peasant_sheet.png (479x480, 32x32 frames in a
 * grid). The CSS scales the sheet to 50% so each frame displays at 16x16,
 * matching the existing tile size. Mirrored directions (W, SW, NW) are
 * achieved with `transform: scaleX(-1)` on the peasant div.
 */
(function() {
    const DISPLAY_PX = 16;     // each frame renders at 16x16
    const FRAMES_PER_DIR = 5;
    const FRAME_DURATION_MS = 140;

    // Each entry maps a direction to the row + starting column of its first
    // walk frame on the (scaled) sprite sheet, plus whether the sprite needs
    // a horizontal flip.
    const DIRECTIONS = {
        S:  { row: 0, col: 0, flip: false },
        SE: { row: 0, col: 5, flip: false },
        E:  { row: 1, col: 0, flip: false },
        NE: { row: 1, col: 5, flip: false },
        N:  { row: 2, col: 0, flip: false },
        // The remaining three reuse the matching east-side rows mirrored.
        NW: { row: 1, col: 5, flip: true },
        W:  { row: 1, col: 0, flip: true },
        SW: { row: 0, col: 5, flip: true },
    };

    // unit.id -> { direction, frame, timer }
    const states = new Map();

    /**
     * Map a movement vector (dx, dy in pixels) to one of the 8 direction
     * keys above. Screen coordinates: +x is east, +y is south.
     */
    function dirFromDelta(dx, dy) {
        if (dx === 0 && dy === 0) return 'S';
        const deg = Math.atan2(dy, dx) * 180 / Math.PI;
        if (deg >= -22.5  && deg <  22.5)  return 'E';
        if (deg >=  22.5  && deg <  67.5)  return 'SE';
        if (deg >=  67.5  && deg < 112.5)  return 'S';
        if (deg >= 112.5  && deg < 157.5)  return 'SW';
        if (deg >= 157.5  || deg < -157.5) return 'W';
        if (deg >= -157.5 && deg < -112.5) return 'NW';
        if (deg >= -112.5 && deg <  -67.5) return 'N';
        return 'NE';
    }

    function applyFrame(unit, dirKey, frameIdx) {
        const d = DIRECTIONS[dirKey];
        if (!d) return;
        const col = d.col + (frameIdx % FRAMES_PER_DIR);
        const x = -(col * DISPLAY_PX);
        const y = -(d.row * DISPLAY_PX);
        unit.style.backgroundPosition = x + 'px ' + y + 'px';
        // Flipping with transform also flips the inner select indicator if
        // it were a child — but the indicator is a sibling, so this is safe.
        unit.style.transform = d.flip ? 'scaleX(-1)' : '';
    }

    function stopTimer(state) {
        if (state && state.timer) {
            clearInterval(state.timer);
            state.timer = null;
        }
    }

    /**
     * Cancel the walk-frame timer for a unit without changing its current
     * frame. Use this when interrupting a movement order that won't be
     * immediately followed by a new `setMoving` call.
     */
    function stop(unit) {
        if (!unit) return;
        const state = states.get(unit.id);
        stopTimer(state);
    }

    /**
     * Forget all tracked state for a unit (timer + map entry). Call this when
     * the peasant is removed from the DOM permanently.
     */
    function destroy(unit) {
        if (!unit) return;
        const id = typeof unit === 'string' ? unit : unit.id;
        const state = states.get(id);
        stopTimer(state);
        states.delete(id);
    }

    /**
     * Begin walking animation for a unit moving from (fromX, fromY) toward
     * (toX, toY). Cancels any prior frame timer for that unit.
     */
    function setMoving(unit, fromX, fromY, toX, toY) {
        if (!unit) return;
        const dirKey = dirFromDelta(toX - fromX, toY - fromY);
        let state = states.get(unit.id);
        stopTimer(state);
        state = { direction: dirKey, frame: 0, timer: null };
        states.set(unit.id, state);

        applyFrame(unit, dirKey, 0);
        state.timer = setInterval(function() {
            // Bail out if the unit was removed from the DOM. Drop the entry
            // entirely so we don't accumulate stale state for despawned units.
            if (!unit.isConnected) {
                stopTimer(state);
                states.delete(unit.id);
                return;
            }
            state.frame = (state.frame + 1) % FRAMES_PER_DIR;
            applyFrame(unit, state.direction, state.frame);
        }, FRAME_DURATION_MS);
    }

    /**
     * Stop animating and show the still pose for the unit's current
     * direction (frame 0). If the unit has no recorded direction yet, fall
     * back to the south-facing standing frame.
     */
    function setIdle(unit) {
        if (!unit) return;
        let state = states.get(unit.id);
        stopTimer(state);
        if (!state) {
            state = { direction: 'S', frame: 0, timer: null };
            states.set(unit.id, state);
        }
        applyFrame(unit, state.direction, 0);
    }

    /**
     * Initialise all peasants currently on the map to the standing pose.
     * Called once after the DOM is ready so the existing static sprite
     * (`wc1-human-standing.png`) is replaced by a real frame from the sheet.
     */
    function initAll() {
        const peasants = document.querySelectorAll('.peasant');
        peasants.forEach(function(p) {
            // Make sure each peasant has an id (movement code already
            // assigns one, but defensive).
            if (!p.id) return;
            setIdle(p);
        });
    }

    window.RTS = window.RTS || {};
    window.RTS.Sprite = { setMoving, setIdle, stop, destroy, initAll };
})();
