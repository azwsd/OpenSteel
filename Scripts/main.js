//loads files
const fileInput = document.querySelector("#fileInput");

fileInput.addEventListener("change", async (event) => {
    await handleFiles(event.target.files);
    //Clear the file input, so the same file can be imported again
    fileInput.value = "";
});

//File processing logic
async function handleFiles(files) {
    // Reset file counter
    fileCounter = 0;
    // Get the number of files imported
    let fileCount = files.length;
    // Convert file list into a file array
    let filesArray = [...files];
    if (!filesArray.length) return;
    for (const file of filesArray) {
        const fileName = file.name;
        if (!verifyFile(fileName)) continue;
        const fileData = await file.text();
        // Handle DXF files
        if (getFileExtension(fileName) === 'dxf') {
            const element = document.getElementById('dxfToNCModal')
            const modal = M.Modal.getInstance(element);
            const processBtn = document.getElementById('dxfToNCButton');
            const closeBtn = document.getElementById('dxfToNCCloseButton');
            
            modal.open(); // Open settings modal
            
            // Wait for action from the user
            await new Promise((resolve) => {
                const onProcessClick = () => {
                    // Validate inputs first
                    if (!validateDxfInputs()) {
                        return; // Stay in the modal - don't resolve
                    }
                    
                    // Convert the file
                    const result = convertDxfToNc(fileData, fileName);
                    if (result === null) {
                        resolve(); // No valid contour found, resolve immediately
                        return;
                    }

                    console.log(result);
                    addFile(fileName, result, fileCount);

                    // Clean up listeners
                    processBtn.removeEventListener('click', onProcessClick);
                    closeBtn.removeEventListener('click', onCloseClick);
                    modal.close(); // Close the modal
                    resolve();
                };
                
                const onCloseClick = () => {
                    // Clean up listeners
                    processBtn.removeEventListener('click', onProcessClick);
                    closeBtn.removeEventListener('click', onCloseClick);
                    modal.close(); // Close the modal
                    resolve();
                };
                
                processBtn.addEventListener('click', onProcessClick);
                closeBtn.addEventListener('click', onCloseClick);
            });
            
            // Continue to next file
            continue;
        }
        // Add the file to the view
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
        M.Modal.getInstance(document.getElementById('dxfToNCModal')).isOpen) return; //Ignore key events if modals are open
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

function getDSTVSettings () {
    document.getElementById('removeHoles').checked = removeHoles;
    document.getElementById('removeCuts').checked = removeCuts;
    document.getElementById('removeMitre').checked = removeMitre;
}

function setDSTVSettings () {
    removeHoles = document.getElementById('removeHoles').checked;
    removeCuts = document.getElementById('removeCuts').checked;
    removeMitre = document.getElementById('removeMitre').checked;
    localStorage.setItem("removeHoles", removeHoles);
    localStorage.setItem("removeCuts", removeCuts);
    localStorage.setItem("removeMitre", removeMitre);
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
    //Removes DSTV blocks depending on user settings
    if (removeCuts && removeHoles) data = removeNCBlocks(data, ['BO', 'IK', 'AK']);
    else if (removeCuts) data = removeNCBlocks(data, ['IK', 'AK']);
    else if (removeHoles) data = removeNCBlocks(data, ['BO']);
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
    else if (filePairs.size === 1) {
        document.getElementById('exportNCButton').click();
        return;
    }
    let zip = new JSZip(); //Create a new ZIP archive
    for (let [file, data] of filePairs.entries()) {
        //Removes DSTV blocks depending on user settings
        if (removeCuts && removeHoles) data = removeNCBlocks(data, ['BO', 'IK', 'AK']);
        else if (removeCuts) data = removeNCBlocks(data, ['IK', 'AK']);
        else if (removeHoles) data = removeNCBlocks(data, ['BO']);
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