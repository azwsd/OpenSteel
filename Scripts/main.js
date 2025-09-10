//loads files
const fileInput = document.querySelector("#fileInput");

fileInput.addEventListener("change", async (event) => {
    await handleFiles(event.target.files);
    //Clear the file input, so the same file can be imported again
    fileInput.value = "";
});

// File processing logic
async function handleFiles(files) {
    // Reset DXF batch import flag
    dxfBatchImport = false;
    // Reset file counter
    fileCounter = 0;
    // Convert file list into an array
    const filesArray = [...files];
    const fileCount = filesArray.length;
    if (!fileCount) return;

    for (const file of filesArray) {
    const fileName = file.name;
    if (!verifyFile(fileName)) continue;
    const fileData = await file.text();

    // Only DXF files need modal interaction
    if (getFileExtension(fileName).toLowerCase() === 'dxf') {
        const modalElem = document.getElementById('dxfToNCModal');
        const modal = M.Modal.getInstance(modalElem);
        const processBtn = document.getElementById('dxfToNCButton');
        const batchProcessBtn = document.getElementById('batchDxfToNCButton');
        const closeBtn = document.getElementById('dxfToNCCloseButton');

        // Fast‑path for batch mode already on
        if (dxfBatchImport) {
            let result = null;
            try {
                result = convertDxfToNc(fileData, fileName);
            } 
            catch (err) {
                console.error("Conversion error:", err);
                 M.toast({ html: 'Conversion Failed!', classes: 'rounded toast-error', displayLength: 3000});
            }
            if (result) {
                addFile(fileName.replace(/\.dxf$/, ".nc1"), result, fileCount);
            }
            continue;
        }

        // Open modal and wait for user decision
        modal.open();
        await new Promise(resolve => {
            // Cleanup helper — removes listeners and closes modal
            const cleanup = () => {
                [processBtn, batchProcessBtn, closeBtn].forEach(btn => {
                btn.removeEventListener('click', btn._handler);
                });
                modal.close();
        };

        // Main dxf to nc convert handler
        processBtn._handler = async (evt) => {
            evt.preventDefault();
            try {
                if (!validateDxfInputs()) {
                    // leave modal open - don’t resolve yet
                    return;
                }
                let result = null;
                try {
                    result = convertDxfToNc(fileData, fileName);
                } catch (err) {
                    console.error("Conversion error:", err);
                    M.toast({ html: 'Conversion Failed!', classes: 'rounded toast-error', displayLength: 3000});
                }
                if (result) {
                    addFile(fileName.replace(/\.dxf$/, ".nc1"), result, fileCount);
                }
            } 
            finally {
                cleanup();
                resolve();
            }
        };

        // Batch mode click flips flag then delegates to process
        batchProcessBtn._handler = (evt) => {
            evt.preventDefault();
            dxfBatchImport = true;
            processBtn._handler(evt);
        };

        // Close without processing
        closeBtn._handler = (evt) => {
            evt.preventDefault();
            cleanup();
            resolve();
        };

        // Hook up listeners
        processBtn.addEventListener('click', processBtn._handler);
        batchProcessBtn.addEventListener('click', batchProcessBtn._handler);
        closeBtn.addEventListener('click', closeBtn._handler);
        });

        // Move on to next file
        continue;
    }

    // Nc file just add to view
    addFile(fileName, fileData, fileCount);
    }
}

// Counter to track drag enter/leave events
let dragCounter = 0;

// Make the entire page a drag and drop zone
const dropZone = document.body;

// Prevent default drag behaviors on the entire page
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.addEventListener(eventName, preventDefaults, false);
});

//Handle drag enter
document.addEventListener('dragenter', (e) => {
    dragCounter++;
    if (dragCounter === 1) {
        highlight(e);
    }
}, false);

// Handle drag over
document.addEventListener('dragover', highlight, false);

// Handle drag leave
document.addEventListener('dragleave', (e) => {
    dragCounter--;
    if (dragCounter === 0) {
        unhighlight(e);
    }
}, false);

//Handle drop
document.addEventListener('drop', (e) => {
    dragCounter = 0;
    unhighlight(e);
    handleDrop(e);
}, false);
//Prevent default for an event
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}
//Highlight the body when a file is dragged over it
function highlight() {
    document.body.classList.add('drag-over');
}
function unhighlight() {
    document.body.classList.remove('drag-over');
}
//Load files when dropped on the page
async function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    await handleFiles(files);
}

//Makes the action buttons always under the nav bar
window.addEventListener("scroll", function () {
    let navbar = document.querySelector(".navbar-fixed");
    let buttonContainer = document.querySelector("#functionButtons");
    let navHeight = navbar.offsetHeight;
    
    buttonContainer.style.top = navHeight + "px";
});

function downloadActiveViews() {
    M.Modal.getInstance(document.getElementById('exportModal')).close(); //Hide export modal
    if (selectedFile == '') {
        M.toast({ html: 'No file selected to export!', classes: 'rounded toast-error', displayLength: 3000}); // Show error message if no file is selected
        return;
    }
    let viewCount = 0;
    let lastView = '';
    const fileName = selectedFile.substring(0, selectedFile.lastIndexOf('.'));
    let zip = new JSZip(); //Create a new ZIP archive
        let promises = [];

        Object.keys(stages).forEach(view => {
            if (document.getElementById(view).classList.contains('hide')) return; //Skip hidden views
            hasVisibleViews = true; //At least one view is visible
            viewCount++;
            lastView = view; //Keep track of the last view processed
            
            let stage = stages[view];
            let dataURL = stage.toDataURL({ pixelRatio: 5 }); //High-resolution export
            
            // Convert dataURL to Blob
            let promise = fetch(dataURL)
                .then(res => res.blob())
                .then(blob => {
                    zip.file(`${fileName}-${view}.png`, blob); // Add PNG file to ZIP
                });

            promises.push(promise);
        });

    if (viewCount == 0) {
        M.toast({ html: 'No visible views to export!', classes: 'rounded toast-error', displayLength: 3000}); // Show error message if no views are visible
        return;
    }

    //Wait for all promises to resolve before generating the ZIP or download the only active view
    if (viewCount == 1) {
        let stage = stages[lastView]
        let dataURL = stage.toDataURL({ pixelRatio: 5 }); //High resolution export
    
        let link = document.createElement('a');
        link.href = dataURL;
        link.download = `${fileName}-${lastView}.png`; //Name based on view name
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    else {
        Promise.all(promises).then(() => {
            zip.generateAsync({ type: 'blob' }).then(blob => {
                let link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `${fileName}-views.zip`; //Name of the ZIP file
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
        });
    }
    M.Sidenav.getInstance(document.getElementById('mobile')).close(); //Closes side nav
}

function clickHoleData() {
    let btn = document.querySelector('#properties .tabs > li:nth-child(2) a');
    if(!btn.classList.contains('active')) btn.click();
}

//Download all views when ctrl + s is pressed
document.addEventListener('keydown', function (e) {
    if ( M.Modal.getInstance(document.getElementById('DXFModal')).isOpen ||
        M.Modal.getInstance(document.getElementById('createModal')).isOpen ||
        M.Modal.getInstance(document.getElementById('addHoleModal')).isOpen ||
        M.Modal.getInstance(document.getElementById('dxfToNCModal')).isOpen ||
        M.Modal.getInstance(document.getElementById('FNCModal')).isOpen ||
        document.activeElement === document.getElementById('fileSearch')) return; //Ignore key events if modals are open
        
    if (e.ctrlKey && e.key.toLowerCase() === 's') { //Detect Ctrl + S
        e.preventDefault(); //Prevent default browser save behavior
        downloadActiveViews();
    }
    else if(e.key.toLowerCase() === 's') { //Detect S
        e.preventDefault(); //Prevent default browser save behavior
        let stage = stages[activeView]
        let dataURL = stage.toDataURL({ pixelRatio: 5 }); //High resolution export
        const fileName = selectedFile.substring(0, selectedFile.lastIndexOf('.'));
    
        let link = document.createElement('a');
        link.href = dataURL;
        link.download = `${fileName}-${activeView}.png`; //Name based on view name
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    else if(e.key === 'ArrowUp') { //Detect arrow up
        e.preventDefault(); //Prevent default browser save behavior
        let fileElements = document.querySelectorAll('.viewFiles');
        let selectedIndex = -1;
    
        fileElements.forEach((el, index) => {
            if (el.classList.contains('selected-file')) selectedIndex = index;
        });
        // Select next file if available
        if (selectedIndex !== -1 && selectedIndex - 1 > -1) { 
            fileElements[selectedIndex - 1].click();
            // Scroll the selected element into view
            fileElements[selectedIndex - 1].scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest'
        });
        }
    }
    else if(e.key === 'ArrowDown') { //Detect arrow down
        e.preventDefault(); //Prevent default browser save behavior
        let fileElements = document.querySelectorAll('.viewFiles');
        let selectedIndex = -1;
    
        fileElements.forEach((el, index) => {
            if (el.classList.contains('selected-file')) selectedIndex = index;
        });
        // Select next file if available
        if (selectedIndex !== -1 && selectedIndex + 1 < fileElements.length) { 
            fileElements[selectedIndex + 1].click();
            // Scroll the selected element into view
            fileElements[selectedIndex + 1].scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest'
            });
        }
    }
    else if(e.key === 'ArrowLeft') { //Detect arrow left
    e.preventDefault(); //Prevent default browser save behavior
    let holeElements = document.querySelectorAll('.holeCard');
    let selectedIndex = -1;

    clickHoleData()
    holeElements.forEach((el, index) => {
        if (el.classList.contains('selected-file')) selectedIndex = index;
    });
    // Select next hole if available
    if (selectedIndex !== -1 && selectedIndex - 1 > -1) {
        holeElements[selectedIndex - 1].click();
        // Scroll the selected element into view
        holeElements[selectedIndex - 1].scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest'
        });
    }
        else if(holeElements.length != 0) {
            holeElements[0].click(); //If no hole is selected select first hole
            // Scroll the first element into view
            holeElements[0].scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest'
            });
        }
    }
    else if(e.key === 'ArrowRight') { //Detect arrow right
        e.preventDefault(); //Prevent default browser save behavior
        let holeElements = document.querySelectorAll('.holeCard');
        let selectedIndex = -1;

        clickHoleData()
        holeElements.forEach((el, index) => {
            if (el.classList.contains('selected-file')) selectedIndex = index;
        });
        // Select next hole if available
        if (selectedIndex !== -1 && selectedIndex + 1 < holeElements.length) {
            holeElements[selectedIndex + 1].click();
            // Scroll the selected element into view
            holeElements[selectedIndex + 1].scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest'
            });
        }
        else if(holeElements.length != 0) {
            holeElements[0].click(); //If no hole is selected select first hole
            // Scroll the first element into view
            holeElements[0].scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest'
            });
        }
    }
    else if(e.key === 'Home') {
        e.preventDefault(); //Prevent default browser save behavior
        document.getElementById('snapSize').stepUp();
        document.getElementById('saveSettings').click();
    }
    else if(e.key === 'End') {
        e.preventDefault(); //Prevent default browser save behavior
        document.getElementById('snapSize').stepDown();
        document.getElementById('saveSettings').click();
    }
    else if(e.key === 'PageUp') {
        e.preventDefault(); //Prevent default browser save behavior
        document.getElementById('snapDistance').stepUp();
        document.getElementById('saveSettings').click();
    }
    else if(e.key === 'PageDown') {
        e.preventDefault(); //Prevent default browser save behavior
        document.getElementById('snapDistance').stepDown();
        document.getElementById('saveSettings').click();
    }
    else if (e.key.toLowerCase() === 'e') { //Detect e
        e.preventDefault(); //Prevent default browser save behavior
        M.Modal.getInstance(document.getElementById('exportModal')).open(); //Open export modal
    }
    //Function buttons shortcuts
    else if(e.key.toLowerCase() === 'p') activatePanTool();
    else if(e.key.toLowerCase() === 'm') activateMeasureTool();
    else if(e.key.toLowerCase() === 't') toggleSnapIndicators();
    else if(e.key.toLowerCase() === 'c' && !e.ctrlKey) M.Modal.getInstance(document.getElementById('clearMeasurementsModal')).open();
    else if(e.key.toLowerCase() === 'f') {
        document.getElementById('measurementTextTransform').click();
        document.getElementById('saveSettings').click();
    } 
    //Switching views
    else if(e.key.toLowerCase() === 'o') document.querySelector(`.viewSwitch[data-view="o"]`).click();
    else if(e.key.toLowerCase() === 'v') document.querySelector(`.viewSwitch[data-view="v"]`).click();
    else if(e.key.toLowerCase() === 'u') document.querySelector(`.viewSwitch[data-view="u"]`).click();
    else if(e.key.toLowerCase() === 'h') document.querySelector(`.viewSwitch[data-view="h"]`).click();
});

function loadProfilesPage(){
    sessionStorage.setItem("filePairs", JSON.stringify(Object.fromEntries(filePairs)));
    sessionStorage.setItem("selectedFile", selectedFile);
    window.location.href = "profiles.html";
}

function loadNestingPage(){
    sessionStorage.setItem("filePairs", JSON.stringify(Object.fromEntries(filePairs)));
    sessionStorage.setItem("selectedFile", selectedFile);
    window.location.href = "nesting.html";
}

document.addEventListener('DOMContentLoaded', function(){
    if (filePairs != {}) {
        for (let [fileName, fileData] of filePairs) addFile(fileName, fileData, filePairs.size, true); //Load saved files in session
    }
    if (selectedFile != '') {
        selectedFile = sessionStorage.getItem('selectedFile');
        selectFile(selectedFile); //Select saved selectedFile in session
    }
});

let removeHoles = localStorage.getItem("removeHoles") || 1;
let removeCuts = localStorage.getItem("removeCuts") || 1;
let removeMitre = localStorage.getItem("removeMitre") || 1;
let removeText = localStorage.getItem("removeText") || 1;

function getDSTVSettings () {
    document.getElementById('removeHoles').checked = removeHoles;
    document.getElementById('removeCuts').checked = removeCuts;
    document.getElementById('removeMitre').checked = removeMitre;
    document.getElementById('removeText').checked = removeText;
}

function setDSTVSettings () {
    removeHoles = document.getElementById('removeHoles').checked;
    removeCuts = document.getElementById('removeCuts').checked;
    removeMitre = document.getElementById('removeMitre').checked;
    removeText = document.getElementById('removeText').checked;
    localStorage.setItem("removeHoles", removeHoles);
    localStorage.setItem("removeCuts", removeCuts);
    localStorage.setItem("removeMitre", removeMitre);
    localStorage.setItem("removeText", removeText);
}

document.getElementById('exportNCButton').addEventListener('click', getDSTVSettings()); //Loads stored DSTV settings into view

function removeNCBlocks (data, blockCodes) {
    let lines = data.split(/\r?\n/);
    let updatedData = '';
    let currentBlock = '';
    let prevLine = '';
    let blockOpening = false;
    for (const line of lines) {
        if (['BO', 'SI', 'AK', 'IK', 'PU', 'KO', 'SC', 'TO', 'UE', 'PR', 'KA', 'EN'].includes(line.trim().toUpperCase().slice(0, 2))) {
            currentBlock = line.trim().toLocaleUpperCase().slice(0, 2);
            prevLine = line;
            if (currentBlock === 'EN') {
                updatedData += line;
                break; //End of file, no need to continue
            }
            blockOpening = true;
            continue;
        }
        if (blockCodes.includes(currentBlock)) continue; //Skip block data
        //Adds block code at the top of each block
        if (blockOpening) {
            updatedData += prevLine + '\n';
            blockOpening = false;
        }
        updatedData += line + '\n';
    }
    return updatedData;
}

function removeNCMitre (data) {
    let lines = data.split(/\r?\n/);
    let updatedData = '';
    let lineCounter = 0;
    for (const line of lines) {
        if (line.trim().slice(0, 2) == '**') continue;
        lineCounter++;
        if (lineCounter > 17 && lineCounter < 22) updatedData += '0.00\n';
        else updatedData += line + '\n';
    }
    return updatedData;
}

document.getElementById('exportNCButton').addEventListener('click', function(){
    setDSTVSettings(); //Loads settings into local storage
    if (filePairs.size === 0) {
        M.toast({ html: 'No files to export!', classes: 'rounded toast-warning', displayLength: 3000}); //Show error message if no files are loaded
        return;
    }
    if (!selectedFile) {
        M.toast({ html: 'No selected file to export!', classes: 'rounded toast-warning', displayLength: 3000}); //Show error message if no file is selected
        return;
    }
    let link = document.createElement('a');
    let data = filePairs.get(selectedFile);
    // Remove DSTV blocks depending on user settings
    const blocksToRemove = [];
    if (removeCuts) blocksToRemove.push('IK', 'AK');
    if (removeHoles) blocksToRemove.push('BO');
    if (removeText) blocksToRemove.push('SI');
    if (blocksToRemove.length > 0) {
        data = removeNCBlocks(data, blocksToRemove);
    }
    //Removes mitre depending on user settings
    if (removeMitre) data = removeNCMitre(data);
    let blob = new Blob([data], { type: 'text/plain' });
    link.href = URL.createObjectURL(blob);
    link.download = `${selectedFile}`; //Name of the ZIP file
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

document.getElementById('batchExportNCButton').addEventListener('click', function(){
    setDSTVSettings(); //Loads settings into local storage
    if (filePairs.size === 0) {
        M.toast({ html: 'No files to export!', classes: 'rounded toast-warning', displayLength: 3000}); //Show error message if no files are loaded
        return;
    }
    let zip = new JSZip(); //Create a new ZIP archive
    for (let [file, data] of filePairs.entries()) {
        // Remove DSTV blocks depending on user settings
        const blocksToRemove = [];
        if (removeCuts) blocksToRemove.push('IK', 'AK');
        if (removeHoles) blocksToRemove.push('BO');
        if (removeText) blocksToRemove.push('SI');
        if (blocksToRemove.length > 0) {
            data = removeNCBlocks(data, blocksToRemove);
        }
        //Removes mitre depending on user settings
        if (removeMitre) data = removeNCMitre(data);
        let blob = new Blob([data], { type: 'text/plain' });
        zip.file(`${file}`, blob); // Add file to ZIP
    }
    zip.generateAsync({ type: 'blob' }).then(blob => {
        let link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'DSTV-Export.zip'; //Name of the ZIP file
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});

const filesDiv = document.getElementById('files');
document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                updateFileTracker();
            }
        });
    });

    if (filesDiv) {
        observer.observe(filesDiv, {
            childList: true, // Watch for additions/removals of child nodes
            subtree: false // Only watch direct children
        });
    }
});

function updateFileTracker() {
    // Get position of selected file
    const selectedFileElement = filesDiv.querySelector('.selected-file');
    const childElements = Array.from(filesDiv.querySelectorAll('.viewFiles'));
    const selectedFileIndex = childElements.indexOf(selectedFileElement);

    const filesCount = childElements.length; // Amount of files loaded

    // Update file tracker text
    const fileTrackers = document.querySelectorAll('.fileTracker');
    fileTrackers.forEach(tracker => {
        tracker.textContent = `File ${selectedFileIndex + 1}/${filesCount}`;
    });
}

// DSTV Modal Profile Selection Variables
let dstvCsvData = [];
let dstvCsvPath = '';
let dstvSelectedSectionType = '';
let dstvSelectedProfileSize = '';
let dstvSectionDetailsAutocompleteInstance = null;
let dstvSectionDetailsDropdownInstance = null;

// Initialize DSTV Modal when it opens
document.addEventListener('DOMContentLoaded', function() {
    // Initialize section type select change handler
    const sectionTypeSelect = document.getElementById('sectionTypeSelect');
    if (sectionTypeSelect) {
        M.FormSelect.init(sectionTypeSelect);
        
        sectionTypeSelect.addEventListener('change', function() {
            const selectedType = this.value;
            dstvSelectedSectionType = selectedType;
            resetDstvProfileData()
            loadDstvSectionDetails(selectedType);
        });
        
        // Initialize dropdown instance
        dstvSectionDetailsDropdownInstance = M.Dropdown.init(
            document.getElementById('sectionDetailsDropdownBtn'), 
            {
                constrainWidth: false,
                coverTrigger: false
            }
        );
        
        // Load initial profiles for 'I' type (default selection)
        loadDstvSectionDetails('I');
    }
});

function loadDstvSectionDetails(sectionType) {
    return new Promise(resolve => {
        const sectionDetailsElem = document.getElementById('sectionDetailsAutocomplete');
        
        // Clear previous selection
        sectionDetailsElem.value = '';
        dstvSelectedProfileSize = '';
        
        // Map section types to profile types and CSV paths
        let profileType = '';
        switch (sectionType) {
            case 'I':
                dstvCsvPath = 'data/I.csv';
                break;
            case 'U':
                dstvCsvPath = 'data/U.csv';
                break;
            case 'L':
                dstvCsvPath = 'data/L.csv';
                break;
            case 'M':
                dstvCsvPath = 'data/SHS.csv';
                break;
            case 'RO':
                dstvCsvPath = 'data/CHS.csv';
                break;
            case 'RU':
                dstvCsvPath = 'data/round.csv';
                break;
            case 'B':
                dstvCsvPath = 'data/flat.csv';
                break;
            case 'C':
                dstvCsvPath = 'data/U.csv'; // C profiles are in U.csv
                break;
            case 'T':
                // T sections don't have a standard profile library
                sectionDetailsElem.disabled = true;
                const dropdown = document.getElementById('sectionDetailsDropdown');
                dropdown.innerHTML = '<li><a class="deep-purple-text">T sections not available in profile library</a></li>';
                resolve();
                return;
            default:
                sectionDetailsElem.disabled = true;
                resolve();
                return;
        }
        
        // Enable the autocomplete
        sectionDetailsElem.disabled = false;
        
        // Fetch CSV data
        fetch(dstvCsvPath)
            .then(response => response.text())
            .then(text => {
                // Filter data for the specific profile type
                dstvCsvData = parseCSV(text);
                
                // Create autocomplete data
                const sizeData = {};
                dstvCsvData.forEach((obj, index) => {
                    const displayText = getDstvProfileID(obj);
                    sizeData[displayText] = null;
                    obj.localIndex = index;
                });
                
                // Update autocomplete
                if (dstvSectionDetailsAutocompleteInstance) {
                    dstvSectionDetailsAutocompleteInstance.destroy();
                }
                
                dstvSectionDetailsAutocompleteInstance = M.Autocomplete.init(sectionDetailsElem, {
                    data: sizeData,
                    limit: 10,
                    onAutocomplete: function(val) {
                        dstvSelectedProfileSize = val;
                        const profileData = findDstvProfileByDisplayText(val);
                        if (profileData) {
                            fillDstvProfileData(profileData);
                        }
                    }
                });
                
                // Update dropdown
                const dropdown = document.getElementById('sectionDetailsDropdown');
                dropdown.innerHTML = "";
                
                dstvCsvData.forEach((obj, index) => {
                    const item = document.createElement('li');
                    const profileID = getDstvProfileID(obj);
                    item.innerHTML = `<a class="deep-purple-text lighten-3" onclick="selectDstvSectionFromDropdown('${profileID}', ${index})">${profileID}</a>`;
                    dropdown.appendChild(item);
                });
                
                // Update label to active state
                const label = sectionDetailsElem.nextElementSibling;
                if (label) {
                    label.classList.add('active');
                }
                
                resolve();
            })
            .catch(error => {
                M.toast({html: 'Error loading profile data!', classes: 'rounded toast-error', displayLength: 2000});
                resolve();
            });
    });
}

function selectDstvSectionFromDropdown(displayText, index) {
    const sectionDetailsElem = document.getElementById('sectionDetailsAutocomplete');
    sectionDetailsElem.value = displayText;
    dstvSelectedProfileSize = displayText;
    
    // Update label to active state
    const label = sectionDetailsElem.nextElementSibling;
    if (label) {
        label.classList.add('active');
    }
    
    // Close dropdown
    if (dstvSectionDetailsDropdownInstance) {
        dstvSectionDetailsDropdownInstance.close();
    }
    
    // Load profile data
    const profileData = dstvCsvData[index];
    if (profileData) {
        fillDstvProfileData(profileData);
    }
    
    // Force Materialize update
    M.updateTextFields();
}

function findDstvProfileByDisplayText(displayText) {
    return dstvCsvData.find(profile => {
        return getDstvProfileID(profile) === displayText;
    });
}

function getDstvProfileID(obj) {
    // Get the current section type to determine the profile type
    const sectionType = document.getElementById('sectionTypeSelect').value;
    
    switch (sectionType) {
        case 'I':
        case 'U':
        case 'C':
            const code = obj.code.match(/^[a-zA-Z]+/)[0];
            return `${code}: ${obj.name}`;
        case 'RU': // Round
            const roundCode = obj.code.match(/^[a-zA-Z]+/)[0];
            return `${roundCode}: ${obj.od}`;
        case 'B': // Flat
            const flatCode = obj.code.match(/^[a-zA-Z]+/)[0];
            return `${flatCode}: ${obj.b} x ${obj.thk}`;
        case 'RO': // CHS
            const chsCode = obj.code.match(/^[a-zA-Z]+/)[0];
            return `${chsCode}: ${obj.od} x ${obj.thk}`;
        case 'M': // SHS/RHS
        case 'L': // Angles
            const structCode = obj.code.match(/^[a-zA-Z]+/)[0];
            return `${structCode}: ${obj.h} x ${obj.b} x ${obj.thk}`;
        default:
            return obj.name || obj.code;
    }
}

function fillDstvProfileData(profileData) {
    // Fill the relevant input fields with profile data
    if (profileData.h) {
        document.getElementById('heighthInput').value = profileData.h;
    }
    if (profileData.b) {
        document.getElementById('flangeWidthInput').value = profileData.b;
    }
    if (profileData.tf) {
        document.getElementById('flangeThicknessInput').value = profileData.tf;
    }
    if (profileData.tw) {
        document.getElementById('webThicknessInput').value = profileData.tw;
    }
    if (profileData.thk) {
        // For profiles that use 'thk' instead of separate flange/web thickness
        document.getElementById('flangeThicknessInput').value = profileData.thk;
        document.getElementById('webThicknessInput').value = profileData.thk;
    }
    if (profileData.r) {
        document.getElementById('radiusInput').value = profileData.r;
    }
    else {
        document.getElementById('radiusInput').value = '0.00';
    }
    if (profileData.kgm) {
        document.getElementById('weightInput').value = parseFloat(profileData.kgm).toFixed(2);
    }
    if (profileData.od) {
        // For round sections, use outside diameter as both height and flange width
        document.getElementById('heighthInput').value = profileData.od;
        document.getElementById('flangeWidthInput').value = profileData.od;
    }

    // Paint surface default value
    document.getElementById('paintSurfaceInput').value = '0.00';

    // Update Materialize text fields
    M.updateTextFields();
}

function parseCSV(text) {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",");

    return lines.slice(1).map(line => {
        const values = line.split(",");
        return headers.reduce((obj, header, i) => {
            obj[header.trim()] = values[i].trim();
            return obj;
        }, {});
    });
}

function resetDstvProfileData() {
    // Reset all input fields to empty values
    const fieldsToReset = [
        'heighthInput',
        'flangeWidthInput', 
        'flangeThicknessInput',
        'webThicknessInput',
        'radiusInput',
        'weightInput'
    ];
    
    fieldsToReset.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.value = '';
        }
    });
    
    // Update Materialize text fields to reflect the changes
    M.updateTextFields();
}