var hero = {
    top: 816,
    left: 240
}

let cameraStart = {
    top: 700,
    left: 0
}

let cameraMoving = false;

let keyboardState = {
    upPressedDown: false,
    downPressedDown: false,
    rightPressedDown: false,
    leftPressedDown: false,
    shiftPressedDown: false
}

document.onkeyup = function(KeyboardEvent) {
    // Stop moving Camera left.
    if (KeyboardEvent.key === 'a') {

        keyboardState.leftPressedDown = false;

    // Stop moving Camera right.
    } else if (KeyboardEvent.key === 'd') {

        keyboardState.rightPressedDown = false;

    // Stop moving Camera up.
    } else if (KeyboardEvent.key === 'w') {

        keyboardState.upPressedDown = false;

    // Stop moving Camera down.
    } else if (KeyboardEvent.key === 's') {

        keyboardState.downPressedDown = false;
    }

    if (KeyboardEvent.key === 'Shift') {
        keyboardState.shiftPressedDown = false;
    }
}

document.onkeydown = function(KeyboardEvent) {
    const HERO_SPEED = 2000;

    // Move Camera left.
    if (KeyboardEvent.key === 'a') {

        keyboardState.leftPressedDown = true;

    // Move Camera right.
    } else if (KeyboardEvent.key === 'd') {

        keyboardState.rightPressedDown = true;
    }

    // Move Camera up.
    if (KeyboardEvent.key === 'w') {

        keyboardState.upPressedDown = true;

    // Move Camera down.
    } else if (KeyboardEvent.key === 's') {

        keyboardState.downPressedDown = true;
    }

    // Move Main Character right.
    if (KeyboardEvent.key === 'j') {
        $("#hero").fadeIn(1000);
        //hero.left -= 16;

        //moveHero(hero.left);
        $( "#hero" ).animate({
            left: "-=16",
        }, HERO_SPEED, function() {
            // Animation complete.
            console.log('left movement completed');
            $("#hero").fadeOut(4000);
        });


    // Move Main Character left.
    } else if (KeyboardEvent.key === 'l') {
        $("#hero").fadeIn(1000);
        // hero.top += 16;
        $( "#hero" ).animate({
            left: "+=16",
        }, HERO_SPEED, function() {
            // Animation complete.
            console.log('left movement completed');
            $("#hero").fadeOut(4000);
        });

        //moveHero(hero.left);
    }

    // Move Main Character up.
    if (KeyboardEvent.key === 'i') {
        $("#hero").fadeIn(1000);

        $( "#hero" ).animate({
            top: "-=16",
        }, HERO_SPEED, function() {
            // Animation complete.
            console.log('top movement completed');
            $("#hero").fadeOut(4000);
        });

        //moveHero(hero.left, hero.top);

    // Move Main Character down.
    } else if (KeyboardEvent.key === 'k') {
        //hero.top += 16;
        $("#hero").fadeIn(1000);

        $( "#hero" ).animate({
            top: "+=16",
        }, HERO_SPEED, function() {
            // Animation complete.
            console.log('top movement completed');
            $("#hero").fadeOut(4000);
        });

        //moveHero(hero.left, hero.top);
    }

    if (KeyboardEvent.key === 'Shift') {
        keyboardState.shiftPressedDown = true;
    }
}
/**
 * The keyboard controls doesn't seem to allow for diagonal movement.
 * @see cameraControls and keyboardState.
 * Created this to work with wasd keys for movement, but it can be reused for other keys in the future
 *
 * @param {*} horizontal
 * @param {*} vertical
 */
function moveCamera(horizontal, vertical) {

    if (((horizontal < 0) && (window.scrollX > 0)) || ((horizontal > 0) && (window.scrollX < (document.body.scrollWidth - window.innerWidth +15)))) {
        window.scrollX += horizontal;
    }
    if (((vertical < 0) && (window.scrollY > 0)) || ((vertical > 0) && (window.scrollY < (document.body.scrollHeight - window.innerHeight + 15)))) {
        window.scrollY += vertical;
    }

    window.scrollTo(window.scrollX, window.scrollY);
}

function moveCameraVertically(vertical) {
    window.scrollTo(window.scrollX, window.scrollY + vertical);
}

function moveCameraHorizontally(horizontal) {
    window.scrollTo(window.scrollX + horizontal, window.scrollY);

}

/**
 * Move the peasant using the css properties.
 * This isn't necessary, we won't use keyboard controls like this in the future.
 */
function moveHero(left, top) {
    let heroElement = document.getElementById('hero');

    if (left !== null) {
        heroElement.style.left = left + 'px';
    }

    if (top !== null) {
        heroElement.style.top = top + 'px';
    }
}

/**
 * Peasants should move at 80px / 7seconds.
 * Game tics every half second.
 */
 function animateCharacters()
 {
    // Todo: implement this function
 }

/**
 * Per-segment animation step callback: keep the green selection outline
 * pinned on top of the moving unit.
 */
function _moveUnitStepFn(unit) {
    return function(now, fx) {
        let $unit = $(fx.elem);
        let selectedIndicators = document.getElementsByName(unit.getAttribute('id'));
        for (let index = 0; index < selectedIndicators.length; index++) {
            if (selectedIndicators[index].style === undefined) {
                selectedIndicators[index].style = {};
            }
            selectedIndicators[index].style.left = $unit.offset().left + 'px';
            selectedIndicators[index].style.top = $unit.offset().top + 'px';
        }
    };
}

/**
 * Walk `unit` along `path` one tile at a time. The segments are NOT
 * pre-queued: each `_walkSegment` call enqueues only its own animation
 * plus a single follow-up queue entry that triggers the next segment.
 * That guarantees occupancy checks, reservations, and `Sprite.setMoving`
 * for tile N+1 only run after the animation onto tile N has completed.
 *
 * Path entries use x = row, y = column (matches the A* graph indexing).
 */
function moveUnit(path, unit) {
    if (!path || !path.length || !unit) return;

    const Coll = window.RTS && window.RTS.Collision;
    // A previous order may have been cancelled via `$(unit).stop(true)`
    // which clears the queued cleanup — drop any stale reservation now so
    // it doesn't permanently block the tile for other units.
    if (Coll) Coll.clear(unit);
    const sessionId = Coll ? Coll.newSession(unit) : 0;

    // Kick off the first segment via the queue so it composes correctly
    // with anything else already pending on the unit.
    $(unit).queue(function(next) {
        _walkSegment(unit, path, 0, sessionId, next, 0);
    });
}

/**
 * Run a single tile of the path. Strictly sequential: this fn is the
 * currently-dequeued queue entry, so it owns the "inprogress" sentinel
 * until it calls `next()`. We:
 *   1. Check occupancy of `path[i]`. If blocked, wait & retry, eventually
 *      bailing the whole path so the player can re-issue.
 *   2. Reserve the tile, switch the sprite to its walk frames, and queue
 *      the jQuery animate for that one tile.
 *   3. Queue the next segment behind the animate, so when the animate
 *      finishes the queue advances to `_walkSegment(i+1)` which performs
 *      its own occupancy check at *that* moment.
 *   4. Call `next()` to let the animate (and only the animate) start.
 */
function _walkSegment(unit, path, i, sessionId, next, reroutesDone) {
    const Coll = window.RTS && window.RTS.Collision;
    const Sprite = window.RTS && window.RTS.Sprite;
    reroutesDone = reroutesDone || 0;

    // A newer movement order has superseded ours — exit silently. Don't
    // call next(): if our queue was cleared by `$(unit).stop(true, false)`
    // before a new walk started, dequeue would advance the new walk's
    // queue. (In practice queued segments are only ever invoked while
    // their session is current, but check defensively.)
    if (Coll && !Coll.isSessionCurrent(unit, sessionId)) {
        return;
    }

    // End of path: settle into the still pose and release the tile-ahead
    // reservation, then close out the queue so `.promise().done()` fires.
    if (i >= path.length) {
        if (Sprite) Sprite.setIdle(unit);
        if (Coll) Coll.clear(unit);
        next();
        return;
    }

    const coord = path[i];
    const toRow = coord.x;
    const toCol = coord.y;
    const toTop = toRow * 16;
    const toLeft = toCol * 16;

    const WAIT_MS = 150;
    // Once the next tile has been blocked for this many consecutive
    // retries (~0.9s) we try to re-route around the obstruction instead
    // of waiting for it to clear. After the first reroute attempt we
    // only re-attempt every REROUTE_COOLDOWN retries so a dense jam
    // doesn't trigger an A* search every 150ms.
    const RETRIES_BEFORE_REROUTE = 6;
    const REROUTE_COOLDOWN = 6;
    const MAX_RETRIES = 30; // ~4.5s ceiling before truly giving up
    const MAX_REROUTES = 4; // hard cap on per-order replans

    let retries = 0;

    // Build an A* path from our current tile to the original destination,
    // walling off the tiles every other peasant is currently standing on.
    // Returns the new path or null if no replan is possible/useful.
    function tryReroute() {
        const grid = window.RTS && window.RTS.gridSearch;
        if (!grid || typeof grid.findPathAvoiding !== 'function') return null;

        const curRow = Math.round(unit.offsetTop / 16);
        const curCol = Math.round(unit.offsetLeft / 16);
        const destNode = path[path.length - 1];
        if (!destNode) return null;
        const destRow = destNode.x;
        const destCol = destNode.y;

        // Already at the destination — nothing to plan around.
        if (curRow === destRow && curCol === destCol) return null;

        // Snapshot the current tiles of every other peasant. Mining
        // peasants are tucked inside the gold mine and don't physically
        // block movement, so they're skipped (matches `isOccupied`).
        const blocked = [];
        const peasants = document.querySelectorAll('.peasant');
        for (let p = 0; p < peasants.length; p++) {
            const u = peasants[p];
            if (u === unit) continue;
            if (!u.isConnected) continue;
            if (u.classList.contains('peasant-mining')) continue;
            const r = Math.round(u.offsetTop / 16);
            const c = Math.round(u.offsetLeft / 16);
            blocked.push({ row: r, col: c });
        }

        const newPath = grid.findPathAvoiding(curRow, curCol, destRow, destCol, blocked);
        if (!newPath || newPath.length === 0) return null;

        // If the freshly-planned next tile is the same blocked tile we've
        // been waiting on, the replan didn't actually find a way around
        // (A* fell back to the same corridor). Treat as "no useful
        // reroute" so we keep waiting instead of looping immediately.
        if (newPath[0] && newPath[0].x === toRow && newPath[0].y === toCol) {
            return null;
        }
        return newPath;
    }

    function attempt() {
        // Stale: a newer movement order has cleared our queue (via
        // `$(unit).stop(true, false)`). Do NOT call next() here — calling
        // dequeue would advance the *new* walk's queue and corrupt it.
        if (Coll && !Coll.isSessionCurrent(unit, sessionId)) {
            return;
        }
        if (Coll && Coll.isOccupied(toRow, toCol, unit)) {
            retries++;

            // After a few retries of waiting on the same blocker, ask A*
            // for a fresh path that goes around it. Restart this same
            // queue entry (`next`) on the new path so the surrounding
            // queue plumbing still flows correctly. The modulo check
            // throttles repeated A* calls in dense jams (attempts at
            // retries 6, 12, 18, 24, 30 with the defaults).
            const sinceThreshold = retries - RETRIES_BEFORE_REROUTE;
            const reroutable = retries >= RETRIES_BEFORE_REROUTE
                && reroutesDone < MAX_REROUTES
                && sinceThreshold % REROUTE_COOLDOWN === 0;
            if (reroutable) {
                const newPath = tryReroute();
                if (newPath) {
                    if (Coll) Coll.clear(unit);
                    if (Sprite) Sprite.setIdle(unit);
                    _walkSegment(unit, newPath, 0, sessionId, next, reroutesDone + 1);
                    return;
                }
            }

            if (retries > MAX_RETRIES) {
                if (Sprite) Sprite.setIdle(unit);
                if (Coll) Coll.clear(unit);
                next();
                return;
            }
            if (Sprite) Sprite.setIdle(unit);
            setTimeout(attempt, WAIT_MS);
            return;
        }

        // Tile is free — reserve it so no one else slips in while we walk.
        if (Coll) Coll.reserve(unit, toRow, toCol);
        if (Sprite) {
            Sprite.setMoving(unit, unit.offsetLeft, unit.offsetTop, toLeft, toTop);
        }

        // Queue the animate for THIS tile, then the trigger for the next
        // tile. Calling next() removes our "inprogress" sentinel so the
        // animate starts; when it finishes, the queue advances to the
        // next-segment trigger which will dequeue _walkSegment(i+1).
        $(unit).animate({
            left: toLeft,
            top: toTop,
        }, {
            duration: 1000,
            easing: 'linear',
            step: _moveUnitStepFn(unit),
        });

        $(unit).queue(function(nextSeg) {
            _walkSegment(unit, path, i + 1, sessionId, nextSeg, reroutesDone);
        });

        next();
    }

    attempt();
}

/**
 * Finds the className unitSelected in the class list and removes it.
 *
 * @param {*} unitId
 *
 * @returns
 */
 function unSelectUnit(unitId) {
    var unit = document.getElementById(unitId);
    unit.classList.remove("unitSelected");

    // The selected indicator should have the same name as the unit's selected id.
    let selectedIndicator = document.querySelector("div[name='" + unit.getAttribute('id') + "']");
    if (selectedIndicator === null) {
        return true;
    }

    // Make sure that the indicator is hidden.
    selectedIndicator.style.display = 'none';
    selectedIndicator.remove();
}

/**
 *
 */
function selectUnit(unitId) {
    let currentUnit = document.getElementById(unitId);
    let currentClassName = currentUnit.className;
    let unitLeft = $(currentUnit).offset().left;
    let unitTop =  $(currentUnit).offset().top;

    if (currentClassName.length > 0) {
        document.getElementById(unitId).className = [currentClassName, 'unitSelected'].join(' ');
    }
    let selectIndicator = document.createElement('div');
    selectIndicator.setAttribute('name', currentUnit.getAttribute('id'));
    selectIndicator.style.left = unitLeft + 'px';
    selectIndicator.style.top = unitTop +'px';
    selectIndicator.className = 'unitOutlined';

    document.getElementById('main').appendChild(selectIndicator);
}

/**
 * Will need to change this to the move command.
 *
 * @param {*} clickEvent
 */
function rightClickContextMenu(clickEvent) {
    clickEvent.preventDefault();
}

/**
 * Sets the key down states for the camera directions.
 */
function cameraControls()
{
    let x = 0;
    let y = 0;

    // Camera Controls
    if (keyboardState.leftPressedDown === true) {

        x = x - 2;

    }
    if (keyboardState.rightPressedDown === true) {

        x = x + 2;

    }
    if (keyboardState.upPressedDown === true) {

        y = y - 2;

    }
    if (keyboardState.downPressedDown === true) {

        y = y + 2;

    }

    moveCamera(x, y);
}

/**
 * This is temporary, eventually this will wait for a server to come back.
 */
    function waitForCameraStart() {

    if (cameraStart !== undefined) {
        window.scrollTo({
            top: cameraStart.top,
            left: cameraStart.left,
            behavior: 'auto'
        });
    }
}

function gameLoop() {
    setTimeout(gameLoop, 500);
}

function camera() {
    setTimeout(camera, 5);

    // Only run checks if the right buttons are pressed.
    if (keyboardState.leftPressedDown || keyboardState.rightPressedDown || keyboardState.upPressedDown || keyboardState.downPressedDown) {
        cameraControls();
    }
}

gameLoop();
camera();

$(document).ready(function() {

    setTimeout(waitForCameraStart, 50);

    // Only for the peasants we start with, will need to create new peasants at some point and add onclick event on creation.
    const peasants = document.querySelectorAll('.peasant');
    peasants.forEach(peasant => {
        peasant.onclick = function(event) {
            selectUnit(this.id);
        }
    });

});
