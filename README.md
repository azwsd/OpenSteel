# OpenSteel

## _A DSTV Viewer and Steel Profile Library_

OpenSteel is a web app that not only allows you to view DSTV files but also provides a steel profile library for easy access to standard steel profiles. It also allows for profile linear nesting from DSTV and/or user input. Built with HTML, CSS, and JavaScript, OpenSteel is an open-source, lightweight web app designed to help engineers and fabricators.

## Table of Contents

- [Features](#features)
- [Supported DSTV Blocks](#supported-dstv-blocks)
- [Tech Stack](#tech-stack)
- [File Structure](#file-structure)
- [Some Functions Explained](#some-functions-explained)
- [License](#license)
- [Contributing](#contributing)

## Features

- Import multiple DSTV (.nc and .nc1) files at once
- Panning, zooming, and measuring functionality
- Snap points for precise measurements
- DSTV header and hole data viewer
- Steel profile library with common steel sections
- Simple, easy-to-use interface

## Supported DSTV Blocks

OpenSteel supports parsing and rendering the following DSTV blocks:

- **BO (Boreholes)** - Defines hole positions, diameters, and depths.
- **AK (Outer Contour)** - Defines the external shape of the steel part.
- **IK (Inner Contour)** - Defines cutouts inside the part.
- **SI (Numeration Data)** - Contains numbering and identification data.
- **PU (Marking)** - Defines markings on the part for assembly guidance.
- **KO (Marking)** - Similar to PU but for other specific markings.

## Tech Stack

OpenSteel is built using the following technologies:

- **HTML5** and **CSS3** for the structure and styling
- **JavaScript** for functionality
- **Materialize** for styling and responsive behavior
- **Konva.js** for interactive canvas drawing
- **jszip.js** for creating zip files
- **jsPDF.js** for creating PDF files

## File Structure

```
project
│   README.md
│   index.html
│   profiles.html 
│   nesting.html
│
└───Fonts
│
└───Images
│
└───Scripts
│   blocDrawer.js          **Handles the drawing of parsed DSTV files into shapes
│   fileHandler.js         **Handles information viewing
│   jsPDF-autotable.min.js **Helper library for jsPDF
│   jsPDF.min.js           **Library for creating PDFs
│   jszip.min.js           **Library for creating zip files
│   konva.min.js           **Main Konva script
│   konva-scripts.js       **Helper script for Konva to add additional functionality
│   main.js                **Main script file for file importing
│   materialize-main.js    **Main Materialize script
│   materialize-scripts.js **Initialize scripts for Materialize
│   ncFileParser.js        **Handles file parsing
│   nesting-main.js        **Main script file for linear nesting
│   profiles-csv-loader.js **Handles csv file loading
│   profiles-main.js       **Handles the profile library functionality
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
- `addHoleData()` - Adds hole cards to `index.html` for viewing.
- `ncHeaderFullyDefined()` - If the header data is sufficient for defining the part (no contour data), this function handles drawing the part.

### blocDrawer.js

- `drawContours()` - Draws parsed contour data using Konva.
- `drawHoles()` - Draws parsed hole data using Konva.
- `drawMarks()` - Draws parsed mark data using Konva.
- `transformCoordinates(view, x, y, width, height)` - Takes in view, x, and y coordinates and returns transformed positions according to the DSTV standard.

## License

OpenSteel, Ahmed Mohamed Ragab.

## Contributing

We welcome contributions! If you'd like to contribute, please follow these steps:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Make your changes.
4. Commit your changes (`git commit -am 'Add new feature'`).
5. Push to the branch (`git push origin feature-branch`).
6. Create a new pull request.

If you have any questions or need assistance, feel free to open an issue.
