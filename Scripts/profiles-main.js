//Map containing fileName, filedata as text pairs
let filePairs = new Map(Object.entries(JSON.parse(sessionStorage.getItem("filePairs") || "{}")));
let selectedFile = sessionStorage.getItem("selectedFile") || "";

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
    findProfile();
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
    updateSessionData()
    M.toast({html: 'All files were cleared!', classes: 'rounded toast-success', displayLength: 2000}); //shows success message
}

//clicks a hidden insert element when the list item is clicked
function insert_file(btn){
    document.getElementById('fileInput').click();
    M.Tooltip.getInstance(btn).close(); //Closes the tooltip
};


fileInput.addEventListener("change", async (event) => {
    //reset file counter
    fileCounter = 0;
    //retrives selected files
    const files = event.target.files;
    //gets the number of files imported
    let fileCount = event.target.files.length;
    //converts file list into a file array
    let filesArray = [...files]
    if(!filesArray.length) return;
    for (file of filesArray){
        const fileName = file.name;
        if(!verifyFile(fileName)) continue;
        const fileData = await file.text();
        //adds the file to the view
        addFile(fileName, fileData, fileCount);
        //Clears the file input, so the same file can be imported again
        fileInput.value = "";
    }
});

//Parses the header of DSTV file
let headerData = [];
function ncParseHeaderData(fileData){
    const splitFileData = fileData.split('\n');
    headerData = []
    let lineCounter = 0;
    let isFirstIteration = true;
    for (line of splitFileData)
    {
        //removes the leading spaces
        line = line.trimStart();
        //reads only the first 24 lines
        if (lineCounter == 19) break;
        //removes ST line and comment line
        if(isFirstIteration || line.slice(0, 2) == '**') {
            isFirstIteration = false;
            continue;
        };
        //removes comments from any line
        line = line.split('**')[0];
        //Removes \r from the end of string
        line = line.replace(/\r$/, '');
        headerData.push(line);
        lineCounter++;
    }
};

async function findProfile() {
    const quantity = Number(headerData[5]);
    const profileType = headerData[7].toUpperCase();
    const length = headerData[8];
    const height = headerData[9];
    const flangeWidth = headerData[10];
    const flangeThickness = headerData[11];
    const webThickness = headerData[12];
    const radius = headerData[13];
    //Handle missing profile data in database
    let profileFound = false;
    let fetchPromises = [];

    if (!(['I', 'U', 'L', 'M', 'RO', 'RU', 'C'].includes(profileType))) {
        M.toast({html: 'Profile not supported!', classes: 'rounded toast-error', displayLength: 2000});
        document.getElementById('profileData').innerHTML = 'please select a profile and a size!';
        return;
    }

    //Convert DSTV profile type to standard type
    if (profileType == 'I' || profileType == 'U' || profileType == 'C') {
        csvPath = profileType == 'I' ? 'data/I.csv' : 'data/U.csv';
        fetchPromises.push(fetch(csvPath)
        .then(response => response.text())
        .then(text => {
            return Promise.all(parseCSV(text).forEach(async obj => {
                if (
                    parseFloat(obj.h).toFixed(2) == parseFloat(height).toFixed(2) 
                    && parseFloat(obj.b).toFixed(2) == parseFloat(flangeWidth).toFixed(2) 
                    && parseFloat(obj.tw).toFixed(2) == parseFloat(webThickness).toFixed(2) 
                    && parseFloat(obj.tf).toFixed(2) == parseFloat(flangeThickness).toFixed(2) 
                    && parseFloat(obj.r).toFixed(2) == parseFloat(radius).toFixed(2)) {
                    profileFound = true;
                    await loadSubProfiles(obj.profileCode);
                    await new Promise(resolve => {
                        const observer = new MutationObserver((mutations, obs) => {
                            if (document.getElementById('profileSizeDropdown').children.length > 0) {
                                obs.disconnect();
                                resolve();
                            }
                        });
                        observer.observe(document.getElementById('profileSizeDropdown'), {childList: true});
                    });
                    document.querySelectorAll('#profileSizeDropdown a')[Number(obj.localIndex)].click();
                }
            }));
        })
        .catch(error => console.error("Error loading CSV:", error)));
    }
    if (profileType == 'L') {
        fetchPromises.push(fetch('data/L.csv')
        .then(response => response.text())
        .then(text => {
            return Promise.all(parseCSV(text).forEach(async obj => {
                if (
                    parseFloat(obj.h).toFixed(2) == parseFloat(height).toFixed(2) 
                    && parseFloat(obj.b).toFixed(2) == parseFloat(flangeWidth).toFixed(2) 
                    && parseFloat(obj.thk).toFixed(2) == parseFloat(flangeThickness).toFixed(2)) {
                    profileFound = true;
                    await loadSubProfiles(obj.profileCode);
                    await new Promise(resolve => {
                        const observer = new MutationObserver((mutations, obs) => {
                            if (document.getElementById('profileSizeDropdown').children.length > 0) {
                                obs.disconnect();
                                resolve();
                            }
                        });
                        observer.observe(document.getElementById('profileSizeDropdown'), {childList: true});
                    });
                    document.querySelectorAll('#profileSizeDropdown a')[Number(obj.localIndex)].click();
                }
            }));
        })
        .catch(error => console.error("Error loading CSV:", error)));
        fetchPromises.push(promise);
    }
    else if (profileType == 'M' && height == flangeWidth) {
        profileType = 'SHS';
        fetchPromises.push(fetch('data/SHS.csv')
        .then(response => response.text())
        .then(text => {
            return Promise.all(parseCSV(text).forEach(async (obj, index) => {
                if (
                    parseFloat(obj.h).toFixed(2) == parseFloat(height).toFixed(2) 
                    && parseFloat(obj.thk).toFixed(2) == parseFloat(flangeThickness).toFixed(2)) {
                    profileFound = true;
                    await loadSubProfiles(obj.profileCode);
                    await new Promise(resolve => {
                        const observer = new MutationObserver((mutations, obs) => {
                            if (document.getElementById('profileSizeDropdown').children.length > 0) {
                                obs.disconnect();
                                resolve();
                            }
                        });
                        observer.observe(document.getElementById('profileSizeDropdown'), {childList: true});
                    });
                    document.querySelectorAll('#profileSizeDropdown a')[index].click();
                }
            }));
        })
        .catch(error => console.error("Error loading CSV:", error)));
    }
    else if (profileType == 'M' && height != flangeWidth) {
        profileType = 'RHS';
        fetchPromises.push(fetch('data/RHS.csv')
        .then(response => response.text())
        .then(text => {
            return Promise.all(parseCSV(text).forEach(async (obj, index) => {
                if (
                    parseFloat(obj.h).toFixed(2) == parseFloat(height).toFixed(2) 
                    && parseFloat(obj.b).toFixed(2) == parseFloat(flangeWidth).toFixed(2) 
                    && parseFloat(obj.thk).toFixed(2) == parseFloat(flangeThickness).toFixed(2)) {
                    profileFound = true;
                    await loadSubProfiles(obj.profileCode);
                    await new Promise(resolve => {
                        const observer = new MutationObserver((mutations, obs) => {
                            if (document.getElementById('profileSizeDropdown').children.length > 0) {
                                obs.disconnect();
                                resolve();
                            }
                        });
                        observer.observe(document.getElementById('profileSizeDropdown'), {childList: true});
                    });
                    document.querySelectorAll('#profileSizeDropdown a')[index].click();
                }
            }));
        })
        .catch(error => console.error("Error loading CSV:", error)));
    }
    else if (profileType == 'RO') {
        profileType = 'CHS';
        fetchPromises.push(fetch('data/CHS.csv')
        .then(response => response.text())
        .then(text => {
            return Promise.all(parseCSV(text).forEach(async (obj, index) => {
                if (
                    parseFloat(obj.od).toFixed(2) == parseFloat(flangeWidth).toFixed(2) 
                    && parseFloat(obj.thk).toFixed(2) == parseFloat(flangeThickness).toFixed(2)) {
                    profileFound = true;
                    await loadSubProfiles(obj.profileCode);
                    await new Promise(resolve => {
                        const observer = new MutationObserver((mutations, obs) => {
                            if (document.getElementById('profileSizeDropdown').children.length > 0) {
                                obs.disconnect();
                                resolve();
                            }
                        });
                        observer.observe(document.getElementById('profileSizeDropdown'), {childList: true});
                    });
                    document.querySelectorAll('#profileSizeDropdown a')[index].click();
                }
            }));
        })
        .catch(error => console.error("Error loading CSV:", error)));
    }
    else if (profileType == 'RU') {
        profileType = 'Round';
        fetchPromises.push(fetch('data/round.csv')
        .then(response => response.text())
        .then(text => {
            return Promise.all(parseCSV(text).forEach(async (obj, index) => {
                if (parseFloat(obj.od).toFixed(2) == parseFloat(flangeWidth).toFixed(2)) {
                    profileFound = true;
                    await loadSubProfiles(obj.profileCode);
                    await new Promise(resolve => {
                        const observer = new MutationObserver((mutations, obs) => {
                            if (document.getElementById('profileSizeDropdown').children.length > 0) {
                                obs.disconnect();
                                resolve();
                            }
                        });
                        observer.observe(document.getElementById('profileSizeDropdown'), {childList: true});
                    });
                    document.querySelectorAll('#profileSizeDropdown a')[index].click();
                }
            }));
        })
        .catch(error => console.error("Error loading CSV:", error)));
    }
    // Wait for all fetch operations to complete
    await Promise.all(fetchPromises);
    if (!profileFound) {
        handleMissingProfile();
    }
    else {
        document.getElementById('Length').value = length; //Set length value to length of DSTV part
        document.getElementById('Quantity').value = quantity; //Set quantity value to quantity of DSTV part
    }
}

function handleMissingProfile() {
    document.getElementById('profileData').innerHTML = 'please select a profile and a size!';
    M.toast({html: 'Profile not in database!', classes: 'rounded toast-warning', displayLength: 2000});
}

function loadIndexPage(){
    sessionStorage.setItem("filePairs", JSON.stringify(Object.fromEntries(filePairs)));
    sessionStorage.setItem("selectedFile", selectedFile);
    window.location.href = "index.html";
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

let csvData = [];
let csvPath = '';
let loadedProfile = '';
let loadedProfileCode = '';
function loadSubProfiles(btn) {
    return new Promise(resolve => {
        if (typeof btn === "object") {
            var profile = btn.innerHTML;
            var instance = M.Dropdown.getInstance(document.getElementById('profileDropdownBtn'));
            instance.close();
        }
        else var profile = btn;
        
        const img = document.querySelector('#profileImage img');
        //If a new profile type is selected it removes profile data content
        if (loadedProfileCode != profile) {
            loadedProfileCode = profile;
            document.getElementById('profileData').innerHTML = 'please select a profile and a size!';
        }
        if (['IPE', 'HE', 'M', 'W', 'UB', 'H-JS', 'H-KS', 'IPN', 'S', 'J', 'IB', 'HD', 'UC', 'HP', 'UBP'].includes(profile)) {
            //If a new profile type is selected it removes profile data content
            if (loadedProfile != 'I') {
                loadedProfile = 'I';
                document.getElementById('profileData').innerHTML = 'please select a profile and a size!';
            }
            csvPath = 'data/I.csv';
            img.src = 'Images/Profiles/I.png';
        }
        else if (['UPE', 'PFC', 'UPN', 'U', 'C', 'MC', 'CH', 'CN', 'TFC'].includes(profile)) {
            loadedProfile = 'U';
            csvPath = 'data/U.csv';
            img.src = 'Images/Profiles/U.png';
        }
        else if (['EA', 'UA'].includes(profile)) {
            loadedProfile = 'L';
            csvPath = 'data/L.csv';
            img.src = 'Images/Profiles/L.png';
        }
        else if (profile == 'Rebar') {
            loadedProfile = 'Rebar';
            csvPath = 'data/rebar.csv';
            img.src = 'Images/Profiles/round.png';
        }
        else if (profile == 'CHS') {
            loadedProfile = 'CHS';
            csvPath = 'data/CHS.csv';
            img.src = 'Images/Profiles/CHS.png';
        }
        else if (profile == 'Flat') {
            loadedProfile = 'Flat';
            csvPath = 'data/flat.csv';
            img.src = 'Images/Profiles/flat.png';
        }
        else if (profile == 'Square') {
            loadedProfile = 'Square';
            csvPath = 'data/square.csv';
            img.src = 'Images/Profiles/square.png';
        }
        else if (profile == 'Round') {
            loadedProfile = 'Round';
            csvPath = 'data/round.csv';
            img.src = 'Images/Profiles/round.png';
        }
        else if (profile == 'RHS') {
            loadedProfile = 'RHS';
            csvPath = 'data/RHS.csv';
            img.src = 'Images/Profiles/SHS.png';
        }
        else if (profile == 'SHS') {
            loadedProfile = 'SHS';
            csvPath = 'data/SHS.csv';
            img.src = 'Images/Profiles/SHS.png';
        }
        else {
            M.toast({html: 'Profile not supported!', classes: 'rounded toast-error', displayLength: 2000})
            img.src = 'Images/Profiles/no-profile.png';
            document.getElementById('profileSizeDropdown').innerHTML = '<a class="deep-purple-text lighten-3">Please select a profile!</a>';
            document.getElementById('profileData').innerHTML = 'please select a profile and a size!';
            return;
        }
        fetch(csvPath)
            .then(response => response.text())
            .then(text => {
                csvData = parseCSV(text).filter(row => row.profileCode == profile);
    
                const profileSizeDropdown = document.getElementById('profileSizeDropdown');
                profileSizeDropdown.innerHTML = ""; //Clear profile size dropdown
                csvData.forEach((obj, index) => {
                    const item = document.createElement('li');
                    const profileID = getProfileID(obj);
                    item.innerHTML = `<a class="deep-purple-text lighten-3" data-index="${index}" onclick="loadProfile(this)">${profileID}</a>`;
                    profileSizeDropdown.appendChild(item);
                });
            })
            .catch(error => console.error("Error loading CSV:", error));
        resolve();
    })
}

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
        displayProfile(selectedProfile); //Display full profile data in view
    }
}

function displayProfile(selectedProfile) {
    if (loadedProfile == 'I' || loadedProfile == 'U') {
        clearViewProfileData();
        const name = document.createElement('p');
        const weight = document.createElement('p');
        weightValue = parseFloat(selectedProfile.kgm).toFixed(2);
        const height = document.createElement('p');
        const width = document.createElement('p');
        const webThickness = document.createElement('p');
        const flangeThickness = document.createElement('p');
        const radius = document.createElement('p');
        const code = document.createElement('p');
        const profileData = document.getElementById('profileData');

        name.innerHTML = `Profile name: ${selectedProfile.name}`;
        weight.innerHTML = `Weight: ${weightValue} kg/m`;
        height.innerHTML = `Height: ${selectedProfile.h} mm`;
        width.innerHTML = `Width: ${selectedProfile.b} mm`;
        webThickness.innerHTML = `Web thickness: ${selectedProfile.tw} mm`;
        flangeThickness.innerHTML = `Flange thickness: ${selectedProfile.tf} mm`;
        radius.innerHTML = `Radius: ${selectedProfile.r} mm`;
        code.innerHTML = `Code: ${selectedProfile.code}`;

        [name, weight, height, width, webThickness, flangeThickness, radius, code].forEach(e => { profileData.appendChild(e) });
    }
    else if (loadedProfile == 'Rebar' || loadedProfile == 'Round') {
        clearViewProfileData();
        const name = document.createElement('p');
        const weight = document.createElement('p');
        weightValue = parseFloat(selectedProfile.kgm).toFixed(2);
        const od = document.createElement('p');
        const code = document.createElement('p');
        const profileData = document.getElementById('profileData');

        name.innerHTML = `Profile name: ${selectedProfile.profileCode}`;
        weight.innerHTML = `Weight: ${weightValue} kg/m`;
        od.innerHTML = `Outside diameter: ${selectedProfile.od} mm`;
        code.innerHTML = `Code: ${selectedProfile.code}`;

        [name, weight, od, code].forEach(e => { profileData.appendChild(e) });
    }
    else if (loadedProfile == 'CHS') {
        clearViewProfileData();
        const name = document.createElement('p');
        const od = document.createElement('p');
        const weight = document.createElement('p');
        weightValue = parseFloat(selectedProfile.kgm).toFixed(2);
        const thickness = document.createElement('p');
        const code = document.createElement('p');
        const nps = document.createElement('p');
        const sch = document.createElement('p');
        const profileData = document.getElementById('profileData');

        name.innerHTML = `Profile name: ${selectedProfile.profileCode}`;
        weight.innerHTML = `Weight: ${weightValue} kg/m`;
        od.innerHTML = `Outside diameter: ${selectedProfile.od} mm`;
        thickness.innerHTML = `Wall thickness: ${selectedProfile.thk} mm`;
        nps.innerHTML = `NPS: ${selectedProfile.nps} inch`;
        sch.innerHTML = `Sch: ${selectedProfile.sch}`;
        code.innerHTML = `Code: ${selectedProfile.code}`;

        [name, weight, od, thickness, nps, sch, code].forEach(e => { profileData.appendChild(e) });
    }
    else if (loadedProfile == 'Flat') {
        clearViewProfileData();
        const name = document.createElement('p');
        const weight = document.createElement('p');
        weightValue = parseFloat(selectedProfile.kgm).toFixed(2);
        const thickness = document.createElement('p');
        const width = document.createElement('p');
        const code = document.createElement('p');
        const profileData = document.getElementById('profileData');

        name.innerHTML = `Profile name: ${selectedProfile.profileCode}`;
        weight.innerHTML = `Weight: ${weightValue} kg/m`;
        thickness.innerHTML = `Thickness: ${selectedProfile.thk} mm`;
        width.innerHTML = `Width: ${selectedProfile.b} mm`;
        code.innerHTML = `Code: ${selectedProfile.code}`;

        [name, weight, thickness, width, code].forEach(e => { profileData.appendChild(e) });
    }
    else if (loadedProfile == 'Square') {
        clearViewProfileData();
        const name = document.createElement('p');
        const weight = document.createElement('p');
        weightValue = parseFloat(selectedProfile.kgm).toFixed(2);
        const length = document.createElement('p');
        const code = document.createElement('p');
        const profileData = document.getElementById('profileData');

        name.innerHTML = `Profile name: ${selectedProfile.profileCode}`;
        weight.innerHTML = `Weight: ${weightValue} kg/m`;
        length.innerHTML = `Side length: ${selectedProfile.l} mm`;
        code.innerHTML = `Code: ${selectedProfile.code}`;

        [name, weight, length, code].forEach(e => { profileData.appendChild(e) });
    }
    else if (loadedProfile == 'RHS' || loadedProfile == 'SHS' || loadedProfile == 'L') {
        clearViewProfileData();
        const name = document.createElement('p');
        const weight = document.createElement('p');
        weightValue = parseFloat(selectedProfile.kgm).toFixed(2);
        const thickness = document.createElement('p');
        const height = document.createElement('p');
        const width = document.createElement('p');
        const code = document.createElement('p');
        const profileData = document.getElementById('profileData');

        name.innerHTML = `Profile name: ${selectedProfile.profileCode}`;
        weight.innerHTML = `Weight: ${weightValue} kg/m approx.`;
        thickness.innerHTML = `Thickness: ${selectedProfile.thk} mm`;
        height.innerHTML = `Height: ${selectedProfile.h} mm`;
        width.innerHTML = `Width: ${selectedProfile.b} mm`;
        code.innerHTML = `Code: ${selectedProfile.code}`;

        [name, weight, thickness, height, width, code].forEach(e => { profileData.appendChild(e) });
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
let weightValue = 0;
function calcWeight() {
    if (weightValue == 0) {
        M.toast({html: 'Please choose a profile!', classes: 'rounded toast-error', displayLength: 2000})
        return;
    }
    const length = parseFloat(document.getElementById('Length').value);
    const quantity = parseFloat(document.getElementById('Quantity').value);
    const weight = (weightValue * length * quantity / 1000).toFixed(2);
    if (isNaN(weight)) {
        M.toast({html: 'Please enter correct numbers!', classes: 'rounded toast-error', displayLength: 2000})
        return;
    }
    M.toast({html: `Weight: ${weight} Kg`, classes: 'rounded toast-success', displayLength: 2000});
}
