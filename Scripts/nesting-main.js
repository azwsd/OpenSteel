//header data
let headerData = [];
//Map containing fileName, filedata as text pairs
let filePairs = new Map(Object.entries(JSON.parse(sessionStorage.getItem("filePairs") || "{}")));
let selectedFile = sessionStorage.getItem("selectedFile") || "";
//Blocs
let blocs = ['BO', 'SI', 'AK', 'IK', 'PU', 'KO', 'SC', 'TO', 'UE', 'PR', 'KA', 'EN']

function updateSessionData() {
    sessionStorage.setItem("filePairs", JSON.stringify(Object.fromEntries(filePairs)));
    sessionStorage.setItem("selectedFile", selectedFile);
}

//loads files
const fileInput = document.querySelector("#fileInput");

//counter for files imported
let fileCounter = 0;

//Return extinsion of file
function getFileExtension(fileName){
    if (typeof fileName === "undefined") return;
    return fileName.split('.').pop();
};

//make sure the file format is supported
function verifyFile(fileName)
{
    const acceptableFiles = ['nc', 'nc1'];
    if(acceptableFiles.includes(getFileExtension(fileName).toLowerCase())) return true;
    M.toast({html: 'Please insert correct file format!', classes: 'rounded toast-warning', displayLength: 2000});
    return false;
};

//hides or unhides the files space holder p element
function filesPlaceHolder(){
    let mapSize = filePairs.size;
    if (mapSize == 0){
        document.querySelectorAll('.filesPlaceHolder').forEach(el => {
            el.classList.remove('hide');
        });
    }
    else{
        document.querySelectorAll('.filesPlaceHolder').forEach(el => {
            el.classList.add('hide');
        });
    }
}

//selects file
function selectFile(file){
    //if the file is given from view, file name is extracted
    if (typeof(file) == 'object') file = file.querySelector('a').dataset.filename;
    //removes any selected-file class from view and adds selected-file class to the selected file
    document.querySelectorAll('.viewFiles').forEach(el => {
        if (el.querySelector('a').dataset.filename == file)
        {
            el.classList.add('selected-file');
        }
        else
        {
            el.classList.remove('selected-file');
        }
    });
    selectedFile = file;
    ncParseHeaderData(filePairs.get(selectedFile));
    ncViewsImage(); //Shows the views image
    //Load piece data for any profile but plate
    if (profileCode.toUpperCase() != "B") {
        setInputValue('piece-profile', profile);
        setInputValue('piece-length', length);
        setInputValue('piece-amount', quantity);
        setInputValue('piece-label', label);
    }
    updateFileTracker();
    //Closes side nav
    let sideNav = document.querySelector('.sidenav');
    let instance = M.Sidenav.getInstance(sideNav)
    instance.close();
}

//adds file to the html page
function addFile(fileName, fileData, fileCount, isReload = false){
    //handles if the file already exists
    if (filePairs.has(fileName) && !isReload)
    {
        M.toast({html: 'File already exists!', classes: 'rounded toast-warning', displayLength: 2000})
        return;
    }

    //Checks for ST and EN in the files
    const splitFileData = fileData.split('\n');
    if (splitFileData[0].substring(0, 2) != 'ST' && !isReload)
    {
        M.toast({html: 'Incorrect file structure!', classes: 'rounded toast-error', displayLength: 2000});
        return;
    }

    //adds file and its content as a key value pair in a map
    if (!isReload) filePairs.set(fileName, fileData);

    let sideNavClearAll = document.getElementById('sideNavClearAll');
    let sideNavFiles = document.getElementById('mobile')
    let mainViewFiles = document.getElementById('files')

    let div = document.createElement('div');
    let p = document.createElement('p');
    let icon = document.createElement('i');
    let btn = document.createElement('a');

    div.classList.add('viewFiles');
    div.classList.add('hoverable');
    div.setAttribute('onclick', 'selectFile(this, event)');

    btn.setAttribute('data-filename', fileName);
    btn.setAttribute('onClick', 'deleteFile(this, event)');
    btn.classList.add('fileDelete', 'btn-small', 'waves-effect', 'waves-light', 'red');

    icon.classList.add('material-icons', 'right');
    icon.textContent = 'delete';

    p.textContent = fileName;

    btn.appendChild(icon);
    div.appendChild(p);
    div.appendChild(btn);
    let divClone = div.cloneNode(true);

    mainViewFiles.appendChild(div);
    sideNavFiles.insertBefore(divClone, sideNavClearAll);

    fileCounter++;
    //adds or removes the files space holder
    if (fileCounter == 1) filesPlaceHolder();
    //selects imported file in view
    if (fileCounter == fileCount && !isReload) selectFile(fileName);
    updateSessionData();
}

//deletes file of pressed button
function deleteFile(btn, event){
    let fileName = btn.dataset.filename;
    //Stops the div from being pressed selecting the deleted
    event.stopPropagation();
    //deletes element from the map
    filePairs.delete(fileName);
    //checks if file is selected or not
    let selectedFileDiv = btn.closest('.viewFiles').classList.contains('selected-file');
    //deletes the file from the view
    document.querySelectorAll('.fileDelete').forEach(el => {
        if (el.dataset.filename == fileName) el.closest('.viewFiles').remove();
    });
    //reset place holder if theres no files
    filesPlaceHolder();
    //clears the header data and views
    if (selectedFileDiv) {
        clearHeaderData();
        selectedFile = '';
    }
    updateSessionData();
}

//clears all files
function clearAllFiles(){
    //checks if map is empty
    if (filePairs.size == 0)
    {
        M.toast({html: 'There are no files to clear!', classes: 'rounded toast-warning', displayLength: 2000});
        return;
    }
    //removes all files from view
    document.querySelectorAll('.viewFiles').forEach(el => {
        el.remove();
    });
    filePairs.clear(); //clears map
    selectedFile = ''; //Clears stored selected file
    filesPlaceHolder(); //shows place holder
    clearHeaderData(); //clears the header data
    updateSessionData();
    M.toast({html: 'All files were cleared!', classes: 'rounded toast-success', displayLength: 2000}); //shows success message
}

//clicks a hidden insert element when the list item is clicked
function insert_file(btn){
    document.getElementById('fileInput').click();
    M.Tooltip.getInstance(btn).close(); //Closes the tooltip
};

function clearHeaderData() {
    const properties = document.querySelectorAll("#properties div");
    properties.forEach(property => {
        let pElement = property.querySelector('p');
        if (pElement) {
            pElement.innerHTML = 'N/A';
        }
    });
}

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

//Parses the header of DSTV file
//Global variables for important header data
let order = '';
let drawing = '';
let phase = '';
let label = '';
let steelQuality = '';
let profile = '';
let length = '';
let quantity = '';
let profileCode = '';
function ncParseHeaderData(fileData){
    const splitFileData = fileData.split('\n');
    const properties = document.querySelectorAll("#properties #tab1 div");
    headerData = []
    //clears header data array
    headerData.length = 0;
    let lineCounter = 0;
    for (line of splitFileData)
    {
        //Removes \r from the end of string, replaces spaces with dashes, and removes leading and trailing spaces
        line = line.trim().replace(/\s+/g, '-').replace(/\r$/, '');
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
        //Empty text info handler
        if (lineCounter > 19 && line.length == 0) line = 'N/A';
        //Writes part properties to properties div
        properties[lineCounter].querySelector('p').innerHTML = line;
        //Removes \r from the end of string
        line = line.replace(/\r$/, '');

        switch (lineCounter) {
            case 0:
                order = line;
                break;
            case 1:
                drawing = line;
                break;
            case 2:
                phase = line;
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
                profile = line.replace(/(\d)\*(\d)/g, '$1X$2');
                break;
            case 7:
                profileCode = line;
                break;
            case 8:
                length = line;
                break;
        }

        headerData.push(line);
        lineCounter++;
    }
};

function handleMissingProfile() {
    document.getElementById('profileData').innerHTML = 'please select a profile and a size!';
    M.toast({html: 'Profile not in database!', classes: 'rounded toast-warning', displayLength: 2000});
}

function loadIndexPage(){
    sessionStorage.setItem("filePairs", JSON.stringify(Object.fromEntries(filePairs)));
    sessionStorage.setItem("selectedFile", selectedFile);
    window.location.href = "index.html";
}

function loadProfilesPage(){
    sessionStorage.setItem("filePairs", JSON.stringify(Object.fromEntries(filePairs)));
    sessionStorage.setItem("selectedFile", selectedFile);
    window.location.href = "profiles.html";
}

document.addEventListener('DOMContentLoaded', function(){
    if (filePairs != {}) {
        for (let [fileName, fileData] of filePairs) addFile(fileName, fileData, filePairs.size, true); //Load saved files in session
    }
    if (selectedFile != '') {
        selectedFile = sessionStorage.getItem('selectedFile');
        selectFile(selectedFile); //Select saved selectedFile in session
    }
    // Load saved stock
    stockItems = JSON.parse(localStorage.getItem('stockItems')) || [];
    renderStockTable();
    // Add pieces from loaded files to nesting
    const addPieceBtn = document.getElementById('add-piece');
    for (const [fileName, fileData] of filePairs) {
        selectFile(fileName);
        if(profileCode.replace(/\s+/g, '').toUpperCase() == 'B') continue; // Skip if profile is plate
        addPieceBtn.click(); // Simulate click to add piece
    }
});

document.addEventListener('keydown', function (e) {
    if(e.key === 'ArrowUp') { //Detect arrow up
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
});

// Data structures
let stockItems = [];
let pieceItems = [];
let remainingPieceItems = []; // This is calculated during rendering to show unassigned pieces

// DOM Elements
const addStockBtn = document.getElementById('add-stock');
const addPieceBtn = document.getElementById('add-piece');
const optimizeBtn = document.getElementById('optimize-btn');
const stockTable = document.getElementById('stock-table').getElementsByTagName('tbody')[0];
const pieceTable = document.getElementById('piece-table').getElementsByTagName('tbody')[0];
const cuttingNestsDiv = document.getElementById('cutting-nests');
const remainingPiecesDiv = document.getElementById('remaining-pieces');
const downloadOffcutsBtn = document.getElementById('download-offcuts-btn');
const acceptNestBtn = document.getElementById('accept-nest-btn');

// Event Listeners
addStockBtn.addEventListener('click', addStock);
addPieceBtn.addEventListener('click', addPiece);
optimizeBtn.addEventListener('click', optimizeCuttingNests);
downloadOffcutsBtn.addEventListener('click', downloadOffcutCSV);
acceptNestBtn.addEventListener('click', () => {
    const modal = document.getElementById('acceptNestModal');
    const instance = M.Modal.init(modal);
    instance.open();
});

// Function to process accepted nests
function acceptNest() {
    if (cuttingNests.length === 0) {
        M.toast({html: 'No nests to accept!', classes: 'rounded toast-warning', displayLength: 2000});
        return;
    }

    // Check for unlimited stock mode
    if (localStorage.getItem('useUnlimitedStock') === 'true') {
        M.toast({html: 'Cannot Accept Nest in Unlimited Stock Mode!', classes: 'rounded toast-error', displayLength: 2000});
        return;
    }

    // Track offcuts to add
    const offcutsToAdd = [];

    // Track used stock to remove
    const usedStock = [];

    // Process each nest
    cuttingNests.forEach(nest => {
        // Add used stock to removal list
        usedStock.push({
            profile: nest.profile,
            length: nest.stockLength,
            amount: 1
        });
        
        // Check if offcut already in list
        const existingOffcutIndex = offcutsToAdd.findIndex(
            item => item.profile === nest.profile && item.length === nest.offcut
        );
        
        if (existingOffcutIndex !== -1) {
            offcutsToAdd[existingOffcutIndex].amount += 1;
        } else if (nest.offcut > 0) {
            offcutsToAdd.push({
                profile: nest.profile,
                length: nest.offcut,
                amount: 1
            });
        }
    });

    // Remove used stock
    usedStock.forEach(used => {
        const existingStockIndex = stockItems.findIndex(
            item => item.profile === used.profile && item.length === used.length
        );
        
        if (existingStockIndex !== -1) {
            // Reduce the amount of the stock item
            stockItems[existingStockIndex].amount -= used.amount;
            
            // If amount becomes zero or negative, remove the stock item
            if (stockItems[existingStockIndex].amount <= 0) {
                stockItems.splice(existingStockIndex, 1);
            }
        }
    });

    // Add offcuts as new stock items
    offcutsToAdd.forEach(offcut => {
        const existingStockIndex = stockItems.findIndex(
            item => item.profile === offcut.profile && item.length === offcut.length
        );
        
        if (existingStockIndex !== -1) {
            // Update existing stock item
            stockItems[existingStockIndex].amount += offcut.amount;
        } else {
            // Add new stock item
            stockItems.push({
                profile: offcut.profile,
                length: offcut.length,
                amount: offcut.amount
            });
        }
    });

    // Update the stock table
    localStorage.setItem('stockItems', JSON.stringify(stockItems));
    renderStockTable();
}
  
// Function to programmatically set input value
function setInputValue(inputId, value) {
    const input = document.getElementById(inputId);
    input.value = value;
    
    M.updateTextFields();
}

// Nesting functions
function addStock() {
    const profile = document.getElementById('stock-profile').value.trim().replace(/(\d)\*(\d)/g, '$1X$2').replace(/\s+/g, '-');
    const length = parseFloat(document.getElementById('stock-length').value);
    const amount = parseInt(document.getElementById('stock-amount').value);

    if (!profile || isNaN(length) || isNaN(amount) || length <= 0 || amount <= 0) {
        M.toast({html: 'Please enter valid stock information!', classes: 'rounded toast-warning', displayLength: 2000});
        return;
    }

    const stockItem = { profile, length, amount };
    stockItems.push(stockItem);
    localStorage.setItem('stockItems', JSON.stringify(stockItems));
    renderStockTable();

    // Clear inputs
    document.getElementById('stock-profile').value = '';
    document.getElementById('stock-length').value = '12000';
    document.getElementById('stock-amount').value = '1';
}

function addPiece() {
    const profile = document.getElementById('piece-profile').value.trim().replace(/(\d)\*(\d)/g, '$1X$2').replace(/\s+/g, '-');
    const length = parseFloat(document.getElementById('piece-length').value);
    const amount = parseInt(document.getElementById('piece-amount').value);
    const label = document.getElementById('piece-label').value == '' ? length : document.getElementById('piece-label').value;
    const color = stringToColor(label);

    if (!profile || isNaN(length) || isNaN(amount) || length <= 0 || amount <= 0) {
        M.toast({html: 'Please enter valid piece information!', classes: 'rounded toast-warning', displayLength: 2000});
        return;
    }

    const pieceItem = { profile, length, amount, label, color, id: Date.now() };
    pieceItems.push(pieceItem);
    renderPieceTable();

    // Clear inputs
    document.getElementById('piece-profile').value = '';
    document.getElementById('piece-length').value = '';
    document.getElementById('piece-amount').value = '1';
    document.getElementById('piece-label').value = '';
}

function editStock(index) {
    // Get the stock item to edit
    const stockItem = stockItems[index];
    
    // First destroy existing select to prevent nesting
    const stockProfileSelect = document.getElementById('stock-profile');
    if (stockProfileSelect.M_FormSelect) {
        stockProfileSelect.M_FormSelect.destroy();
    }
    
    // Populate the form fields with current values
    stockProfileSelect.value = stockItem.profile;
    document.getElementById('stock-length').value = stockItem.length;
    document.getElementById('stock-amount').value = stockItem.amount;
    
    // Change the Add button to Update
    const addStockBtn = document.getElementById('add-stock');
    addStockBtn.innerHTML = '<i class="material-icons left hide-on-small-only">save</i><i class="material-icons hide-on-med-and-up">save</i><span class="hide-on-small-only">Update</span>';
    addStockBtn.classList.add('update-mode');
    
    // Create a cancel button if it doesn't exist
    let cancelBtn = document.getElementById('cancel-stock-edit');
    if (!cancelBtn) {
        cancelBtn = document.createElement('button');
        cancelBtn.id = 'cancel-stock-edit';
        cancelBtn.className = 'waves-effect waves-light btn amber';
        cancelBtn.innerHTML = '<i class="material-icons left hide-on-small-only">cancel</i><i class="material-icons hide-on-med-and-up">cancel</i><span class="hide-on-small-only">Cancel</span>';
        cancelBtn.onclick = cancelStockEdit;
        addStockBtn.parentNode.insertBefore(cancelBtn, addStockBtn.nextSibling);
    } else {
        cancelBtn.style.display = 'inline-block';
    }
    
    // Store the index being edited
    addStockBtn.dataset.editIndex = index;
    
    // Update the add event listener to handle updates
    addStockBtn.removeEventListener('click', addStock);
    addStockBtn.addEventListener('click', updateStock);
    M.updateTextFields();
}

function updateStock() {
    const profile = document.getElementById('stock-profile').value.trim().replace(/(\d)\*(\d)/g, '$1X$2').replace(/\s+/g, '-');
    const length = parseFloat(document.getElementById('stock-length').value);
    const amount = parseInt(document.getElementById('stock-amount').value);
    const editIndex = parseInt(document.getElementById('add-stock').dataset.editIndex);

    // Check if the stock item still exists
    if (editIndex >= stockItems.length) {
        M.toast({html: 'This stock item has been removed!', classes: 'rounded toast-error', displayLength: 2000});
        resetStockForm();
        return;
    }

    if (!profile || isNaN(length) || isNaN(amount) || length <= 0 || amount <= 0) {
        M.toast({html: 'Please enter valid stock information!', classes: 'rounded toast-warning', displayLength: 2000});
        return;
    }

    // Update the stock item
    stockItems[editIndex] = { profile, length, amount };
    
    // Reset the form and button
    resetStockForm();
    
    // Re-render the table
    localStorage.setItem('stockItems', JSON.stringify(stockItems));
    renderStockTable();
    
    M.toast({html: 'Stock updated successfully!', classes: 'rounded toast-success', displayLength: 2000});
}

function cancelStockEdit() {
    resetStockForm();
    M.toast({html: 'Edit cancelled', classes: 'rounded', displayLength: 1000});
}

function resetStockForm() {
    // First destroy existing select to prevent nesting
    const stockProfileSelect = document.getElementById('stock-profile');
    if (stockProfileSelect.M_FormSelect) {
        stockProfileSelect.M_FormSelect.destroy();
    }
    
    // Clear inputs
    stockProfileSelect.value = '';
    document.getElementById('stock-length').value = '12000';
    document.getElementById('stock-amount').value = '1';
    
    // Reset the button
    const addStockBtn = document.getElementById('add-stock');
    addStockBtn.innerHTML = '<i class="material-icons left">add</i>Add Stock';
    addStockBtn.classList.remove('update-mode');
    delete addStockBtn.dataset.editIndex;
    
    // Hide cancel button
    const cancelBtn = document.getElementById('cancel-stock-edit');
    if (cancelBtn) {
        cancelBtn.style.display = 'none';
    }
    
    // Reset event listener
    addStockBtn.removeEventListener('click', updateStock);
    addStockBtn.addEventListener('click', addStock);
}

function editPiece(index) {
    // Get the piece item to edit
    const pieceItem = pieceItems[index];
    
    // First destroy existing select to prevent nesting
    const pieceProfileSelect = document.getElementById('piece-profile');
    if (pieceProfileSelect.M_FormSelect) {
        pieceProfileSelect.M_FormSelect.destroy();
    }
    
    // Populate the form fields with current values
    pieceProfileSelect.value = pieceItem.profile;
    document.getElementById('piece-length').value = pieceItem.length;
    document.getElementById('piece-amount').value = pieceItem.amount;
    document.getElementById('piece-label').value = pieceItem.label;
    
    // Change the Add button to Update
    const addPieceBtn = document.getElementById('add-piece');
    addPieceBtn.innerHTML = '<i class="material-icons left">save</i>Update';
    addPieceBtn.classList.add('update-mode');
    
    // Create a cancel button if it doesn't exist
    let cancelBtn = document.getElementById('cancel-piece-edit');
    if (!cancelBtn) {
        cancelBtn = document.createElement('button');
        cancelBtn.id = 'cancel-piece-edit';
        cancelBtn.className = 'waves-effect waves-light btn amber';
        cancelBtn.innerHTML = '<i class="material-icons left">cancel</i>Cancel';
        cancelBtn.onclick = cancelPieceEdit;
        addPieceBtn.parentNode.insertBefore(cancelBtn, addPieceBtn.nextSibling);
    } else {
        cancelBtn.style.display = 'inline-block';
    }
    
    // Store the index being edited
    addPieceBtn.dataset.editIndex = index;
    
    // Update the add event listener to handle updates
    addPieceBtn.removeEventListener('click', addPiece);
    addPieceBtn.addEventListener('click', updatePiece);
    M.updateTextFields();
}

function updatePiece() {
    const profile = document.getElementById('piece-profile').value.trim().replace(/(\d)\*(\d)/g, '$1X$2').replace(/\s+/g, '-');
    const length = parseFloat(document.getElementById('piece-length').value);
    const amount = parseInt(document.getElementById('piece-amount').value);
    const label = document.getElementById('piece-label').value || length.toString();
    const editIndex = parseInt(document.getElementById('add-piece').dataset.editIndex);
    
    if (!profile || isNaN(length) || isNaN(amount) || length <= 0 || amount <= 0) {
        M.toast({html: 'Please enter valid piece information!', classes: 'rounded toast-warning', displayLength: 2000});
        return;
    }
    
    // Preserve the original ID and color, or generate new ones if editing affects the color
    const originalItem = pieceItems[editIndex];
    const color = label !== originalItem.label ? stringToColor(label) : originalItem.color;
    const id = originalItem.id; // Keep the original ID
    
    // Update the piece item
    pieceItems[editIndex] = { profile, length, amount, label, color, id };
    
    // Reset the form and button
    resetPieceForm();
    
    // Re-render the table
    renderPieceTable();
    
    M.toast({html: 'Piece updated successfully!', classes: 'rounded toast-success', displayLength: 2000});
}

function cancelPieceEdit() {
    resetPieceForm();
    M.toast({html: 'Edit cancelled', classes: 'rounded', displayLength: 2000});
}

function resetPieceForm() {
    // First destroy existing select to prevent nesting
    const pieceProfileSelect = document.getElementById('piece-profile');
    if (pieceProfileSelect.M_FormSelect) {
        pieceProfileSelect.M_FormSelect.destroy();
    }
    
    // Clear inputs
    pieceProfileSelect.value = '';
    document.getElementById('piece-length').value = '';
    document.getElementById('piece-amount').value = '1';
    document.getElementById('piece-label').value = '';
    
    // Reset the button
    const addPieceBtn = document.getElementById('add-piece');
    addPieceBtn.innerHTML = '<i class="material-icons left">add</i>Add Piece';
    addPieceBtn.classList.remove('update-mode');
    delete addPieceBtn.dataset.editIndex;
    
    // Hide cancel button
    const cancelBtn = document.getElementById('cancel-piece-edit');
    if (cancelBtn) {
        cancelBtn.style.display = 'none';
    }
    
    // Reset event listener
    addPieceBtn.removeEventListener('click', updatePiece);
    addPieceBtn.addEventListener('click', addPiece);
}

function stringToColor(str) {
    // FNV-1a 32-bit initialization
    let hash = 0x811c9dc5;

    // FNV-1a hash loop
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    // Ensure unsigned 32-bit
    hash >>>= 0;

    // Extract R, G, B from different byte lanes
    let r = (hash >>> 16) & 0xff;
    let g = (hash >>> 8) & 0xff;
    let b = hash & 0xff;

    // Scale down to 60-80% of original brightness for softer colors
    r = Math.floor(r * 0.7);
    g = Math.floor(g * 0.7);
    b = Math.floor(b * 0.7);

    // Convert to hex and pad
    const hex = x => x.toString(16).padStart(2, '0');

    return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function renderStockTable() {
    stockTable.innerHTML = '';

    stockItems.forEach((item, index) => {
        const row = stockTable.insertRow();
        row.innerHTML = `
            <td>${item.profile}</td>
            <td>${item.length}</td>
            <td>${item.amount}</td>
            <td>
                <button class="waves-effect waves-light btn deep-purple" onclick="editStock(${index})">
                    <i class="material-icons left hide-on-small-only">edit</i>
                    <i class="material-icons hide-on-med-and-up">edit</i>
                    <span class="hide-on-small-only">Edit</span>
                </button>
                <button class="waves-effect waves-light btn red" onclick="removeStock(${index})">
                    <i class="material-icons left hide-on-small-only">delete</i>
                    <i class="material-icons hide-on-med-and-up">delete</i>
                    <span class="hide-on-small-only">Remove</span>
                </button>
            </td>
        `;
    });
}

function renderPieceTable() {
    pieceTable.innerHTML = '';

    pieceItems.forEach((item, index) => {
        const row = pieceTable.insertRow();
        row.innerHTML = `
            <td>${item.profile}</td>
            <td>${item.length}</td>
            <td>${item.amount}</td>
            <td>${item.label}</td>
            <td style="background-color:${item.color}"></td>
            <td>
                <button class="waves-effect waves-light btn deep-purple" onclick="editPiece(${index})">
                    <i class="material-icons left hide-on-small-only">edit</i>
                    <i class="material-icons hide-on-med-and-up">edit</i>
                    <span class="hide-on-small-only">Edit</span>
                </button>
                <button class="waves-effect waves-light btn red" onclick="removePiece(${index})">
                    <i class="material-icons left hide-on-small-only">delete</i>
                    <i class="material-icons hide-on-med-and-up">delete</i>
                    <span class="hide-on-small-only">Remove</span>
                </button>
            </td>
        `;
    });
}

function removeStock(index) {
    stockItems.splice(index, 1);
    localStorage.setItem('stockItems', JSON.stringify(stockItems));
    renderStockTable();
}

function removePiece(index) {
    pieceItems.splice(index, 1);
    renderPieceTable();
}

document.addEventListener('DOMContentLoaded', function(){
    let gripStart = localStorage.getItem("gripStart") || 20;
    let gripEnd = localStorage.getItem("gripEnd") || 20;
    let sawWidth = localStorage.getItem("sawWidth") || 3;
    let preferShorterStocks = localStorage.getItem("preferShorterStocks") || false;
    let maxUniqueLabels = localStorage.getItem("maxUniqueLabels") || 999;
    let minOffcut = localStorage.getItem("minOffcut") || 1000;
    let useUnlimitedStock = localStorage.getItem("useUnlimitedStock") || false;
    let groupUniqueNests = localStorage.getItem("groupUniqueNests") || false;
    let unlimitedStockLength = localStorage.getItem("unlimitedStockLength") || 12000;

    document.getElementById('grip-start').value = gripStart;
    document.getElementById('grip-end').value = gripEnd;
    document.getElementById('saw-width').value = sawWidth;
    document.getElementById('shorter-length-preference').checked = preferShorterStocks == 'true';
    document.getElementById('max-unique-labels').value = maxUniqueLabels;
    document.getElementById('min-offcut').value = minOffcut;
    document.getElementById('unlimited-stock-preference').checked = useUnlimitedStock == 'true';
    document.getElementById('group-unique-nests').checked = groupUniqueNests == 'true';
    document.getElementById('unlimited-stock-length').value = unlimitedStockLength;
});

let cuttingNests = [];
let nestCounter;
function optimizeCuttingNests() {
    // Unlimited stock setting
    const useUnlimitedStock = document.getElementById('unlimited-stock-preference').checked;

    if (stockItems.length === 0 && !useUnlimitedStock) {
        M.toast({html: 'Please add stock items first!', classes: 'rounded toast-warning', displayLength: 2000});
        return;
    }
    if (pieceItems.length === 0) {
        M.toast({html: 'Please add piece items first!', classes: 'rounded toast-warning', displayLength: 2000});
        return;
    }

    const gripStart = (() => {
    const val = parseFloat(document.getElementById('grip-start').value);
        return isNaN(val) ? 0 : val;
    })();

    const gripEnd = (() => {
        const val = parseFloat(document.getElementById('grip-end').value);
        return isNaN(val) ? 0 : val;
    })();

    const sawWidth = (() => {
        const val = parseFloat(document.getElementById('saw-width').value);
        return isNaN(val) ? 0 : val;
    })();

    const preferShorterStocks = document.getElementById('shorter-length-preference').checked;

    const maxUniqueLabels = (() => {
        const val = parseInt(document.getElementById('max-unique-labels').value);
        return isNaN(val) ? 999 : val;
    })();

    const minOffcut = (() => {
        const val = parseInt(document.getElementById('min-offcut').value);
        return isNaN(val) ? 0 : val;
    })();

    nestCounter = (() => {
        const val = Number(document.getElementById('first-nest-number').value);
        return isNaN(val) ? 1 : val;
    })();

    const groupUniqueNests = document.getElementById('group-unique-nests').checked;

    const unlimitedStockLength = (() => {
        const val = parseFloat(document.getElementById('unlimited-stock-length').value);
        return isNaN(val) ? 12000 : val;
    })();

    localStorage.setItem("gripStart", gripStart);
    localStorage.setItem("gripEnd", gripEnd);
    localStorage.setItem("sawWidth", sawWidth);
    localStorage.setItem("preferShorterStocks", preferShorterStocks);
    localStorage.setItem("maxUniqueLabels", maxUniqueLabels);
    localStorage.setItem("minOffcut", minOffcut);
    localStorage.setItem("first-nest-number", nestCounter);
    localStorage.setItem("useUnlimitedStock", useUnlimitedStock);
    localStorage.setItem("groupUniqueNests", groupUniqueNests);
    localStorage.setItem("unlimitedStockLength", unlimitedStockLength);

    if(isNaN(nestCounter)) {
        M.toast({html: 'Please Enter Correct First Nest Number!', classes: 'rounded toast-warning', displayLength: 2000});
        return;
    }
    // If negative number is given by user reset it to 1
    if(nestCounter < 1) nestCounter = 1;

    // Clear previous nests
    cuttingNests = []

    // Group pieces by profile
    const profileGroups = {};
    pieceItems.forEach(piece => {
        if (!profileGroups[piece.profile]) {
            profileGroups[piece.profile] = [];
        }
        for (let i = 0; i < piece.amount; i++) {
            profileGroups[piece.profile].push({
                id: `${piece.id}-${i}`,
                parentID: piece.id,
                length: piece.length,
                originalPiece: piece,
                label: piece.label,
                color: piece.color,
                assigned: false
            });
        }
    });

    // Group stock by profile
    const stockGroups = {};
    
    if (useUnlimitedStock) {
        // Create unlimited stock for each profile that has pieces
        for (const profile in profileGroups) {
            stockGroups[profile] = [];
            // Start with a reasonable number of stock pieces, will generate more as needed
            for (let i = 0; i < 100; i++) {
                stockGroups[profile].push({
                    id: `unlimited-stock-${profile}-${i}`,
                    length: unlimitedStockLength,
                    originalStock: {
                        profile: profile,
                        length: unlimitedStockLength,
                        amount: 'unlimited'
                    },
                    usableLength: unlimitedStockLength - gripStart - gripEnd - (gripStart === 0 ? 0 : sawWidth),
                    remainingLength: unlimitedStockLength - gripStart - gripEnd - (gripStart === 0 ? 0 : sawWidth),
                    pieceAssignments: [],
                    offcut: 0,
                    waste: 0,
                    used: false,
                    hasLastPieceWithoutSaw: false,
                    isUnlimitedStock: true
                });
            }
        }
    } else {
        stockItems.forEach(stock => {
            if (!stockGroups[stock.profile]) {
                stockGroups[stock.profile] = [];
            }
            for (let i = 0; i < stock.amount; i++) {
                stockGroups[stock.profile].push({
                    id: `stock-${stock.profile}-${i}`,
                    length: stock.length,
                    originalStock: stock,
                    usableLength: stock.length - gripStart - gripEnd - (gripStart === 0 ? 0 : sawWidth),
                    remainingLength: stock.length - gripStart - gripEnd - (gripStart === 0 ? 0 : sawWidth),
                    pieceAssignments: [],
                    offcut: 0,
                    waste: 0,
                    used: false,
                    hasLastPieceWithoutSaw: false,
                    isUnlimitedStock: false
                });
            }
        });
    }

    for (const profile in profileGroups) {
        if (!stockGroups[profile]) {
            M.toast({html: `No available stock for profile: ${profile}!`, classes: 'rounded toast-warning', displayLength: 2000});
            continue;
        }

        const pieces = profileGroups[profile];
        const stocks = stockGroups[profile];
        
        // Reset assignment status
        pieces.forEach(p => p.assigned = false);
        stocks.forEach(s => {
            s.used = false;
            s.pieceAssignments = [];
            s.remainingLength = s.usableLength;
            s.hasLastPieceWithoutSaw = false;
        });

        // Sort stocks by length if preferShorterStocks is checked
        if (preferShorterStocks) {
            stocks.sort((a, b) => a.length - b.length);
        }

        if (useUnlimitedStock) {
            binPackingOptimizationWithUnlimitedStock(pieces, stocks, gripStart, gripEnd, sawWidth, maxUniqueLabels, profile, stockGroups, unlimitedStockLength);
        } else {
            binPackingOptimization(pieces, stocks, gripStart, gripEnd, sawWidth, maxUniqueLabels);
        }
        
        // Process results
        processStockResults(stocks, cuttingNests, gripStart, gripEnd, sawWidth);
    }

    renderCuttingNests(cuttingNests);
    cuttingNestsDiv.classList.remove('hide');
    downloadOffcutsBtn.classList.remove('hide');
    acceptNestBtn.classList.remove('hide');
    M.Tabs.init(document.querySelectorAll('#nesting-tabs')); // Initialize tabs
}

// Modified version of your binPackingOptimization that handles unlimited stock
function binPackingOptimizationWithUnlimitedStock(pieces, stocks, gripStart, gripEnd, sawWidth, maxUniqueLabels, profile, stockGroups, unlimitedStockLength) {
    // Sort pieces by length (decreasing)
    pieces.sort((a, b) => b.length - a.length);
    
    // Make a deep copy of pieces to work with
    const unassignedPieces = [...pieces];
    
    // Function to add more stock if needed
    function ensureStockAvailability() {
        const unusedStocks = stocks.filter(s => !s.used);
        // Add more stock when we're running low on unused stock
        if (unusedStocks.length < 5) {
            const currentCount = stocks.length;
            for (let i = 0; i < 20; i++) {
                const newStock = {
                    id: `unlimited-stock-${profile}-${currentCount + i}`,
                    length: unlimitedStockLength,
                    originalStock: {
                        profile: profile,
                        length: unlimitedStockLength,
                        amount: 'unlimited'
                    },
                    usableLength: unlimitedStockLength - gripStart - gripEnd - (gripStart === 0 ? 0 : sawWidth),
                    remainingLength: unlimitedStockLength - gripStart - gripEnd - (gripStart === 0 ? 0 : sawWidth),
                    pieceAssignments: [],
                    offcut: 0,
                    waste: 0,
                    used: false,
                    hasLastPieceWithoutSaw: false,
                    isUnlimitedStock: true
                };
                stocks.push(newStock);
            }
            stockGroups[profile] = stocks; // Update the reference
        }
    }
    
    // Bin packing with pattern generation
    while (unassignedPieces.length > 0) {
        // Ensure enough stock is available
        ensureStockAvailability();
        
        // Find an unused stock
        let currentStock = stocks.find(s => !s.used);
        if (!currentStock) {
            // This shouldn't happen with unlimited stock, but just in case
            ensureStockAvailability();
            currentStock = stocks.find(s => !s.used);
        }
        
        if (!currentStock) {
            M.toast({html: `Error: Could not create unlimited stock!`, classes: 'rounded toast-error', displayLength: 2000});
            break;
        }
        
        // Mark this stock as used
        currentStock.used = true;
        
        // Generate best pattern for this stock with unique label constraint
        const stockUsableLength = currentStock.usableLength;
        const bestPattern = findBestPatternForStock(unassignedPieces, stockUsableLength, sawWidth, maxUniqueLabels);
        
        if (bestPattern.pieces.length === 0) {
            // No pieces fit in this stock
            currentStock.used = false;
            M.toast({html: `Some pieces are too long for ${unlimitedStockLength}mm stock!`, classes: 'rounded toast-warning', displayLength: 2000});
            break;
        }
        
        // Assign pieces according to pattern
        let currentPos = gripStart;
        bestPattern.pieces.forEach((piece, index) => {
            // Find index in unassignedPieces array
            const pieceIndex = unassignedPieces.findIndex(p => 
                p.id === piece.id && !p.assigned
            );
            
            if (pieceIndex !== -1) {
                // Mark piece as assigned
                unassignedPieces[pieceIndex].assigned = true;
                
                // Add to stock's piece assignments
                currentStock.pieceAssignments.push({
                    piece: unassignedPieces[pieceIndex],
                    position: currentPos,
                    length: unassignedPieces[pieceIndex].length,
                    label: unassignedPieces[pieceIndex].label,
                    color: unassignedPieces[pieceIndex].color,
                    withoutSawWidth: piece.withoutSawWidth || false // Track if placed without saw width
                });
                
                // Update position for next piece
                currentPos += unassignedPieces[pieceIndex].length;
                
                // Add saw width only if this piece was placed with saw width
                if (index < bestPattern.pieces.length - 1 && !piece.withoutSawWidth) {
                    currentPos += sawWidth;
                }
                
                // Update flag if this is the last piece and it was placed without saw width
                if (index === bestPattern.pieces.length - 1 && piece.withoutSawWidth) {
                    currentStock.hasLastPieceWithoutSaw = true;
                }
                
                // Remove from unassigned pieces
                unassignedPieces.splice(pieceIndex, 1);
            }
        });
        
        // Update remaining length
        currentStock.remainingLength = currentStock.usableLength - 
            (currentPos - gripStart);
    }
}

function binPackingOptimization(pieces, stocks, gripStart, gripEnd, sawWidth, maxUniqueLabels) {
    // Sort pieces by length (decreasing)
    pieces.sort((a, b) => b.length - a.length);
    
    // Make a deep copy of pieces to work with
    const unassignedPieces = [...pieces];
    
    // Bin packing with pattern generation
    while (unassignedPieces.length > 0) {
        // Find an unused stock
        let currentStock = stocks.find(s => !s.used);
        if (!currentStock) {
            M.toast({html: `Not all pieces were nested!`, classes: 'rounded toast-warning', displayLength: 2000});
            break;
        }
        
        // Mark this stock as used
        currentStock.used = true;
        
        // Generate best pattern for this stock with unique label constraint
        const stockUsableLength = currentStock.usableLength;
        const bestPattern = findBestPatternForStock(unassignedPieces, stockUsableLength, sawWidth, maxUniqueLabels);
        
        if (bestPattern.pieces.length === 0) {
            // No pieces fit in this stock
            currentStock.used = false;
            break;
        }
        
        // Assign pieces according to pattern
        let currentPos = gripStart;
        bestPattern.pieces.forEach((piece, index) => {
            // Find index in unassignedPieces array
            const pieceIndex = unassignedPieces.findIndex(p => 
                p.id === piece.id && !p.assigned
            );
            
            if (pieceIndex !== -1) {
                // Mark piece as assigned
                unassignedPieces[pieceIndex].assigned = true;
                
                // Add to stock's piece assignments
                currentStock.pieceAssignments.push({
                    piece: unassignedPieces[pieceIndex],
                    position: currentPos,
                    length: unassignedPieces[pieceIndex].length,
                    label: unassignedPieces[pieceIndex].label,
                    color: unassignedPieces[pieceIndex].color,
                    withoutSawWidth: piece.withoutSawWidth || false // Track if placed without saw width
                });
                
                // Update position for next piece
                currentPos += unassignedPieces[pieceIndex].length;
                
                // Add saw width only if this piece was placed with saw width
                if (index < bestPattern.pieces.length - 1 && !piece.withoutSawWidth) {
                    currentPos += sawWidth;
                }
                
                // Update flag if this is the last piece and it was placed without saw width
                if (index === bestPattern.pieces.length - 1 && piece.withoutSawWidth) {
                    currentStock.hasLastPieceWithoutSaw = true;
                }
                
                // Remove from unassigned pieces
                unassignedPieces.splice(pieceIndex, 1);
            }
        });
        
        // Update remaining length
        currentStock.remainingLength = currentStock.usableLength - (currentPos - gripStart);
    }
}

function findBestPatternForStock(pieces, stockLength, sawWidth, maxUniqueLabels) {
    // Generate all valid combinations of pieces that fit within the stock
    const validPatterns = generateAllValidPatterns(pieces, stockLength, sawWidth, maxUniqueLabels);
    
    if (validPatterns.length === 0) {
        return { pieces: [], waste: stockLength };
    }
    
    // Find pattern with minimum waste (best utilization)
    validPatterns.sort((a, b) => a.waste - b.waste);
    return validPatterns[0];
}

function generateAllValidPatterns(pieces, stockLength, sawWidth, maxUniqueLabels, maxPatterns = 1000) {
    const patterns = [];
    
    // Generate patterns using backtracking
    function backtrack(start, currentPattern, remainingLength, uniqueLabels) {
        // Check if we have a valid pattern
        if (currentPattern.length > 0) {
            // Calculate waste
            const usedLength = currentPattern.reduce((sum, p, idx) => {
                // Add piece length
                let total = sum + p.length;
                // Add saw width only if not the last piece or if it's not marked as withoutSawWidth
                if (idx < currentPattern.length - 1 && !p.withoutSawWidth) {
                    total += sawWidth;
                }
                return total;
            }, 0);
            
            const waste = stockLength - usedLength;
            
            // Add this pattern to our collection
            patterns.push({
                pieces: [...currentPattern],
                waste: waste,
                utilization: (usedLength / stockLength) * 100
            });
            
            // Limit pattern generation for performance
            if (patterns.length >= maxPatterns) {
                return;
            }
        }
        
        // Try adding more pieces
        for (let i = start; i < pieces.length; i++) {
            const piece = pieces[i];
            
            // Check if adding this piece would exceed the unique labels constraint
            const newLabel = piece.label;
            if (!uniqueLabels.has(newLabel) && uniqueLabels.size >= maxUniqueLabels) {
                continue; // Skip this piece if it would exceed the max unique labels
            }
            
            // Try fitting with saw width first
            const additionalLengthWithSaw = piece.length + sawWidth;
            
            if (additionalLengthWithSaw <= remainingLength) {
                // Add piece to current pattern (with saw width)
                const pieceWithSaw = { ...piece, withoutSawWidth: false };
                currentPattern.push(pieceWithSaw);
                
                // Update unique labels
                const updatedUniqueLabels = new Set(uniqueLabels);
                updatedUniqueLabels.add(newLabel);
                
                // Recursive call with remaining length
                backtrack(i + 1, currentPattern, remainingLength - additionalLengthWithSaw, updatedUniqueLabels);
                
                // Backtrack
                currentPattern.pop();
            } 
            // If it doesn't fit with saw width, try without saw width
            else if (piece.length <= remainingLength) {
                // Add piece to current pattern (without saw width)
                const pieceWithoutSaw = { ...piece, withoutSawWidth: true };
                currentPattern.push(pieceWithoutSaw);
                
                // Update unique labels
                const updatedUniqueLabels = new Set(uniqueLabels);
                updatedUniqueLabels.add(newLabel);
                
                const usedLength = currentPattern.reduce((sum, p, idx) => {
                    let total = sum + p.length;
                    if (idx < currentPattern.length - 1 && !p.withoutSawWidth) {
                        total += sawWidth;
                    }
                    return total;
                }, 0);
                
                const waste = stockLength - usedLength;
                
                patterns.push({
                    pieces: [...currentPattern],
                    waste: waste,
                    utilization: (usedLength / stockLength) * 100
                });
                
                // Backtrack
                currentPattern.pop();
            }
        }
    }
    
    // Start backtracking with empty pattern and empty set of unique labels
    backtrack(0, [], stockLength, new Set());
    
    // Prioritize patterns with more pieces and less waste
    return patterns.sort((a, b) => {
        // First prioritize by piece count (more pieces)
        const pieceDiff = b.pieces.length - a.pieces.length;
        if (pieceDiff !== 0) return pieceDiff;
        
        // Then by waste (less waste)
        return a.waste - b.waste;
    });
}

function processStockResults(stocks, cuttingNests, gripStart, gripEnd, sawWidth) {
    stocks.forEach(stock => {
        if (stock.used && stock.pieceAssignments.length > 0) {
            // Calculate total used length
            let usedLength = 0;
            let sawCuts = gripStart === 0 ? 0 : 1;
            
            stock.pieceAssignments.forEach((assignment, index) => {
                usedLength += assignment.length;
                // Count saw cuts (all pieces except the last one, unless last one is without saw width)
                if (index < stock.pieceAssignments.length && !assignment.withoutSawWidth) {
                    sawCuts++;
                }
            });
            
            // Calculate waste and offcut
            let totalWaste = sawCuts * sawWidth + gripStart + gripEnd;
            let offcut = stock.length - usedLength - totalWaste;
            const minOffcut = parseInt(document.getElementById('min-offcut').value);
            if (offcut < minOffcut) {
                totalWaste += offcut; // Add offcut to waste if it's less than minOffcut
                offcut = 0; // If offcut is less than minOffcut, set to 0
            }
            
            cuttingNests.push({
                profile: stock.originalStock.profile,
                stockLength: stock.length,
                gripStart: gripStart,
                gripEnd: gripEnd,
                sawWidth: sawWidth,
                pieceAssignments: stock.pieceAssignments,
                offcut: offcut,
                waste: totalWaste,
                hasLastPieceWithoutSaw: stock.hasLastPieceWithoutSaw
            });
        }
    });
}

// Render the nesting results
function renderCuttingNests(nests) {
    cuttingNestsDiv.innerHTML = '';
    const fragment = document.createDocumentFragment();
    let remaining = pieceItems.map(i => ({ ...i }));
    
    // Get unique nests with their counts
    const uniqueNests = getUniqueNests(nests);
    
    // Group unique nests by profile
    const nestsByProfile = {};
    uniqueNests.forEach(uniqueNest => {
        const profile = uniqueNest.nest.profile;
        if (!nestsByProfile[profile]) {
            nestsByProfile[profile] = [];
        }
        nestsByProfile[profile].push(uniqueNest);
    });
    
    const firstNestNumber = Number(document.getElementById('first-nest-number').value) || 1;
  
    const createElem = (tag, className, html = '') => {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (html) el.innerHTML = html;
        return el;
    };
  
    const updateRemaining = parentID => {
        const idx = remaining.findIndex(i => i.id === parentID);
        if (idx === -1) return;
        remaining[idx].amount--;
        if (remaining[idx].amount <= 0) remaining.splice(idx, 1);
    };
  
    const recordUsage = (summary, { label, length, color, profile, parentID }) => {
        if (!summary[label]) summary[label] = { count: 0, length, color, profile };
        summary[label].count++;
    };
  
    const buildStatsRow = (label, value, unit = '') =>
        `<div class="stat col s3"><span class="stat-label">${label}:</span> <span class="stat-value">${value.toFixed(2)}${unit}</span></div>`;
  
    const buildNestHeader = (pattern, nestNumber, count = 1) => {
        const header = createElem('div', 'nest-header');
        const title = createElem('h5', 'card-title');
        title.textContent = `Nest #${nestNumber} ${count > 1 ? `(Qty: ${count})` : '(Qty: 1)'}`;
        
        const stats = createElem('div', 'row nest-stats card-panel');
        stats.innerHTML = `
            ${buildStatsRow('Stock', pattern.stockLength, ' mm')}
            ${buildStatsRow('Offcut', Math.round(pattern.offcut), ' mm')}
            ${buildStatsRow('Waste', Math.round(pattern.waste), ' mm')}
            ${buildStatsRow('Pieces', pattern.pieceAssignments.length)}
        `;
        
        header.appendChild(title);
        header.appendChild(stats);
        return header;
    };
  
    const buildUsageList = summary => {
        const container = createElem('div', 'pieces-summary');
        const title = createElem('h6', '');
        title.textContent = 'Pieces Used';
        container.appendChild(title);
        
        const list = createElem('div', 'pieces-list row');
        Object.values(summary).forEach(item => {
            const node = createElem('div', 'piece-item col s4 m3 l2');
            node.innerHTML = `
                <div class="chip" style="background-color:${item.color}">
                    <span class="white-text">${item.count}×${item.length} mm</span>
                </div>
            `;
            list.appendChild(node);
        });
        container.appendChild(list);
        return container;
    };

    // Create responsive DOM-based visualization
    const createResponsiveNest = pattern => {
        const container = createElem('div', 'bar-container');
        const stockBar = createElem('div', 'stock-bar');
        
        const total = pattern.stockLength;
        
        // Add grip start
        if (pattern.gripStart > 0) {
            const gripStart = createElem('div', 'grip-segment');
            gripStart.style.left = '0';
            gripStart.style.width = `${(pattern.gripStart / total * 100)}%`;
            gripStart.setAttribute('data-tooltip', `Grip Start: ${pattern.gripStart}mm`);
            gripStart.classList.add('tooltipped');
            if (pattern.gripStart / total > 0.03) {
                gripStart.textContent = `${pattern.gripStart}`;
            }
            stockBar.appendChild(gripStart);
        }
        
        // Add grip end
        if (pattern.gripEnd > 0) {
            const gripEnd = createElem('div', 'grip-segment');
            gripEnd.style.right = '0';
            gripEnd.style.width = `${(pattern.gripEnd / total * 100)}%`;
            gripEnd.setAttribute('data-tooltip', `Grip End: ${pattern.gripEnd}mm`);
            gripEnd.classList.add('tooltipped');
            if (pattern.gripEnd / total > 0.03) {
                gripEnd.textContent = `${pattern.gripEnd}`;
            }
            stockBar.appendChild(gripEnd);
        }
        
        // Track position for pieces and saw cuts
        let cursor = pattern.gripStart;
        
        // Add pieces and saw cuts
        pattern.pieceAssignments.forEach((assign, i) => {
            const pieceWidth = assign.piece.length / total * 100;
            
            // Add saw cut
            if (i == 0 && pattern.sawWidth > 0 && pattern.gripStart != 0) {
                if (pattern.pieceAssignments[i].withoutSawWidth) return;
                const sawCut = createElem('div', 'saw-cut-segment');
                sawCut.style.left = `${(cursor / total * 100)}%`;
                sawCut.style.width = `${(pattern.sawWidth / total * 100)}%`;
                sawCut.setAttribute('data-tooltip', `Saw Cut: ${pattern.sawWidth}mm`);
                sawCut.classList.add('tooltipped');
                stockBar.appendChild(sawCut);
                cursor += pattern.sawWidth;
            }

            // Create piece segment
            const pieceSegment = createElem('div', 'piece-segment');
            pieceSegment.style.left = `${(cursor / total * 100)}%`;
            pieceSegment.style.width = `${pieceWidth}%`;
            pieceSegment.style.backgroundColor = assign.piece.color;
            pieceSegment.setAttribute('data-tooltip', `${assign.piece.label}: ${assign.piece.length}mm`);
            pieceSegment.classList.add('tooltipped');
            
            if (pieceWidth > 5) {
                pieceSegment.textContent = assign.piece.label;
            }
            
            stockBar.appendChild(pieceSegment);
            cursor += assign.piece.length;
            
            // Add saw cut
            if (i < pattern.pieceAssignments.length && pattern.sawWidth > 0) {
                if (pattern.pieceAssignments[i].withoutSawWidth) return;
                const sawCut = createElem('div', 'saw-cut-segment');
                sawCut.style.left = `${(cursor / total * 100)}%`;
                sawCut.style.width = `${(pattern.sawWidth / total * 100)}%`;
                sawCut.setAttribute('data-tooltip', `Saw Cut: ${pattern.sawWidth}mm`);
                sawCut.classList.add('tooltipped');
                stockBar.appendChild(sawCut);
                cursor += pattern.sawWidth;
            }
        });
        
        // Add offcut if present
        if (pattern.offcut > 0) {
            const offcutSegment = createElem('div', 'offcut-segment');
            offcutSegment.style.left = `${(cursor / total * 100)}%`;
            offcutSegment.style.width = `${(pattern.offcut / total * 100)}%`;
            offcutSegment.setAttribute('data-tooltip', `Offcut: ${Math.round(pattern.offcut)}mm`);
            offcutSegment.classList.add('tooltipped');
            if (pattern.offcut / total > 0.03) {
                offcutSegment.textContent = `${Math.round(pattern.offcut)}`;
            }
            stockBar.appendChild(offcutSegment);
        }
        
        container.appendChild(stockBar);
        return container;
    };

    // Create Tab Structure
    const tabsContainer = createElem('div', 'nesting-tabs-container');
    const tabsUl = createElem('ul', 'tabs nesting-tabs');
    tabsUl.id = 'nesting-tabs';
    const tabContentContainer = createElem('div', 'tab-content-container');
    
    // Create General Results tab
    const generalTabId = 'general-results-tab';
    const generalTabLi = createElem('li', 'tab');
    const generalTabLink = createElem('a', 'active deep-purple-text');
    generalTabLink.href = `#${generalTabId}`;
    generalTabLink.textContent = 'General Results';
    generalTabLi.appendChild(generalTabLink);
    tabsUl.appendChild(generalTabLi);
    
    // Create tabs for each profile
    Object.keys(nestsByProfile).forEach(profile => {
        const profileTabId = `profile-${profile.trim().replace(/(\d)\*(\d)/g, '$1X$2').replace(/\s+/g, '-').toLowerCase()}`;
        const profileTabLi = createElem('li', 'tab');
        const profileTabLink = createElem('a', 'deep-purple-text');
        profileTabLink.href = `#${profileTabId}`;
        profileTabLink.textContent = profile;
        profileTabLi.appendChild(profileTabLink);
        tabsUl.appendChild(profileTabLi);
    });
    
    // Calculate overall statistics using unique nests
    let totalStockUsed = 0;
    let totalPieceLength = 0;
    let totalStockLength = 0;
    let totalOffcut = 0;
    let totalWaste = 0;
    
    uniqueNests.forEach(uniqueNest => {
        const count = uniqueNest.count;
        const nest = uniqueNest.nest;
        
        totalStockUsed += count;
        totalStockLength += nest.stockLength * count;
        totalOffcut += nest.offcut * count;
        totalWaste += nest.waste * count;
        
        nest.pieceAssignments.forEach(p => {
            totalPieceLength += p.piece.length * count;
            // Update remaining pieces based on unique nest counts
            for (let j = 0; j < count; j++) {
                updateRemaining(p.piece.parentID);
            }
        });
    });
    
    const materialEfficiency = totalStockLength > 0 ? ((totalPieceLength / totalStockLength) * 100).toFixed(2) : 0;
    
    // Group remaining pieces by profile
    const remainingByProfile = {};
    remaining.forEach(piece => {
        if (!remainingByProfile[piece.profile]) {
            remainingByProfile[piece.profile] = [];
        }
        remainingByProfile[piece.profile].push(piece);
    });
    
    // Add Remaining Pieces tab
    if (remaining.length > 0) {
        const remainingTabId = 'remaining-pieces-tab';
        const remainingTabLi = createElem('li', 'tab');
        const remainingTabLink = createElem('a', 'deep-purple-text');
        remainingTabLink.href = `#${remainingTabId}`;
        remainingTabLink.textContent = 'Remaining Pieces';
        remainingTabLi.appendChild(remainingTabLink);
        tabsUl.appendChild(remainingTabLi);
    }
    
    tabsContainer.appendChild(tabsUl);
    tabsContainer.appendChild(tabContentContainer);
    
    // Create General Results tab content
    const generalTabContent = createElem('div', 'tab-content');
    generalTabContent.id = generalTabId;
    
    const generalCard = createElem('div', 'card');
    const generalCardContent = createElem('div', 'card-content');
    const generalTitle = createElem('span', 'card-title');
    generalTitle.textContent = 'General Results';
    generalCardContent.appendChild(generalTitle);
    
    // General statistics
    const generalStats = createElem('div', 'card-panel blue-grey lighten-5');
    generalStats.innerHTML = `
        <div class="row">
            <div class="col s12 m3">
                <p>Total Stocks Used: <strong>${totalStockUsed}</strong></p>
            </div>
            <div class="col s12 m3">
                <p>Material Efficiency: <strong>${materialEfficiency}%</strong></p>
            </div>
            <div class="col s12 m3">
                <p>Total Offcut: <strong>${Math.round(totalOffcut)}</strong>mm</p>
            </div>
            <div class="col s12 m3">
                <p>Total Waste: <strong>${Math.round(totalWaste)}</strong>mm</p>
            </div>
        </div>
    `;
    generalCardContent.appendChild(generalStats);
    
    // Profile breakdown
    const profileBreakdown = createElem('div', 'profile-breakdown');
    const breakdownTitle = createElem('h6', '');
    breakdownTitle.textContent = 'Profile Breakdown';
    profileBreakdown.appendChild(breakdownTitle);
    
    const breakdownList = createElem('ul', 'collection');
    Object.entries(nestsByProfile).forEach(([profile, profileUniqueNests]) => {
        const profileStats = profileUniqueNests.reduce((acc, uniqueNest) => {
            const count = uniqueNest.count;
            const nest = uniqueNest.nest;
            
            acc.stocks += count;
            acc.stockLength += nest.stockLength * count;
            acc.pieceLength += nest.pieceAssignments.reduce((sum, p) => sum + p.piece.length, 0) * count;
            acc.offcut += nest.offcut * count;
            acc.waste += nest.waste * count;
            acc.pieces += nest.pieceAssignments.length * count;
            acc.uniquePatterns += 1;
            return acc;
        }, { stocks: 0, stockLength: 0, pieceLength: 0, offcut: 0, waste: 0, pieces: 0, uniquePatterns: 0 });
        
        const profileEfficiency = ((profileStats.pieceLength / profileStats.stockLength) * 100).toFixed(2);
        
        const listItem = createElem('li', 'collection-item');
        listItem.innerHTML = `
            <div class="row">
                <div class="col s12 l2"><strong>${profile}</strong></div>
                <div class="col s6 l1">Stocks: ${profileStats.stocks}</div>
                <div class="col s6 l1">Patterns: ${profileStats.uniquePatterns}</div>
                <div class="col s6 l2">Pieces: ${profileStats.pieces}</div>
                <div class="col s6 l2">Efficiency: ${profileEfficiency}%</div>
                <div class="col s6 l2">Offcut: ${Math.round(profileStats.offcut)}mm</div>
                <div class="col s6 l2">Waste: ${Math.round(profileStats.waste)}mm</div>
            </div>
        `;
        breakdownList.appendChild(listItem);
    });
    
    profileBreakdown.appendChild(breakdownList);
    generalCardContent.appendChild(profileBreakdown);
    generalCard.appendChild(generalCardContent);
    generalTabContent.appendChild(generalCard);
    tabContentContainer.appendChild(generalTabContent);
    
    // Create profile-specific tabs
    let nestCounter = firstNestNumber;
    Object.entries(nestsByProfile).forEach(([profile, profileUniqueNests]) => {
        const profileTabId = `profile-${profile.trim().replace(/(\d)\*(\d)/g, '$1X$2').replace(/\s+/g, '-').toLowerCase()}`;
        const profileTabContent = createElem('div', 'tab-content');
        profileTabContent.id = profileTabId;
        
        // Profile summary card
        const profileCard = createElem('div', 'card');
        const profileCardContent = createElem('div', 'card-content');
        const profileTitle = createElem('span', 'card-title');
        profileTitle.textContent = `Profile: ${profile} - Cutting Nests`;
        profileCardContent.appendChild(profileTitle);
        
        // Profile statistics
        const profileStats = profileUniqueNests.reduce((acc, uniqueNest) => {
            const count = uniqueNest.count;
            const nest = uniqueNest.nest;
            
            acc.totalStocks += count;
            acc.stockLength += nest.stockLength * count;
            acc.pieceLength += nest.pieceAssignments.reduce((sum, p) => sum + p.piece.length, 0) * count;
            acc.offcut += nest.offcut * count;
            acc.waste += nest.waste * count;
            acc.pieces += nest.pieceAssignments.length * count;
            acc.uniquePatterns += 1;
            return acc;
        }, { totalStocks: 0, stockLength: 0, pieceLength: 0, offcut: 0, waste: 0, pieces: 0, uniquePatterns: 0 });
        
        const profileEfficiency = ((profileStats.pieceLength / profileStats.stockLength) * 100).toFixed(2);
        
        const profileStatsDiv = createElem('div', 'card-panel blue-grey lighten-5');
        profileStatsDiv.innerHTML = `
            <div class="row">
                <div class="col s12 m6 l3">
                    <p>Total Stocks: <strong>${profileStats.totalStocks}</strong></p>
                </div>
                <div class="col s12 m6 l3">
                    <p>Unique Patterns: <strong>${profileStats.uniquePatterns}</strong></p>
                </div>
                <div class="col s12 m6 l3">
                    <p>Efficiency: <strong>${profileEfficiency}%</strong></p>
                </div>
                <div class="col s12 m6 l3">
                    <p>Total Pieces: <strong>${profileStats.pieces}</strong></p>
                </div>
            </div>
            <div class="row">
                <div class="col s12 m6">
                    <p>Total Offcut: <strong>${Math.round(profileStats.offcut)}</strong>mm</p>
                </div>
                <div class="col s12 m6">
                    <p>Total Waste: <strong>${Math.round(profileStats.waste)}</strong>mm</p>
                </div>
            </div>
        `;
        profileCardContent.appendChild(profileStatsDiv);
        
        // Individual nests for this profile
        profileUniqueNests.forEach(uniqueNest => {
            const nest = uniqueNest.nest;
            const count = uniqueNest.count;
            
            const nestCard = createElem('div', 'nest-card card');
            const nestCardContent = createElem('div', 'card-content');
            
            nestCardContent.appendChild(buildNestHeader(nest, nestCounter, count));
            
            // Pieces summary for this nest
            const nestUsage = {};
            nest.pieceAssignments.forEach(a => {
                recordUsage(nestUsage, { 
                    ...a.piece, 
                    profile: a.piece.originalPiece ? a.piece.originalPiece.profile : profile, 
                    parentID: a.piece.parentID 
                });
            });
            nestCardContent.appendChild(buildUsageList(nestUsage));
            
            // Add responsive nest visualization
            nestCardContent.appendChild(createResponsiveNest(nest));
            
            nestCard.appendChild(nestCardContent);
            profileCardContent.appendChild(nestCard);
            
            nestCounter++;
        });
        
        profileCard.appendChild(profileCardContent);
        profileTabContent.appendChild(profileCard);
        tabContentContainer.appendChild(profileTabContent);
    });
    
    // Create Remaining Pieces tab content
    if (remaining.length > 0) {
        const remainingTabContent = createElem('div', 'tab-content');
        remainingTabContent.id = 'remaining-pieces-tab';
        
        const remainingCard = createElem('div', 'card');
        const remainingCardContent = createElem('div', 'card-content');
        const remainingTitle = createElem('span', 'card-title');
        remainingTitle.textContent = 'Remaining Pieces';
        remainingCardContent.appendChild(remainingTitle);
        
        // Overall remaining pieces summary
        const totalRemainingPieces = remaining.reduce((sum, piece) => sum + piece.amount, 0);
        const totalRemainingLength = remaining.reduce((sum, piece) => sum + (piece.length * piece.amount), 0);
        
        const remainingSummary = createElem('div', 'card-panel blue-grey lighten-5');
        remainingSummary.innerHTML = `
            <div class="row">
                <div class="col s12 m4">
                    <p>Total Remaining Pieces: <strong>${totalRemainingPieces}</strong></p>
                </div>
                <div class="col s12 m4">
                    <p>Total Remaining Length: <strong>${Math.round(totalRemainingLength)}</strong>mm</p>
                </div>
                <div class="col s12 m4">
                    <p>Profiles with Remaining Pieces: <strong>${Object.keys(remainingByProfile).length}</strong></p>
                </div>
            </div>
        `;
        remainingCardContent.appendChild(remainingSummary);
        
        // Group remaining pieces by profile
        Object.entries(remainingByProfile).forEach(([profile, profilePieces]) => {
            const profileRemainingCard = createElem('div', 'card');
            const profileRemainingContent = createElem('div', 'card-content');
            
            const profileRemainingTitle = createElem('h6', '');
            profileRemainingTitle.textContent = `Profile: ${profile} - Remaining Pieces`;
            profileRemainingContent.appendChild(profileRemainingTitle);
            
            // Profile remaining statistics
            const profileTotalPieces = profilePieces.reduce((sum, piece) => sum + piece.amount, 0);
            const profileTotalLength = profilePieces.reduce((sum, piece) => sum + (piece.length * piece.amount), 0);
            
            const profileRemainingStats = createElem('div', 'card-panel');
            profileRemainingStats.innerHTML = `
                <div class="row">
                    <div class="col s12 m6">
                        <p>Pieces: <strong>${profileTotalPieces}</strong></p>
                    </div>
                    <div class="col s12 m6">
                        <p>Total Length: <strong>${Math.round(profileTotalLength)}</strong>mm</p>
                    </div>
                </div>
            `;
            profileRemainingContent.appendChild(profileRemainingStats);
            
            // List of remaining pieces
            const remainingPiecesList = createElem('div', 'remaining-pieces-list');
            const remainingPiecesTitle = createElem('h6', '');
            remainingPiecesTitle.textContent = 'Piece Details';
            remainingPiecesList.appendChild(remainingPiecesTitle);
            
            const remainingTable = createElem('table', 'striped');
            const tableHeader = createElem('thead', '');
            tableHeader.innerHTML = `
                <tr>
                    <th>Label</th>
                    <th>Length (mm)</th>
                    <th>Quantity</th>
                    <th>Total Length (mm)</th>
                </tr>
            `;
            remainingTable.appendChild(tableHeader);
            
            const tableBody = createElem('tbody', '');
            profilePieces.forEach(piece => {
                const row = createElem('tr', '');
                row.innerHTML = `
                    <td>
                        <div class="chip" style="background-color:${piece.color}">
                            <span class="white-text">${piece.label}</span>
                        </div>
                    </td>
                    <td>${piece.length}</td>
                    <td>${piece.amount}</td>
                    <td>${piece.length * piece.amount}</td>
                `;
                tableBody.appendChild(row);
            });
            remainingTable.appendChild(tableBody);
            
            remainingPiecesList.appendChild(remainingTable);
            profileRemainingContent.appendChild(remainingPiecesList);
            
            profileRemainingCard.appendChild(profileRemainingContent);
            remainingCardContent.appendChild(profileRemainingCard);
        });
        
        remainingCard.appendChild(remainingCardContent);
        remainingTabContent.appendChild(remainingCard);
        tabContentContainer.appendChild(remainingTabContent);
    }
    
    // Update first nest number for next nest
    document.getElementById('first-nest-number').value = nestCounter;
    localStorage.setItem("first-nest-number", nestCounter);
    
    // Add export button
    const exportButtonContainer = createElem('div', 'export-button-container center-align');
    const exportButton = createElem('a', 'waves-effect waves-light btn-large deep-purple');
    exportButton.innerHTML = '<i class="material-icons left">file_download</i>Export to PDF';
    exportButton.onclick = () => generatePDF(uniqueNests);

    // Create a custom checkbox container that won't be affected by Materialize
    const checkboxContainer = createElem('div', 'custom-checkbox-container');

    // Create a standard HTML checkbox (not using Materialize's styling)
    const checkboxInput = document.createElement('input');
    checkboxInput.type = 'checkbox';
    checkboxInput.id = 'remove-nesting-color';

    // Create a label for the checkbox
    const checkboxLabel = document.createElement('label');
    checkboxLabel.htmlFor = 'remove-nesting-color';
    checkboxLabel.textContent = 'Remove nesting color';
    checkboxLabel.style.color = 'black';

    // Assemble the checkbox and label
    checkboxContainer.appendChild(checkboxInput);
    checkboxContainer.appendChild(checkboxLabel);

    // Add elements to the container
    exportButtonContainer.appendChild(checkboxContainer);
    exportButtonContainer.appendChild(document.createElement('br')); // Add spacing
    exportButtonContainer.appendChild(exportButton);
    
    // Append all to fragment
    fragment.appendChild(tabsContainer);
    fragment.appendChild(exportButtonContainer);
    
    // Append fragment to container
    cuttingNestsDiv.appendChild(fragment);
    
    // Initialize Materialize tabs and tooltips
    M.Tabs.init(document.getElementById('nesting-tabs'), {});
    M.Tooltip.init(document.querySelectorAll('.tooltipped'), {});
}

// Function to generate PDF from the nesting data
function generatePDF(uniqueNests) {
    // Get the jsPDF constructor from the window.jspdf object
    const { jsPDF } = window.jspdf;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);
    
    // Add title
    doc.setFontSize(18);
    doc.text('Nesting Report', margin, margin + 10);
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, margin + 20);
    doc.line(margin, margin + 25, pageWidth - margin, margin + 25);
    
    let yPosition = margin + 35;
    
    // Add summary section
    doc.setFontSize(16);
    doc.text('Nesting Summary', margin, yPosition);
    yPosition += 10;
    
    // Summary table using unique nests
    doc.setFontSize(10);
    const summaryHeaders = ['Nest #', 'Profile', 'Stock Length', 'Nested Pieces', 'Offcut', 'Waste', 'Qty'];
    const summaryData = uniqueNests.map((uniqueNest, i) => [
      `${nestCounter + i}`,
      uniqueNest.nest.profile,
      `${uniqueNest.nest.stockLength} mm`,
      uniqueNest.nest.pieceAssignments.length.toString(),
      `${Math.round(uniqueNest.nest.offcut)} mm`,
      `${Math.round(uniqueNest.nest.waste)} mm`,
      uniqueNest.count.toString()
    ]);
    
    // Create summary table
    doc.autoTable({
      head: [summaryHeaders],
      body: summaryData,
      startY: yPosition,
      margin: { left: margin, right: margin },
      tableWidth: contentWidth
    });
    
    yPosition = doc.lastAutoTable.finalY + 15;
    
    // Add a new page for nests
    doc.addPage();
    yPosition = margin + 10;
    
    // Group unique nests by profile
    const nestsByProfile = {};
    uniqueNests.forEach((uniqueNest, idx) => {
        const profile = uniqueNest.nest.profile;
        if (!nestsByProfile[profile]) nestsByProfile[profile] = [];

        nestsByProfile[profile].push({
            ...uniqueNest,
            originalIndex: idx
        });
    });

    // Add each profile group
    Object.keys(nestsByProfile).forEach(profile => {
    const profileNests = nestsByProfile[profile];
    
    // Check if we need a new page for profile header
    if (yPosition > pageHeight - 90) {
        doc.addPage();
        yPosition = margin + 10;
    }
    
    // Add profile section header
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(`Profile: ${profile}`, margin, yPosition);
    yPosition += 12;
    
    // Add profile summary
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const totalNests = profileNests.reduce((sum, nest) => sum + nest.count, 0);
    const totalPieces = profileNests.reduce((sum, nest) => sum + (nest.nest.pieceAssignments.length * nest.count), 0);
    doc.text(`Total Nests: ${totalNests} | Total Pieces: ${totalPieces}`, margin, yPosition);
    yPosition += 15;
    
    // Add each nest in this profile
    profileNests.forEach((uniqueNest, profileIdx) => {
        const pat = uniqueNest.nest;
        const count = uniqueNest.count;
        
        // Check if we need a new page
        if (yPosition > pageHeight - 70) {
        doc.addPage();
        yPosition = margin + 10;
        }
        
        // Add nest title with quantity
        doc.setFontSize(14);
        doc.text(`Nest #${nestCounter + uniqueNest.originalIndex} - Profile: ${pat.profile}${count > 1 ? ` (Qty: ${count})` : ' (Qty: 1)'}`, margin, yPosition);
        yPosition += 8;
        
        // Add nest stats
        doc.setFontSize(10);
        doc.text(`Stock: ${pat.stockLength} mm | Offcut: ${Math.round(pat.offcut)} mm | Waste: ${Math.round(pat.waste)} mm | Nested Pieces: ${pat.pieceAssignments.length}`, margin, yPosition);
        yPosition += 10;
        
        // Draw nest visualization
        const barHeight = 10;
        const barY = yPosition;
        const isBlackAndWhite = document.getElementById('remove-nesting-color').checked;

        // Draw stock bar
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(224, 224, 224);
        doc.rect(margin, barY, contentWidth, barHeight, 'F');
        
        // Track position for pieces and saw cuts
        let cursor = margin;
        const scale = contentWidth / pat.stockLength;
        
        // Add grip start if present
        if (pat.gripStart > 0) {
            const gripWidth = pat.gripStart * scale;
            doc.setFillColor(158, 158, 158);
            doc.rect(cursor, barY, gripWidth, barHeight, 'F');
            cursor += gripWidth;
        }
        
        // Add pieces and saw cuts
        pat.pieceAssignments.forEach((assign, i) => {
            // Draw piece
            const pieceWidth = assign.piece.length * scale;
            
            // Convert hex color to RGB for PDF
            let color = assign.piece.color;
            if (isBlackAndWhite) {
                doc.setFillColor(255, 255, 255); // White for B/W
                doc.setDrawColor(0, 0, 0); // Set stroke color (e.g., black)
                doc.setLineWidth(0.5); // Set stroke width (e.g., 0.5 units)
            }
            else {
                const r = parseInt(color.substr(1, 2), 16);
                const g = parseInt(color.substr(3, 2), 16);
                const b = parseInt(color.substr(5, 2), 16);
                doc.setFillColor(r, g, b);
            }
            
            doc.rect(cursor, barY, pieceWidth, barHeight, 'FD');
            
            // Add piece label if enough space
            if (pieceWidth > 15) {
                isBlackAndWhite ? doc.setTextColor(0, 0, 0) : doc.setTextColor(255, 255, 255); // Black text for B/W
                // Make sure label is a string
                const label = typeof assign.piece.label === 'string' ? assign.piece.label : String(assign.piece.label);
                doc.text(label, cursor + pieceWidth / 2, barY + barHeight / 2, {
                    align: 'center',
                    baseline: 'middle'
                });
                doc.setTextColor(0, 0, 0); // Reset text color
            }
            
            cursor += pieceWidth;
            
            // Add saw cut
            if (i < pat.pieceAssignments.length && pat.sawWidth > 0) {
                if (pat.pieceAssignments[i].withoutSawWidth) return; // Skip saw cut if last piece was placed without saw width
                const sawWidthSize = pat.sawWidth < 1 ? 1 : pat.sawWidth; // Ensure saw width is at least 1mm
                const sawWidth = sawWidthSize * scale;
                doc.setFillColor(0, 0, 0); // Black for saw cut
                doc.rect(cursor, barY, sawWidth, barHeight, 'F');
                cursor += sawWidth;
            }
        });
        
        // Add offcut if present
        if (pat.offcut > 0) {
            const offcutWidth = pat.offcut * scale;
            doc.setFillColor(224, 224, 224);
            doc.setDrawColor(158, 158, 158);
            doc.rect(cursor, barY, offcutWidth, barHeight, 'F');
            
            // Add offcut label if enough space
            if (offcutWidth > 15) {
                doc.setTextColor(97, 97, 97);
                // Convert to string to avoid type error
                const offcutText = String(Math.round(pat.offcut));
                doc.text(offcutText, cursor + offcutWidth / 2, barY + barHeight / 2, {
                align: 'center',
                baseline: 'middle'
                });
                doc.setTextColor(0, 0, 0); // Reset text color
            }
        }
        
        yPosition += barHeight + 15;
        
        // Add used pieces table for this nest
        const nestUsage = {};
        pat.pieceAssignments.forEach(a => {
            const piece = a.piece;
            const id = piece.label;
            if (!nestUsage[id]) {
                nestUsage[id] = {
                profile: piece.originalPiece.profile,
                label: piece.label,
                length: piece.length,
                count: 0
                };
            }
            nestUsage[id].count++;
        });
        
        const usedHeaders = ['Profile', 'Label', 'Length', 'Qty per Nest', 'Total Qty'];
        const usedData = Object.values(nestUsage).map(d => [
            d.profile,
            String(d.label),
            `${d.length} mm`,
            String(d.count),
            String(d.count * count) // Total quantity including nest count
        ]);
        
        // Create used pieces table
        doc.autoTable({
            head: [usedHeaders],
            body: usedData,
            startY: yPosition,
            margin: { left: margin, right: margin },
            tableWidth: contentWidth
        });
        
        yPosition = doc.lastAutoTable.finalY + 15;
    });
    
    // Add some extra space between profile groups
    yPosition += 10;
    });
    
    // Add new page for summary tables
    doc.addPage();
    yPosition = margin + 10;
    
    // Add used pieces table
    doc.setFontSize(16);
    doc.text('Used Pieces Summary', margin, yPosition);
    yPosition += 10;
    
    // Extract pieces usage summary from uniqueNests array
    const piecesUsage = {};

    // Iterate through each unique nest
    uniqueNests.forEach(nestItem => {
        const { nest, count } = nestItem;
        const { profile, pieceAssignments } = nest;
        
        // Process each piece assignment in the nest
        pieceAssignments.forEach(piece => {
            const key = `${profile}-${piece.label}-${piece.length}`;
            
            if (piecesUsage[key]) {
                // Add to existing entry
                piecesUsage[key].amount += count;
            } else {
                // Create new entry
                piecesUsage[key] = {
                    profile: profile,
                    label: piece.label,
                    length: piece.length,
                    amount: count
                };
            }
        });
    });

    // Convert to the format expected by your table
    const piecesUsageHeaders = ['Profile', 'Label', 'Length', 'Qty'];
    const piecesUsageData = Object.values(piecesUsage).map(d => [
        d.profile,
        String(d.label),
        `${d.length} mm`,
        String(d.amount)
    ]);

    // Create all used pieces table
    doc.autoTable({
        head: [piecesUsageHeaders],
        body: piecesUsageData,
        startY: yPosition,
        margin: { left: margin, right: margin },
        tableWidth: contentWidth
    });
    
    yPosition = doc.lastAutoTable.finalY + 15;
    
    // Save the PDF
    doc.save('nesting_report.pdf');
}

//Create hidden file input on document load for loading stock and pieces files
const loadStockInput = document.createElement('input');
const loadPiecesInput = document.createElement('input');
document.addEventListener('DOMContentLoaded', function() {
    //Create a hidden file input element for loading stock files
    loadStockInput.type = 'file';
    loadStockInput.id = 'load-stock-input';
    loadStockInput.style.display = 'none';
    loadStockInput.accept = '.csv';
    document.body.appendChild(loadStockInput);
    //Create a hidden file input element for loading pieces files
    loadPiecesInput.type = 'file';
    loadPiecesInput.id = 'load-pieces-input';
    loadPiecesInput.style.display = 'none';
    loadPiecesInput.accept = '.csv';
    document.body.appendChild(loadPiecesInput);
});

//Get references to elements
const loadStockButton = document.getElementById('load-stock');
const loadPiecesButton = document.getElementById('load-pieces');
const saveStockButton = document.getElementById('save-stock');
const savePiecesButton = document.getElementById('save-pieces');
const clearStockButton = document.getElementById('clear-stock');
const clearPiecesButton = document.getElementById('clear-pieces');

//clicks a hidden insert element when the list item is clicked
loadStockButton.addEventListener('click', function() {
    loadStockInput.click();
});
loadPiecesButton.addEventListener('click', function() {
    loadPiecesInput.click();
});
saveStockButton.addEventListener('click', function() {
    downloadStockCSV();
});
savePiecesButton.addEventListener('click', function() {
    downloadPiecesCSV();
});
clearStockButton.addEventListener('click', function() {
    clearStock();
});
clearPiecesButton.addEventListener('click', function() {
    clearPieces();
});

let idCounter = 0; //ID Counter for unique ID's

//File input change handler for loading stock files
loadStockInput.addEventListener('change', async function(event) {
    //reset file counter
    fileCounter = 0;
    //retrieves selected file
    const file = event.target.files[0];
    //check if a file was selected
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
        M.toast({html: 'Only CSV files are allowed!', classes: 'rounded toast-warning', displayLength: 2000});
        loadPiecesInput.value = ""; // Clear the input
        return;
    }
    const fileData = await file.text();
    //Loads the stock data from the file
    loadStockData(fileData);
    //clears the file input, so the same file can be imported again
    loadStockInput.value = "";
});

//File input change handler for loading pieces files
loadPiecesInput.addEventListener('change', async function(event) {
    //reset file counter
    fileCounter = 0;
    //retrieves selected file
    const file = event.target.files[0];
    //check if a file was selected
    if (!file) return;
    //Load csv files only
    if (!file.name.toLowerCase().endsWith('.csv')) {
        M.toast({html: 'Only CSV files are allowed!', classes: 'rounded toast-warning', displayLength: 2000});
        loadPiecesInput.value = ""; // Clear the input
        return;
    }
    const fileData = await file.text();
    //Loads the pieces data from the file
    loadPiecesData(fileData);
    //clears the file input, so the same file can be imported again
    loadPiecesInput.value = "";
});

function loadStockData(fileData) {
    const lines = fileData.trim().split('\n');
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        const columns = line.split(',').map(item => item.trim());
        if (columns.length < 3) continue; // Skip invalid lines
        const profile = columns[0].trim().replace(/(\d)\*(\d)/g, '$1X$2').replace(/\s+/g, '-');
        const length = parseFloat(columns[1].trim());
        const amount = parseFloat(columns[2].trim());
        if (isNaN(length) || isNaN(amount)) continue; // Skip invalid lines
        stockItems.push({ profile, length, amount });
    }
    localStorage.setItem('stockItems', JSON.stringify(stockItems));
    renderStockTable();
    M.toast({html: 'Stock loaded successfully!', classes: 'rounded toast-success', displayLength: 2000});
}

function loadPiecesData(fileData) {
    const lines = fileData.trim().split('\n');
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        const columns = line.split(',').map(item => item.trim());
        if (columns.length < 3) continue; // Skip invalid lines
        const profile = columns[0].trim().replace(/(\d)\*(\d)/g, '$1X$2').replace(/\s+/g, '-');
        const length = parseFloat(columns[1].trim());
        const amount = parseFloat(columns[2].trim());
        const label = columns[3].trim() == '' ? length : columns[3].trim(); //Set label to the value of the input if it exists, otherwise use length
        const color = stringToColor(label);
        if (isNaN(length) || isNaN(amount)) continue; // Skip invalid lines
        pieceItems.push({ profile, length, amount, label, color, id: Date.now() + (++idCounter) });
    }
    renderPieceTable();
    M.toast({html: 'Pieces loaded successfully!', classes: 'rounded toast-success', displayLength: 2000});
}

function clearStock() {
    if (stockItems.length === 0) {
        M.toast({html: 'No stock items to clear', classes: 'rounded toast-warning', displayLength: 2000});
        return;
    }
    stockItems = [];
    localStorage.setItem('stockItems', JSON.stringify(stockItems));
    renderStockTable();
    M.toast({html: 'Stock cleared successfully!', classes: 'rounded toast-success', displayLength: 2000});
}

function clearPieces() {
    if (pieceItems.length === 0) {
        M.toast({html: 'No piece items to clear', classes: 'rounded toast-warning', displayLength: 2000});
        return;
    }
    pieceItems = [];
    renderPieceTable();
    M.toast({html: 'Pieces cleared successfully!', classes: 'rounded toast-success', displayLength: 2000});
}

//Download stock items as CSV
function downloadStockCSV() {
    if (!stockItems || stockItems.length === 0) {
        M.toast({html: 'No stock items to download', classes: 'rounded toast-warning', displayLength: 2000});
        return;
    }

    // Create CSV header
    let csvContent = 'Profile,Length,Amount\n';
    
    // Add data rows
    stockItems.forEach(item => {
        csvContent += `${item.profile},${item.length},${item.amount}\n`;
    });
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stock_items.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

//Download offcut items as CSV
function downloadOffcutCSV() {
    const uniqueNests = getUniqueNests(cuttingNests);
    let offcutCount = 0;

    // Create CSV header
    let csvContent = 'Profile,Length,Amount\n';
    
    // Add data rows
    uniqueNests.forEach(uniqueNest => {
        const offcut = uniqueNest.nest.offcut;
        if (offcut <= 0) return; // Skip nests with no offcut
        csvContent += `${uniqueNest.nest.profile},${uniqueNest.nest.offcut},${uniqueNest.count}\n`;
        offcutCount += uniqueNest.count;
    });

    if (offcutCount === 0) {
        M.toast({html: 'No offcuts to download!', classes: 'rounded toast-warning', displayLength: 2000});
        return;
    }
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'offcuts.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Download pieces as CSV
function downloadPiecesCSV() {
    if (!pieceItems || pieceItems.length === 0) {
        M.toast({html: 'No piece items to download', classes: 'rounded toast-warning', displayLength: 2000});
        return;
    }

    // Create CSV header
    let csvContent = 'Profile,Length,Amount,Label\n';
    
    // Add data rows
    pieceItems.forEach(item => {
        csvContent += `${item.profile},${item.length},${item.amount},${item.label}\n`;
    });
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'piece_items.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

function exportFncNest() {
    saveFNCSettings(); // Save settings before exporting
    
    // If no nesting is present return with error
    if (cuttingNests.length == 0) {
        M.toast({html: 'No Nesting to Export!', classes: 'rounded toast-error', displayLength: 2000});
        return;
    }

    if (checkForMissingProfile() == true) {
        M.toast({html: 'Some Piece Profiles are Missing!', classes: 'rounded toast-error', displayLength: 2000});
        return;
    }

    if (!FNCDrillType) {
        M.toast({html: 'Please select a drill type!', classes: 'rounded toast-warning', displayLength: 2000});
        return;
    }

    const selectElement = document.getElementById('FNCDrillTypeSelect');
    FNCDrillType = selectElement.value; // Get FNC drill type export value
    localStorage.setItem('FNCDrillType', FNCDrillType); // Save the selected drill type to local storage

    // Create pieces blocks for all nested parts
    createPieceItemsFromFiles();

    // Get unqiue labels from nests
    const labels = getUniqueNestLabels();

    let piecesBlocks = '';
    Object.entries(labels).forEach(([label, data]) => {
        if(pieceItemsFromFiles[label] === undefined) return; // Skip if label not found in pieceItemsFromFiles
        piecesBlocks += createFNC(pieceItemsFromFiles[label][1], data.count, data.isUniqueProfile) + '\n';
    });

    const missingPieces = getMissingPieces();
    if (missingPieces.length > 0) {
        missingPieces.forEach(piece => {
            genericData = {
                label: piece.label,
                length: piece.length
            }
            piecesBlocks += createFNC(piece.data, piece.count, false, true, genericData) + '\n';
        });
    }

    let nestsBlocks = createNestBlocks(nestCounter, missingPieces);

    // Create download link with nesting data
    let link = document.createElement('a');
    let blob = new Blob([piecesBlocks + nestsBlocks], { type: 'text/plain' });
    link.href = URL.createObjectURL(blob);
    link.download = 'nests.fnc'; //Name of the ZIP file
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function getMissingPieces() {
    // Create a set of labels from filePairs for quick lookup
    const labelsFromFiles = new Set();
    for (const [fileName, fileData] of filePairs) {
        ncParseHeaderData(fileData);
        labelsFromFiles.add(label);
    }
    
    // Find pieces that are in pieceItems but not in filePairs
    const missingPiecesMap = new Map();
    
    for (const pieceItem of pieceItems) {
        if (!labelsFromFiles.has(pieceItem.label)) {
            if (missingPiecesMap.has(pieceItem.label)) {
                // If piece already exists, add to the count
                missingPiecesMap.get(pieceItem.label).count += pieceItem.amount;
            } else {
                // If piece doesn't exist, add it to the map
                missingPiecesMap.set(pieceItem.label, {
                    label: pieceItem.label,
                    profileCode: profilesFromFiles.get(pieceItem.profile).profileCode,
                    profile: pieceItem.profile,
                    length: pieceItem.length,
                    count: pieceItem.amount,
                    data: profilesFromFiles.get(pieceItem.profile).fileData
                });
            }
        }
    }
    
    // Convert map values to array
    return Array.from(missingPiecesMap.values());
}

let pieceItemsFromFiles = {};
function createPieceItemsFromFiles() {
    // Create a dictionary from DSTV file pairs with piece label as key and file data as value
    pieceItemsFromFiles = {};
    for (const [fileName, fileData] of filePairs) {
        ncParseHeaderData(fileData);
        pieceItemsFromFiles[label] = [fileName, fileData, order, drawing, phase, label, steelQuality, profileCode, profile];
    }
}

let profilesFromFiles = new Map(); 
function checkForMissingProfile() {
    // Extract all profiles from file pairs with fileData attached
    profilesFromFiles.clear();
    
    for (const [fileName, fileData] of filePairs) {
        ncParseHeaderData(fileData);
        
        // Store profile as key with fileData and profileCode as value
        profilesFromFiles.set(profile, {
            fileData: fileData,
            profileCode: profileCode
        });
    }
    
    // Check if any piece item's profile is not in the extracted profiles
    for (const pieceItem of pieceItems) {
        if (!profilesFromFiles.has(pieceItem.profile)) {
            return true; // Profile missing
        }
    }
    
    // Return false if all piece item profiles are found in file pairs
    return false;
}

function getUniqueNestLabels() {
    const labelCounts = new Map(); // Map to track unique labels and their counts
    const seenProfiles = new Set(); // Set to track unique profiles
    
    // Go through every nest in cuttingNest array
    cuttingNests.forEach(nest => {
        // Go through each piece in pieceAssignments for this nest
        nest.pieceAssignments.forEach(piece => {
            const key = piece.label;
            const profile = piece.piece.originalPiece.profile;
            let isUniqueProfile = true;
            if (pieceItemsFromFiles[key] !== undefined) isUniqueProfile = !seenProfiles.has(profile);
            else isUniqueProfile = false;
            
            if (!labelCounts.has(key)) {
                labelCounts.set(key, {
                    label: piece.label,
                    count: 0,
                    profile: profile,
                    isUniqueProfile: isUniqueProfile
                });
            }
            labelCounts.get(key).count++;
            
            // Mark this profile as seen only if it's in loaded files
            if (pieceItemsFromFiles[key] !== undefined) seenProfiles.add(profile);
        });
    });
    
    return Object.fromEntries(labelCounts);
}

function createNestBlocks(nestCounter, missingPieces) {
    let result = '';
    const uniqueNests = getUniqueNests(cuttingNests);
    for (const uniqueNest of uniqueNests) {
        let nestData = `[[BAR]]\n[HEAD]\nN:${nestCounter} `;
        uniqueNest.nest.pieceAssignments.forEach((piece, index) => {
            // If constraint material is set, use it instead of pieceSteelQuality
            let material = constraintMaterial == '' ? pieceItemsFromFiles[piece.label][6] : constraintMaterial;
            if (constraintMaterial == undefined) constraintMaterial = 'S235JR'; // Default to S235JR if not set
            // Convert the missing pieces array to a Map for lookup using label
            const missingPiecesByLabel = new Map(
                missingPieces.map(piece => [piece.label, piece])
            );
            if(pieceItemsFromFiles[piece.label] === undefined) {
                profileData = missingPiecesByLabel.get(piece.label);
                if (index === 0) nestData += `M:${material} CP:${profileData.profileCode} P:${profileData.profile}\nLB${uniqueNest.nest.stockLength} BI${uniqueNest.count} SP${uniqueNest.nest.gripStart} SL${uniqueNest.nest.sawWidth} SC${uniqueNest.nest.gripEnd}\n`;
                nestData += `[PCS] C:Order D:Drawing N:Phase POS:${profileData.label} QT1\n`;
            }
            else {
                if (index === 0) nestData += `M:${material} CP:${pieceItemsFromFiles[piece.label][7]} P:${pieceItemsFromFiles[piece.label][8]}\nLB${uniqueNest.nest.stockLength} BI${uniqueNest.count} SP${uniqueNest.nest.gripStart} SL${uniqueNest.nest.sawWidth} SC${uniqueNest.nest.gripEnd}\n`;
                nestData += `[PCS] C:${pieceItemsFromFiles[piece.label][2]} D:${pieceItemsFromFiles[piece.label][3]} N:${pieceItemsFromFiles[piece.label][4]} POS:${pieceItemsFromFiles[piece.label][5]} QT1\n`;
            }
        });
        nestCounter++;
        result += nestData + '\n';
    }
    // set first nest number value in local storage after current nest counter
    localStorage.setItem('first-nest-number', nestCounter);
    return result;
}

// Set first nest number value from local storage when fnc nest export modal is open
document.addEventListener('DOMContentLoaded', function(){
    document.getElementById('first-nest-number').value = localStorage.getItem('first-nest-number') || 1;
});

// Function to return unique nests and their count
function getUniqueNests(nests) {
    const nestMap = new Map();

    const groupUniqueNests = document.getElementById('group-unique-nests').checked; // Get the checkbox value

    // Helper function to create unique key for nest
    function createNestKey(nest) {
        const sortedPieces = nest.pieceAssignments.map(item => ({
            label: item.piece.originalPiece.label,
            length: item.piece.originalPiece.length,
            profile: item.piece.originalPiece.profile,
            parentID: item.piece.originalPiece.id

        })).sort((a, b) => String(a.label).localeCompare(String(b.label)));

        return JSON.stringify({
            profile: nest.profile,
            length: nest.stockLength,
            pieceAssignments: sortedPieces,
            groupUniqueNests: groupUniqueNests == true ? "" : Math.random()
        });
    }

    // Group nests by unique key
    nests.forEach((nest, index) => {
        const key = createNestKey(nest);

        if (nestMap.has(key)) {
            nestMap.get(key).count++;
            nestMap.get(key).indices.push(index);
        }
        else {
            nestMap.set(key, {
                nest: nest,
                count: 1,
                indices: [index]
            });
        }
    });

    // Convert map to array
    const uniqueNests = Array.from(nestMap.values()).map(item => ({
        nest: item.nest,
        count: item.count,
        indices: item.indices
    }));

    return uniqueNests;
}

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