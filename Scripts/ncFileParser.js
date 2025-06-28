//header data
let headerData = [];
//Blocs
let blocs = ['BO', 'SI', 'AK', 'IK', 'PU', 'KO', 'SC', 'TO', 'UE', 'PR', 'KA', 'EN']
//External contour bloc data
let contourData = [];
//Hole bloc data
let holeData = [];
//Marks bloc data
let marksData = [];
//Numerations bloc data
let numerationsData = [];
//Store lastFace data
let lastFace = "";
//View contour bloc status
let viewExists = {
    o: false,
    v: false,
    u: false,
    h: false
};

//Parses the header of DSTV file
function ncParseHeaderData(fileData){
    const splitFileData = fileData.split('\n');
    const properties = document.querySelectorAll("#properties #tab1 div");
    //clears header data array
    headerData.length = 0;
    let lineCounter = 0;
    let isFirstIteration = true;
    for (line of splitFileData)
    {
        //removes the leading spaces
        line = line.trimStart();
        //reads only the first 24 lines
        if (lineCounter == 24) break;
        //removes ST line and comment line
        if(isFirstIteration || line.slice(0, 2) == '**') {
            isFirstIteration = false;
            continue;
        };
        //removes comments from any line
        line = line.split('**')[0];
        //Check if there are blocs in the header
        if (blocs.includes(line.slice(0, 2)) && line.slice(2, 1) == ' ')
        {
            M.toast({html: 'File header contains an error!', classes: 'rounded toast-warning', displayLength: 2000});
            break;
        }
        //Empty text info handler
        if (lineCounter > 19 && line.length == 0) line = 'N/A';
        //Writes part properties to properties div
        properties[lineCounter].querySelector('p').innerHTML = line;
        //Adds line to headerData array
        headerData.push(line);
        lineCounter++;
    }
};

function ncViewsImage(){
    const profileCode = document.getElementById('Code').querySelector('p:first-of-type').innerHTML.slice(0, 1);
    const img = document.getElementById('profileViewsImg');
    switch (profileCode) {
        case 'I':
            img.src = 'Images/Views/I.png';
            break;
        case 'RO':
        case 'RU':
            img.src = 'Images/Views/R.png';
            break;
        case 'U':
            img.src = 'Images/Views/U.png';
            break;
        case 'B':
            img.src = 'Images/Views/B.png';
            break;
        case 'L':
            img.src = 'Images/Views/L.png';
            break;
        case 'C':
            img.src = 'Images/Views/C.png';
            break;
        case 'M':
            img.src = 'Images/Views/M.png';
            break;
        case 'T':
            img.src = 'Images/Views/T.png';
            break;
        default:
            img.src = '';
            break;   
    } 
}

//Parse contour blocs and add them to the contourData array
function ncParseContourData(line, contourType){
    let values = line.trim().split(/\s+/); // Split by whitespace
    let face = "";  
    let xValue, dimensionRef, yValue;
    let notchTool;

    // Check if the first value is a face (single letter)
    if (values[0].length == 1 && /[A-Za-z]/.test(values[0])) {
        face = values[0];  // Store face
        values.shift();  // Remove it from the array
    } else {
        face = lastFace; // Use the previous face if not present
    }
    lastFace = face; // Update last seen face
    viewExists[face] = true; //Set the view exists for the current view as true

    // Extract X-value and check for dimension reference
    let xMatch = values[0].match(/([\d.]+)([A-Za-z]*)$/);
    xValue = parseFloat(xMatch[1]);  // X-value
    dimensionRef = xMatch[2] || "";  // Dimension reference (if present)

    yValue = parseFloat(values[1]);  // Y-value (always at index 1)

    // Extract notch tool
    let toolMatch = values[1].match(/([\d.]+)([A-Za-z]*)$/);
    notchTool = toolMatch[2] || "";  // Notch tool (if present)

    // Extract remaining values (starting from index 2)
    let parsedValues = values.slice(2).map(v => v ? parseFloat(v) : 0.00);

    // Ensure we always have at least 5 extra values (Notch type, Radius, Welding prep 1-4)
    while (parsedValues.length < 5) {
        parsedValues.push(0.00);
    }

    // Add parsed line to contourBlocks
    contourData.push([face, xValue, dimensionRef, yValue, ...parsedValues, contourType, notchTool]);
}

//Parse hole blocs and add them to the holeData array
function ncParseHoleData(line) {
    let values = line.trim().split(/\s+/); // Split by whitespace
    let view = "";  
    let xValue, dimensionRef, yValue, holeType = "", diameter, depth = 0.00;
    let slotType = "", width = 0.00, height = 0.00, angle = 0.00;

    // Check if the first value is a view (single letter)
    if (values[0].length === 1 && /[A-Za-z]/.test(values[0])) {
        view = values.shift();  // Store view and remove it from array
    } else {
        view = lastView; // Use previous view if not present
    }
    lastView = view; // Update last seen view

    // Extract X-value and check for dimension reference
    let xMatch = values[0].match(/^([\d.]+)([A-Za-z]*)$/);
    if (!xMatch) return; // Exit if invalid format
    xValue = parseFloat(xMatch[1]);  
    dimensionRef = xMatch[2] || "";  

    // Extract HoleType (may be attached to Y or separate)
    let yMatch = values[1].match(/^([\d.]+)([A-Za-z]*)$/);
    if (!yMatch) return; // Exit if invalid format
    yValue = parseFloat(yMatch[1]);
    holeType = yMatch[2] || "";  // HoleType (if present)

    diameter = parseFloat(values[2]); // Handle missing diameter
     

    // Extract optional SlotType
    if (values.length > 3) {
        depth = parseFloat(values[3]) || 0.00;
        let depthMatch = values[3].match(/^([\d.]+)([A-Za-z]*)$/);
        if (!depthMatch) return; // Exit if invalid format
        depth = parseFloat(depthMatch[1]);
        slotType = depthMatch[2] || "";
    }

    if (slotType != '') {
        width = parseFloat(values[4]) || 0.00;
        height = parseFloat(values[5]) || 0.00;
        angle = parseFloat(values[6]) || 0.00;
    }
    // Add parsed line to holeData array
    holeData.push([view, xValue, dimensionRef, yValue, holeType, diameter, depth, slotType, width, height, angle, holeData.length]);
}

//Parses Blocs
function ncParseBlocData(fileData){
    const splitFileData = fileData.split('\n'); //split file lines
    let bloc = ''; //stores current bloc
    let isStart = false;

    clearAllData(); //Empties stored bloc data

    for (line of splitFileData)
    {
        //Removes start, end spaces and replaces any un wanted extra spaces in the middle with one space only
        line = line.trim().replace(/\s+/g, ' ');
        //Checks for a new bloc
        if (blocs.includes(line.slice(0, 2)))
        {
            isStart = true;
            bloc = line.slice(0, 2);
            //Ends parsing at the end of the file
            if (bloc == 'EN') break;
            //skips the bloc line
            continue;
        }

        //Parse contour blocs and add them to the contourData array
        if (bloc == 'AK' || bloc == 'IK') {
            isStart = false;
            ncParseContourData(line, bloc);
        }
        //Parse hole blocs and add them to the holeData array
        if (bloc == 'BO') ncParseHoleData(line);
        //Parse marks blocs and add them to the marksData array
        if (bloc == 'KO' || bloc == 'PU') {
            ncParseMarksData(line, isStart);
            isStart = false;
        }
        //Parse numerations blocs and add them to the numerationsData array
        if (bloc == 'SI') ncParseNumertaionsData(line);
    }

    handleUndefinedViews();
}

//Empties stored bloc data
function clearAllData() {
    contourData.length = 0;
    holeData.length = 0;
    marksData.length = 0;
    numerationsData.length = 0;
    storedMeasurements.length = 0;
    viewExists = {
        o: false,
        v: false,
        u: false,
        h: false
    };
}

//Parse Marks
function ncParseMarksData(line, isStart){ 
    let values = line.trim().split(/\s+/); // Split by whitespace
    let face = "";
    let xValue, dimensionRef, yValue, radius;

    // Check if the first value is a face (single letter)
    if (values[0].length == 1 && /[A-Za-z]/.test(values[0])) {
        face = values[0];  // Store face
        values.shift();  // Remove it from the array
    } else {
        face = lastFace; // Use the previous face if not present
    }
    lastFace = face; // Update last seen 
    
    //Extract X-value and check for dimension reference
    let xMatch = values[0].match(/^([\d.]+)([A-Za-z]*)$/);
    if (!xMatch) return; // Exit if invalid format
    xValue = parseFloat(xMatch[1]);  
    dimensionRef = xMatch[2] || "";  

    //Extract y-value and radius
    yValue = parseFloat(values[1]);
    radius = parseFloat(values[2]);

    // Add parsed line to marksData
    marksData.push([face, xValue, dimensionRef, yValue, radius, isStart]);
}

//Parse Numerations
function ncParseNumertaionsData(line){
    let values = line.trim().split(/\s+/); // Split by whitespace
    let face = "";
    let xValue, dimensionRef, yValue, angle, height, turn, text;

    // Check if the first value is a face (single letter)
    if (values[0].length == 1 && /[A-Za-z]/.test(values[0])) {
        face = values[0];  // Store face
        values.shift();  // Remove it from the array
    } else {
        face = lastFace; // Use the previous face if not present
    }
    lastFace = face; // Update last seen 
    
    // Extract X-value and check for dimension reference
    let xMatch = values[0].match(/^([\d.]+)([A-Za-z]*)$/);
    if (!xMatch) return; // Exit if invalid format
    xValue = parseFloat(xMatch[1]);  
    dimensionRef = xMatch[2] || "";

    // Extract HoleType (may be attached to Y or separate)
    yValue = parseFloat(values[1]);
    angle = parseFloat(values[2]);

    // Extract text height and check for text rotation
    let textMatch = values[3].match(/^([\d.]+)([A-Za-z]*)$/);
    if (!textMatch) return; // Exit if invalid format
    height = parseFloat(textMatch[1]);  
    turn = textMatch[2] || "";

    //Extract text
    text = values[4];

    //Add parsed line to numerationsData
    numerationsData.push([face, xValue, dimensionRef, yValue, angle, height, turn, text]);
}

//Adds hole data to hole info tap
function addHoleData() {
    for (const [index, holeLine] of holeData.entries()) {
        const holeInfo = document.getElementById('holeInfoContainer');
        const holeDiv = document.createElement('div');
        holeDiv.classList.add('card', 'holeCard');
        const holeContent = document.createElement('div');
        holeContent.classList.add('card-content');
        let view = document.createElement('p');
        let holeType = document.createElement('p');
        let xVal = document.createElement('p');
        let yVal= document.createElement('p');
        let diaVal = document.createElement('p');
        let depthVal = document.createElement('p');
        let widthVal = document.createElement('p');
        let heightVal = document.createElement('p');
        let angleVal = document.createElement('p');
        let delHoleBtn = document.createElement('a');
        let delHoleIcon = document.createElement('i');

        delHoleIcon.classList.add('material-icons', 'white-text');
        delHoleIcon.innerHTML = 'delete';
        delHoleBtn.classList.add('waves-effect', 'waves-light', 'btn', 'red', 'delHoleBtn');
        delHoleBtn.setAttribute('data-view', holeLine[0]);
        delHoleBtn.setAttribute('data-x', holeLine[1]);
        delHoleBtn.setAttribute('data-y', holeLine[3]);
        delHoleBtn.addEventListener('click', (event) => delHole(event, delHoleBtn));
        delHoleBtn.appendChild(delHoleIcon);

        view.innerHTML = '<strong>View:</strong> ' + holeLine[0];
        if(holeLine[7] === '')
        {
            let temp = holeLine[4];
            switch(temp) {
                case '':
                    holeType.innerHTML = '<strong>Type:</strong> Hole';
                    break;
                case 'g':
                    holeType.innerHTML = '<strong>Type:</strong> Threaded hole';
                    break;
                case 'l':
                    holeType.innerHTML = '<strong>Type:</strong> Left threaded hole';
                    break;
                case 'm':
                    holeType.innerHTML = '<strong>Type:</strong> Mark';
                    break;
                case 's':
                    holeType.innerHTML = '<strong>Type:</strong> Countersink hole';
                    break;
                default:
                    break;
            }
        }
        else holeType.innerHTML = 'Slotted hole';
        xVal.innerHTML = `<strong>X: </strong> ${holeLine[1]} mm`;
        yVal.innerHTML = `<strong>Y: </strong> ${holeLine[3]} mm`;
        diaVal.innerHTML = `<strong>Diameter: </strong> ${holeLine[5]} mm`;
        if (holeLine[6] == 0) depthVal.innerHTML = `<strong>Depth: </strong> through-hole`;
        else depthVal.innerHTML = `<strong>Depth: </strong> ${holeLine[6]} mm`;
        widthVal.innerHTML = `<strong>Width: </strong> ${holeLine[8] ? holeLine[8] + ' mm' : 'N/A'}`;
        heightVal.innerHTML = `<strong>Height: </strong> ${holeLine[9] ? holeLine[9] + ' mm' : 'N/A'}`;
        angleVal.innerHTML = `<strong>Angle: </strong> ${holeLine[10] ? holeLine[10] + '°' : 'N/A'}`;

        holeDiv.classList.add('holeContainer');
        [view, holeType, xVal, yVal, diaVal, depthVal, widthVal, heightVal, angleVal, delHoleBtn].forEach(p => { 
            p.classList.add('holeInfo');
            holeContent.appendChild(p);
        });

        holeDiv.setAttribute('data-index', index);
        holeDiv.setAttribute('data-view', holeLine[0] + '-view');
        holeDiv.setAttribute('onClick', 'changeHoleColor(this)')
        holeDiv.classList.add('holeCard', 'hoverable');
        holeDiv.appendChild(holeContent);
        holeInfo.appendChild(holeDiv);
    }
}

//Deletes hole from DSTV file and view
function delHole(e, delHoleBtn) {
    e.stopPropagation(); //Stop hole infor div from being pressed
    const view = delHoleBtn.dataset.view;
    const xVal = delHoleBtn.dataset.x;
    const yVal = delHoleBtn.dataset.y;
    const id = delHoleBtn.closest('.holeContainer').dataset.index;

    const lines = filePairs.get(selectedFile).split('\n');
    const filteredLines = lines.filter(line => {
        const trimmed = line.trim();
        
        //Check if line starts with the wanted view
        if (trimmed.startsWith(view)) {
            //Split by any amount of whitespace
            const parts = trimmed.split(/\s+/);
            
            if (parts.length >= 4) {
                //Extract X value
                const lineX = parts[1].replace(/[a-zA-Z]+$/, '');
                //Extract Y value
                const lineY = parts[2];
                
                //Check for match - handle both string and number comparison
                const xMatch = lineX === xVal || parseFloat(lineX) === parseFloat(xVal);
                const yMatch = lineY === yVal || parseFloat(lineY) === parseFloat(yVal);
                
                if (xMatch && yMatch) return false; //Remove this line (match)
            }
        }
        return true; //Keep this line (no match)
    });
    const removedCount = lines.length - filteredLines.length; //Gets the number of removed hole lines
    filePairs.set(selectedFile, filteredLines.join('\n'));
    if (removedCount > 0) {
        for (const [index, holeLine] of holeData.entries()) {
            if (holeLine[11] == id) {
                holeData.splice(index, 1);
                break; //Exit after finding and deleting a match
            }
        }
        const holeDiv = delHoleBtn.closest('.holeContainer');
        const layer = layers[view + '-view'];
        const hole = layer.findOne(`.circle-${id}`); //Find the hole by its name
        hole.destroy(); //Remove hole from view
        holeDiv.remove(); //Remove hole info card
        layer.batchDraw();
    }
}

//Adds measurement line to history dropdown menu
function addMeasurementData(measurementCounter, view, distance, hDistance, vDistance) {
    let container = document.getElementById('historyDropdown');
    let div = document.createElement('div');
    let measurements = document.createElement('div');
    let measurementView = document.createElement('p');
    let measrementDistance = document.createElement('p');
    let measrementhDistance = document.createElement('p');
    let measrementvDistance= document.createElement('p');
    let btn = document.createElement('a');
    let icon = document.createElement('i');

    measurementView.innerHTML = view;
    measrementDistance.innerHTML = `<strong>D: </strong> ${distance} mm`;
    measrementhDistance.innerHTML = `<strong>X: </strong> ${hDistance} mm`;
    measrementvDistance.innerHTML = `<strong>Y: </strong> ${vDistance} mm`;

    div.setAttribute('data-measurementCounter', measurementCounter);
    div.setAttribute('onclick', 'changeMeasurementColor(this)');
    div.classList.add('measurement-container', 'hoverable');
    measurements.classList.add('measurement-data');
    btn.classList.add('waves-effect', 'waves-light', 'red', 'btn-floating');
    btn.setAttribute('onclick', 'deleteMeasurement(this, event)');
    icon.classList.add('material-icons');
    icon.textContent = 'delete';

    btn.appendChild(icon);
    measurements.appendChild(measurementView);
    measurements.appendChild(measrementDistance);
    measurements.appendChild(measrementhDistance);
    measurements.appendChild(measrementvDistance);
    div.appendChild(measurements);
    div.appendChild(btn);
    container.appendChild(div);
}

//Deletes a measurement
function deleteMeasurement(btn, event) {
    //Stops the div from being pressed selecting the deleted
    event.stopPropagation();
    let dropDownMenu = document.getElementById("historyDropdown");
    let dropdownElement = document.getElementById("historyDropdownBtn"); //The dropdown menu element
    let instance = M.Dropdown.getInstance(dropdownElement);
    //Gets closest parent with class measurement-container
    let div = btn.closest('.measurement-container');
    let measurementCounter = div.dataset.measurementcounter;
    let view = div.firstElementChild.firstElementChild.innerHTML;
    let layer = measurementLayers[view];
    layer.findOne(`.final-measurement-line-${measurementCounter}`).destroy(); //Find the measurement line by its name
    layer.findOne(`.final-guide-line-1-${measurementCounter}`).destroy(); //Find the guide line 1 by its name
    layer.findOne(`.final-guide-line-2-${measurementCounter}`).destroy(); //Find the guide line 2 by its name
    layer.findOne(`.measurement-text-${measurementCounter}`).destroy(); //Find the measurement text by its name
    layer.findOne(`.measurement-transformer-${measurementCounter}`).destroy(); //Find the measurement text transformer by its name
    layer.batchDraw(); //Redraws the layer after modification
    div.remove(); //Removes measurement history from dropdown menu
    instance.recalculateDimensions(); //Recalculates drodown dimensions when elements are removed
    storedMeasurements = storedMeasurements.filter(item => item.measurementCounter != measurementCounter); //Removes measurement from measurement stored data
    if (dropDownMenu.children.length === 0) {
        instance.close(); //Closes dropdown when it's empty
        dropdownElement.classList.add('lighten-3'); //Makes the measurement history button appear inactive
    }
}

//Selects measurement
function changeMeasurementColor(measurementDiv) {
    //Resets all measurement text color
    for (let view of views) {
        let layer = measurementLayers[view];
        let measurementLines = layer.find(node => node.name().startsWith('measurement-text-'));
        measurementLines.forEach(text => text.fill(measurementTextColor));
    }
    //Removes sletected file class from every container div
    let divs = document.querySelectorAll('.measurement-container');
    for (let div of divs) div.classList.remove('selected-file');
    //Adds selected file class to desired div
    measurementDiv.classList.add('selected-file');
    let measurementCounter = measurementDiv.dataset.measurementcounter;
    let view = measurementDiv.firstElementChild.firstElementChild.innerHTML;
    let layer = measurementLayers[view];
    layer.findOne(`.measurement-text-${measurementCounter}`).fill('red'); //Find the measurement line by its name
}

//Hnadles if there are no countour blocs and the part is defined by header only
function handleUndefinedViews(){
    const profile = document.getElementById('Code').querySelector('p:first-of-type').innerHTML.trim();
    const length = parseFloat(document.getElementById('Length').querySelector('p:first-of-type').innerHTML);
    const height = parseFloat(document.getElementById('Height').querySelector('p:first-of-type').innerHTML);
    const flangeWidth = parseFloat(document.getElementById('flangeWidth').querySelector('p:first-of-type').innerHTML);
    const flangeThickness = parseFloat(document.getElementById('flangeThickness').querySelector('p:first-of-type').innerHTML);
    const webThickness = parseFloat(document.getElementById('webThickness').querySelector('p:first-of-type').innerHTML);
    const webCutStart = Math.abs(parseFloat(document.getElementById('webCutStart').querySelector('p:first-of-type').innerHTML));
    const isNegativeWCS = (document.getElementById('webCutStart').querySelector('p:first-of-type').innerHTML.trim().startsWith("-"));
    const webCutEnd = Math.abs(parseFloat(document.getElementById('webCutEnd').querySelector('p:first-of-type').innerHTML));
    const isNegativeWCE = (document.getElementById('webCutEnd').querySelector('p:first-of-type').innerHTML.trim().startsWith("-"));
    const flangeCutStart = Math.abs(parseFloat(document.getElementById('flangeCutStart').querySelector('p:first-of-type').innerHTML));
    const isNegativeFCS = (document.getElementById('flangeCutStart').querySelector('p:first-of-type').innerHTML.trim().startsWith("-"));
    const flangeCutEnd = Math.abs(parseFloat(document.getElementById('flangeCutEnd').querySelector('p:first-of-type').innerHTML));
    const isNegativeFCE = (document.getElementById('flangeCutEnd').querySelector('p:first-of-type').innerHTML.trim().startsWith("-"));

   if (['U', 'B', 'L', 'C', 'M', 'RO', 'RU'].includes(profile)) {
        switch (profile) {
            case 'M':
                if (!viewExists.h) addBackWeb(length, height, flangeWidth, flangeThickness, webThickness, webCutStart, isNegativeWCS, webCutEnd, isNegativeWCE, flangeCutStart, isNegativeFCS, flangeCutEnd, isNegativeFCE);
            case 'U':
            case 'C':
                if (!viewExists.o) addTopFlange(length, height, flangeWidth, flangeThickness, webThickness, webCutStart, isNegativeWCS, webCutEnd, isNegativeWCE, flangeCutStart, isNegativeFCS, flangeCutEnd, isNegativeFCE);
            case 'L':
                if (!viewExists.u) addBottomFlange(length, height, flangeWidth, flangeThickness, webThickness, webCutStart, isNegativeWCS, webCutEnd, isNegativeWCE, flangeCutStart, isNegativeFCS, flangeCutEnd, isNegativeFCE);
            case 'RO':
            case 'RU':
            case 'B':
                if (!viewExists.v) addFrontWeb(length, height, flangeWidth, flangeThickness, webThickness, webCutStart, isNegativeWCS, webCutEnd, isNegativeWCE, flangeCutStart, isNegativeFCS, flangeCutEnd, isNegativeFCE);
            default:
                break;
        }
    }
    else if (profile == 'I')
    {
        if (!viewExists.o) addTopFlange(length, height, flangeWidth, flangeThickness, webThickness, webCutStart, isNegativeWCS, webCutEnd, isNegativeWCE, flangeCutStart, isNegativeFCS, flangeCutEnd, isNegativeFCE);
        if (!viewExists.u) addBottomFlange(length, height, flangeWidth, flangeThickness, webThickness, webCutStart, isNegativeWCS, webCutEnd, isNegativeWCE, flangeCutStart, isNegativeFCS, flangeCutEnd, isNegativeFCE);
        if (!viewExists.v) addFrontWebI(length, height, flangeWidth, flangeThickness, webThickness, webCutStart, isNegativeWCS, webCutEnd, isNegativeWCE, flangeCutStart, isNegativeFCS, flangeCutEnd, isNegativeFCE);
    }
    else if (profile == 'T')
    {
        if (!viewExists.h) addFlangeT(length, height, flangeWidth, flangeThickness, webThickness, webCutStart, isNegativeWCS, webCutEnd, isNegativeWCE, flangeCutStart, isNegativeFCS, flangeCutEnd, isNegativeFCE);
        if (!viewExists.u) addWebT(length, height, flangeWidth, flangeThickness, webThickness, webCutStart, isNegativeWCS, webCutEnd, isNegativeWCE, flangeCutStart, isNegativeFCS, flangeCutEnd, isNegativeFCE);
    }
    else if(!(viewExists.o && viewExists.v && viewExists.u && viewExists.h)) M.toast({html: `Profile ${profile} not supported!`, classes: 'rounded toast-error', displayLength: 2000}); //Handles if there are not contour data and profile is not supported
    return;
}

function addFrontWeb(length, height, flangeWidth, flangeThickness, webThickness, webCutStart, isNegativeWCS, webCutEnd, isNegativeWCE, flangeCutStart, isNegativeFCS, flangeCutEnd, isNegativeFCE) { 
    const wCS = (height - flangeThickness) * Math.tan((webCutStart * Math.PI) / 180);
    const wCE = (height - flangeThickness) * Math.tan((webCutEnd * Math.PI) / 180);
    const fCS = (flangeWidth - webThickness) * Math.tan((flangeCutStart * Math.PI) / 180);
    const fCE = (flangeWidth - webThickness) * Math.tan((flangeCutEnd * Math.PI) / 180);
    let firstPoint = [];

    const sValue = wCS > fCS ? wCS : fCS;
    const eValue = wCE > fCE ? wCE : fCE;

    if (!isNegativeWCS && !isNegativeFCS) firstPoint = ['v', fCS, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00];
    else if (!isNegativeWCS && isNegativeFCS) firstPoint = ['v', 0.00, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00];
    else if (isNegativeWCS && !isNegativeFCS) firstPoint = ['v', sValue, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00];
    else firstPoint = ['v', wCS, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00];
    contourData.push(firstPoint);

    if (!isNegativeWCE && !isNegativeFCE) contourData.push(['v', length - wCE, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (!isNegativeWCE && isNegativeFCE) contourData.push(['v', length - eValue, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (isNegativeWCE && !isNegativeFCE) contourData.push(['v', length, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else contourData.push(['v', length - fCE, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00]);

    if (!isNegativeWCE && !isNegativeFCE) contourData.push(['v', length, '', height, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (!isNegativeWCE && isNegativeFCE) contourData.push(['v', length - fCE, '', height, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (isNegativeWCE && !isNegativeFCE) contourData.push(['v', length - wCE, '', height, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else contourData.push(['v', length - eValue, '', height, '', 0.00, 0.00, 0.00, 0.00, 0.00]);

    if (!isNegativeWCS && !isNegativeFCS) contourData.push(['v', sValue, '', height, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (!isNegativeWCE && isNegativeFCE) contourData.push(['v', wCS, '', height, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (isNegativeWCS && !isNegativeFCS) contourData.push(['v', fCS, '', height, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else contourData.push(['v', 0.00, '', height, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    
    contourData.push(firstPoint);
}

function addBackWeb(length, height, flangeWidth, flangeThickness, webThickness, webCutStart, isNegativeWCS, webCutEnd, isNegativeWCE, flangeCutStart, isNegativeFCS, flangeCutEnd, isNegativeFCE) { 
    const wCS = (height - flangeThickness) * Math.tan((webCutStart * Math.PI) / 180);
    const wCE = (height - flangeThickness) * Math.tan((webCutEnd * Math.PI) / 180);
    const fCS = (flangeWidth - webThickness) * Math.tan((flangeCutStart * Math.PI) / 180);
    const fCE = (flangeWidth - webThickness) * Math.tan((flangeCutEnd * Math.PI) / 180);
    let firstPoint = [];

    const sValue = wCS > fCS ? wCS : fCS;
    const eValue = wCE > fCE ? wCE : fCE;

    if (!isNegativeWCS && !isNegativeFCS) firstPoint = ['h', 0.00, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00];
    else if (!isNegativeWCS && isNegativeFCS) firstPoint = ['h', fCS, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00];
    else if (isNegativeWCS && !isNegativeFCS) firstPoint = ['h', wCS, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00];
    else firstPoint = ['h', sValue, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00];
    contourData.push(firstPoint);

    if (!isNegativeWCE && !isNegativeFCE) contourData.push(['h', length - eValue, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (!isNegativeWCE && isNegativeFCE) contourData.push(['h', length - wCE, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (isNegativeWCE && !isNegativeFCE) contourData.push(['h', length - fCE, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else contourData.push(['h', length, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00]);

    if (!isNegativeWCE && !isNegativeFCE) contourData.push(['h', length - fCE, '', height, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (!isNegativeWCE && isNegativeFCE) contourData.push(['h', length, '', height, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (isNegativeWCE && !isNegativeFCE) contourData.push(['h', length- eValue, '', height, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else contourData.push(['h', length - wCE, '', height, '', 0.00, 0.00, 0.00, 0.00, 0.00]);

    if (!isNegativeWCS && !isNegativeFCS) contourData.push(['h', wCS, '', height, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (!isNegativeWCE && isNegativeFCE) contourData.push(['h',sValue, '', height, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (isNegativeWCS && !isNegativeFCS) contourData.push(['h', 0.00, '', height, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else contourData.push(['h', fCS, '', height, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    
    contourData.push(firstPoint);
}

function addTopFlange(length, height, flangeWidth, flangeThickness, webThickness, webCutStart, isNegativeWCS, webCutEnd, isNegativeWCE, flangeCutStart, isNegativeFCS, flangeCutEnd, isNegativeFCE) { 
    const wCS = (height - flangeThickness) * Math.tan((webCutStart * Math.PI) / 180);
    const wCE = (height - flangeThickness) * Math.tan((webCutEnd * Math.PI) / 180);
    const fCS = (flangeWidth - webThickness) * Math.tan((flangeCutStart * Math.PI) / 180);
    const fCE = (flangeWidth - webThickness) * Math.tan((flangeCutEnd * Math.PI) / 180);
    let firstPoint = [];

    const sValue = wCS > fCS ? wCS : fCS;
    const eValue = wCE > fCE ? wCE : fCE;

    if (!isNegativeWCS && !isNegativeFCS) firstPoint = ['o', 0.00, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00];
    else if (!isNegativeWCS && isNegativeFCS) firstPoint = ['o', fCS, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00];
    else if (isNegativeWCS && !isNegativeFCS) firstPoint = ['o', wCS, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00];
    else firstPoint = ['o', sValue, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00];
    contourData.push(firstPoint);

    if (!isNegativeWCE && !isNegativeFCE) contourData.push(['o', length - eValue, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (!isNegativeWCE && isNegativeFCE) contourData.push(['o', length - wCE, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (isNegativeWCE && !isNegativeFCE) contourData.push(['o', length - fCE, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else contourData.push(['o', length, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00]);

    if (!isNegativeWCE && !isNegativeFCE) contourData.push(['o', length - wCE, '', flangeWidth, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (!isNegativeWCE && isNegativeFCE) contourData.push(['o', length - eValue, '', flangeWidth, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (isNegativeWCE && !isNegativeFCE) contourData.push(['o', length, '', flangeWidth, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else contourData.push(['o', length - fCE, '', flangeWidth, '', 0.00, 0.00, 0.00, 0.00, 0.00]);

    if (!isNegativeWCS && !isNegativeFCS) contourData.push(['o', fCS, '', flangeWidth, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (!isNegativeWCE && isNegativeFCE) contourData.push(['o', 0.00, '', flangeWidth, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (isNegativeWCS && !isNegativeFCS) contourData.push(['o', sValue, '', flangeWidth, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else contourData.push(['o', wCS, '', flangeWidth, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    
    contourData.push(firstPoint);
}

function addBottomFlange(length, height, flangeWidth, flangeThickness, webThickness, webCutStart, isNegativeWCS, webCutEnd, isNegativeWCE, flangeCutStart, isNegativeFCS, flangeCutEnd, isNegativeFCE) { 
    const wCS = (height - flangeThickness) * Math.tan((webCutStart * Math.PI) / 180);
    const wCE = (height - flangeThickness) * Math.tan((webCutEnd * Math.PI) / 180);
    const fCS = (flangeWidth - webThickness) * Math.tan((flangeCutStart * Math.PI) / 180);
    const fCE = (flangeWidth - webThickness) * Math.tan((flangeCutEnd * Math.PI) / 180);
    let firstPoint = [];

    const sValue = wCS > fCS ? wCS : fCS;
    const eValue = wCE > fCE ? wCE : fCE;

    if (!isNegativeWCS && !isNegativeFCS) firstPoint = ['u', wCS, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00];
    else if (!isNegativeWCS && isNegativeFCS) firstPoint = ['u', sValue, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00];
    else if (isNegativeWCS && !isNegativeFCS) firstPoint = ['u', 0.00, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00];
    else firstPoint = ['u', fCS, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00];
    contourData.push(firstPoint);

    if (!isNegativeWCE && !isNegativeFCE) contourData.push(['u', length - fCE, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (!isNegativeWCE && isNegativeFCE) contourData.push(['u', length, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (isNegativeWCE && !isNegativeFCE) contourData.push(['u', length - eValue, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else contourData.push(['u', length - wCE, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00]);

    if (!isNegativeWCE && !isNegativeFCE) contourData.push(['u', length, '', flangeWidth, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (!isNegativeWCE && isNegativeFCE) contourData.push(['u', length - fCE, '', flangeWidth, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (isNegativeWCE && !isNegativeFCE) contourData.push(['u', length - wCE, '', flangeWidth, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else contourData.push(['u', length - eValue, '', flangeWidth, '', 0.00, 0.00, 0.00, 0.00, 0.00]);

    if (!isNegativeWCS && !isNegativeFCS) contourData.push(['u', sValue, '', flangeWidth, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (!isNegativeWCE && isNegativeFCE) contourData.push(['u', wCS, '', flangeWidth, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (isNegativeWCS && !isNegativeFCS) contourData.push(['u', fCS, '', flangeWidth, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else contourData.push(['u', 0.00, '', flangeWidth, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    
    contourData.push(firstPoint);
}

function addFlangeT(length, height, flangeWidth, flangeThickness, webThickness, webCutStart, isNegativeWCS, webCutEnd, isNegativeWCE, flangeCutStart, isNegativeFCS, flangeCutEnd, isNegativeFCE) {
    const wCS = (height - flangeThickness) * Math.tan((webCutStart * Math.PI) / 180);
    const wCE = (height - flangeThickness) * Math.tan((webCutEnd * Math.PI) / 180);
    const fCS = (flangeWidth - webThickness) * Math.tan((flangeCutStart * Math.PI) / 180);
    const fCE = (flangeWidth - webThickness) * Math.tan((flangeCutEnd * Math.PI) / 180);
    let firstPoint = [];

    const sValue = wCS > fCS ? wCS : fCS;
    const eValue = wCE > fCE ? wCE : fCE;
    //Calculate web points
    if (!isNegativeWCS && !isNegativeFCS) firstPoint = ['h', fCS, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00];
    else if (!isNegativeWCS && isNegativeFCS) firstPoint = ['h', 0.00, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00];
    else if (isNegativeWCS && !isNegativeFCS) firstPoint = ['h', sValue, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00];
    else firstPoint = ['h', wCS, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00];
    contourData.push(firstPoint);

    if (!isNegativeWCE && !isNegativeFCE) contourData.push(['h', length - wCE, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (!isNegativeWCE && isNegativeFCE) contourData.push(['h', length - eValue, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (isNegativeWCE && !isNegativeFCE) contourData.push(['h', length, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else contourData.push(['h', length - fCE, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00]);

    if (!isNegativeWCE && !isNegativeFCE) contourData.push(['h', length, '', height, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (!isNegativeWCE && isNegativeFCE) contourData.push(['h', length - fCE, '', height, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (isNegativeWCE && !isNegativeFCE) contourData.push(['h', length- wCE, '', height, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else contourData.push(['h', length - eValue, '', height, '', 0.00, 0.00, 0.00, 0.00, 0.00]);

    if (!isNegativeWCS && !isNegativeFCS) contourData.push(['h', sValue, '', height, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (!isNegativeWCE && isNegativeFCE) contourData.push(['h',wCS, '', height, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (isNegativeWCS && !isNegativeFCS) contourData.push(['h',fCS, '', height, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else contourData.push(['h', 0.00, '', height, '', 0.00, 0.00, 0.00, 0.00, 0.00]);

    contourData.push(firstPoint);
}

function addWebT(length, height, flangeWidth, flangeThickness, webThickness, webCutStart, isNegativeWCS, webCutEnd, isNegativeWCE, flangeCutStart, isNegativeFCS, flangeCutEnd, isNegativeFCE) {
    const wCST = ((height - flangeThickness)/2) * Math.tan((webCutStart * Math.PI) / 180);
    const wCET = ((height - flangeThickness)/2) * Math.tan((webCutEnd * Math.PI) / 180);
    const fCS = (flangeWidth - webThickness) * Math.tan((flangeCutStart * Math.PI) / 180);
    const fCE = (flangeWidth - webThickness) * Math.tan((flangeCutEnd * Math.PI) / 180);
    let firstPoint = [];

    const sValueT = wCST > fCS ? wCST : fCS;
    const eValueT = wCET > fCE ? wCET : fCE;
    //Calculate flange points
    if (!isNegativeWCS && !isNegativeFCS) firstPoint = ['u', wCST, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00];
    else if (!isNegativeWCS && isNegativeFCS) firstPoint = ['u', sValueT, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00];
    else if (isNegativeWCS && !isNegativeFCS) firstPoint = ['u', wCST, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00];
    else firstPoint = ['u', sValueT, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00];
    contourData.push(firstPoint);

    if (!isNegativeWCE && !isNegativeFCE) contourData.push(['u', length - eValueT, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (!isNegativeWCE && isNegativeFCE) contourData.push(['u', length - wCET, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (isNegativeWCE && !isNegativeFCE) contourData.push(['u', length - eValueT, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else contourData.push(['u', length - wCET, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00]);

    if (!isNegativeWCE && !isNegativeFCE) contourData.push(['u', length - wCET, '', flangeWidth, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (!isNegativeWCE && isNegativeFCE) contourData.push(['u', length - eValueT, '', flangeWidth, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (isNegativeWCE && !isNegativeFCE) contourData.push(['u', length - wCET, '', flangeWidth, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else contourData.push(['u', length - eValueT, '', flangeWidth, '', 0.00, 0.00, 0.00, 0.00, 0.00]);

    if (!isNegativeWCS && !isNegativeFCS) contourData.push(['u', sValueT, '', flangeWidth, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (!isNegativeWCE && isNegativeFCE) contourData.push(['u', wCST, '', flangeWidth, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (isNegativeWCS && !isNegativeFCS) contourData.push(['u', sValueT, '', flangeWidth, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else contourData.push(['u', wCST, '', flangeWidth, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    
    contourData.push(firstPoint);
}

function addFrontWebI(length, height, flangeWidth, flangeThickness, webThickness, webCutStart, isNegativeWCS, webCutEnd, isNegativeWCE, flangeCutStart, isNegativeFCS, flangeCutEnd, isNegativeFCE) {
    const wCS = (height - flangeThickness) * Math.tan((webCutStart * Math.PI) / 180);
    const wCE = (height - flangeThickness) * Math.tan((webCutEnd * Math.PI) / 180);
    const fCS = (flangeWidth - webThickness) * Math.tan((flangeCutStart * Math.PI) / 180);
    const fCE = (flangeWidth - webThickness) * Math.tan((flangeCutEnd * Math.PI) / 180);
    const fCSW = ((flangeWidth - webThickness)/2) * Math.tan((flangeCutStart * Math.PI) / 180);
    const fCEW = ((flangeWidth - webThickness)/2) * Math.tan((flangeCutEnd * Math.PI) / 180);
    let firstPoint = [];

    const sValueW = wCS > fCSW ? wCS : fCSW;
    const eValueW = wCE > fCEW ? wCE : fCEW;

    if (!isNegativeWCS && !isNegativeFCS) firstPoint = ['v', fCSW, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00];
    else if (!isNegativeWCS && isNegativeFCS) firstPoint = ['v', sValueW, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00];
    else if (isNegativeWCS && !isNegativeFCS) firstPoint = ['v', fCSW, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00];
    else firstPoint = ['v', sValueW, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00];
    contourData.push(firstPoint);

    if (!isNegativeWCE && !isNegativeFCE) contourData.push(['v', length - eValueW, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (!isNegativeWCE && isNegativeFCE) contourData.push(['v', length - fCEW, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (isNegativeWCE && !isNegativeFCE) contourData.push(['v', length - eValueW, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else contourData.push(['v', length - fCEW, '', 0.00, '', 0.00, 0.00, 0.00, 0.00, 0.00]);

    if (!isNegativeWCE && !isNegativeFCE) contourData.push(['v', length - fCEW, '', height, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (!isNegativeWCE && isNegativeFCE) contourData.push(['v', length - eValueW, '', height, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (isNegativeWCE && !isNegativeFCE) contourData.push(['v', length - fCEW, '', height, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else contourData.push(['v', length - eValueW, '', height, '', 0.00, 0.00, 0.00, 0.00, 0.00]);

    if (!isNegativeWCS && !isNegativeFCS) contourData.push(['v', sValueW, '', height, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (!isNegativeWCE && isNegativeFCE) contourData.push(['v', fCSW, '', height, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else if (isNegativeWCS && !isNegativeFCS) contourData.push(['v', sValueW, '', height, '', 0.00, 0.00, 0.00, 0.00, 0.00]);
    else contourData.push(['v', fCSW, '', height, '', 0.00, 0.00, 0.00, 0.00, 0.00]);

    contourData.push(firstPoint);
}