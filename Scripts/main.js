//loads files
const fileInput = document.querySelector("#fileInput");

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

//Makes the action buttons always under the nav bar
window.addEventListener("scroll", function () {
    let navbar = document.querySelector(".navbar-fixed");
    let buttonContainer = document.querySelector("#functionButtons");
    let navHeight = navbar.offsetHeight;
    
    buttonContainer.style.top = navHeight + "px";
});

//Download all views when ctrl + s is pressed
document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.key === 's') { //Detect Ctrl + S
        e.preventDefault(); //Prevent default browser save behavior
        Object.keys(stages).forEach(view => {
            if(document.getElementById(view).classList.contains('hide')) return; //If view is hidden skip it
            let stage = stages[view];
            let dataURL = stage.toDataURL({ pixelRatio: 5 }); //High resolution export
            
            let link = document.createElement('a');
            link.href = dataURL;
            link.download = `${view}.png`; //Name based on view name
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }
    else if(e.key === 's') { //Detect S
        e.preventDefault(); //Prevent default browser save behavior
        let stage = stages[activeView]
        let dataURL = stage.toDataURL({ pixelRatio: 5 }); //High resolution export
    
        let link = document.createElement('a');
        link.href = dataURL;
        link.download = `${activeView}.png`; //Name based on view name
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});

//Function buttons shortcuts
document.addEventListener('keydown', function (e) {
    if(e.key.toLowerCase() === 'p') activatePanTool();
    if(e.key.toLowerCase() === 'm') activateMeasureTool();
    if(e.key.toLowerCase() === 't') toggleSnapIndicators()
    if(e.key.toLowerCase() === 'c') M.Modal.getInstance(document.getElementById('clearMeasurementsModal')).open();
    //Switching views
    if(e.key.toLowerCase() === 'o') document.querySelector(`.viewSwitch[data-view="o"]`).click();
    if(e.key.toLowerCase() === 'v') document.querySelector(`.viewSwitch[data-view="v"]`).click();
    if(e.key.toLowerCase() === 'u') document.querySelector(`.viewSwitch[data-view="u"]`).click();
    if(e.key.toLowerCase() === 'h') document.querySelector(`.viewSwitch[data-view="h"]`).click();
});