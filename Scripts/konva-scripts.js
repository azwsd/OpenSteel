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
    if (document.getElementById(view).classList.contains('hide')) return; //Skip resizing if the view is hidden
    const container = document.getElementById(view);
    const stage = stages[view];

    if (stage && container) {
        // Store current transformation to maintain view
        const oldScale = stage.scaleX();
        const oldX = stage.x();
        const oldY = stage.y();
        const oldWidth = stage.width();
        const oldHeight = stage.height();
        
        // Update stage size
        stage.width(container.clientWidth);
        stage.height(container.clientHeight);
        
        // Adjust position to maintain relative positioning
        const scaleX = container.clientWidth / oldWidth;
        const scaleY = container.clientHeight / oldHeight;
        
        stage.x(oldX * scaleX);
        stage.y(oldY * scaleY);
        
        stage.batchDraw();
    }
}

//Function to auto-fit all views
function autoFitAllViews(padding = 0) {
    views.forEach(view => {
        autoFitSingleView(view, padding);
    });
}

//Function to auto-fit a single view
function autoFitSingleView(view, padding) {
    const stage = stages[view];
    if (!stage) return;
    
    //Get bounds of content of current view
    const bounds = getVisibleContentBounds(stage);
    
    if (!bounds) {
        //No content found in this view, reset to default view
        resetView(view);
        return;
    }
    
    const stageWidth = stage.width();
    const stageHeight = stage.height();
    
    //Calculate scale to fit this view's content with padding
    const scaleX = (stageWidth - padding * 2) / bounds.width;
    const scaleY = (stageHeight - padding * 2) / bounds.height;
    const scale = Math.min(scaleX, scaleY, 3); // Allow scaling up to 3x, but limit it
    
    //Calculate position to center this view's content
    const centerX = (stageWidth / 2) - ((bounds.minX + bounds.width / 2) * scale);
    const centerY = (stageHeight / 2) - ((bounds.minY + bounds.height / 2) * scale);
    
    //Apply transformation with smooth animation
    stage.to({
        x: centerX,
        y: centerY,
        scaleX: scale,
        scaleY: scale,
        duration: 0.3,
        easing: Konva.Easings.EaseInOut
    });
}

//Function to get bounds of visible content
function getVisibleContentBounds(stage) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let hasContent = false;
    
    //Check all layers for content
    stage.getLayers().forEach(layer => {
        layer.getChildren().forEach(child => {
            //Skip invisible elements
            if (!child.visible() || child.opacity() === 0) {
                return;
            }

            //Get the bounding box
            const box = child.getClientRect();
            
            //Only include elements with actual size
            if (box.width > 0 && box.height > 0) {
                minX = Math.min(minX, box.x);
                minY = Math.min(minY, box.y);
                maxX = Math.max(maxX, box.x + box.width);
                maxY = Math.max(maxY, box.y + box.height);
                hasContent = true;
            }
        });
    });
    
    //Return null if no content found
    if (!hasContent) {
        return null;
    }
    
    return { 
        minX, 
        minY, 
        maxX, 
        maxY, 
        width: maxX - minX, 
        height: maxY - minY 
    };
}

//Reset view
function resetView(view) {
    const stage = stages[view];
    stage.to({
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        duration: 0,
        easing: Konva.Easings.EaseInOut
    });
}

//Initialize all views
views.forEach(view => {
    const container = document.getElementById(view);
    const stage = new Konva.Stage({
        container: view,
        width: container.clientWidth,
        height: container.clientHeight,
        // Enable dragging for better navigation
        draggable: true
    });
    const layer = new Konva.Layer();
    const measurementLayer = new Konva.Layer();
    const snapLayer = new Konva.Layer();
    snapLayer.visible(false);

    stage.add(layer);
    stage.add(measurementLayer);
    stage.add(snapLayer);
    snapLayers[view] = snapLayer;

    stages[view] = stage;
    layers[view] = layer;
    measurementLayers[view] = measurementLayer;

    stage.on('click touchstart', e => handleMeasurementClick(stage, e));
    stage.on('mousemove touchmove', e => handleMouseMove(stage, e));

    let resizeTimeout;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            for (const view of views) handleResize(view);
            resetScale();
            stages[Object.keys(stages)[0]].to({ onFinish: () => autoFitAllViews() });
        }, 250); // Wait 250ms after last resize event
    });
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
        let value = parseInt(this.value, 10);

        if (isNaN(value)) {
            this.value = this.min;
        } else if (value < this.min) {
            this.value = this.min;
        } else if (value > this.max) {
            this.value = this.max;
        }
    });
});

//Loads default values
let snapDistanceMin = 1;
let snapDistanceMax = 20;
let snapSizeMin = 1;
let snapSizeMax = 20;
document.addEventListener('DOMContentLoaded', function (){
    let snapSizeElement = document.getElementById('snapSize');
    snapSizeElement.value = snapSize;
    snapSizeElement.min = snapSizeMin;
    snapSizeElement.max = snapSizeMax;
    let snapDistanceElement = document.getElementById('snapDistance');
    snapDistanceElement.value = snapDistance;
    snapDistanceElement.min = snapDistanceMin;
    snapDistanceElement.max = snapDistanceMax;
    document.getElementById('snapPointColor').value = snapPointColor;
    document.getElementById('originPointColor').value = originPointColor;
    document.getElementById('measurementColor').value = measurementColor;
    document.getElementById('measurementTextColor').value = measurementTextColor;
    document.getElementById('measurementTextTransform').checked = resizeVisible;
});

document.getElementById("saveSettings").addEventListener("click", function() {
    snapSize = document.getElementById("snapSize").value;
    if(snapSize < snapSizeMin) {
        document.getElementById("snapSize").value = snapSizeMin;
        snapSize = snapSizeMin;
    }
    else if(snapSize > snapSizeMax) {
        document.getElementById("snapSize").value = snapSizeMax;
        snapSize = snapSizeMax;
    }
    snapDistance = document.getElementById("snapDistance").value;
    if(snapDistance < snapDistanceMin) {
        document.getElementById("snapDistance").value = snapDistanceMin;
        snapDistance = snapDistanceMin;
    }
    else if(snapDistance > snapDistanceMax) {
        document.getElementById("snapDistance").value = snapDistanceMax;
        snapDistance = snapDistanceMax;
    }
    snapPointColor = document.getElementById('snapPointColor').value;
    originPointColor = document.getElementById('originPointColor').value;
    measurementColor = document.getElementById('measurementColor').value;
    measurementTextColor = document.getElementById('measurementTextColor').value;
    resizeVisible = document.getElementById('measurementTextTransform').checked;

    Object.values(measurementLayers).forEach(layer => {
        layer.getChildren(node => 
            node.name()?.startsWith("final-measurement-line") ||
            node.name()?.startsWith("measurement-text")
        ).forEach(node => {
            if (node.className === "Line") node.stroke(measurementColor);
            else if (node.className === "Text") {
                node.fill(measurementTextColor);
                node.draggable(resizeVisible);
            }
        });

        const labelTransformers = layer.find('Transformer');
        labelTransformers.forEach(labelTransformer => {
            resizeVisible == false ? labelTransformer.hide() : labelTransformer.show();
        });

        layer.batchDraw();
    });

    Object.values(snapLayers).forEach(layer => {
        layer.getChildren(node => node.name() === "origin-point").forEach(node => {
            if (node.className === "Circle") {
                node.fill(originPointColor);
                node.radius(snapSize);
            }
        });

        layer.batchDraw();
    });
    Object.values(snapLayers).forEach(layer => {
        layer.getChildren(node => node.name() === "snap-indicator").forEach(node => {
            if (node.className === "Circle") {
                node.fill(snapPointColor);
                node.radius(snapSize);
            }
        });

        layer.batchDraw();
    });

    localStorage.setItem("snapSize", snapSize);
    localStorage.setItem("snapDistance", snapDistance);
    localStorage.setItem("snapPointColor", snapPointColor);
    localStorage.setItem("originPointColor", originPointColor);
    localStorage.setItem("measurementColor", measurementColor);
    localStorage.setItem("measurementTextColor", measurementTextColor);
    localStorage.setItem("resizeVisible", resizeVisible);
});

//Track active measurement state
let isMeasuring = false;
let activeMeasurementView = null;

function handleMeasurementClick(stage, e) {
    if (tool !== 'measure') return;

    let view = Object.keys(stages).find(v => stages[v] === stage);

    if (measurementPoints.length === 0) {
        activeMeasurementView = view;
    }

    if (view !== activeMeasurementView) return;

    let pos = getTransformedPosition(stage, stage.getPointerPosition());
    let snappedPos = getNearestSnapPoint(pos);
    measurementPoints.push(snappedPos);

    const mLayer = measurementLayers[activeMeasurementView];

    if (measurementPoints.length === 1) {
        if (tempLine) tempLine.destroy();

        tempLine = new Konva.Line({
            points: [snappedPos.x, snappedPos.y, snappedPos.x, snappedPos.y],
            stroke: 'gray',
            strokeWidth: 3,
            dash: [5, 5],
            name: 'temp-measurement-line'
        });

        tempLine.strokeScaleEnabled(false);
        mLayer.add(tempLine);
        mLayer.batchDraw();
        isMeasuring = true;
    } 
    else if (measurementPoints.length === 2) {
        if (tempLine) {
            tempLine.destroy();
            tempLine = null;
        }

        measureDistance(measurementPoints[0], measurementPoints[1], activeMeasurementView, false);

        measurementPoints = [];
        activeMeasurementView = null;
        isMeasuring = false;
    }
}

function handleMouseMove(stage, e) {
    if (measurementPoints.length === 1 && tempLine) {
        let pos = getTransformedPosition(stage, stage.getPointerPosition());
        let snappedPos = getNearestSnapPoint(pos);

        tempLine.points([measurementPoints[0].x, measurementPoints[0].y, snappedPos.x, snappedPos.y]);
        measurementLayers[activeView].batchDraw();
    }
}

let measurementColor = localStorage.getItem("measurementColor") || '#808080';
let measurementTextColor = localStorage.getItem("measurementTextColor") || '#008000';
let resizeVisible = localStorage.getItem("resizeVisible") === "true" ? true : false;
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

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angleRad = Math.atan2(dy, dx);
    const angleDeg = angleRad * (180 / Math.PI);

    let labelName = isRedrawing ? `measurement-text-${index}` : `measurement-text-${measurementCounter}`;
    let label = new Konva.Text({
        x: (start.x + end.x) / 2,
        y: (start.y + end.y) / 2,
        text: `${distance} mm`,
        fontSize: 30,
        fill: measurementTextColor,
        name: labelName,
        draggable: resizeVisible,
        rotation: angleDeg
    });

    let labelTransformerName = isRedrawing ? `measurement-transformer-${index}` : `measurement-transformer-${measurementCounter}`;
    let labelTransformer = new Konva.Transformer({
        nodes: [label],
        name: labelTransformerName,
        rotateEnabled: true,
        enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    });
    resizeVisible == false ? labelTransformer.hide() : labelTransformer.show();

    line.strokeScaleEnabled(false);
    label.perfectDrawEnabled(false);
    mLayer.add(line, label, labelTransformer);
    mLayer.batchDraw();

    if (measurementCounter > 0) document.getElementById('historyDropdownBtn').classList.remove('lighten-3');

    if (!isRedrawing) {
        addMeasurementData(measurementCounter, view, distance, hDistance, vDistance);
        storedMeasurements.push({ start, end, view, measurementCounter });
        M.toast({ html: `length: ${distance} mm, X: ${hDistance} mm, Y: ${vDistance} mm`, classes: 'rounded toast-success', displayLength: 3000});
    }
}

function redrawMeasurements() {
    Object.keys(measurementLayers).forEach(view => {
        const mLayer = measurementLayers[view];
        mLayer.destroyChildren();

        storedMeasurements.forEach(m => {
            if (m.view === view) {
                measureDistance(m.start, m.end, view, true, m.measurementCounter);
            }
        });

        mLayer.batchDraw();
    });
}

views.forEach(view => {
    const stage = stages[view];

    // Enhanced mouse wheel zoom with limits
    stage.on('wheel', e => {
        e.evt.preventDefault();
        const scaleBy = 1.05;
        let oldScale = stage.scaleX();
        let pointer = stage.getPointerPosition();

        let newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
        
        // Add zoom limits
        const minScale = 0.1;
        const maxScale = 10;
        newScale = Math.max(minScale, Math.min(maxScale, newScale));
        
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

    stage.on('mousedown touchstart', e => {
        e.evt.preventDefault();
        if (e.evt.touches && e.evt.touches.length === 2) {
            touchStartDistance = getDistance(e.evt.touches);
            touchStartScale = stage.scaleX();
        } else {
            lastPos = stage.getPointerPosition();
        }
    });

    stage.on('mousemove touchmove', e => {
        e.evt.preventDefault();
        if (e.evt.touches && e.evt.touches.length === 2) {
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
            const pos = stage.getPointerPosition();
            stage.x(stage.x() + pos.x - lastPos.x);
            stage.y(stage.y() + pos.y - lastPos.y);
            lastPos = pos;
            stage.batchDraw();
        }
    });

    stage.on('mouseup touchend', () => {
        lastPos = null;
        touchStartDistance = null;
        touchStartScale = null;
    });
});

function getDistance(touches) {
    const [touch1, touch2] = touches;
    return Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
    );
}

function clearAllViews() {
    Object.keys(layers).forEach(view => {
        layers[view].destroyChildren();
        measurementLayers[view].destroyChildren();
        snapLayers[view].destroyChildren();
        layers[view].batchDraw();
        measurementLayers[view].batchDraw();
        snapLayers[view].batchDraw();
    });
}

//Reset scale
function resetScale() {
    views.forEach(view => resetView(view));
}

function clearMeasurements() {
    Object.keys(measurementLayers).forEach(view => {
        measurementLayers[view].destroyChildren();
        storedMeasurements = [];
        measurementLayers[view].batchDraw();
    });
    document.getElementById('historyDropdown').innerHTML = '';
    measurementCounter = 0;
    document.getElementById('historyDropdownBtn').classList.add('lighten-3');
    measurementPoints = [];
    activeMeasurementView = null;
    isMeasuring = false;
}

let tool = 'pan';

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

function toggleSnapIndicators() {
    let isVisible;
    Object.values(snapLayers).forEach(layer => {
        isVisible = layer.visible();
        layer.visible(!isVisible);
        layer.batchDraw();
    });
    const btn = document.getElementById('toggleSnap');
    btn.classList.toggle('lighten-3')
    isVisible == true ? btn.dataset.tooltip = 'Show snap points' : btn.dataset.tooltip = 'Hide snap points';
}