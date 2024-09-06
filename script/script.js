var hero = {
    top: 816,
    left: 240
}

let cameraStart = {
    top: 760,
    left: 120
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
 * @param {*} path
 * @param {*} unit
 */
function moveUnit(path, unit) {

    for (let nodeNumber = 0; nodeNumber < path.length; nodeNumber++) {
        const coord = path[nodeNumber];
        let toTop = (coord.x * 16);
        let toLeft = (coord.y * 16);

        $( unit ).animate({
            left: toLeft,
            top: toTop,
        }, {
            duration: 1000,
            easing: "linear",
            step: function( now, fx ) {
                let $unit = $( fx.elem );
                let selectedIndicators = document.getElementsByName(unit.getAttribute('id'));
                for (let index = 0; index < selectedIndicators.length; index++) {
                    if (selectedIndicators[index].style === undefined) {
                        selectedIndicators[index].style = {};
                    }
                    selectedIndicators[index].style.left = $unit.offset().left + 'px';
                    selectedIndicators[index].style.top = $unit.offset().top + 'px';
                }
            }
        });
    }
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
            behavior: 'smooth'
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

    setTimeout(waitForCameraStart, 1000);

    // Only for the peasants we start with, will need to create new peasants at some point and add onclick event on creation.
    const peasants = document.querySelectorAll('.peasant');
    peasants.forEach(peasant => {
        peasant.onclick = function(event) {
            selectUnit(this.id);
        }
    });

});
