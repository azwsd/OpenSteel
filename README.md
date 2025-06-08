# OpenSteel

## _A DSTV Viewer, Steel Profile Library and Linear nesting engine_

OpenSteel is a web app that not only allows you to view DSTV files but also provides a steel profile library for easy access to standard steel profiles. It also allows for profile linear nesting from DSTV and/or user input. Built with HTML, CSS, and JavaScript, OpenSteel is an open-source, lightweight web app designed to help engineers and fabricators.

## Table of Contents

- [Features](#features)
- [Supported DSTV Blocks](#supported-dstv-blocks)
- [Tech Stack](#tech-stack)
- [License](#license)
- [Disclaimer](#Disclaimer)
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

## License

OpenSteel, Ahmed Mohamed Ragab.
GNU General Public License v3.0

## ⚠️ Disclaimer

This project includes functionality to export files in a format compatible with certain proprietary systems used in steel fabrication.

- The export logic is developed entirely through independent analysis and does **not** use or include any proprietary code, libraries, file specifications, or documentation from third-party vendors.
- The project has **no affiliation with, endorsement by, or connection to any commercial software vendor or brand**.
- File compatibility is provided solely for the purpose of interoperability.

Use of this software is at your own risk. Ensure that your use of exported files complies with any applicable software licenses or agreements.

This disclaimer is provided for transparency and to clarify the independent nature of the project.

## Contributing

We welcome contributions! If you'd like to contribute, please follow these steps:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Make your changes.
4. Commit your changes (`git commit -am 'Add new feature'`).
5. Push to the branch (`git push origin feature-branch`).
6. Create a new pull request.

If you have any questions or need assistance, feel free to open an issue.