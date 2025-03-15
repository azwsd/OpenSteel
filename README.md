# OpenSteel
## _DSTV viewer made with love_

OpenSteel is a webapp for viewing DSTV (.nc and .nc1) files made with HTML, CSS, and JS according to __STANDARD DESCRIPTION FOR STEEL STRUCTURE PIECES FOR THE NUMERICAL CONTROL, July 1998, 7. ST Edition__.

## Features

- Import multible DSTV (.nc and .nc1) files at once
- Panning, zooming and measure functionality
- Snap points for taking measurements
- DSTV header data viewer
- Hole data viewer

OpenSteel is opensource, lightweight webapp with great functionality

## Tech
OpenSteel uses pure HTML, CSS, and JS

- [Materialize] - Framework for styling and adding responsive behavoir
- [Konva] - A JS API for creating stages and drawing on them

## File Structure
```
project
│   README.md
│   Index.html   
│
└───Fonts
│ 
└───Images
│ 
└───Scripts
│ blocDrawer.js **Handles the drawing of parsed DSTV files into shapes
│ fileHandler.js **Handle information viewing
│ konva.min.js the **Main Konva script
│ konva-scripts.js **Helper script for Konva to add aditional functionality
│ main.js **Main script file for file importing
│ materialize-main.js **Main Materialize script
│ materialize-scripts.js **Intialize scripts for Materialize
│ ncFileParser.js **Handles file parsing
└───Styles
│ main.css **Main style sheet
│ materialize-icons.css **Imports Materialize icons locally
| materialize-main.css **Main Materialize style sheet
```

## Some Functions Explained
### ncFileParser.js
- ncParseBlocData(fileData) **Calls correct parsing fucntion depending on bloc name
- ncParseHeaderData(fileData) **Parses the header data for DTSV file
- ncParseContourData(line) **Parses the contour data for DSTV file (AK and IK blocs)
- ncParseHoleData(line) **Parses the hole data for DSTV file (BO bloc)
- ncParseMarksData(line, isStart) **Parses the mark data for DSTV file (KO and PU blocs)
- ncParseNumertaionsData(line) **Parses the numbering data for DSTV file (SI bloc)
- addHoleData() **Adds hole cards to Index.html for viewing
- ncHeaderFullyDefined() **If the header data is sufficent for defining the part (no contour data) this function handles drawing the part
### blocDrawer.js
- drawContours() **Draws parsed contour data using Konva
- drawContours() **Draws parsed hole data using Konva
- drawMarks() **Draws parsed mark data using Konva
- transformCoordinates(view, x, y, width, height) **Takes in view, x, and y corrdinate and returns transformed positions according to DSTV standard
## License

OpenSteel, Ahmed Mohamed Ragab.