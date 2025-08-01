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

let profileCodes = ['C', 'CH', 'CHS', 'CN', 'EA', 'Flat', 'HD', 'HE', 'H-JS', 'H-KS', 'HP', 'IB', 'IPE', 'IPN', 'J', 'M', 'MC', 'PFC', 'Rebar', 'RHS', 'Round', 'S', 'SHS', 'Square', 'TFC', 'U', 'UA', 'UB', 'UBP', 'UC', 'UPE', 'UPN', 'W'];

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
    M.toast({html: 'Please insert correct file format!', classes: 'rounded toast-warning', displayLength: 2000})
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
    document.querySelector('#profileDropdownBtn p').innerHTML = 'PROFILE'; //Reset profile button
    document.querySelector('#profileSizeDropdownBtn p').innerHTML = 'SIZE'; //Reset profile size button
    findProfile();
    ncViewsImage(); //Shows the views image
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
    updateSessionData()
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
        document.getElementById('profileData').innerHTML = 'please select a profile and a size!'; //Clears profile data
        document.getElementById('Length').value = ''; //Clears length input
        document.getElementById('Quantity').value = ''; //Clears quantity input
        document.querySelector('#profileImage img').src = 'Images/Profiles/no-profile.png'; //Clears profile image
        document.getElementById('profileViewsImg').src = ''; //Clears profile image
        document.querySelector('#profileDropdownBtn p').innerHTML = 'PROFILE'; //Reset profile button
        document.querySelector('#profileSizeDropdownBtn p').innerHTML = 'SIZE'; //Reset profile size button
        document.getElementById('weightResult').value = ''; //Reset weight result
        selectedFile = '';
    }
    updateSessionData()
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
    document.getElementById('profileData').innerHTML = 'please select a profile and a size!'; //Clears profile data
    document.getElementById('Length').value = ''; //Clears length input
    document.getElementById('Quantity').value = ''; //Clears quantity input
    document.querySelector('#profileImage img').src = 'Images/Profiles/no-profile.png'; //Clears profile image
    document.getElementById('profileViewsImg').src = ''; //clears views img
    document.querySelector('#profileDropdownBtn p').innerHTML = 'PROFILE'; //Reset profile button
    document.querySelector('#profileSizeDropdownBtn p').innerHTML = 'SIZE'; //Reset profile size button
    document.getElementById('weightResult').value = ''; //Reset weight result
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

function loadNestingPage(){
    sessionStorage.setItem("filePairs", JSON.stringify(Object.fromEntries(filePairs)));
    sessionStorage.setItem("selectedFile", selectedFile);
    window.location.href = "nesting.html";
}

document.addEventListener('DOMContentLoaded', function(){
    //Fill profile codes into view
    for (profile of profileCodes) {
        const profileDropdown = document.getElementById('profileDropdown');
        const item = document.createElement('li');
        item.innerHTML = `<a class="deep-purple-text lighten-3" onclick="loadSubProfiles(this)">${profile}</a>`;
        profileDropdown.appendChild(item);
    }
    if (filePairs != {}) {
        for (let [fileName, fileData] of filePairs) addFile(fileName, fileData, filePairs.size, true); //Load saved files in session
    }
    if (selectedFile != '') {
        selectedFile = sessionStorage.getItem('selectedFile');
        selectFile(selectedFile); //Select saved selectedFile in session
    }
});

function getProfileID(obj) {
    switch (loadedProfile) {
        case 'I':
        case 'U':
            var code =  obj.code.match(/^[a-zA-Z]+/)[0];
            return `${code}: ${obj.name}`;
        case 'Rebar':
        case 'Round':
            var code =  obj.code.match(/^[a-zA-Z]+/)[0];
            return `${code}: ${obj.od}`
        case 'Square':
            var code =  obj.code.match(/^[a-zA-Z]+/)[0];
            return `${code}: ${obj.l}`
        case 'CHS':
            var code =  obj.code.match(/^[a-zA-Z]+/)[0];
            return `${code}: ${obj.od} x ${obj.thk}`;
        case 'Flat':
            var code =  obj.code.match(/^[a-zA-Z]+/)[0];
            return `${code}: ${obj.b} x ${obj.thk}`;
        case 'RHS':
        case 'SHS':
        case 'L':
            var code =  obj.code.match(/^[a-zA-Z]+/)[0];
            return `${code}: ${obj.h} x ${obj.b} x ${obj.thk}`;
    }
}

function loadProfile(btn) {
    const index = btn.getAttribute("data-index");
    var instance = M.Dropdown.getInstance(document.getElementById('profileSizeDropdownBtn'));
    instance.close();
    if (index !== null) {
        const selectedProfile = csvData[index];
        document.querySelector('#profileSizeDropdownBtn p').innerHTML = btn.innerHTML;
        displayProfile(selectedProfile); //Display full profile data in view
    }
}

function displayProfile(selectedProfile) {
    if (loadedProfile == 'I' || loadedProfile == 'U') {
        clearViewProfileData();
        const weight = document.createElement('p');
        weightValue = parseFloat(selectedProfile.kgm).toFixed(2);
        const height = document.createElement('p');
        const width = document.createElement('p');
        const webThickness = document.createElement('p');
        const flangeThickness = document.createElement('p');
        const radius = document.createElement('p');
        const code = document.createElement('p');
        const profileData = document.getElementById('profileData');

        weight.innerHTML = `Weight: ${weightValue} kg/m`;
        height.innerHTML = `Height: ${selectedProfile.h} mm`;
        width.innerHTML = `Width: ${selectedProfile.b} mm`;
        webThickness.innerHTML = `Web thickness: ${selectedProfile.tw} mm`;
        flangeThickness.innerHTML = `Flange thickness: ${selectedProfile.tf} mm`;
        radius.innerHTML = `Radius: ${selectedProfile.r} mm`;
        code.innerHTML = `Code: ${selectedProfile.code}`;

        [weight, height, width, webThickness, flangeThickness, radius, code].forEach(e => { profileData.appendChild(e) });
        debouncedCalcWeight(); //Calculate weight based on selected profile
    }
    else if (loadedProfile == 'Rebar' || loadedProfile == 'Round') {
        clearViewProfileData();
        const weight = document.createElement('p');
        weightValue = parseFloat(selectedProfile.kgm).toFixed(2);
        const od = document.createElement('p');
        const code = document.createElement('p');
        const profileData = document.getElementById('profileData');

        weight.innerHTML = `Weight: ${weightValue} kg/m`;
        od.innerHTML = `Outside diameter: ${selectedProfile.od} mm`;
        code.innerHTML = `Code: ${selectedProfile.code}`;

        [weight, od, code].forEach(e => { profileData.appendChild(e) });
        debouncedCalcWeight(); //Calculate weight based on selected profile
    }
    else if (loadedProfile == 'CHS') {
        clearViewProfileData();
        const od = document.createElement('p');
        const weight = document.createElement('p');
        weightValue = parseFloat(selectedProfile.kgm).toFixed(2);
        const thickness = document.createElement('p');
        const code = document.createElement('p');
        const nps = document.createElement('p');
        const sch = document.createElement('p');
        const profileData = document.getElementById('profileData');

        weight.innerHTML = `Weight: ${weightValue} kg/m`;
        od.innerHTML = `Outside diameter: ${selectedProfile.od} mm`;
        thickness.innerHTML = `Wall thickness: ${selectedProfile.thk} mm`;
        nps.innerHTML = `NPS: ${selectedProfile.nps} inch`;
        sch.innerHTML = `Sch: ${selectedProfile.sch}`;
        code.innerHTML = `Code: ${selectedProfile.code}`;

        [weight, od, thickness, nps, sch, code].forEach(e => { profileData.appendChild(e) });
        debouncedCalcWeight(); //Calculate weight based on selected profile
    }
    else if (loadedProfile == 'Flat') {
        clearViewProfileData();
        const weight = document.createElement('p');
        weightValue = parseFloat(selectedProfile.kgm).toFixed(2);
        const thickness = document.createElement('p');
        const width = document.createElement('p');
        const code = document.createElement('p');
        const profileData = document.getElementById('profileData');

        weight.innerHTML = `Weight: ${weightValue} kg/m`;
        thickness.innerHTML = `Thickness: ${selectedProfile.thk} mm`;
        width.innerHTML = `Width: ${selectedProfile.b} mm`;
        code.innerHTML = `Code: ${selectedProfile.code}`;

        [weight, thickness, width, code].forEach(e => { profileData.appendChild(e) });
        debouncedCalcWeight(); //Calculate weight based on selected profile
    }
    else if (loadedProfile == 'Square') {
        clearViewProfileData();
        const weight = document.createElement('p');
        weightValue = parseFloat(selectedProfile.kgm).toFixed(2);
        const length = document.createElement('p');
        const code = document.createElement('p');
        const profileData = document.getElementById('profileData');

        weight.innerHTML = `Weight: ${weightValue} kg/m`;
        length.innerHTML = `Side length: ${selectedProfile.l} mm`;
        code.innerHTML = `Code: ${selectedProfile.code}`;

        [weight, length, code].forEach(e => { profileData.appendChild(e) });
        debouncedCalcWeight(); //Calculate weight based on selected profile
    }
    else if (loadedProfile == 'RHS' || loadedProfile == 'SHS' || loadedProfile == 'L') {
        clearViewProfileData();
        const weight = document.createElement('p');
        weightValue = parseFloat(selectedProfile.kgm).toFixed(2);
        const thickness = document.createElement('p');
        const height = document.createElement('p');
        const width = document.createElement('p');
        const code = document.createElement('p');
        const profileData = document.getElementById('profileData');

        weight.innerHTML = `Weight: ${weightValue} kg/m approx.`;
        thickness.innerHTML = `Thickness: ${selectedProfile.thk} mm`;
        height.innerHTML = `Height: ${selectedProfile.h} mm`;
        width.innerHTML = `Width: ${selectedProfile.b} mm`;
        code.innerHTML = `Code: ${selectedProfile.code}`;

        [weight, thickness, height, width, code].forEach(e => { profileData.appendChild(e) });
        debouncedCalcWeight(); //Calculate weight based on selected profile
    }
    else M.toast({html: 'Please choose a correct profile!', classes: 'rounded toast-error', displayLength: 2000});
}

function clearViewProfileData() {
    profileData.innerHTML = ''; //Clears content of profile data
    weightValue = 0; //Clears weight calculation
}

function parseCSV(text) {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",");

    return lines.slice(1).map(line => {
        const values = line.split(",");
        return headers.reduce((obj, header, i) => {
            obj[header.trim()] = values[i].trim(); //Trim spaces
            return obj;
        }, {});
    });
}

//Weight calc function
document.getElementById('Length')?.addEventListener('input', calcWeight);
document.getElementById('Quantity')?.addEventListener('input', calcWeight);
let weightValue = 0;
let debounceTimer;
// Debounced version of calcWeight with 100ms delay
function debouncedCalcWeight() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(calcWeight, 100);
}
function calcWeight() {
    result = document.getElementById('weightResult');
    const length = parseFloat(document.getElementById('Length').value);
    const quantity = parseFloat(document.getElementById('Quantity').value);
    const weight = (weightValue * length * quantity / 1000).toFixed(2);
    if (isNaN(weight)) {
        result.value = 'result'; // Show default result
        return;
    }
    result.value = weight; //Show result
}

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