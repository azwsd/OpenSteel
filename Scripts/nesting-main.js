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
            el.style.visibility = 'visible';
        });
    }
    else{
        document.querySelectorAll('.filesPlaceHolder').forEach(el => {
            el.style.visibility = 'hidden';
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
    //Load piece data
    setInputValue('piece-profile', profile);
    setInputValue('piece-length', length);
    setInputValue('piece-amount', quantity);
    setInputValue('piece-label', label);
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
let label = '';
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
        //Removes \r from the end of string
        line = line.replace(/\r$/, '');

        switch (lineCounter) {
            case 3:
                label = line;
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
    // Addd pieces from loaded files to nesting
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
        if (selectedIndex !== -1 && selectedIndex - 1 > -1) fileElements[selectedIndex - 1].click();
    }
    else if(e.key === 'ArrowDown') { //Detect arrow down
        e.preventDefault(); //Prevent default browser save behavior
        let fileElements = document.querySelectorAll('.viewFiles');
        let selectedIndex = -1;
    
        fileElements.forEach((el, index) => {
            if (el.classList.contains('selected-file')) selectedIndex = index;
        });
        // Select next file if available
        if (selectedIndex !== -1 && selectedIndex + 1 < fileElements.length) fileElements[selectedIndex + 1].click();
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
const resultsDiv = document.getElementById('results');
const cuttingNestsDiv = document.getElementById('cutting-nests');
const remainingPiecesDiv = document.getElementById('remaining-pieces');

// Event Listeners
addStockBtn.addEventListener('click', addStock);
addPieceBtn.addEventListener('click', addPiece);
optimizeBtn.addEventListener('click', optimizeCuttingNests);
  
// Function to programmatically set input value
function setInputValue(inputId, value) {
    const input = document.getElementById(inputId);
    input.value = value;
    
    M.updateTextFields();
}

// Nesting functions
function addStock() {
    const profile = document.getElementById('stock-profile').value;
    const length = parseFloat(document.getElementById('stock-length').value);
    const amount = parseInt(document.getElementById('stock-amount').value);

    if (!profile || isNaN(length) || isNaN(amount) || length <= 0 || amount <= 0) {
        M.toast({html: 'Please enter valid stock information!', classes: 'rounded toast-warning', displayLength: 2000});
        return;
    }

    const stockItem = { profile, length, amount };
    stockItems.push(stockItem);
    renderStockTable();

    // Clear inputs
    document.getElementById('stock-profile').value = '';
    document.getElementById('stock-length').value = '12000';
    document.getElementById('stock-amount').value = '1';
}

function addPiece() {
    const profile = document.getElementById('piece-profile').value;
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
}

function updateStock() {
    const profile = document.getElementById('stock-profile').value;
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
}

function updatePiece() {
    const profile = document.getElementById('piece-profile').value;
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

function stringToColor(str, satMin = 0.4, satMax = 0.9, lightMin = 0.4, lightMax = 0.8) {
    // Add a non-numeric prefix to numeric strings
    if (/^\d+$/.test(str)) {
        str = "txt_" + str;
    }
    
    // Primary hash for hue
    let hashHue = 0;
    // Secondary hash for saturation - different multiplier
    let hashSat = 0;
    // Tertiary hash for lightness - different bit shift
    let hashLight = 0;

    // Use different prime numbers for each hash component
    for (let i = 0; i < str.length; i++) {
        const charCode = str.charCodeAt(i);
        hashHue = ((hashHue << 5) - hashHue + charCode) * 17;
        hashSat = ((hashSat << 4) - hashSat + charCode) * 23;
        hashLight = ((hashLight << 6) - hashLight + charCode) * 13;
    }

    // Normalize hue to 0-360
    const hue = Math.abs(hashHue % 360);

    // Normalize saturation between satMin and satMax
    const satRange = satMax - satMin;
    const saturation = satMin + (Math.abs(hashSat) % 1000) / 1000 * satRange;

    // Normalize lightness between lightMin and lightMax
    const lightRange = lightMax - lightMin;
    const lightness = lightMin + (Math.abs(hashLight) % 1000) / 1000 * lightRange;

    // Convert HSL to RGB
    const h = hue / 360;
    const s = saturation;
    const l = lightness;

    let r, g, b;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;

      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    // Convert to hex
    const toHex = x => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
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
    renderStockTable();
}

function removePiece(index) {
    pieceItems.splice(index, 1);
    renderPieceTable();
}

function calculateAndDisplayResults(cuttingNests) {
    let totalStockUsed = cuttingNests.length;
    let totalPieceLength = 0;
    let totalStockLength = 0;
    let totalWaste = 0;
    let totalOffcut = 0;

    cuttingNests.forEach(nest => {
        totalStockLength += nest.stockLength;
        nest.pieceAssignments.forEach(p => totalPieceLength += p.length);
        totalOffcut += nest.offcut;
        totalWaste += nest.waste;
    });

    const materialEfficiency = ((totalPieceLength / totalStockLength) * 100).toFixed(2);

    document.getElementById('total-stock').textContent = totalStockUsed;
    document.getElementById('material-efficiency').textContent = `${materialEfficiency}%`;
    document.getElementById('total-offcut').textContent = Math.round(totalOffcut);
    document.getElementById('total-waste').textContent = Math.round(totalWaste);
}

function optimizeCuttingNests() {
    if (stockItems.length === 0 || pieceItems.length === 0) {
        M.toast({html: 'Please add stock and piece items first!', classes: 'rounded toast-warning', displayLength: 2000});
        return;
    }

    const gripStart = parseFloat(document.getElementById('grip-start').value) || 0;
    const gripEnd = parseFloat(document.getElementById('grip-end').value) || 0;
    const sawWidth = parseFloat(document.getElementById('saw-width').value) || 0;
    const preferShorterStocks = document.getElementById('shorter-length-preference').checked;
    const maxUniqueLabels = parseInt(document.getElementById('max-unique-labels').value) || 999;

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
    stockItems.forEach(stock => {
        if (!stockGroups[stock.profile]) {
            stockGroups[stock.profile] = [];
        }
        for (let i = 0; i < stock.amount; i++) {
            stockGroups[stock.profile].push({
                id: `stock-${stock.profile}-${i}`,
                length: stock.length,
                originalStock: stock,
                usableLength: stock.length - gripStart - gripEnd,
                remainingLength: stock.length - gripStart - gripEnd,
                pieceAssignments: [],
                offcut: 0,
                waste: 0,
                used: false
            });
        }
    });

    const cuttingNests = [];

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
        });

        // Sort stocks by length if preferShorterStocks is checked
        if (preferShorterStocks) {
            stocks.sort((a, b) => a.length - b.length);
        }

        // Improved bin packing algorithm with max unique labels constraint
        binPackingOptimization(pieces, stocks, gripStart, gripEnd, sawWidth, maxUniqueLabels);
        
        // Process results
        processStockResults(stocks, cuttingNests, gripStart, gripEnd, sawWidth);
    }

    calculateAndDisplayResults(cuttingNests);
    renderCuttingNests(cuttingNests);
    resultsDiv.classList.remove('hide');
    cuttingNestsDiv.classList.remove('hide');
    if (remainingPiecesDiv.innerHTML != '') {
        M.toast({html: 'Not all pieces were nested!', classes: 'rounded toast-warning', displayLength: 2000});
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
            M.toast({html: `Not enough stock to fit all pieces!`, classes: 'rounded toast-warning', displayLength: 2000});
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
                    color: unassignedPieces[pieceIndex].color
                });
                
                // Update position for next piece
                currentPos += unassignedPieces[pieceIndex].length;
                
                // Add saw width
                if (index < bestPattern.pieces.length - 1) {
                    currentPos += sawWidth;
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
                // Add saw width for all except last piece
                if (idx < currentPattern.length - 1) {
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
            
            // Calculate additional length needed including saw cut
            const additionalLength = piece.length + 
                (currentPattern.length > 0 ? sawWidth : 0);
                
            // Check if this piece fits
            if (additionalLength <= remainingLength) {
                // Add piece to current pattern
                currentPattern.push(piece);
                
                // Update unique labels
                const updatedUniqueLabels = new Set(uniqueLabels);
                updatedUniqueLabels.add(newLabel);
                
                // Recursive call with remaining length
                backtrack(i + 1, currentPattern, remainingLength - additionalLength, updatedUniqueLabels);
                
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
            stock.pieceAssignments.forEach((assignment, index) => {
                usedLength += assignment.length;
            });
            
            // Calculate waste and offcut
            const totalWaste = (stock.pieceAssignments.length - 1) * sawWidth + gripStart + gripEnd;
            const offcut = stock.length - usedLength - totalWaste;
            
            cuttingNests.push({
                profile: stock.originalStock.profile,
                stockLength: stock.length,
                gripStart: gripStart,
                gripEnd: gripEnd,
                sawWidth: sawWidth,
                pieceAssignments: stock.pieceAssignments,
                offcut: offcut,
                waste: totalWaste
            });
        }
    });
}

// Render the nesting results
function renderCuttingNests(nests) {
    cuttingNestsDiv.innerHTML = '';
    const fragment = document.createDocumentFragment();
    const allUsed = {};
    let remaining = pieceItems.map(i => ({ ...i }));
  
    // --- Helpers ---
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
      if (!allUsed[parentID]) allUsed[parentID] = { label, length, color, profile, amount: 0 };
      allUsed[parentID].amount++;
    };
  
    const buildStatsRow = (label, value, unit = '') =>
      `<div class="stat col s3"><span class="stat-label">${label}:</span> <span class="stat-value">${value}${unit}</span></div>`;
  
    const buildNestHeader = (pattern, idx) => {
      const header = createElem('div', 'nest-header');
      const title = createElem('h5', 'card-title');
      title.textContent = `Profile: ${pattern.profile} - Nest #${idx + 1}`;
      
      const stats = createElem('div', 'row nest-stats');
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
        
        // Add tooltip with Materialize
        gripStart.setAttribute('data-tooltip', `Grip Start: ${pattern.gripStart}mm`);
        gripStart.classList.add('tooltipped');
        
        // Add visual text if space permits
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
        
        // Add tooltip with Materialize
        gripEnd.setAttribute('data-tooltip', `Grip End: ${pattern.gripEnd}mm`);
        gripEnd.classList.add('tooltipped');
        
        // Add visual text if space permits
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
        
        // Create piece segment
        const pieceSegment = createElem('div', 'piece-segment');
        pieceSegment.style.left = `${(cursor / total * 100)}%`;
        pieceSegment.style.width = `${pieceWidth}%`;
        pieceSegment.style.backgroundColor = assign.piece.color;
        
        // Add tooltip with Materialize
        pieceSegment.setAttribute('data-tooltip', `${assign.piece.label}: ${assign.piece.length}mm`);
        pieceSegment.classList.add('tooltipped');
        
        // Add visual text if space permits
        if (pieceWidth > 5) {
          pieceSegment.textContent = assign.piece.label;
        }
        
        stockBar.appendChild(pieceSegment);
        
        cursor += assign.piece.length;
        
        // Add saw cut
        if (i < pattern.pieceAssignments.length - 1 && pattern.sawWidth > 0) {
          const sawCut = createElem('div', 'saw-cut-segment');
          sawCut.style.left = `${(cursor / total * 100)}%`;
          sawCut.style.width = `${(pattern.sawWidth / total * 100)}%`;
          
          // Add tooltip for saw cut
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
        
        // Add tooltip with Materialize
        offcutSegment.setAttribute('data-tooltip', `Offcut: ${Math.round(pattern.offcut)}mm`);
        offcutSegment.classList.add('tooltipped');
        
        // Add visual text if space permits
        if (pattern.offcut / total > 0.03) {
          offcutSegment.textContent = `${Math.round(pattern.offcut)}`;
        }
        
        stockBar.appendChild(offcutSegment);
      }
      
      container.appendChild(stockBar);
      
      return container;
    };

    // --- Create Tab Structure ---
    const tabsContainer = createElem('div', 'nesting-tabs-container');
    
    // Create tabs ul
    const tabsUl = createElem('ul', 'tabs nesting-tabs');
    tabsUl.id = 'nesting-tabs';
    
    // Create tab content container
    const tabContentContainer = createElem('div', 'tab-content-container');
    
    // Create tab for summary
    const summaryTabId = 'summary-tab';
    const summaryTabLi = createElem('li', 'tab');
    const summaryTabLink = createElem('a', 'active deep-purple-text');
    summaryTabLink.href = `#${summaryTabId}`;
    summaryTabLink.textContent = 'Nesting Summary';
    summaryTabLi.appendChild(summaryTabLink);
    tabsUl.appendChild(summaryTabLi);
    
    // Create tab for each nest
    nests.forEach((pat, i) => {
      const nestTabId = `nest-tab-${i}`;
      const nestTabLi = createElem('li', 'tab');
      const nestTabLink = createElem('a', 'deep-purple-text');
      nestTabLink.href = `#${nestTabId}`;
      nestTabLink.textContent = `Nest #${i + 1}`;
      nestTabLi.appendChild(nestTabLink);
      tabsUl.appendChild(nestTabLi);
    });
    
    // Create tab for used pieces
    const usedPiecesTabId = 'used-pieces-tab';
    const usedPiecesTabLi = createElem('li', 'tab');
    const usedPiecesTabLink = createElem('a', 'deep-purple-text');
    usedPiecesTabLink.href = `#${usedPiecesTabId}`;
    usedPiecesTabLink.textContent = 'Used Pieces';
    usedPiecesTabLi.appendChild(usedPiecesTabLink);
    tabsUl.appendChild(usedPiecesTabLi);
    
    // Create tab for remaining pieces
    const remainingPiecesTabId = 'remaining-pieces-tab';
    const remainingPiecesTabLi = createElem('li', 'tab');
    const remainingPiecesTabLink = createElem('a', 'deep-purple-text');
    remainingPiecesTabLink.href = `#${remainingPiecesTabId}`;
    remainingPiecesTabLink.textContent = 'Remaining Pieces';
    remainingPiecesTabLi.appendChild(remainingPiecesTabLink);
    tabsUl.appendChild(remainingPiecesTabLi);
    
    tabsContainer.appendChild(tabsUl);
    tabsContainer.appendChild(tabContentContainer);
    
    // Create tab contents
    const summaryTabContent = createElem('div', 'tab-content');
    summaryTabContent.id = summaryTabId;
    
    // Build summary card
    const summaryCard = createElem('div', 'card summary-card');
    const summaryCardContent = createElem('div', 'card-content');
    
    const summaryTitle = createElem('span', 'card-title');
    summaryTitle.textContent = 'Nesting Summary';
    summaryCardContent.appendChild(summaryTitle);
    
    // Add nest statistics
    const nestsSummary = createElem('div', 'nests-summary');
    nestsSummary.innerHTML = `
      <h6>Nesting Overview</h6>
      <ul class="collection">
        ${nests.map((pat, i) => `
          <li class="collection-item">
            <div class="row">
              <div class="col s12 m6">Nest #${i + 1} - Profile: ${pat.profile}</div>
              <div class="col s6 m3">Stock: ${pat.stockLength} mm</div>
              <div class="col s6 m3">Pieces: ${pat.pieceAssignments.length}</div>
            </div>
          </li>
        `).join('')}
      </ul>
    `;
    
    summaryCardContent.appendChild(nestsSummary);
    summaryCard.appendChild(summaryCardContent);
    summaryTabContent.appendChild(summaryCard);
    
    tabContentContainer.appendChild(summaryTabContent);
    
    // --- Create nest tabs content ---
    const usage = {};
    nests.forEach((pat, i) => {
      const nestTabId = `nest-tab-${i}`;
      const nestTabContent = createElem('div', 'tab-content');
      nestTabContent.id = nestTabId;
      
      const nestCard = createElem('div', 'nest-card card');
      const cardContent = createElem('div', 'card-content');
      
      cardContent.appendChild(buildNestHeader(pat, i));
      
      // Pieces summary for this nest
      const nestUsage = {};
      pat.pieceAssignments.forEach(a => {
        recordUsage(nestUsage, { ...a.piece, profile: a.piece.originalPiece.profile, parentID: a.piece.parentID });
        updateRemaining(a.piece.parentID);
      });
      cardContent.appendChild(buildUsageList(nestUsage));
      
      // Add responsive nest visualization
      cardContent.appendChild(createResponsiveNest(pat));
      
      nestCard.appendChild(cardContent);
      nestTabContent.appendChild(nestCard);
      
      tabContentContainer.appendChild(nestTabContent);
    });
    
    // --- Create used pieces tab content ---
    const usedPiecesTabContent = createElem('div', 'tab-content');
    usedPiecesTabContent.id = usedPiecesTabId;
    
    const buildTableCard = (title, data) => {
      const card = createElem('div', 'card summary-card');
      const cardContent = createElem('div', 'card-content');
      
      const cardTitle = createElem('span', 'card-title');
      cardTitle.textContent = title;
      cardContent.appendChild(cardTitle);
      
      const tableContainer = createElem('div', 'responsive-table-container');
      const table = createElem('table', 'striped highlight responsive-table');
      table.innerHTML = `
        <thead>
          <tr><th>Profile</th><th>Label</th><th>Length</th><th>Qty</th></tr>
        </thead>
        <tbody>
          ${Object.values(data).map(d => `
            <tr>
              <td>${d.profile}</td>
              <td>${d.label}</td>
              <td>${d.length} mm</td>
              <td>${d.amount}</td>
            </tr>`).join('')}
        </tbody>
      `;
      tableContainer.appendChild(table);
      cardContent.appendChild(tableContainer);
      card.appendChild(cardContent);
      return card;
    };
    
    usedPiecesTabContent.appendChild(buildTableCard('Used Pieces', allUsed));
    tabContentContainer.appendChild(usedPiecesTabContent);
    
    // --- Create remaining pieces tab content ---
    const remainingPiecesTabContent = createElem('div', 'tab-content');
    remainingPiecesTabContent.id = remainingPiecesTabId;
    
    if (remaining.length) {
      remainingPiecesTabContent.appendChild(buildTableCard('Remaining Pieces', Object.fromEntries(
        remaining.map(r => [r.id, { ...r, amount: r.amount }])
      )));
    } else {
      const emptyCard = createElem('div', 'card');
      const emptyCardContent = createElem('div', 'card-content');
      emptyCardContent.innerHTML = '<p>No remaining pieces.</p>';
      emptyCard.appendChild(emptyCardContent);
      remainingPiecesTabContent.appendChild(emptyCard);
    }
    
    tabContentContainer.appendChild(remainingPiecesTabContent);
    
    // Add PDF export button with custom checkbox (no Materialize styling)
    const exportButtonContainer = createElem('div', 'export-button-container center-align');

    // Create a standard export button
    const exportButton = createElem('a', 'waves-effect waves-light btn-large deep-purple');
    exportButton.innerHTML = '<i class="material-icons left">file_download</i>Export to PDF';
    exportButton.onclick = () => generatePDF(nests, allUsed, remaining);

    // Create a custom checkbox container that won't be affected by Materialize
    const checkboxContainer = createElem('div', 'custom-checkbox-container');

    // Create a standard HTML checkbox (not using Materialize's styling)
    const checkboxInput = document.createElement('input');
    checkboxInput.type = 'checkbox';
    checkboxInput.id = 'export-option';

    // Create a label for the checkbox
    const checkboxLabel = document.createElement('label');
    checkboxLabel.htmlFor = 'export-option';
    checkboxLabel.textContent = 'Remove nesting color';

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
function generatePDF(nests, allUsed, remaining) {
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
    
    // Summary table
    doc.setFontSize(10);
    const summaryHeaders = ['Nest #', 'Profile', 'Stock Length', 'Nested Pieces', 'Offcut', 'Waste'];
    const summaryData = nests.map((pat, i) => [
      `${i + 1}`,
      pat.profile,
      `${pat.stockLength} mm`,
      pat.pieceAssignments.length.toString(),  // Convert to string
      `${Math.round(pat.offcut)} mm`,
      `${Math.round(pat.waste)} mm`
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
    
    // Add each nest visualization
    nests.forEach((pat, idx) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 70) {
        doc.addPage();
        yPosition = margin + 10;
      }
      
      // Add nest title
      doc.setFontSize(14);
      doc.text(`Nest #${idx + 1} - Profile: ${pat.profile}`, margin, yPosition);
      yPosition += 8;
      
      // Add nest stats
      doc.setFontSize(10);
      doc.text(`Stock: ${pat.stockLength} mm | Offcut: ${Math.round(pat.offcut)} mm | Waste: ${Math.round(pat.waste)} mm | Nested Pieces: ${pat.pieceAssignments.length}`, margin, yPosition);
      yPosition += 10;
      
      // Draw nest visualization
      const barHeight = 10;
      const barY = yPosition;
      isBlackAndWhite = document.getElementById('export-option').checked;

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
      
      const usedHeaders = ['Profile', 'Label', 'Length', 'Qty'];
      const usedData = Object.values(nestUsage).map(d => [
        d.profile,
        String(d.label),  // Ensure label is a string
        `${d.length} mm`,
        String(d.count)   // Convert count to string
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
    
    // Add new page for summary tables
    doc.addPage();
    yPosition = margin + 10;
    
    // Add used pieces table
    doc.setFontSize(16);
    doc.text('Used Pieces Summary', margin, yPosition);
    yPosition += 10;
    
    const allUsedHeaders = ['Profile', 'Label', 'Length', 'Qty'];
    const allUsedData = Object.values(allUsed).map(d => [
      d.profile,
      String(d.label),  // Ensure label is a string
      `${d.length} mm`,
      String(d.amount)  // Convert amount to string
    ]);
    
    // Create all used pieces table
    doc.autoTable({
      head: [allUsedHeaders],
      body: allUsedData,
      startY: yPosition,
      margin: { left: margin, right: margin },
      tableWidth: contentWidth
    });
    
    yPosition = doc.lastAutoTable.finalY + 15;
    
    // Add remaining pieces table if any
    if (remaining.length) {
      // Check if we need a new page
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = margin + 10;
      }
      
      doc.setFontSize(16);
      doc.text('Remaining Pieces', margin, yPosition);
      yPosition += 10;
      
      const remainingHeaders = ['Profile', 'Label', 'Length', 'Qty'];
      const remainingData = remaining.map(r => [
        r.profile,
        String(r.label),  // Ensure label is a string
        `${r.length} mm`,
        String(r.amount)  // Convert amount to string
      ]);
      
      // Create remaining pieces table
      doc.autoTable({
        head: [remainingHeaders],
        body: remainingData,
        startY: yPosition,
        margin: { left: margin, right: margin },
        tableWidth: contentWidth
      });
    }
    
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

//File input change handler for loading stock files
loadStockInput.addEventListener('change', async function(event) {
    //reset file counter
    fileCounter = 0;
    //retrieves selected file
    const file = event.target.files[0];
    //check if a file was selected
    if (!file) return;
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
        const profile = columns[0].trim();
        const length = parseFloat(columns[1].trim());
        const amount = parseFloat(columns[2].trim());
        if (isNaN(length) || isNaN(amount)) continue; // Skip invalid lines
        stockItems.push({ profile, length, amount });
    }
    renderStockTable();
    M.toast({html: 'Stock loaded successfully!', classes: 'rounded toast-success', displayLength: 2000});
}

function loadPiecesData(fileData) {
    const lines = fileData.trim().split('\n');
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        const columns = line.split(',').map(item => item.trim());
        if (columns.length < 3) continue; // Skip invalid lines
        const profile = columns[0].trim();
        const length = parseFloat(columns[1].trim());
        const amount = parseFloat(columns[2].trim());
        const label = columns[3].trim() == '' ? length : columns[3].trim(); //Set label to the value of the input if it exists, otherwise use length
        const color = stringToColor(label);
        if (isNaN(length) || isNaN(amount)) continue; // Skip invalid lines
        pieceItems.push({ profile, length, amount, label, color, id: Date.now() });
    }
    renderPieceTable();
    M.toast({html: 'Pieces loaded successfully!', classes: 'rounded toast-success', displayLength: 2000});
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