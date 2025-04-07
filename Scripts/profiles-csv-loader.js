
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
            const csv = parseCSV(text);
            const promises = csv.map(async obj => {
                if (
                    (obj.name.toUpperCase().replace(/ /g,'') == profileName) ||
                    (obj.alt != '' && obj.alt.toUpperCase().replace(/ /g,'') == profileName) ||
                    (parseFloat(obj.h).toFixed(2) == parseFloat(height).toFixed(2) 
                    && parseFloat(obj.b).toFixed(2) == parseFloat(flangeWidth).toFixed(2) 
                    && parseFloat(obj.tw).toFixed(2) == parseFloat(webThickness).toFixed(2) 
                    && parseFloat(obj.tf).toFixed(2) == parseFloat(flangeThickness).toFixed(2) 
                    && parseFloat(obj.r).toFixed(2) == parseFloat(radius).toFixed(2))) {
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
            });
            return Promise.all(promises);
        }));
    }
    if (profileType == 'L') {
        fetchPromises.push(fetch('data/L.csv')
        .then(response => response.text())
        .then(text => {
            const csv = parseCSV(text);
            const promises = csv.map(async obj => {
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
            });
            return Promise.all(promises);
        }));
    }
    else if (profileType == 'M' && height == flangeWidth) {
        profileType = 'SHS';
        fetchPromises.push(fetch('data/SHS.csv')
        .then(response => response.text())
        .then(text => {
            const csv = parseCSV(text);
            const promises = csv.map(async (obj, index) => {
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
            });
            return Promise.all(promises);
        }));
    }
    else if (profileType == 'M' && height != flangeWidth) {
        profileType = 'RHS';
        fetchPromises.push(fetch('data/RHS.csv')
        .then(response => response.text())
        .then(text => {
            const csv = parseCSV(text);
            const promises = csv.map(async (obj, index) => {
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
            });
            return Promise.all(promises);
        }));
    }
    else if (profileType == 'RO') {
        profileType = 'CHS';
        fetchPromises.push(fetch('data/CHS.csv')
        .then(response => response.text())
        .then(text => {
            const csv = parseCSV(text);
            const promises = csv.map(async (obj, index) => {
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
            });
            return Promise.all(promises);
        }));
    }
    else if (profileType == 'RU') {
        profileType = 'Round';
        fetchPromises.push(fetch('data/round.csv')
        .then(response => response.text())
        .then(text => {
            const csv = parseCSV(text);
            const promises = csv.map(async (obj, index) => {
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
            });
            return Promise.all(promises);
        }));
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
            });
        resolve();
    })
}