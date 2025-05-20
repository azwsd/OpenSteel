// Function to calculate the angle between two points
function calcAngle(pX, pY, cX, cY) {
    let angle = Math.atan2(pY - cY, pX - cX) * (180 / Math.PI);
    return angle < 0 ? angle + 360 : angle; // Convert negative angles to 0-360 range
}

// Function to give correct angle based on clockwise direction
function calcAngles(angle, rotation, isClockwise) {
    let startAngle = 360 - rotation;
    let endAngle = 360 - (rotation + angle);
    return isClockwise ? [startAngle, endAngle] : [endAngle, startAngle];
}

// Function to handle rectangular shapes
function handleRectangleAsPolygon(rect, stageHeight, formatNum) {
    let dxf = '';

    // 1. Read rectangle properties
    const x = rect.x();
    const y = rect.y();
    const ox = rect.offsetX() || 0;
    const oy = rect.offsetY() || 0;
    const w = rect.width();
    const h = rect.height();
    const rotDeg = rect.rotation() || 0;
    const r = rect.cornerRadius() || 0;

    //Build the four raw corners (top‑left, top‑right, bottom‑right, bottom‑left)
    let corners = [
    { x: x - ox, y: y - oy},
    { x: x - ox + w, y: y - oy},
    { x: x - ox + w, y: y - oy + h},
    { x: x - ox, y: y - oy + h}
    ];

    //Rotate each corner around the rectangle center
    const rad = rotDeg * Math.PI/180;
    const cx  = (corners[0].x + corners[2].x)/2;
    const cy  = (corners[0].y + corners[2].y)/2;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    corners = corners.map(p => ({
    x: cx + (p.x - cx)*cos - (p.y - cy)*sin,
    y: cy + (p.x - cx)*sin + (p.y - cy)*cos
    }));  

    //For each corner compute “tangent points” inset by radius along incoming/outgoing edges
    const tangentPoints = [];
    for (let i = 0; i < 4; i++) {
    const prev = corners[(i + 3)%4];
    const curr = corners[i];
    const next = corners[(i + 1)%4];

    // Edge vectors
    const vIn  = { x: curr.x - prev.x, y: curr.y - prev.y };
    const vOut = { x: next.x - curr.x, y: next.y - curr.y };
    const lenIn  = Math.hypot(vIn.x, vIn.y);
    const lenOut = Math.hypot(vOut.x, vOut.y);

    // Unit vectors
    const uIn  = { x: vIn.x/lenIn,  y: vIn.y/lenIn };
    const uOut = { x: vOut.x/lenOut, y: vOut.y/lenOut };

    // Tangent (start/end of arc) points
    const p1 = { x: curr.x - uIn.x * r,  y: curr.y - uIn.y * r };
    const p2 = { x: curr.x + uOut.x * r, y: curr.y + uOut.y * r };

    tangentPoints.push({ in: p1, out: p2, corner: curr });
    }

    //Compute the DXF bulge for a 90° arc: tan(θ/4), θ=90° → tan(22.5°)
    const bulge = - Math.tan((90 * Math.PI/180) / 4);

    //R12‐compliant POLYLINE
    dxf += '0\nPOLYLINE\n8\nHoles\n66\n1\n70\n1\n';

    for (let i = 0; i < 4; i++) {
    const currT  = tangentPoints[i];
    const nextT  = tangentPoints[(i+1)%4];

    //Straight line from this corner’s out → next corner’s in
    dxf += '0\nVERTEX\n8\nHoles\n';
    dxf += `10\n${formatNum(currT.out.x)}\n20\n${formatNum(stageHeight - currT.out.y)}\n`;
    dxf += `42\n0.0\n`;  // no bulge on straight segment

    dxf += '0\nVERTEX\n8\nHoles\n';
    dxf += `10\n${formatNum(nextT.in.x)}\n20\n${formatNum(stageHeight - nextT.in.y)}\n`;
    dxf += `42\n0.0\n`;

    dxf += '0\nVERTEX\n8\nHoles\n';
    dxf += `10\n${formatNum(nextT.in.x)}\n20\n${formatNum(stageHeight - nextT.in.y)}\n`;
    dxf += `42\n${formatNum(bulge)}\n`;
    }

    //Close the polyline
    dxf += '0\nSEQEND\n';

    return dxf;
}

// Function to convert Konva stage to DXF format
function konvaToDXF(stage, viewName) {
    // Extract view name without "-view" suffix for coordinate transformations
    const view = viewName.replace('-view', '');
    
    // Get the stage dimensions for coordinate transformation
    const stageHeight = stage.height();
    
    // Standard DXF header - AC1009 is R12 format
    let dxf = '0\nSECTION\n2\nHEADER\n';
    dxf += '9\n$ACADVER\n1\nAC1009\n';
    dxf += '9\n$INSBASE\n10\n0.0\n20\n0.0\n30\n0.0\n';
    dxf += '9\n$EXTMIN\n10\n0.0\n20\n0.0\n';
    dxf += '9\n$EXTMAX\n10\n1000.0\n20\n1000.0\n';
    dxf += '0\nENDSEC\n';
    
    // Add tables section for layers
    dxf += '0\nSECTION\n2\nTABLES\n';
    
    // Add LTYPE table
    dxf += '0\nTABLE\n2\nLTYPE\n70\n1\n';
    dxf += '0\nLTYPE\n2\nCONTINUOUS\n70\n0\n3\nSolid line\n72\n65\n73\n0\n40\n0.0\n';
    dxf += '0\nENDTAB\n';
    
    // Start LAYER table
    dxf += '0\nTABLE\n2\nLAYER\n70\n3\n'; // 3 layers
    
    // Define Geometry layer (0)
    dxf += `0\nLAYER\n2\nGeometry\n70\n0\n62\n${7 * geometryColor}\n6\nCONTINUOUS\n`;
    
    // Define Holes layer
    dxf += `0\nLAYER\n2\nHoles\n70\n0\n62\n${1 * holeColor}\n6\nCONTINUOUS\n`;
    // Define Text layer
    dxf += `0\nLAYER\n2\nText\n70\n0\n62\n${2 * textColor}\n6\nCONTINUOUS\n`;

    // Define Snap points layer
    dxf += `0\nLAYER\n2\nSnapLayer\n70\n0\n62\n${3 * snapColor}\n6\nCONTINUOUS\n`;
    
    // End LAYER table
    dxf += '0\nENDTAB\n';
    
    // Add STYLE table for text
    dxf += '0\nTABLE\n2\nSTYLE\n70\n1\n';
    dxf += '0\nSTYLE\n2\nSTANDARD\n70\n0\n40\n0.0\n41\n1.0\n50\n0.0\n71\n0\n42\n0.2\n3\ntxt\n4\n\n';
    dxf += '0\nENDTAB\n';
    
    // End TABLES section
    dxf += '0\nENDSEC\n';
    
    // Add entities section
    dxf += '0\nSECTION\n2\nENTITIES\n';
    
    try {
        // Process all layers from the stage
        const layers = stage.getLayers();
        
        if (!layers || layers.length === 0) {
            dxf += '0\nENDSEC\n0\nEOF\n';
            return dxf; // Return minimal valid DXF
        }
        
        // Helper function to flip Y coordinates
        const transformY = (y) => {
            return stageHeight - y; // Flip Y coordinate
        };
        
        // Helper function to adjust rotation values based on the view
        const transformRotation = (rotation, view) => {
            // You'll need to adapt this based on your coordinate system logic
            return 180 - rotation; // Basic flip for Y-axis inversion
        };
        
        // Format numbers to ensure they're valid for DXF
        const formatNum = (num) => {
            if (num === undefined || num === null || isNaN(num)) return "0.0";
            return parseFloat(num).toFixed(6);
        };
        
        // Process each layer in the stage
        layers.forEach(layer => { 
            // Process all shapes in this layer
            layer.getChildren().forEach((shape, index) => {
                if (!shape.isVisible()) {
                    return;
                }
                
                try {
                    const className = shape.getClassName();
                    
                    // Handling for text elements
                    if (className === 'Text') {
                        // Handle text - place on Text layer
                        const text = shape.text ? shape.text() : 
                                    (shape.getText ? shape.getText() : 
                                    (shape.getAttr ? shape.getAttr('text') : "Text"));
                        
                        const x = parseFloat(shape.x !== undefined ? (typeof shape.x === 'function' ? shape.x() : shape.x) : 0);
                        const y = parseFloat(shape.y !== undefined ? (typeof shape.y === 'function' ? shape.y() : shape.y) : 0);
                        
                        // Transform Y coordinate for DXF
                        const transformedY = transformY(y);
                        
                        const fontSize = shape.fontSize ? 
                                       (typeof shape.fontSize === 'function' ? shape.fontSize() : shape.fontSize) : 
                                       (shape.getAttr && shape.getAttr('fontSize') ? shape.getAttr('fontSize') : 12);
                        
                        // Convert font size to text height in DXF (approximate conversion)
                        const textHeight = parseFloat(fontSize) * 0.75;
                        
                        dxf += '0\nTEXT\n';
                        dxf += '8\nText\n'; // Text layer
                        dxf += `10\n${formatNum(x)}\n`; // X position
                        dxf += `20\n${formatNum(transformedY)}\n`; // Transformed Y position
                        dxf += `30\n0.0\n`; // Z position
                        dxf += `40\n${formatNum(textHeight)}\n`; // Text height
                        dxf += `1\n${text}\n`; // Text content
                        dxf += `7\nSTANDARD\n`; // Text style
                        
                        // Handle text rotation if available
                        if (typeof shape.rotation === 'function') {
                            // Need to invert rotation angle when flipping Y
                            const rotation = -shape.rotation();
                            dxf += `50\n${formatNum(rotation)}\n`; // Rotation angle in degrees
                        }
                        
                        // For debugging
                        dxf += `999\nExported Text: "${text}" at (${x},${transformedY}) height=${textHeight}\n`;
                    } else if (className === 'Line') {
                        // Handle lines
                        const points = shape.points();
                        if (points && points.length >= 4) {
                            for (let i = 0; i < points.length - 2; i += 2) {
                                dxf += '0\nLINE\n';
                                dxf += '8\nGeometry\n'; // Geometry layer
                                dxf += `10\n${formatNum(points[i])}\n`; // Start X
                                dxf += `20\n${formatNum(transformY(points[i+1]))}\n`; // Transformed Start Y
                                dxf += `30\n0.0\n`; // Start Z
                                dxf += `11\n${formatNum(points[i+2])}\n`; // End X
                                dxf += `21\n${formatNum(transformY(points[i+3]))}\n`; // Transformed End Y
                                dxf += `31\n0.0\n`; // End Z
                            }
                        }
                    } else if (className === 'Circle') {
                        fill = shape.attrs.fill;
                        if (fill == undefined) {
                            // Handle circles
                            dxf += '0\nCIRCLE\n';
                            //Add shape to holes layer or snap layer
                            if (fill === undefined) {
                                dxf += '8\nHoles\n'; //Holes layer
                            }
                            else {
                                dxf += '8\nSnapLayer\n'; //Snap layer
                            }
                            dxf += `10\n${formatNum(shape.attrs.x)}\n`; // Center X
                            dxf += `20\n${formatNum(transformY(shape.attrs.y))}\n`; // Transformed Center Y
                            dxf += `30\n0.0\n`; // Center Z
                            dxf += `40\n${formatNum(shape.attrs.radius)}\n`; // Radius
                        }
                        else {
                            //Create a point for the snap layer
                            dxf += '0\nPOINT\n';
                            dxf += '8\nSnapLayer\n'; //Snap layer
                            dxf += `10\n${formatNum(shape.attrs.x)}\n`; //X coordinate
                            dxf += `20\n${formatNum(transformY(shape.attrs.y))}\n`; //Y coordinate
                            dxf += `30\n0.0\n`; //Z coordinate
                        }
                    } else if (className === 'Arc') {
                        // Get arc properties
                        const centerX = shape.attrs.x;
                        const centerY = shape.attrs.y;
                        const radius = shape.attrs.innerRadius;
                        const angle = shape.attrs.angle;
                        const rotation = shape.attrs.rotation;
                        const isClockwise = shape.attrs.clockwise;
                        let startAngle = 0;
                        let endAngle = 0;

                        [startAngle, endAngle] = calcAngles(angle, rotation, isClockwise);

                        // Transform Y coordinate for DXF
                        const transformedCenterY = stageHeight - centerY;
                        
                        // Add the ARC entity to DXF
                        dxf += '0\nARC\n';
                        dxf += '8\nGeometry\n'; // Layer
                        dxf += `10\n${formatNum(centerX)}\n`; // Center X
                        dxf += `20\n${formatNum(transformedCenterY)}\n`; // Center Y
                        dxf += `30\n0.0\n`; // Center Z
                        dxf += `40\n${formatNum(radius)}\n`; // Radius
                        dxf += `50\n${formatNum(startAngle)}\n`; // Start angle
                        dxf += `51\n${formatNum(endAngle)}\n`; // End angle
                    } else if (className === 'Rect') {
                       dxf += handleRectangleAsPolygon(shape, stageHeight, formatNum);
                    }
                } catch (shapeError) {
                    console.error('Error processing shape:', shapeError);
                }
            });
        });
    } catch (err) {
        console.error('Error generating DXF for view', viewName, err);
    }
    
    // End the entities section
    dxf += '0\nENDSEC\n';
    
    // End of file
    dxf += '0\nEOF\n';
    
    return dxf;
}

// Function to load DXF settings from session storage
let geometryColor, holeColor, textColor, snapColor;
function loadDXFSettings() {
    geometryColor = sessionStorage.getItem("geometryColor") || 1;
    holeColor = sessionStorage.getItem("holeColor") || 1;
    textColor = sessionStorage.getItem("textColor") || 1;
    snapColor = sessionStorage.getItem("snapColor") || 1;
}

//Function to export all loaded files to DXF
function batchExportToDXF() {
    const files = document.querySelectorAll('#files .viewFiles');
    // If no files are loaded, show an error message
    if (files.length === 0) {
        M.toast({ html: 'No files to export!', classes: 'rounded toast-error', displayLength: 3000});
        return;
    }
    //Clicks on each file to trigger the export
    for (let file of files) {
        file.click();
        exportToDXF();
    }
}

// Function to export visible Konva stages to DXF and create a ZIP file
function exportToDXF() {
    // If no file is selected, show an error message
    if (!selectedFile) {
        M.toast({ html: 'No file selected!', classes: 'rounded toast-error', displayLength: 3000});
        return;
    }
    geometryColor = document.getElementById("geometryColor").checked;
    holeColor = document.getElementById("holeColor").checked;
    textColor = document.getElementById("textColor").checked;
    snapColor = document.getElementById("snapColor").checked;
    sessionStorage.setItem("geometryColor", geometryColor);
    sessionStorage.setItem("holeColor", selectedFile);
    sessionStorage.setItem("textColor", selectedFile);
    sessionStorage.setItem("snapColor", selectedFile);
    geometryColor == 1 ? geometryColor = 1 : geometryColor = -1;
    holeColor == 1 ? holeColor = 1 : holeColor = -1;
    textColor == 1 ? textColor = 1 : textColor = -1;
    snapColor == 1 ? snapColor = 1 : snapColor = -1;

    const zip = new JSZip();
    const views = ['o-view', 'v-view', 'u-view', 'h-view'];
    const fileName = selectedFile.replace(/\.[^/.]+$/, '');
    let viewsCounter = 0;
    let singleViewDXF = null;
    let singleViewName = '';
    
    // For each view, check if it's visible and add it to the zip if it is
    views.forEach(view => {
        const viewElement = document.getElementById(view);
        if (viewElement && !viewElement.classList.contains('hide')) {
            // Get the Konva stage for this view
            const stage = stages[view];
            if (stage) {
                const dxfContent = konvaToDXF(stage, view);
                if (dxfContent) {
                    // Add the DXF content to the zip
                    zip.file(`${fileName}-${view}.dxf`, dxfContent);
                    hasVisibleViews = true;
                    viewsCounter++;
                    // Save the last visible view's DXF content in case it's the only one
                    singleViewDXF = dxfContent;
                    singleViewName = view;
                }
            }
        }
    });
    
    if (viewsCounter === 0) {
        //No visible views to export
        M.toast({ html: 'No visible views to export!', classes: 'rounded toast-error', displayLength: 3000});
        return;
    }
    
    if (viewsCounter > 1) {
        //Generate the zip file
        zip.generateAsync({type: "blob"}).then(function(content) {
        //Create a download link for the zip file
        const a = document.createElement('a');
        a.href = URL.createObjectURL(content);
        a.download = `${fileName}-DXF.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });
    }
    else {
        //For single view, export directly as DXF without creating a zip
        const a = document.createElement('a');
        const blob = new Blob([singleViewDXF], {type: 'application/dxf'});
        a.href = URL.createObjectURL(blob);
        a.download = `${fileName}-${singleViewName}.dxf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    
}