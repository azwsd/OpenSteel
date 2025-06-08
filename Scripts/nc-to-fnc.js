//Parses the header of DSTV file
//Global variables for important header data
let order = '';
let drawing = '';
let label = '';
let steelQuality = '';
let quantity = '';
let profile = '';
let profileCode = '';
let length = '';
let height = '';
let flangeWidth = '';
let flangeThickness = '';
let webThickness = '';
let weightPerMeter = '';
let webStartCut = '';
let webEndCut = '';
let flangeStartCut = '';
let flangeEndCut = '';
function ncLoadHeaderData(){
    const fileData = filePairs.get(selectedFile);
    const splitFileData = fileData.split('\n');
    let lineCounter = 0;
    let isFirstIteration = true;
    for (line of splitFileData)
    {
        //removes the leading spaces
        line = line.trimStart();
        //reads only the first 20 lines
        if (lineCounter == 20) break;
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
        //Removes \r from the end of string
        line = line.replace(/\r$/, '');

        switch (lineCounter) {
            case 0:
                order = line;
                break;
            case 1:
                drawing = line;
                break;    
            case 3:
            label = line;
                break;
            case 4:
                steelQuality = line;
                break;
            case 5:
                quantity = line;
                break;
            case 6:
                profile = line;
                break;
            case 7:
                profileCode = line;
                break;
            case 8:
                length = line;
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
            case 15:
                webStartCut = line;
                break;
            case 16:
                webEndCut = line;
                break;
            case 17:
                flangeStartCut = line;
                break;
            case 18:
                flangeEndCut = line;
                break;
        }
        lineCounter++;
    }
};

// Face mapping
const faceMapping = {
    'o': 'DB',  // original face
    'u': 'DA',  // upper face
    'h': 'DC'   // horizontal face
};

function createHoleBlock() {
    const fileData = filePairs.get(selectedFile);

    // String to hold all hole data
    let holeData = '';
    
    const lines = fileData.split('\n');
    let inBoBlock = false;
    
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
                const face = parts[0];
                let xCoord = parts[1];
                const yCoord = parts[2];
                const diameter = parts[3];
                
                // Remove any suffix from x coordinate (letters at the end)
                xCoord = xCoord.replace(/[a-zA-Z]+$/, '');
                
                // Get FNC face based on face
                const FNCFace = faceMapping[face] || 'DB'; // default to DB if face not found

                // Format the hole string
                const holeString = `[HOL]   TS11   ${FNCFace}${diameter} X${xCoord} Y${yCoord}`;

                // Add to global array
                holeData += holeString + '\n';
            }
        }
    }
    
    return holeData;
}

function createPRFBlock() {
    return `[[PRF]]\n[PRF] CP:${profileCode} P:${profile} SA${height} TA${webThickness} SB${flangeWidth} TB${flangeThickness} WL${weightPerMeter}`;
}

function createMaterialBlock() {
    return `[[MAT]]\n[MAT] M:${steelQuality}`;
}

function createPCSBlock() {
    return `[[PCS]]\n[HEAD] C:${order} D:${drawing} N:${label}\nM:${steelQuality} CP:${profileCode} P:${profile}\nLP:${length} RAI${webStartCut} RAF${webEndCut} RBI${flangeStartCut} RBF${flangeEndCut}\nQ:${quantity}`;
}

function createFNC() {
    ncLoadHeaderData();
    return `${createPRFBlock()}\n\n${createMaterialBlock()}\n\n${createPCSBlock()}\n${createHoleBlock()}`;
}

function ncToFnc() {
    //M.Modal.getInstance(document.getElementById('exportModal')).close(); //Hide export modal

    // Check if a file is selected
    if (!selectedFile) {
        M.toast({html: 'No file selected!', classes: 'rounded toast-warning', displayLength: 2000});
        return;
    }

    // Create FNC content
    const fncContent = createFNC();

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
}