// Draws contour blocks to the canvas with coordinate transformations
function drawContours() {
    let isFirstIteration = true;
    let resetIteration = false;
    let prevX, prevY, tPrevX, tPrevY, tX, tY, firstX, firstY;
    let currentContour = null;
    let prevView = null;
    let currentView = null;
    let arcLine = 0;
    let arcData = [];
    let fX, fY, sX, sY, eX, eY, r, rTemp;
    let arcType = '';

    for (dataLine of contourData) {
        currentView = dataLine[0];

        if(currentContour != dataLine[9]) {
            currentContour = dataLine[9];
            isFirstIteration = true;
        }

        if(currentContour == 'IK' && isFirstIteration) {
            firstX = dataLine[1];
            firstY = dataLine[3];
        }
        else if(currentContour == 'IK' && !isFirstIteration && dataLine[1] == firstX && dataLine[3] == firstY) resetIteration = true;

        // Skip drawing the line if the face has changed
        if (prevView !== null && prevView !== currentView) {
            prevX = dataLine[1];
            prevY = dataLine[3];
            prevView = currentView;
            isFirstIteration = false;
            continue;
        }
        prevView = currentView;

        // Skip drawing the first line from origin
        if (isFirstIteration && dataLine[4] == 0) {
            prevX = dataLine[1];
            prevY = dataLine[3];
            isFirstIteration = false;
            continue;
        }
        else if(isFirstIteration && dataLine[4] != 0) {
            fX = dataLine[1];
            fY = dataLine[3];
            rTemp = dataLine[4];
            arcLine++;
            arcData.push(fX, fY);
            isFirstIteration = false;
            continue;
        }

        let view = currentView + '-view';
        let layer = layers[view];
        let stage = layers[view].getStage(); // Get the Konva Stage
        let canvasWidth = stage.width();
        let canvasHeight = stage.height();

        //Check if the line is an arc and stores it in arcData
        if(dataLine[4] != 0 && arcLine == 0) {
            fX = dataLine[1];
            fY = dataLine[3];
            rTemp = dataLine[4];
            arcLine++;
            arcData.push(fX, fY);
        }
        else if(dataLine[4] != 0 && arcLine == 1) {
            sX = dataLine[1];
            sY = dataLine[3];
            r = dataLine[4];
            arcLine++;
            arcData.push(sX, sY, r);
            continue; 
        }
        else if(dataLine[4] == 0 && arcLine == 1) {
            eX = dataLine[1];
            eY = dataLine[3];
            cX = dataLine[1];
            cY = arcData[1];
            arcData.push(cX, cY, rTemp, eX, eY);
            arcType = 'partial';
        }
        else if(dataLine[4] == 0 && arcLine == 2) {
            eX = dataLine[1];
            eY = dataLine[3];
            arcLine = 0;
            arcType = 'partial';
            arcData.push(eX, eY); 
        }
        else if(dataLine[4] != 0 && arcLine == 2) {
            arcLine++;
            continue;
        }
        else if(dataLine[4] == 0 && arcLine == 3){
            eX = dataLine[1];
            eY = dataLine[3];
            arcLine = 0;
            arcType = 'full';
            arcData.push(eX, eY);
        }

        if (arcData.length !== 0 && arcType === 'partial') {
            //Get center point correctly
            let sX = arcData[0];
            let sY = arcData[1];
            let cX = arcData[2];
            let cY = arcData[3];
            let eX = arcData[5];
            let eY = arcData[6];
            [sX, sY] = transformCoordinates(view, sX, sY, canvasWidth, canvasHeight);
            [eX, eY] = transformCoordinates(view, eX, eY, canvasWidth, canvasHeight);
            const r = Math.abs(arcData[4]);

            if(sX == eX && sY == eY) {
                [cX, cY] = transformCoordinates(view, cX, cY, canvasWidth, canvasHeight);
                [cX, cY] = [((sX + cX) / 2), (sY + cY) / 2];
                hole = new Konva.Circle({
                    x: cX, 
                    y: cY,
                    radius: r,
                    stroke: 'black',
                    strokeWidth: 3,
                    name: `contour-arc`,
                    snapPoints: [
                        { x: cX, y: cY }, // Center
                        { x: cX + r, y: cY }, // Right (0°)
                        { x: cX, y: cY - r }, // Top (90°)
                        { x: cX - r, y: cY }, // Left (180°)
                        { x: cX, y: cY + r }, // Bottom (270°)
                    ]
                });
                //create snap indicator
                addSnapIndicator(cX, cY, view);
                addSnapIndicator(cX + r, cY, view);
                addSnapIndicator(cX, cY - r, view);
                addSnapIndicator(cX - r, cY, view);
                addSnapIndicator(cX, cY + r, view);

                hole.strokeScaleEnabled(false);
                layer.add(hole);
                layer.batchDraw();

                isFirstIteration = true;
            }
            else {
                let isClockwise = arcData[4] > 0 ? false : true;
                [cX, cY] = calcCenter(sX, sY, cX, cY, eX, eY, r);
                let startAngle = calcAngle(sX, sY, cX, cY);
                let endAngle = calcAngle(eX, eY, cX, cY);

                let arcAngle = calcArcAngle(startAngle, endAngle, isClockwise);
                let rotationAngle = isClockwise ? startAngle : endAngle;

                let arc = new Konva.Arc({
                x: cX,
                y: cY,
                innerRadius: r,
                outerRadius: r,
                angle: arcAngle,
                stroke: 'black',
                rotation: rotationAngle,
                clockwise: true,
                strokeWidth: 3,
                name: 'contour-arc',
                snapPoints : [
                    {cX, cY}
                ],
                });
                addSnapIndicator(cX, cY, view);
        
                arc.strokeScaleEnabled(false); //Prevent stroke scaling when zooming
                layer.add(arc);
                layer.batchDraw();
            }

            prevX = arcData[5];
            prevY = arcData[6];
        
            arcData = [];
            arcType = '';
            arcLine = 0;
            continue;
        }

        if (arcData.length !== 0 && arcType === 'full') {
            //Get center point correctly
            let cX = arcData[2];
            let cY = arcData[3];
            let sX = arcData[0];
            let sY = arcData[1];
            let eX = arcData[5];
            let eY = arcData[6];
            [cX, cY] = transformCoordinates(view, cX, cY, canvasWidth, canvasHeight);
            [sX, sY] = transformCoordinates(view, sX, sY, canvasWidth, canvasHeight);
            [eX, eY] = transformCoordinates(view, eX, eY, canvasWidth, canvasHeight);
            let isClockwise = arcData[4] > 0 ? true : false;
            const r = Math.abs(arcData[4]);
        
            //Compute start and end angles in degrees
            let startAngle = calcAngle(sX, sY, cX, cY);
            let endAngle = calcAngle(eX, eY, cX, cY);
            
            let arcAngle = calcArcAngle(startAngle, endAngle, isClockwise);
            let rotationAngle = isClockwise ? startAngle : endAngle;
            
            let arc = new Konva.Arc({
                x: cX,
                y: cY,
                innerRadius: r,
                outerRadius: r,
                angle: arcAngle,
                stroke: 'black',
                rotation: rotationAngle, 
                clockwise: true,
                strokeWidth: 3,
                name: 'contour-arc',
                snapPoints : [
                    {cX, cY}
                ],
            });
            addSnapIndicator(cX, cY, view);
            arc.strokeScaleEnabled(false); //Prevent stroke scaling when zooming
            layer.add(arc);
            layer.batchDraw();
            
            prevX = arcData[5];
            prevY = arcData[6];
        
            arcData = [];
            arcType = '';
            arcLine = 0;
            continue;
        }
        
        
        //Apply transformations based on the view
        [tPrevX, tPrevY] = transformCoordinates(view, prevX, prevY, canvasWidth, canvasHeight);
        [tX, tY] = transformCoordinates(view, dataLine[1], dataLine[3], canvasWidth, canvasHeight);

        let line = new Konva.Line({
            points: [tPrevX, tPrevY, tX, tY],
            stroke: 'black',
            strokeWidth: 3,
            name: 'contour-line',
            snapPoints: [
                { x: tPrevX, y: tPrevY }, // Start
                { x: (tPrevX + tX) / 2, y: (tPrevY + tY) / 2 }, // Middle
                { x: tX, y: tY }  // End
            ]
        });

        //create snap indicator
        addSnapIndicator(tPrevX, tPrevY, view);
        addSnapIndicator((tPrevX + tX) / 2, (tPrevY + tY) / 2, view);
        addSnapIndicator(tX, tY, view);

        prevX = dataLine[1];
        prevY = dataLine[3];

        line.strokeScaleEnabled(false); //Prevent stroke scaling when zooming
        layer.add(line);
        layer.batchDraw();

        if(resetIteration) {
            resetIteration = false;
            isFirstIteration = true;
        }
    }
}

// Draws contour blocks to the canvas with coordinate transformations
function drawHoles() {
    let currentView = null;

    for (const [index, dataLine] of holeData.entries()) {
        currentView = dataLine[0];
        let holeType = dataLine[4];
        let view = currentView + '-view';
        let layer = layers[view];
        let stage = layers[view].getStage(); // Get the Konva Stage
        let canvasWidth = stage.width();
        let canvasHeight = stage.height();
        let hole;
        let tX, tY;
        let d = dataLine[5];
        let r = d / 2;

        //draws a slot if present in dataline
        if (dataLine[7][0] == 'l') {
            // Calculate the slot dimensions
            let slotWidth = dataLine[8] + d;
            let slotHeight = dataLine[9] + d;

            //Apply transformations based on the view for rectangle
            [tX, tY] = transformCoordinates(view, dataLine[1], dataLine[3], canvasWidth, canvasHeight);
            // Create a rounded rectangle (slot)
            let slot = new Konva.Rect({
                x: tX,
                y: tY,
                width: slotWidth,
                height: slotHeight,
                cornerRadius: d / 2, // Rounded corners
                stroke: 'black',
                strokeWidth: 3,
                rotation: -dataLine[10], // Rotate the slot
                offsetX: r,
                offsetY: slotHeight - r,
                name: `circle-${index}`, 
                snapPoints : [
                    {tX, tY}
                ]
            });

            //create snap indicator
            addSnapIndicator(tX, tY, view);

            // Add the slot to the layer and redraw
            slot.strokeScaleEnabled(false);
            layer.add(slot);
            layer.batchDraw();

            continue;
        }

        [tX, tY] = transformCoordinates(view, dataLine[1], dataLine[3], canvasWidth, canvasHeight);
        if (holeType == 'm') {
            hole = new Konva.Circle({
                x: tX,  // X position
                y: tY,  // Y position
                radius: 2,  // Small radius to appear as a dot
                fill: 'black',  // Fill color
                strokeWidth: 1,  // Stroke thickness\
                name: `circle-${index}`,
                snapPoints: [
                    { x: tX, y: tY }, // Center
                ]
            });
            //create snap indicator
            addSnapIndicator(tX, tY, view);
        }
        else
        {
            hole = new Konva.Circle({
                x: tX, 
                y: tY,
                radius: r,
                stroke: 'black',
                strokeWidth: 3,
                name: `circle-${index}`,
                snapPoints: [
                    { x: tX, y: tY }, // Center
                    { x: tX + r, y: tY }, // Right (0°)
                    { x: tX, y: tY - r }, // Top (90°)
                    { x: tX - r, y: tY }, // Left (180°)
                    { x: tX, y: tY + r }, // Bottom (270°)
                ]
            });
            //create snap indicator
            addSnapIndicator(tX, tY, view);
            addSnapIndicator(tX + r, tY, view);
            addSnapIndicator(tX, tY - r, view);
            addSnapIndicator(tX - r, tY, view);
            addSnapIndicator(tX, tY + r, view);
        }

        hole.strokeScaleEnabled(false);
        layer.add(hole);
        layer.batchDraw();
    }
}

//Changes the color of a hole in view
function changeHoleColor(holeDiv) {
    //Reset all hole colors to black
    for (const dataLine of holeData) {
        let layer = layers[dataLine[0] + '-view'];
        let holes = layer.find(node => node instanceof Konva.Circle);
        holes.forEach(hole => {hole.stroke('black')});
        let Rectangles = layer.find(node => node instanceof Konva.Rect);
        Rectangles.forEach(hole => {hole.stroke('black')});
    }
    document.querySelectorAll('.holeCard').forEach(card => {card.classList.remove('selected-file');}); //Removes green selection boarder from all hole card elements

    let index = holeDiv.dataset.index;
    let view = holeDiv.dataset.view;
    let layer = layers[view];
    let hole = layer.findOne(`.circle-${index}`); // Find the hole by its name
    holeDiv.classList.add('selected-file');
    hole.stroke('green');
    layer.batchDraw();
}

//Draws marks to the canvas
function drawMarks() {
    let currentView = null;
    let prevX, prevY;
    
    for (dataLine of marksData) {
        currentView = dataLine[0];
        let view = currentView + '-view';
        let layer = layers[view];
        let stage = layers[view].getStage(); // Get the Konva Stage
        let canvasWidth = stage.width();
        let canvasHeight = stage.height();
        let tX, tY, tPrevX, tPrevY;
        let r = dataLine[4];
        let isStart = dataLine[5];

        if (r == 0) {
            if (isStart) {
                prevX = dataLine[1];
                prevY = dataLine[3];
                continue;
            }
            // Apply transformations based on the view
            [tPrevX, tPrevY] = transformCoordinates(view, prevX, prevY, canvasWidth, canvasHeight);
            [tX, tY] = transformCoordinates(view, dataLine[1], dataLine[3], canvasWidth, canvasHeight);
            let mark = new Konva.Line({
                points: [tPrevX, tPrevY, tX, tY],
                stroke: 'black',
                strokeWidth: 3,
                name: 'mark-line',
                snapPoints: [
                    { x: tPrevX, y: tPrevY }, // Start
                    { x: (tPrevX + tX) / 2, y: (tPrevY + tY) / 2 }, // Middle
                    { x: tX, y: tY }  // End
                ]
            });
            //create snap indicator
            addSnapIndicator(tPrevX, tPrevY, view);
            addSnapIndicator((tPrevX + tX) / 2, (tPrevY + tY) / 2, view);
            addSnapIndicator(tX, tY, view);

            prevX = dataLine[1];
            prevY = dataLine[3];
    
            mark.strokeScaleEnabled(false); //Prevent stroke scaling when zooming
            layer.add(mark);
            continue;
        }
        
        let mark = new Konva.Circle({
            x: tX,  // X position
            y: tY,  // Y position
            radius: r,  
            fill: 'black',  // Fill color
            strokeWidth: 1,  // Stroke thickness\
            snapPoints: [
                { x: tX, y: tY }, // Center
            ]
        });
        //create snap indicator
        addSnapIndicator(tX, tY, view);
        mark.strokeScaleEnabled(false);
        layer.add(mark);
        layer.batchDraw();
    }
}

//Draws numerations to the canvas
function drawNumertaions() {
    let currentView = null;

    for (dataLine of numerationsData) {
        currentView = dataLine[0];
        let view = currentView + '-view';
        let layer = layers[view];
        let stage = layers[view].getStage(); // Get the Konva Stage
        let canvasWidth = stage.width();
        let canvasHeight = stage.height();
        let tX, tY;
        let angle = dataLine[4];
        let height = dataLine[5];
        let text = dataLine[7];
    
        [tX, tY] = transformCoordinates(view, dataLine[1], dataLine[3], canvasWidth, canvasHeight);
    
        const numeration = new Konva.Text({
            x: tX,
            y: tY,
            text: text,
            fontSize: height, // Set text height as font size
            fontFamily: 'Arial',
            fill: 'black',
            rotation: angle // Rotate text by given angle
        });
    
        numeration.strokeScaleEnabled(false);
        layer.add(numeration);
        layer.batchDraw();
    }
}


//Function to apply coordinate transformations based on view
function transformCoordinates(view, x, y, width, height) {
    switch (view) {
        case 'v-view': // Bottom-left, X and Y negative
        case 'u-view': 
            return [x, height - y];
        case 'o-view': // Bottom-right, X and Y negative
            return [width - x, height - y];
        case 'h-view': // Top-right, Y negative only
        default:
            return [x, y];
    }
}

function calcArcAngle(start, end, isClockwise) {
    if (isClockwise) {
        return start > end ? 360 - start + end : end - start;
    } else {
        return start > end ? start - end : 360 - end + start;
    }
}

function calcAngle(pX, pY, cX, cY){
    let angle = Math.atan2(pY - cY, pX - cX) * (180 / Math.PI); // Negate y for mathematical orientation
    return angle < 0 ? angle + 360 : angle; // Convert negative angles to 0-360 range
}

function calcCenter(sX, sY, cX, cY, eX, eY, r) {
    let [mX, mY] = [(sX + eX) / 2, (sY + eY) / 2]; //Center of start and end points
    let l = Math.sqrt(((sX - eX) ** 2) + ((sY - eY) ** 2)); //Distance between start and end points
    //Calculate the two possible centers
    let [solX1, solY1] = [mX + Math.sqrt(r ** 2 - (l/2) ** 2) * (sY - eY) / l, mY + Math.sqrt(r ** 2 - (l/2) ** 2) * (eX - sX) / l];
    let [solX2, solY2] = [mX - Math.sqrt(r ** 2 - (l/2) ** 2) * (sY - eY) / l, mY - Math.sqrt(r ** 2 - (l/2) ** 2) * (eX - sX) / l];
    //Find the furthest away cX, xY and that's our solution
    let d1 =  Math.sqrt(((cX - solX1) ** 2) + ((cY - solY1) ** 2));
    let d2 =  Math.sqrt(((cX - solX2) ** 2) + ((cY - solY2) ** 2));
    return d1 > d2 ? [solX1, solY1]: [solX2, solY2];
}

//Draws blocs to the canves
function drawBlocs(){
    clearAllViews();
    drawContours();
    drawHoles();
    drawMarks();
    drawNumertaions();
    addOriginPoints();
    redrawMeasurements();
}

//Shows or hide views
function switchView(view, btn) {
    let viewTitle = document.getElementById(view + 'ViewTitle');
    let viewContainer = document.getElementById(view + '-view');

    //Toggle visibility
    let isVisible = !viewContainer.classList.contains('hide');
    if (isVisible) {
        viewTitle.classList.add('hide');
        viewContainer.classList.add('hide');
        btn.dataset.tooltip = 'Turn ON'; //Change tooltip to "Turn ON"
        btn.classList.add('text-lighten-3'); //Dim button
    } else {
        viewTitle.classList.remove('hide');
        viewContainer.classList.remove('hide');
        btn.dataset.tooltip = 'Turn OFF'; //Change tooltip to "Turn OFF"
        btn.classList.remove('text-lighten-3'); //Restore button color
    }

    M.Tooltip.getInstance(btn).close(); //Close tooltip
    M.Tooltip.init(document.querySelectorAll('.tooltipped')); //Reinitialize tooltips

    views.forEach(v => handleResize(v)); //Resize views if necessary
}

//Create a snap indicator point in a view at x, y
let snapSize = localStorage.getItem("snapSize") || 2;
let snapPointColor = localStorage.getItem("snapPointColor") || '#FF0000';
function addSnapIndicator(x, y, view, color=snapPointColor, name='snap-indicator') {
    let snapLayer = snapLayers[view]; //Use snap layer for the active view

    let indicator = new Konva.Circle({
        x: x,
        y: y,
        radius: snapSize, // Small snap indicator
        fill: color,
        strokeWidth: 1,
        name: name,
        listening: false // Make sure it does not interfere with clicks
    });

    indicator.strokeScaleEnabled(false);
    snapLayer.add(indicator);
    snapLayer.batchDraw();
}

//Adds origin points to each view
let originPointColor = localStorage.getItem("originPointColor") || '#008000';
function addOriginPoints(){
    for(view of views) {
        let layer = layers[view];
        let stage = layer.getStage();
        let canvasWidth = stage.width();
        let canvasHeight = stage.height();
        let [tX, tY] = transformCoordinates(view, 0, 0, canvasWidth, canvasHeight);

        let originPoint = new Konva.Circle({
            x: tX,
            y: tY,
            radius: 0,
            strokeWidth: 0,
            name: 'origin-point',
            listening: false, //Make sure it does not interfere with clicks
            snapPoints: [
                { x: tX, y: tY }, //Center
            ]
        });

        addSnapIndicator(tX, tY, view, originPointColor, 'origin-point'); //Add snap point to origin point
        originPoint.strokeScaleEnabled(false);
        layer.add(originPoint);
        layer.batchDraw();
    }
}
