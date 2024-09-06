/**
 * Usage:
 * add this:
 * <div id="background"
 *           onmousedown="showSelectionBox(event)"
 *           onmousemove="dragSelectionBox(event)"
 *      >
 *      <div id="selectIndicator"></div>
 *  </div>
 * to the box where you want multiselect to display
 * Initial css:
 * #selectIndicator{
 *   background-color: rgba(15, 255, 15, 0.4);
 *   opacity:0.4;
 *   width:2px;
 *   height:2px;
 *   border: 5px dotted rgb(15, 182, 15);
 *   z-index: 3;
 *   position: absolute;
 *   display:none;
 * }
 */
let cursorState = {
    buttonDown: false,
    xStart: 0,
    yStart: 0,
    xEnd: 0,
    yEnd: 0
}

function detectLeftButton(event) {
    event = event || window.event;
    if ("buttons" in evt) {
        return evt.buttons == 1;
    }
    let button = event.which || event.button;

    return (button == 1);
}

/**
 * Show a visual box to display what the user is trying to select.
 *
 * @param {*} clickEvent
 */
function dragSelectionBox(clickEvent, debug) {

    // Don't draw a rectangle if this is a right click or if the initial button down isn't detected.
    if ((cursorState.buttonDown !== true) || (clickEvent.buttons === 2)) {
        return true;
    }

    // Make sure the divider is created.
    let boxDivider = document.getElementById('selectIndicator');

    if ((boxDivider === null) && (detectLeftButton(detectLeftButton(clickEvent)))) {
        return false;
    }

    let leftCoord = clickEvent.pageX;
    let topCoord = clickEvent.pageY;
    cursorState.xEnd = leftCoord;
    cursorState.yEnd = topCoord;

    let xDiff = cursorState.xEnd - cursorState.xStart;
    let yDiff = cursorState.yEnd - cursorState.yStart;

    boxDivider.style.width = xDiff + 'px';
    boxDivider.style.height = yDiff + 'px';

    if (xDiff < 0) {
        let absoluteDifference = Math.abs(xDiff);
        boxDivider.style.width = absoluteDifference + 'px';
        boxDivider.style.left = (cursorState.xStart - absoluteDifference) + 'px';
    }

    if (yDiff < 0) {
        let absoluteDifference = Math.abs(yDiff);
        boxDivider.style.height = absoluteDifference + 'px';
        boxDivider.style.top = (cursorState.yStart - absoluteDifference) + 'px';
    }

    boxDivider.style.display = 'block';

    if (debug !== undefined) {
        console.log(debug);
    }
}

/**
 * @param {*} clickEvent
 * @param {*} debug
 *
 * @returns false if cursorState.button down is already true.
 */
function onSelectMouseDown(clickEvent, debug) {
    // Try to prevent default behavior, so it doesn't try to drag images.
    clickEvent.preventDefault ? clickEvent.preventDefault() : clickEvent.returnValue = false;

    let selectIndicator = document.getElementById('selectIndicator');

    if (selectIndicator === null) {

        selectIndicator = document.createElement('div');
        selectIndicator.setAttribute('id', 'selectIndicator');
        document.getElementById('main').appendChild(selectIndicator);
    }

    // Trying to only show the rectangle if its dragging, sometimes its stuck on.
    if (cursorState.buttonDown === true) {
        let selectIndicator = document.getElementById('selectIndicator');
        cursorState.buttonDown = false;
        if (selectIndicator !== null) {
            selectIndicator.style.display = 'none';
        }

        return false;
    }

    showSelectionBox(clickEvent);

    if (debug !== undefined) {
        console.log(debug);
    }
}

/**
 * This event fires when we click on the background image.
 *
 * @param {*} clickEvent
 */
function showSelectionBox(clickEvent, debug) {
    cursorState.buttonDown = true;

    let boxDivider = document.getElementById('selectIndicator');
    if (boxDivider !== null) {
        var leftCoord = clickEvent.pageX;
        var topCoord = clickEvent.pageY;


        boxDivider.style.left = leftCoord + 'px';
        boxDivider.style.top = topCoord + 'px';

        cursorState.xStart = leftCoord;
        cursorState.yStart = topCoord;
    }

    if (debug !== undefined) {
        console.log(debug);
    }
}

function hideSelectionBox(clickEvent) {
    let selectIndicator = document.getElementById('selectIndicator');
    const LEFT_MOUSE_BUTTON = 1;
    const RIGHT_MOUSE_BUTTON = 3;

    switch (clickEvent.which) {
        case LEFT_MOUSE_BUTTON:
            // Unselect Selected Units.
            let peasants = document.getElementsByClassName("peasant");
            for (let index = 0; index < peasants.length; index++) {
                const element = peasants[index];
                if ((element !== null) && elementCollision($(selectIndicator), $(element))) {
                    selectUnit(element.id);
                } else {
                    unSelectUnit(element.id);
                }
            }
            break;
        case RIGHT_MOUSE_BUTTON:
            //console.log("Move Units");
            break;
        default:
            console.log('Unknown mouse button', clickEvent.which);
    }

    if (selectIndicator !== null) {
        selectIndicator.style.display = 'none';
        selectIndicator.remove();
    }


    cursorState = {
        buttonDown: false,
    }
}


/**
 * Took this from stackoverflow, there are a lot of collision detection resources.
 * https://stackoverflow.com/questions/5419134/how-to-detect-if-two-divs-touch-with-jquery
 *
 * @param {*} $div1 needs to be wrapped in Jquery
 * @param {*} $div2 needs to be wrapped in Jquery
 * @returns Boolean
 */
 function elementCollision($div1, $div2) {

    if (($div1.offset() === undefined) || ($div2.offset() === undefined)) {
        return false;
    }
    var x1 = $div1.offset().left;
    var y1 = $div1.offset().top;
    var h1 = $div1.outerHeight(true);
    var w1 = $div1.outerWidth(true);
    var b1 = y1 + h1;
    var r1 = x1 + w1;
    var x2 = $div2.offset().left;
    var y2 = $div2.offset().top;
    var h2 = $div2.outerHeight(true);
    var w2 = $div2.outerWidth(true);
    var b2 = y2 + h2;
    var r2 = x2 + w2;

    if (b1 < y2 || y1 > b2 || r1 < x2 || x1 > r2) {
        return false;
    }

    return true;
}

$(document).ready(function() {

    document.getElementById('main').onmousemove=dragSelectionBox;
    document.onmouseup = hideSelectionBox;
});
