async function findProfile() {
    const quantity = Number(headerData[5]);
    const profileName = headerData[6].toUpperCase().replace(/ /g,''); 
    const profileType = headerData[7].toUpperCase();
    const length = headerData[8];
    const height = headerData[9];
    const flangeWidth = headerData[10];
    const flangeThickness = headerData[11];
    const webThickness = headerData[12];
    const radius = headerData[13];
    
    let profileFound = false;
    let fetchPromises = [];

    if (!(['I', 'U', 'L', 'M', 'RO', 'RU', 'C'].includes(profileType))) {
        M.toast({html: 'Profile not supported!', classes: 'rounded toast-error', displayLength: 2000});
        document.getElementById('profileData').innerHTML = 'please select a profile and a size!';
        return;
    }

    // Convert DSTV profile type to standard type
    if (profileType == 'I' || profileType == 'U' || profileType == 'C') {
        csvPath = profileType == 'I' ? 'data/I.csv' : 'data/U.csv';
        fetchPromises.push(fetch(csvPath)
        .then(response => response.text())
        .then(async text => {
            const csv = parseCSV(text);
            for (const obj of csv) {
                if (
                    (obj.name && obj.name.toUpperCase().replace(/ /g,'') == profileName) ||
                    (obj.alt != undefined && obj.alt != '' && obj.alt.toUpperCase().replace(/ /g,'') == profileName) ||
                    (parseFloat(obj.h).toFixed(2) == parseFloat(height).toFixed(2) 
                    && parseFloat(obj.b).toFixed(2) == parseFloat(flangeWidth).toFixed(2) 
                    && parseFloat(obj.tw).toFixed(2) == parseFloat(webThickness).toFixed(2) 
                    && parseFloat(obj.tf).toFixed(2) == parseFloat(flangeThickness).toFixed(2) 
                    && parseFloat(obj.r).toFixed(2) == parseFloat(radius).toFixed(2))) {
                    
                    profileFound = true;
                    await loadSubProfiles(obj.profileCode);
                    
                    // Auto-select the matching profile in autocomplete
                    const displayText = getProfileID(obj);
                    loadProfile(displayText, obj);
                    break;
                }
            }
        }));
    }
    
    if (profileType == 'L') {
        fetchPromises.push(fetch('data/L.csv')
        .then(response => response.text())
        .then(async text => {
            const csv = parseCSV(text);
            for (const obj of csv) {
                if (
                    parseFloat(obj.h).toFixed(2) == parseFloat(height).toFixed(2) 
                    && parseFloat(obj.b).toFixed(2) == parseFloat(flangeWidth).toFixed(2) 
                    && parseFloat(obj.thk).toFixed(2) == parseFloat(flangeThickness).toFixed(2)) {
                    
                    profileFound = true;
                    await loadSubProfiles(obj.profileCode);
                    
                    const displayText = getProfileID(obj);
                    loadProfile(displayText, obj);
                    break;
                }
            }
        }));
    }
    else if (profileType == 'M' && height == flangeWidth) {
        fetchPromises.push(fetch('data/SHS.csv')
        .then(response => response.text())
        .then(async text => {
            const csv = parseCSV(text);
            for (const obj of csv) {
                if (
                    parseFloat(obj.h).toFixed(2) == parseFloat(height).toFixed(2) 
                    && parseFloat(obj.thk).toFixed(2) == parseFloat(flangeThickness).toFixed(2)) {
                    
                    profileFound = true;
                    await loadSubProfiles(obj.profileCode);
                    
                    const displayText = getProfileID(obj);
                    loadProfile(displayText, obj);
                    break;
                }
            }
        }));
    }
    else if (profileType == 'M' && height != flangeWidth) {
        fetchPromises.push(fetch('data/RHS.csv')
        .then(response => response.text())
        .then(async text => {
            const csv = parseCSV(text);
            for (const obj of csv) {
                if (
                    parseFloat(obj.h).toFixed(2) == parseFloat(height).toFixed(2) 
                    && parseFloat(obj.b).toFixed(2) == parseFloat(flangeWidth).toFixed(2) 
                    && parseFloat(obj.thk).toFixed(2) == parseFloat(flangeThickness).toFixed(2)) {
                    
                    profileFound = true;
                    await loadSubProfiles(obj.profileCode);
                    
                    const displayText = getProfileID(obj);
                    loadProfile(displayText, obj);
                    break;
                }
            }
        }));
    }
    else if (profileType == 'RO') {
        fetchPromises.push(fetch('data/CHS.csv')
        .then(response => response.text())
        .then(async text => {
            const csv = parseCSV(text);
            for (const obj of csv) {
                if (
                    parseFloat(obj.od).toFixed(2) == parseFloat(flangeWidth).toFixed(2) 
                    && parseFloat(obj.thk).toFixed(2) == parseFloat(flangeThickness).toFixed(2)) {
                    
                    profileFound = true;
                    await loadSubProfiles(obj.profileCode);
                    
                    const displayText = getProfileID(obj);
                    loadProfile(displayText, obj);
                    break;
                }
            }
        }));
    }
    else if (profileType == 'RU') {
        fetchPromises.push(fetch('data/round.csv')
        .then(response => response.text())
        .then(async text => {
            const csv = parseCSV(text);
            for (const obj of csv) {
                if (parseFloat(obj.od).toFixed(2) == parseFloat(flangeWidth).toFixed(2)) {
                    profileFound = true;
                    await loadSubProfiles(obj.profileCode);
                    
                    const displayText = getProfileID(obj);
                    loadProfile(displayText, obj);
                    break;
                }
            }
        }));
    }
    
    // Wait for all fetch operations to complete
    await Promise.all(fetchPromises);
    if (!profileFound) {
        handleMissingProfile();
    }
    else {
        document.getElementById('Length').value = length;
        document.getElementById('Quantity').value = quantity;
    }
}

let csvData = [];
let csvPath = '';
let loadedProfile = '';
let loadedProfileCode = '';
let selectedProfileType = '';
let selectedProfileSize = '';
let profileTypeAutocompleteInstance = null;
let profileSizeAutocompleteInstance = null;
let profileDropdownInstance = null;
let profileSizeDropdownInstance = null;
function loadSubProfiles(btn) {
    return new Promise(resolve => {
        // Handle both string and object inputs
        const profile = typeof btn === "object" ? btn.innerHTML : btn;
        
        // Update both autocomplete and any UI displays
        const profileTypeElem = document.getElementById('profileTypeAutocomplete');
        profileTypeElem.value = profile;
        selectedProfileType = profile;
        
        // Update label to active state
        const profileTypeLabel = profileTypeElem.nextElementSibling;
        if (profileTypeLabel) {
            profileTypeLabel.classList.add('active');
        }
        
        // Clear previous size selection
        const profileSizeElem = document.getElementById('profileSizeAutocomplete');
        profileSizeElem.value = '';
        selectedProfileSize = '';
        clearViewProfileData();
        
        // Reset if loading a different profile type
        if (loadedProfileCode !== profile) {
            loadedProfileCode = profile;
            clearViewProfileData();
        }
        
        const img = document.querySelector('#profileImage img');
        
        // Determine profile type and CSV path (your existing logic)
        if (['IPE', 'HE', 'M', 'W', 'UB', 'H-JS', 'H-KS', 'IPN', 'S', 'J', 'IB', 'HD', 'UC', 'HP', 'UBP'].includes(profile)) {
            if (loadedProfile != 'I') {
                loadedProfile = 'I';
                clearViewProfileData();
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
            M.toast({html: 'Profile not supported!', classes: 'rounded toast-error', displayLength: 2000});
            img.src = 'Images/Profiles/no-profile.png';
            profileSizeElem.disabled = true;
            
            // Clear both autocomplete and dropdown
            if (profileSizeAutocompleteInstance) {
                profileSizeAutocompleteInstance.destroy();
            }
            const profileSizeDropdown = document.getElementById('profileSizeDropdown');
            profileSizeDropdown.innerHTML = '<li><a class="deep-purple-text">Please select a profile!</a></li>';
            
            clearViewProfileData();
            resolve();
            return;
        }
        
        // Fetch CSV data
        fetch(csvPath)
            .then(response => response.text())
            .then(text => {
                csvData = parseCSV(text).filter(row => row.profileCode == profile);
                
                // Enable size autocomplete
                profileSizeElem.disabled = false;
                
                // Create autocomplete data for sizes
                const sizeData = {};
                csvData.forEach((obj, index) => {
                    const displayText = getProfileID(obj);
                    sizeData[displayText] = null;
                    obj.localIndex = index; // Store the index for later use
                });
                
                // Update autocomplete
                if (profileSizeAutocompleteInstance) {
                    profileSizeAutocompleteInstance.destroy();
                }
                
                profileSizeAutocompleteInstance = M.Autocomplete.init(profileSizeElem, {
                    data: sizeData,
                    limit: 10,
                    onAutocomplete: function(val) {
                        selectedProfileSize = val;
                        const profileData = findProfileByDisplayText(val);
                        if (profileData) {
                            displayProfile(profileData);
                        }
                    }
                });
                
                // Update dropdown
                const profileSizeDropdown = document.getElementById('profileSizeDropdown');
                profileSizeDropdown.innerHTML = ""; // Clear dropdown
                
                csvData.forEach((obj, index) => {
                    const item = document.createElement('li');
                    const profileID = getProfileID(obj);
                    item.innerHTML = `<a class="deep-purple-text lighten-3" onclick="selectProfileSizeFromDropdown('${profileID}', ${index})">${profileID}</a>`;
                    profileSizeDropdown.appendChild(item);
                });
                
                // Update label to active state
                const sizeLabel = profileSizeElem.nextElementSibling;
                if (sizeLabel) {
                    sizeLabel.classList.add('active');
                }
                
                resolve();
            })
            .catch(error => {
                console.error('Error loading CSV:', error);
                M.toast({html: 'Error loading profile data!', classes: 'rounded toast-error', displayLength: 2000});
                resolve();
            });
    });
}