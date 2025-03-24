const views = ['o-view', 'u-view', 'v-view', 'h-view'];
const stages = {};
const layers = {};
const measurementLayers = {};
const snapLayers = {};
let activeView = '';
let viewClciked = false;
let measurementPoints = [];
let tempLine = null;
let storedMeasurements = [];

function handleResize(view) {
    const container = document.getElementById(view);
    const stage = stages[view]; // Retrieve the correct stage instance

    if (stage && container) {
        stage.width(container.clientWidth);
        stage.height(container.clientHeight);
    }
}

//Initialize all views
views.forEach(view => {
    const container = document.getElementById(view); //Get the container div
    const stage = new Konva.Stage({
        container: view,
        width: container.clientWidth,  //Set to container's actual width
        height: container.clientHeight //Set to container's actual height
    });
    const layer = new Konva.Layer();
    const measurementLayer = new Konva.Layer();
    const snapLayer = new Konva.Layer();
    snapLayer.visible(false); //Start the snap indicator layers as hidden

    stage.add(layer);
    stage.add(measurementLayer);
    stage.add(snapLayer);
    snapLayers[view] = snapLayer; //Store snap layer for toggling visability

    //Set up a large virtual area inside
    const largeBackground = new Konva.Rect({
        x: 0,
        y: 0,
        width: 13000,  
        height: 3000,  
        fill: 'white',
    });

    layer.add(largeBackground);

    stages[view] = stage;
    layers[view] = layer;
    measurementLayers[view] = measurementLayer;

    stage.on('click touchstart', e => handleMeasurementClick(stage, e));
    stage.on('mousemove touchmove', e => handleMouseMove(stage, e));

    // Resize views dynamically when the window is resized
    window.addEventListener("resize", () => handleResize(view));
});

//changes the measurement view on click
views.forEach(view => {
    const stage = stages[view];

    stage.on('click', () => {
        if (viewClciked) return;
        activeView = view;
    });
});

//transform cursor position correctly after zoom/pan
function getTransformedPosition(stage, pos) {
    const transform = stage.getAbsoluteTransform().copy().invert();
    return transform.point(pos);
}

//find nearest snapping point
let snapDistance = 10;
function getNearestSnapPoint(pos) {
    let closestPoint = pos;
    let minDist = snapDistance;

    layers[activeMeasurementView].getChildren().forEach(shape => {
        if (shape.attrs.snapPoints) {
            shape.attrs.snapPoints.forEach(p => {
                let dist = Math.hypot(p.x - pos.x, p.y - pos.y);
                if (dist < minDist) {
                    minDist = dist;
                    closestPoint = p;
                }
            });
        }
    });

    return closestPoint;
}

//Insures that the input numbers are in the correct range
document.querySelectorAll("input[type=number]").forEach(input => {
    input.addEventListener("input", function() {
        let value = parseInt(this.value, 10); // Ensure value is an integer

        if (isNaN(value)) {
            this.value = this.min; // Default to min if value is invalid
        } else if (value < this.min) {
            this.value = this.min;
        } else if (value > this.max) {
            this.value = this.max;
        }
    });
});

//Loads default values
document.addEventListener('DOMContentLoaded', function (){
    //Set values in the settings dropdown menu to default
    document.getElementById('snapSize').value = snapSize;
    document.getElementById('snapDistance').value = snapDistance;
    document.getElementById('snapPointColor').value = snapPointColor;
    document.getElementById('originPointColor').value = originPointColor;
    document.getElementById('measurementColor').value = measurementColor;
    document.getElementById('measurementTextColor').value = measurementTextColor;
});

document.getElementById("saveSettings").addEventListener("click", function() {
    //Set values in script to values from settings dropdown menu
    snapSize = document.getElementById("snapSize").value;
    snapDistance = document.getElementById("snapDistance").value;
    snapPointColor = document.getElementById('snapPointColor').value;
    originPointColor = document.getElementById('originPointColor').value;
    measurementColor = document.getElementById('measurementColor').value;
    measurementTextColor = document.getElementById('measurementTextColor').value;
    drawBlocs(); //Redraw views
});

//Track active measurement state
let isMeasuring = false;
let activeMeasurementView = null;

function handleMeasurementClick(stage, e) {
    if (tool !== 'measure') return;

    let view = Object.keys(stages).find(v => stages[v] === stage);

    //Lock measurement to the first clicked view
    if (measurementPoints.length === 0) {
        activeMeasurementView = view;
    }

    //Prevent measurement clicks in other views
    if (view !== activeMeasurementView) return;

    let pos = getTransformedPosition(stage, stage.getPointerPosition());
    let snappedPos = getNearestSnapPoint(pos);
    measurementPoints.push(snappedPos);

    const mLayer = measurementLayers[activeMeasurementView]; // Ensure correct layer

    if (measurementPoints.length === 1) {
        if (tempLine) tempLine.destroy();

        tempLine = new Konva.Line({
            points: [snappedPos.x, snappedPos.y, snappedPos.x, snappedPos.y],
            stroke: 'gray',
            strokeWidth: 3,
            dash: [5, 5],
            name: 'temp-measurement-line'
        });

        tempLine.strokeScaleEnabled(false); //Prevent stroke scaling when zooming
        mLayer.add(tempLine);
        mLayer.batchDraw();
        isMeasuring = true;
    } 
    else if (measurementPoints.length === 2) {
        if (tempLine) {
            tempLine.destroy();
            tempLine = null;
        }

        //Ensure measurement is drawn in activeMeasurementView
        measureDistance(measurementPoints[0], measurementPoints[1], activeMeasurementView, false);

        measurementPoints = [];
        activeMeasurementView = null; // Unlock measurement for new interactions
        isMeasuring = false;
    }
}

//update preview measurement line
function handleMouseMove(stage, e) {
    if (measurementPoints.length === 1 && tempLine) {
        let pos = getTransformedPosition(stage, stage.getPointerPosition());
        let snappedPos = getNearestSnapPoint(pos);

        tempLine.points([measurementPoints[0].x, measurementPoints[0].y, snappedPos.x, snappedPos.y]);
        measurementLayers[activeView].batchDraw();
    }
}

//measure distance between two points
let measurementColor = '#808080';
let measurementTextColor = '#008000';
let measurementCounter = 0;
function measureDistance(start, end, view, isRedrawing, index) {
    const mLayer = measurementLayers[view];
    const distance = Math.hypot(end.x - start.x, end.y - start.y).toFixed(2);
    const hDistance = Math.abs(end.x - start.x).toFixed(2);
    const vDistance = Math.abs(end.y - start.y).toFixed(2);

    if(!isRedrawing) measurementCounter++;

    let lineName = isRedrawing ? `final-measurement-line-${index}` : `final-measurement-line-${measurementCounter}`;
    let line = new Konva.Line({
        points: [start.x, start.y, end.x, end.y],
        stroke: measurementColor,
        strokeWidth: 3,
        dash: [5, 5],
        name: lineName,
        listening: false 
    });

    let labelName = isRedrawing ? `measurement-text-${index}` : `measurement-text-${measurementCounter}`;
    let label = new Konva.Text({
        x: (start.x + end.x) / 2,
        y: (start.y + end.y) / 2,
        text: `${distance} mm`,
        fontSize: 30,
        fill: measurementTextColor,
        name: labelName,
        offsetX: 20,
        offsetY: 10
    });

    line.strokeScaleEnabled(false);
    label.perfectDrawEnabled(false);
    mLayer.add(line, label);
    mLayer.batchDraw();

    if (measurementCounter > 0) document.getElementById('historyDropdownBtn').classList.remove('lighten-3'); //Make measurement history button active

    //Only store new measurements, prevent duplicates on redraw
    if (!isRedrawing) {
        addMeasurementData(measurementCounter, view, distance, hDistance, vDistance); //Adds measurement data to history menu
        storedMeasurements.push({ start, end, view, measurementCounter });
        //Show toast message for measurement
        M.toast({ html: `length: ${distance} mm, X: ${hDistance} mm, Y: ${vDistance} mm`, classes: 'rounded toast-success', displayLength: 3000});
    }
}

//Redraw all measurements in a view
function redrawMeasurements() {
    Object.keys(measurementLayers).forEach(view => {
        const mLayer = measurementLayers[view];
        mLayer.destroyChildren(); // Clear previous measurements

        storedMeasurements.forEach(m => {
            if (m.view === view) {
                measureDistance(m.start, m.end, view, true, m.measurementCounter); // Pass "isRedrawing = true"
            }
        });

        mLayer.batchDraw();
    });
}

views.forEach(view => {
    const stage = stages[view];

    // Handle mouse wheel zoom
    stage.on('wheel', e => {
        e.evt.preventDefault();
        const scaleBy = 1.05;
        let oldScale = stage.scaleX();
        let pointer = stage.getPointerPosition();

        let newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
        stage.scale({ x: newScale, y: newScale });

        let mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale
        };

        stage.position({
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale
        });

        stage.batchDraw();
    });

    let lastPos = null;
    let touchStartDistance = null;
    let touchStartScale = null;

    // Handle touch start for pan and pinch-to-zoom
    stage.on('mousedown touchstart', e => {
        e.evt.preventDefault();
        if (e.evt.touches && e.evt.touches.length === 2) {
            // Pinch-to-zoom start
            touchStartDistance = getDistance(e.evt.touches);
            touchStartScale = stage.scaleX();
        } else {
            // Pan start
            lastPos = stage.getPointerPosition();
        }
    });

    // Handle touch move for pan and pinch-to-zoom
    stage.on('mousemove touchmove', e => {
        e.evt.preventDefault();
        if (e.evt.touches && e.evt.touches.length === 2) {
            // Pinch-to-zoom
            const newDistance = getDistance(e.evt.touches);
            const scaleBy = newDistance / touchStartDistance;
            const newScale = touchStartScale * scaleBy;

            const pointer = {
                x: (e.evt.touches[0].clientX + e.evt.touches[1].clientX) / 2,
                y: (e.evt.touches[0].clientY + e.evt.touches[1].clientY) / 2
            };

            const mousePointTo = {
                x: (pointer.x - stage.x()) / stage.scaleX(),
                y: (pointer.y - stage.y()) / stage.scaleY()
            };

            stage.scale({ x: newScale, y: newScale });
            stage.position({
                x: pointer.x - mousePointTo.x * newScale,
                y: pointer.y - mousePointTo.y * newScale
            });

            stage.batchDraw();
        } else if (lastPos && tool === 'pan') {
            // Pan
            const pos = stage.getPointerPosition();
            stage.x(stage.x() + pos.x - lastPos.x);
            stage.y(stage.y() + pos.y - lastPos.y);
            lastPos = pos;
            stage.batchDraw();
        }
    });

    // Handle touch end
    stage.on('mouseup touchend', () => {
        lastPos = null;
        touchStartDistance = null;
        touchStartScale = null;
    });
});

// Helper function to calculate the distance between two touch points
function getDistance(touches) {
    const [touch1, touch2] = touches;
    return Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
    );
}

//clears all views
function clearAllViews() {
    Object.keys(layers).forEach(view => {
        layers[view].destroyChildren(); //Remove all shapes
        measurementLayers[view].destroyChildren(); //Remove all measurements
        snapLayers[view].destroyChildren(); //Remove all snap indicators
        layers[view].batchDraw();
        measurementLayers[view].batchDraw();
        snapLayers[view].batchDraw();
    });
}

// Reset scale and position of all stages
function resetScale() {
    views.forEach(view => {
        const stage = stages[view];
        stage.scale({ x: 1, y: 1 });
        stage.position({ x: 0, y: 0 });
        stage.batchDraw();
    });
}

//clears all measurements
function clearMeasurements() {
    Object.keys(measurementLayers).forEach(view => {
        measurementLayers[view].destroyChildren();
        storedMeasurements = [];
        measurementLayers[view].batchDraw();
    }
    );
    document.getElementById('historyDropdown').innerHTML = ''; //Clears measurement history
    measurementCounter = 0; //Resets measuremtn counter
    document.getElementById('historyDropdownBtn').classList.add('lighten-3');
}

let tool = 'pan'; // Default tool is panning

//Hnadles switching from panning tool to measuring tool
function activatePanTool() {
    if (tool === 'measure' && isMeasuring === false) {
        tool = 'pan';
        document.getElementById('measureTool').classList.add('lighten-3');
        document.getElementById('panTool').classList.remove('lighten-3');
    }
}
function activateMeasureTool() {
    if (tool === 'pan') {
        tool = 'measure';
        document.getElementById('panTool').classList.add('lighten-3');
        document.getElementById('measureTool').classList.remove('lighten-3');
    }
}

//Toggle snap indictaors
function toggleSnapIndicators() {
    let isVisible;
    Object.values(snapLayers).forEach(layer => {
        isVisible = layer.visible();
        layer.visible(!isVisible); // Toggle visibility
        layer.batchDraw();
    });
    const btn = document.getElementById('toggleSnap');
    btn.classList.toggle('lighten-3')
    isVisible == true ? btn.dataset.tooltip = 'Show snap points' : btn.dataset.tooltip = 'Hide snap points'; //Switches the tooltip text
}