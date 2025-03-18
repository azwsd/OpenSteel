# OpenSteel
## _DSTV Viewer Made with Love_

OpenSteel is a web app for viewing DSTV (.nc and .nc1) files made with HTML, CSS, and JS according to __STANDARD DESCRIPTION FOR STEEL STRUCTURE PIECES FOR THE NUMERICAL CONTROL, July 1998, 7. ST Edition__.

## Features

- Import multiple DSTV (.nc and .nc1) files at once
- Panning, zooming, and measuring functionality
- Snap points for taking measurements
- DSTV header data viewer
- Hole data viewer

OpenSteel is an open-source, lightweight web app with great functionality.

## Supported DSTV Blocks

OpenSteel supports parsing and rendering the following DSTV blocks:

- **BO (Boreholes)** - Defines hole positions, diameters, and depths.
- **AK (Outer Contour)** - Defines the external shape of the steel part.
- **IK (Inner Contour)** - Defines cutouts inside the part.
- **SI (Numeration Data)** - Contains numbering and identification data.
- **PU (Marking)** - Defines markings on the part for assembly guidance.
- **KO (Marking)** - Similar to PU but for other specific markings.

## Tech

OpenSteel uses pure HTML, CSS, and JS:

- [Materialize] - Framework for styling and adding responsive behavior
- [Konva] - A JS API for creating stages and drawing on them

## File Structure

```
project
│   README.md
│   index.html   
│
└───Fonts
│
└───Images
│
└───Scripts
│   blocDrawer.js          **Handles the drawing of parsed DSTV files into shapes
│   fileHandler.js         **Handles information viewing
│   konva.min.js           **Main Konva script
│   konva-scripts.js       **Helper script for Konva to add additional functionality
│   main.js                **Main script file for file importing
│   materialize-main.js    **Main Materialize script
│   materialize-scripts.js **Initialize scripts for Materialize
│   ncFileParser.js        **Handles file parsing
└───Styles
│   main.css               **Main stylesheet
│   materialize-icons.css  **Imports Materialize icons locally
│   materialize-main.css   **Main Materialize stylesheet
```

## Some Functions Explained

### ncFileParser.js

- `ncParseBlocData(fileData)` - Calls the correct parsing function depending on the block name.
- `ncParseHeaderData(fileData)` - Parses the header data for the DSTV file.
- `ncParseContourData(line)` - Parses the contour data for DSTV files (AK and IK blocks).
- `ncParseHoleData(line)` - Parses the hole data for DSTV files (BO block).
- `ncParseMarksData(line, isStart)` - Parses the mark data for DSTV files (KO and PU blocks).
- `ncParseNumerationsData(line)` - Parses the numbering data for DSTV files (SI block).
- `addHoleData()` - Adds hole cards to index.html for viewing.
- `ncHeaderFullyDefined()` - If the header data is sufficient for defining the part (no contour data), this function handles drawing the part.

### blocDrawer.js

- `drawContours()` - Draws parsed contour data using Konva.
- `drawHoles()` - Draws parsed hole data using Konva.
- `drawMarks()` - Draws parsed mark data using Konva.
- `transformCoordinates(view, x, y, width, height)` - Takes in view, x, and y coordinates and returns transformed positions according to the DSTV standard.

## License

OpenSteel, Ahmed Mohamed Ragab.

