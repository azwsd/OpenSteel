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