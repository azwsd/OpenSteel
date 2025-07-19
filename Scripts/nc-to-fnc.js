//Parses the header of DSTV file
//Global variables for important header data
let pieceOrder = '';
let pieceDrawing = '';
let piecePhase = '';
let pieceLabel = '';
let pieceSteelQuality = '';
let pieceQuantity = '';
let pieceProfile = '';
let pieceProfileCode = '';
let pieceLength = '';
let height = '';
let flangeWidth = '';
let flangeThickness = '';
let webThickness = '';
let weightPerMeter = '';
let webStartCut = '';
let webEndCut = '';
let flangeStartCut = '';
let flangeEndCut = '';
function ncLoadHeaderData(fileData){
    const splitFileData = fileData.split('\n');
    let lineCounter = 0;
    let isFirstIteration = true;
    for (line of splitFileData)
    {
        //removes the leading spaces
        line = line.trimStart();
        //removes ST line
        if (line.slice(0, 2).toUpperCase() == 'ST') continue;
        //reads only the first 24 lines
        if (lineCounter == 24) break;
        //removes comment lines
        if(line.slice(0, 2) == '**') continue;
        //removes comments from any line
        line = line.split('**')[0];
        //Check if there are blocs in the header
        if (blocs.includes(line.slice(0, 2)) && line.slice(2, 1) == ' ')
            {
                M.toast({html: 'File header contains an error!', classes: 'rounded toast-warning', displayLength: 2000});
                break;
            }
        //Removes \r from the end of string, replaces spaces with dashes, and removes leading and trailing spaces
        line = line.trim().replace(/\s+/g, '-').replace(/\r$/, '');

        switch (lineCounter) {
            case 0:
                pieceOrder = line;
                break;
            case 1:
                pieceDrawing = line;
                break;    
            case 2:
                piecePhase = line;
                break; 
            case 3:
            pieceLabel = line;
                break;
            case 4:
                pieceSteelQuality = line;
                break;
            case 5:
                pieceQuantity = line;
                break;
            case 6:
                pieceProfile = line;
                break;
            case 7:
                pieceProfileCode = line;
                break;
            case 8:
                pieceLength = line;
                break;
            case 9:
                height = line;
                break;
            case 10:
                flangeWidth = line;
                break;
            case 11:
                flangeThickness = line;
                break;
            case 12:
                webThickness = line;
                break;
            case 14:
                weightPerMeter = line;
                break;
            case 16:
                webStartCut = line;
                break;
            case 17:
                webEndCut = line;
                break;
            case 18:
                flangeStartCut = line;
                break;
            case 19:
                flangeEndCut = line;
                break;
        }
        lineCounter++;
    }
};

// Face mapping
const faceMapping = {
    'o': 'DB',
    'u': 'DA',
    'v': 'DC',
    'h': 'DD'
};
const angleFaceMapping = {
    'u': 'DA',
    'v': 'DB'
};

// Drill type mapping
const drillTypeMapping = {
    'Punch': 'TS11',
    'Drill': 'TS31',
    'Tap': 'TS41'
};

const profileCodeMapping = {
    'I' : 'I',
    'RO' : 'R',
    'RU' : 'R',
    'U' : 'U',
    'L' : 'L',
    'B' : 'P',
    'T' : 'T',
    'C' : 'C',
    'M' : 'Q'
}

function createHoleBlock(fileData) {
    // String to hold all hole data
    let holeData = '';
    
    const lines = fileData.split('\n');
    let inBoBlock = false;
    let currentFace = '';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check for BO block
        if (line === 'BO') {
            inBoBlock = true;
            continue;
        }

        // Check for exiting a BO block (empty line or end of file or new block)
        if (inBoBlock && (line === '' || line === 'EN' || line.match(/^[A-Z]{2}$/))) {
            inBoBlock = false;
            continue;
        }
        
        // Process hole data within BO block
        if (inBoBlock && line.length > 0) {
            // Parse hole line: face, x, y, diameter, angle
            const parts = line.trim().split(/\s+/);

            if (parts.length >= 4) {
                let face = parts[0].toLowerCase();
                if (face == '') face = currentFace; // Use the last face if current face is empty
                else currentFace = face; // Update current face
                let xCoord = parts[1];
                const yCoord = parts[2];
                const diameter = parts[3];

                if (parts[5] != undefined && parseFloat(parts[5]) != 0) continue; // Skip slots
                
                // Remove any suffix from x coordinate (letters at the end)
                xCoord = xCoord.replace(/[a-zA-Z]+$/, '');
                
                // Get FNC face based on face
                const FNCFace = pieceProfileCode == 'L' ? angleFaceMapping[face] : faceMapping[face];

                // Format the hole string
                const holeString = `[HOL]   ${drillTypeMapping[FNCDrillType]}   ${FNCFace}${diameter} X${xCoord} Y${yCoord}`;

                // Add to global array
                holeData += holeString + '\n';
            }
        }
    }
    
    return holeData;
}

function createMarkBlock(fileData) {
    // String to hold all mark data
    let markData = '';

    const lines = fileData.split('\n');
    let inBoBlock = false;
    let currentFace = '';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Check for SI block
        if (line === 'SI') {
            inBoBlock = true;
            continue;
        }

        // Check for exiting a SI block (empty line or end of file or new block)
        if (inBoBlock && (line === '' || line === 'EN' || line.match(/^[A-Z]{2}$/))) {
            inBoBlock = false;
            continue;
        }

        // Process mark data within SI block
        if (inBoBlock && line.length > 0) {
            // Parse mark line: face, x, y, angle, text
            const parts = line.trim().split(/\s+/);

            if (parts.length >= 4) {
                let face = parts[0].toLowerCase();
                if (face == '') face = currentFace; // Use the last face if current face is empty
                else currentFace = face; // Update current face
                let xCoord = parts[1];
                const yCoord = parts[2];
                const angle = parts[3];
                const text = parts[5];
                
                // Remove any suffix from x coordinate (letters at the end)
                xCoord = xCoord.replace(/[a-zA-Z]+$/, '');
                
                // Get FNC face based on face
                const FNCFace = pieceProfileCode == 'L' ? angleFaceMapping[face] : faceMapping[face];

                // Format the mark string
                const markString = `[MARK] ${FNCFace} X${xCoord} Y${yCoord} ANG${angle} N:${text}`;

                // Add to global array
                markData += markString + '\n';
            }
        }
    }

    return markData;
}

function createPRFBlock() {
    let weightText = pieceProfileCode == 'B' ? '' : `WL${weightPerMeter}`;
    switch (pieceProfileCode) {
        case 'RU':
        case 'RO':
        case 'B':
            weightText = '';
        default:
            weightText = `WL${weightPerMeter}`;
            break;
    }
    return `[[PRF]]\n[PRF] CP:${profileCodeMapping[pieceProfileCode]} P:${pieceProfile} SA${height} TA${webThickness} SB${flangeWidth} TB${flangeThickness} ${weightText}`;
}

function createMaterialBlock() {
    // If constraint material is set, use it instead of pieceSteelQuality
    const material = constraintMaterial == '' ? pieceSteelQuality : constraintMaterial;
    return `[[MAT]]\n[MAT] M:${material}`;
}

function createPCSBlock(requiredQuantity) {
    // If required quantity is available use it instead of quantity in header data
    pieceQuantity = requiredQuantity == 0 ? pieceQuantity : requiredQuantity;

    // If constraint material is set, use it instead of pieceSteelQuality
    const material = constraintMaterial == '' ? pieceSteelQuality : constraintMaterial;

    if (removeFNCMitre == 'true') {
        // If removeFNCMitre is true, set all mitre data to 0
        webStartCut = '0.00';
        webEndCut = '0.00';
        flangeStartCut = '0.00';
        flangeEndCut = '0.00';
    }

    switch (pieceProfileCode) {
        case 'B':
            return `[[PCS]]\n[HEAD] C:${pieceOrder} D:${pieceDrawing} N:${piecePhase} POS:${pieceLabel}\nM:${material} CP:${profileCodeMapping[pieceProfileCode]} P:${pieceProfile}\nLP${pieceLength} SA${height} TA${webThickness}\nQI${pieceQuantity}`;
        case 'RO':
        case 'RU':
            return `[[PCS]]\n[HEAD] C:${pieceOrder} D:${pieceDrawing} N:${piecePhase} POS:${pieceLabel}\nM:${material} CP:${profileCodeMapping[pieceProfileCode]} P:${pieceProfile}\nLP${pieceLength} SA${height} TA${pieceProfileCode == 'RO' ? height : height/2} RAI${webStartCut} RAF${webEndCut} RBI${flangeStartCut} RBF${flangeEndCut}\nQI${pieceQuantity}`;
        default:
            return `[[PCS]]\n[HEAD] C:${pieceOrder} D:${pieceDrawing} N:${piecePhase} POS:${pieceLabel}\nM:${material} CP:${profileCodeMapping[pieceProfileCode]} P:${pieceProfile}\nLP${pieceLength} RAI${webStartCut} RAF${webEndCut} RBI${flangeStartCut} RBF${flangeEndCut}\nQI${pieceQuantity}`;
    }
}

function createFNC(fileData, requiredQuantity) {
    ncLoadHeaderData(fileData);

    let holeData = '';
    // If removeFNCHoles is false, create hole block
    if (removeFNCHoles == 'false') {
        holeData = '\n' + createHoleBlock(fileData)
    }

    return `${createPRFBlock()}\n\n${createMaterialBlock()}\n\n${createPCSBlock(requiredQuantity)}${holeData}\n${createMarkBlock(fileData)}`;
}

let FNCDrillType = localStorage.getItem('FNCDrillType') || 'Punch'; // Default to 'Punch' if not set
let removeFNCMitre = localStorage.getItem('removeFNCMitre') || 'false'; // Default to 'false' if not set
let removeFNCHoles = localStorage.getItem('removeFNCHoles') || 'false'; // Default to 'false' if not set
let constraintMaterial = localStorage.getItem('constraintMaterial') || ''; // Default to empty string if not set

function loadFNCSettings() {
    // Load FNC drill type from local storage
    const selectElement = document.getElementById('FNCDrillTypeSelect');
    selectElement.value = FNCDrillType; // Set FNC drill type export value
    M.FormSelect.init(selectElement); // Re-initialize to show the change

    // Load remove mitre and holes settings
    const removeMitreCheckbox = document.getElementById('removeFNCMitre');
    removeMitreCheckbox.checked = removeFNCMitre === 'true';
    
    const removeHolesCheckbox = document.getElementById('removeFNCHoles');
    removeHolesCheckbox.checked = removeFNCHoles === 'true';

    // Load constraint material
    const constraintMaterialInput = document.getElementById('constraintMaterialInput');
    constraintMaterialInput.value = constraintMaterial;
    M.updateTextFields(); // Update text field to show the loaded value
}

function saveFNCSettings() {
    // Save FNC drill type to local storage
    const selectElement = document.getElementById('FNCDrillTypeSelect');
    FNCDrillType = selectElement.value; // Get FNC drill type export value
    localStorage.setItem('FNCDrillType', FNCDrillType);
    // Save remove mitre and holes settings
    const removeMitreCheckbox = document.getElementById('removeFNCMitre');
    removeFNCMitre = removeMitreCheckbox.checked ? 'true' : 'false';
    localStorage.setItem('removeFNCMitre', removeFNCMitre);
    const removeHolesCheckbox = document.getElementById('removeFNCHoles');
    removeFNCHoles = removeHolesCheckbox.checked ? 'true' : 'false';
    localStorage.setItem('removeFNCHoles', removeFNCHoles);
    // Save constraint material
    const constraintMaterialInput = document.getElementById('constraintMaterialInput');
    constraintMaterial = constraintMaterialInput.value.trim().replace(/\s+/g, '-');
    localStorage.setItem('constraintMaterial', constraintMaterial);
}

function ncToFnc(requiredQuantity = 0) {
    saveFNCSettings(); // Save settings before exporting

    // Check if a file is selected
    if (!selectedFile) {
        M.toast({html: 'No file selected!', classes: 'rounded toast-warning', displayLength: 2000});
        return;
    }
    const fileData = filePairs.get(selectedFile);

    if (!FNCDrillType) {
        M.toast({html: 'Please select a drill type!', classes: 'rounded toast-warning', displayLength: 2000});
        return;
    }
    const selectElement = document.getElementById('FNCDrillTypeSelect');
    FNCDrillType = selectElement.value; // Get FNC drill type export value
    localStorage.setItem('FNCDrillType', FNCDrillType); // Save the selected drill type to local storage

    // Create FNC content
    const fncContent = createFNC(fileData, requiredQuantity);

    // Create a Blob with the output string
    const blob = new Blob([fncContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const fileName = selectedFile.substring(0, selectedFile.lastIndexOf('.'));
    let link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.fnc`; //Name based on file name
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    M.Modal.getInstance(document.getElementById('FNCModal')).close(); // Hide FNC export modal
}

function BatchNcToFnc() {
    saveFNCSettings(); // Save settings before exporting

    // Check if no files are loaded
    if (filePairs.size === 0) {
        M.toast({html: 'No files to export!', classes: 'rounded toast-error', displayLength: 2000});
        return;
    }

    if (!FNCDrillType) {
        M.toast({html: 'Please select a drill type!', classes: 'rounded toast-warning', displayLength: 2000});
        return;
    }

    // Create new ZIP instance
    const zip = new JSZip();
    let processedCount = 0;

    const selectElement = document.getElementById('FNCDrillTypeSelect');
    FNCDrillType = selectElement.value; // Get FNC drill type export value
    localStorage.setItem('FNCDrillType', FNCDrillType); // Save the selected drill type to local storage

    for (const [key, value] of filePairs) {
        const fileName = key.substring(0, key.lastIndexOf('.'));
        const fncContent = createFNC(value);

        // Add FNC content to ZIP file
        zip.file(`${fileName}.fnc`, fncContent);
        processedCount++;
    }

    // Generate ZIP file
    zip.generateAsync({ type: 'blob' }).then(function(content) {
        // Create a Blob with the ZIP content
        const blob = new Blob([content], { type: 'application/zip' });
        const url = URL.createObjectURL(blob);

        let link = document.createElement('a');
        link.href = url;
        link.download = 'FNC_Export.zip'; // Name of the ZIP file
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    M.Modal.getInstance(document.getElementById('FNCModal')).close(); // Hide FNC export modal
}