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

    //Read rectangle properties
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

    //Edge vectors
    const vIn  = { x: curr.x - prev.x, y: curr.y - prev.y };
    const vOut = { x: next.x - curr.x, y: next.y - curr.y };
    const lenIn  = Math.hypot(vIn.x, vIn.y);
    const lenOut = Math.hypot(vOut.x, vOut.y);

    //Unit vectors
    const uIn  = { x: vIn.x/lenIn,  y: vIn.y/lenIn };
    const uOut = { x: vOut.x/lenOut, y: vOut.y/lenOut };

    //Tangent (start/end of arc) points
    const p1 = { x: curr.x - uIn.x * r,  y: curr.y - uIn.y * r };
    const p2 = { x: curr.x + uOut.x * r, y: curr.y + uOut.y * r };

    tangentPoints.push({ in: p1, out: p2, corner: curr });
    }

    //Compute the DXF bulge for a 90° arc: tan(θ/4), θ=90° → tan(22.5°)
    const bulge = - Math.tan((90 * Math.PI/180) / 4);

    //Create R12‐compliant POLYLINE
    dxf += `0\nPOLYLINE\n8\n${holesLayer}\n66\n1\n70\n1\n`;

    for (let i = 0; i < 4; i++) {
    const currT  = tangentPoints[i];
    const nextT  = tangentPoints[(i+1)%4];

    //Straight line from this corner’s out → next corner’s in
    dxf += `0\nVERTEX\n8\n${holesLayer}\n`;
    dxf += `10\n${formatNum(currT.out.x)}\n20\n${formatNum(stageHeight - currT.out.y)}\n`;
    dxf += `42\n0.0\n`;  // no bulge on straight segment

    dxf += `0\nVERTEX\n8\n${holesLayer}\n`;
    dxf += `10\n${formatNum(nextT.in.x)}\n20\n${formatNum(stageHeight - nextT.in.y)}\n`;
    dxf += `42\n0.0\n`;

    dxf += `0\nVERTEX\n8\n${holesLayer}\n`;
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
    dxf += '0\nTABLE\n2\nLTYPE\n70\n2\n'; // 2 line types
    dxf += '0\nLTYPE\n2\nCONTINUOUS\n70\n0\n3\nSolid line\n72\n65\n73\n0\n40\n0.0\n'; // CONTINUOUS
    dxf += '0\nLTYPE\n2\nDASHED\n70\n0\n3\nDashed line\n72\n65\n73\n2\n40\n0.75\n49\n0.5\n49\n-0.75\n'; // DASHED
    dxf += '0\nENDTAB\n'; // End LTYPE table

    // Start LAYER table
    dxf += '0\nTABLE\n2\nLAYER\n70\n5\n'; // 5 layers
    dxf += `0\nLAYER\n2\n${geometryLayer}\n70\n0\n62\n${7 * geometryVisibility}\n6\nCONTINUOUS\n`; // Define Geometry layer
    dxf += `0\nLAYER\n2\n${holesLayer}\n70\n0\n62\n${1 * holeVisibility}\n6\nCONTINUOUS\n`; // Define Holes layer
    dxf += `0\nLAYER\n2\n${textLayer}\n70\n0\n62\n${2 * textVisibility}\n6\nCONTINUOUS\n`; // Define Text layer
    dxf += `0\nLAYER\n2\n${snapLayer}\n70\n0\n62\n${3 * snapVisibility}\n6\nCONTINUOUS\n`; // Define Snap points layer
    dxf += `0\nLAYER\n2\n${measurementLayer}\n70\n0\n62\n${12 * measurementVisibility}\n6\nDASHED\n`; // Define Measurement layer
    dxf += '0\nENDTAB\n'; // End LAYER table
    
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
            return dxf;
        }
        
        //Helper function to flip Y coordinates
        const transformY = (y) => {
            return stageHeight - y; //
        };
        
        //Format numbers to ensure they're valid for DXF
        const formatNum = (num) => {
            if (num === undefined || num === null || isNaN(num)) return "0.0";
            return parseFloat(num).toFixed(6);
        };
        
        //Process each layer in the stage
        layers.forEach(layer => { 
            //Process all shapes in this layer
            layer.getChildren().forEach((shape, index) => {
                if (!shape.isVisible()) {
                    return;
                }
                
                try {
                    const className = shape.getClassName();
                    
                    //Handling for text elements
                    if (className === 'Text') {
                        const text = shape.text ? shape.text() : 
                                    (shape.getText ? shape.getText() : 
                                    (shape.getAttr ? shape.getAttr('text') : "Text"));
                        
                        const x = parseFloat(shape.x !== undefined ? (typeof shape.x === 'function' ? shape.x() : shape.x) : 0);
                        const y = parseFloat(shape.y !== undefined ? (typeof shape.y === 'function' ? shape.y() : shape.y) : 0);
                        
                        //Transform Y coordinate for DXF
                        const transformedY = transformY(y);
                        
                        const fontSize = shape.fontSize ? 
                                       (typeof shape.fontSize === 'function' ? shape.fontSize() : shape.fontSize) : 
                                       (shape.getAttr && shape.getAttr('fontSize') ? shape.getAttr('fontSize') : 12);
                        
                        const name = shape.getAttr("name");
                        
                        //Convert font size to text height in DXF (approximate conversion)
                        const textHeight = parseFloat(fontSize) * 0.75;
                        const scaledTextHeight = formatNum(textHeight) * formatNum(shape.scaleY());
                        
                        dxf += '0\nTEXT\n';
                        if (name.slice() == "text") dxf += `8\n${textLayer}\n`; //Text layer
                        else dxf += `8\n${measurementLayer}\n`; //Text layer
                        dxf += `10\n${formatNum(x)}\n`; //X position
                        dxf += `20\n${formatNum(transformedY) - scaledTextHeight}\n`; //Transformed Y position
                        dxf += `30\n0.0\n`; // Z position
                        dxf += `40\n${scaledTextHeight}\n`; //Text height
                        dxf += `1\n${text}\n`; //Text content
                        dxf += `7\nSTANDARD\n`; //Text style
                        
                        //Handle text rotation if available
                        if (typeof shape.rotation === 'function') {
                            const rotation = -shape.rotation();
                            dxf += `50\n${formatNum(rotation)}\n`; //Rotation angle in degrees
                        }
                    } else if (className === 'Line') {
                        // Handle lines
                        const points = shape.points();
                        const name = shape.getAttr("name");
                        if (points && points.length >= 4) {
                            for (let i = 0; i < points.length - 2; i += 2) {
                                dxf += '0\nLINE\n';
                                if (name.slice(0, 7) == "contour") dxf += `8\n${geometryLayer}\n`; //Geometry layer
                                else  dxf += `8\n${measurementLayer}\n`; //Measurement layer
                                dxf += `10\n${formatNum(points[i])}\n`; //Start X
                                dxf += `20\n${formatNum(transformY(points[i+1]))}\n`; //Transformed Start Y
                                dxf += `30\n0.0\n`; //Start Z
                                dxf += `11\n${formatNum(points[i+2])}\n`; // End X
                                dxf += `21\n${formatNum(transformY(points[i+3]))}\n`; //Transformed End Y
                                dxf += `31\n0.0\n`; //End Z
                            }
                        }
                    } else if (className === 'Circle') {
                        fill = shape.attrs.fill;
                        if (fill == undefined) {
                            //Handle circles with radius greater than minHoleDia
                            if (formatNum(shape.attrs.radius) > minHoleDia)
                            {
                                dxf += '0\nCIRCLE\n';
                                dxf += `8\n${holesLayer}\n`; //Holes layer
                                dxf += `10\n${formatNum(shape.attrs.x)}\n`; //Center X
                                dxf += `20\n${formatNum(transformY(shape.attrs.y))}\n`; //Transformed Center Y
                                dxf += `30\n0.0\n`; //Center Z
                                dxf += `40\n${formatNum(shape.attrs.radius)}\n`; //Radius
                            }
                        }
                        else {
                            //Create a point for the snap layer
                            dxf += '0\nPOINT\n';
                            dxf += `8\n${snapLayer}\n`; //Snap layer
                            dxf += `10\n${formatNum(shape.attrs.x)}\n`; //X coordinate
                            dxf += `20\n${formatNum(transformY(shape.attrs.y))}\n`; //Y coordinate
                            dxf += `30\n0.0\n`; //Z coordinate
                        }
                    } else if (className === 'Arc') {
                        //Get arc properties
                        const centerX = shape.attrs.x;
                        const centerY = shape.attrs.y;
                        const radius = shape.attrs.innerRadius;
                        const angle = shape.attrs.angle;
                        const rotation = shape.attrs.rotation;
                        const isClockwise = shape.attrs.clockwise;
                        let startAngle = 0;
                        let endAngle = 0;

                        [startAngle, endAngle] = calcAngles(angle, rotation, isClockwise);

                        //Transform Y coordinate for DXF
                        const transformedCenterY = stageHeight - centerY;
                        
                        //Add the ARC entity to DXF
                        dxf += '0\nARC\n';
                        dxf += `8\n${geometryLayer}\n`; //Layer
                        dxf += `10\n${formatNum(centerX)}\n`; //Center X
                        dxf += `20\n${formatNum(transformedCenterY)}\n`; //Center Y
                        dxf += `30\n0.0\n`; //Center Z
                        dxf += `40\n${formatNum(radius)}\n`; //Radius
                        dxf += `50\n${formatNum(startAngle)}\n`; //Start angle
                        dxf += `51\n${formatNum(endAngle)}\n`; //End angle
                    } else if (className === 'Rect') {
                       dxf += handleRectangleAsPolygon(shape, stageHeight, formatNum);
                    }
                } catch (shapeError) {
                    M.toast({ html: 'Error processing shape!', classes: 'rounded toast-error', displayLength: 3000});
                }
            });
        });
    } catch (err) {
        M.toast({ html: `Error generating DXF for view: ${viewName}!`, classes: 'rounded toast-error', displayLength: 3000});
    }
    
    //End the entities section
    dxf += '0\nENDSEC\n';
    
    //End of file
    dxf += '0\nEOF\n';
    
    return dxf;
}

// Function to load DXF settings from local storage
let geometryVisibility, holeVisibility, minHoleDia, textVisibility, snapVisibility, geometryLayer, holesLayer, textLayer, snapLayer, measurementLayer, measurementVisibility;
function loadDXFSettings() {
    M.Sidenav.getInstance(document.getElementById('mobile')).close(); //Closes side nav
    M.Modal.getInstance(document.getElementById('exportModal')).close(); //Hide export modal
    geometryVisibility = localStorage.getItem("geometryVisibility") || 1;
    holeVisibility = localStorage.getItem("holeVisibility") || 1;
    minHoleDia = localStorage.getItem("minHoleDia") || 0;
    textVisibility = localStorage.getItem("textVisibility") || 1;
    snapVisibility = localStorage.getItem("snapVisibility") || 1;
    measurementVisibility = localStorage.getItem("measurementVisibility") || 1;
    geometryLayer = localStorage.getItem("geometryLayer") || "Geometry";
    holesLayer = localStorage.getItem("holesLayer") || "Holes";
    textLayer = localStorage.getItem("textLayer") || "Text";
    snapLayer = localStorage.getItem("snapLayer") || "Snap";
    measurementLayer = localStorage.getItem("measurementLayer") || "Measurement";
    //Load settings to the view
    document.getElementById("geometryVisibility").checked = geometryVisibility == 'true' ? true : false;
    document.getElementById("holeVisibility").checked = holeVisibility == 'true' ? true : false;
    document.getElementById("minHoleDia").value = minHoleDia;
    document.getElementById("textVisibility").checked = textVisibility == 'true' ? true : false;
    document.getElementById("snapVisibility").checked = snapVisibility == 'true' ? true : false;
    document.getElementById("measurementVisibility").checked = measurementVisibility == 'true' ? true : false;
    document.getElementById("geometryLayer").value = geometryLayer;
    document.getElementById("holesLayer").value = holesLayer;
    document.getElementById("textLayer").value = textLayer;
    document.getElementById("snapLayer").value = snapLayer;
    document.getElementById("measurementLayer").value = measurementLayer;
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
    //Load DXF settings from view
    geometryVisibility = document.getElementById("geometryVisibility").checked;
    holeVisibility = document.getElementById("holeVisibility").checked;
    minHoleDia = document.getElementById("minHoleDia").value;
    if (minHoleDia < 0 || typeof minHoleDia === "number") minHoleDia = 0; //Ensure minHoleDia is not negative and is a number
    textVisibility = document.getElementById("textVisibility").checked;
    snapVisibility = document.getElementById("snapVisibility").checked;
    geometryLayer = document.getElementById("geometryLayer").value;
    holesLayer = document.getElementById("holesLayer").value;
    textLayer = document.getElementById("textLayer").value;
    snapLayer = document.getElementById("snapLayer").value;
    measurementVisibility = document.getElementById("measurementVisibility").checked;
    measurementLayer = document.getElementById("measurementLayer").value;
    //Save settings to local storage
    localStorage.setItem("geometryVisibility", geometryVisibility);
    localStorage.setItem("holeVisibility", holeVisibility);
    localStorage.setItem("minHoleDia", minHoleDia);
    localStorage.setItem("textVisibility", textVisibility);
    localStorage.setItem("snapVisibility", snapVisibility);
    localStorage.setItem("geometryLayer", geometryLayer);
    localStorage.setItem("holesLayer", holesLayer);
    localStorage.setItem("textLayer", textLayer);
    localStorage.setItem("snapLayer", snapLayer);
    localStorage.setItem("measurementVisibility", measurementVisibility);
    localStorage.setItem("measurementLayer", measurementLayer);
    //Convert boolean values to 1 or -1 for DXF layer Visibility
    geometryVisibility = geometryVisibility == 1 ? 1 : -1;
    holeVisibility = holeVisibility == 1 ? 1 : -1;
    textVisibility = textVisibility == 1 ? 1 : -1;
    snapVisibility = snapVisibility == 1 ? 1 : -1;
    measurementVisibility = measurementVisibility == 1 ? 1 : -1;

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