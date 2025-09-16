class CSVBatchDSTVCreator {
    constructor() {
        this.csvData = [];
        this.profileLibraries = new Map(); // Cache for loaded profile libraries
        this.supportedSectionTypes = ['I', 'U', 'L', 'UA', 'EA', 'M', 'SHS', 'RHS', 'RO', 'PIPE', 'CHS', 'RU', 'B', 'C', 'T'];
        this.sectionTypePaths = {
            'I': 'data/I.csv',
            'U': 'data/U.csv',
            'L': 'data/L.csv',
            'UA': 'data/L.csv',
            'EA': 'data/L.csv',
            'M': 'data/SHS.csv',
            'SHS': 'data/SHS.csv',
            'RHS': 'data/RHS.csv',
            'RO': 'data/CHS.csv',
            'PIPE': 'data/CHS.csv',
            'CHS': 'data/CHS.csv',
            'RU': 'data/round.csv',
            'B': 'data/flat.csv',
            'C': 'data/U.csv',
            'T': null // T sections don't have a profile library
        };
        this.init();
    }

    init() {
        // Wait for DOM and Materialize to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
        } else {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        // Setup CSV input handler
        const csvInput = document.getElementById('csvUploadInput');
        if (csvInput) {
            csvInput.addEventListener('change', (e) => this.handleCSVUpload(e));
        }

        // Setup batch from CSV button handler
        this.setupBatchButton();
    }

    setupBatchButton() {
        // Find the "Batch from CSV" button and add click handler
        const createModal = document.getElementById('createModal');
        if (createModal) {
            const batchButton = Array.from(createModal.querySelectorAll('a.btn')).find(btn => 
                btn.textContent.trim() === 'Batch from CSV'
            );
            
            if (batchButton) {
                batchButton.onclick = (e) => {
                    e.preventDefault();
                    this.triggerCSVUpload();
                };
            }
        }
    }

    triggerCSVUpload() {
        const csvInput = document.getElementById('csvUploadInput');
        if (csvInput) {
            csvInput.click();
        } else {
            this.showToast('CSV upload input not found!', 'error');
        }
    }

    // Helper method for showing toasts
    showToast(message, type = 'error') {
        if (typeof M !== 'undefined' && M.toast) {
            const classes = type === 'error' ? 'rounded toast-error' : 'rounded toast-success';
            M.toast({html: message, classes: classes, displayLength: 3000});
        } else {
            // Fallback to alert if Materialize is not available
            alert(message);
        }
    }

    async handleCSVUpload(event) {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        try {
            const csvText = await this.readFileAsText(file);
            this.csvData = this.parseCSV(csvText);
            
            if (this.csvData.length === 0) {
                this.showToast('No valid data found in CSV file!', 'error');
                return;
            }

            // Validate CSV structure
            if (!this.validateCSVStructure(this.csvData[0])) {
                this.showToast('Invalid CSV structure! Required columns: order, drawing, phase, position, grade, quantity, length, web_start_cut, web_end_cut, flange_start_cut, flange_end_cut, section_type, section_details', 'error');
                return;
            }

            // Process the CSV data
            await this.processBatchCSV();
            
            // Clear the input
            event.target.value = '';
            
        } catch (error) {
            this.showToast('Error processing CSV file: ' + error.message, 'error');
        }
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    parseCSV(text) {
        const lines = text.trim().split('\n');
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, '_'));
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length !== headers.length) {
                continue;
            }

            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index]?.trim() || '';
            });
            data.push(row);
        }

        return data;
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current);
        return result;
    }

    validateCSVStructure(firstRow) {
        const requiredColumns = [
            'order', 'drawing', 'phase', 'position', 'grade', 'quantity', 
            'length', 'web_start_cut', 'web_end_cut', 'flange_start_cut', 
            'flange_end_cut', 'section_type', 'section_details'
        ];

        return requiredColumns.every(col => firstRow.hasOwnProperty(col));
    }

    async processBatchCSV() {
        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (let i = 0; i < this.csvData.length; i++) {
            const row = this.csvData[i];
            
            try {
                const result = await this.createDSTVFromRow(row);
                if (result && result.success) {
                    successCount++;
                    // Add the created DSTV file to the interface
                    if (typeof addFile === 'function') {
                        addFile(result.fileName, result.ncData, this.csvData.length, false);
                    }
                } else {
                    errorCount++;
                    const errorMsg = result ? result.error : 'Unknown error';
                    errors.push(`Row ${i + 1} (${row.position}): ${errorMsg}`);
                }
            } catch (error) {
                errorCount++;
                errors.push(`Row ${i + 1} (${row.position}): ${error.message}`);
            }
        }

        filesPlaceHolder(); // Update file placeholder
        // Show completion summary
        const summary = `Batch processing complete. Success: ${successCount}, Errors: ${errorCount}`;
        this.showToast(summary, errorCount === 0 ? 'success' : 'error');
    }
    
    normalizeSectionType(sectionType) {
        switch (sectionType) {
            case 'PIPE':
            case 'CHS':
                return 'RO';
            case 'RHS':
            case 'SHS':
                return 'M';
            case 'UA':
            case 'EA':
                return 'L';
            default:
                return sectionType;
        }
    }

    async createDSTVFromRow(row) {
        try {
            // Validate required fields
            const requiredFields = ['order', 'drawing', 'phase', 'position', 'grade', 'quantity', 'length', 'section_type', 'section_details'];
            for (const field of requiredFields) {
                if (!row[field]) {
                    const error = `Missing required field: ${field}`;
                    return { success: false, error: error };
                }
            }

            const sectionType = this.normalizeSectionType(row.section_type.toUpperCase());
            if (!this.supportedSectionTypes.includes(sectionType)) {
                const error = `Unsupported section type: ${sectionType}`;
                return { success: false, error: error };
            }

            // Load profile library for this section type if not already loaded
            let profileData = null;
            if (sectionType !== 'T') { // T sections don't have profile library
                profileData = await this.loadProfileLibrary(sectionType);
                if (!profileData) {
                    const error = `Failed to load profile library for section type: ${sectionType}`;
                    return { success: false, error: error };
                }
            }

            // Find matching profile
            let profileMatch = null;
            if (profileData) {
                const normalizedSectionDetails = this.normalizeSectionDetails(row.section_details);
                profileMatch = this.findMatchingProfile(profileData, normalizedSectionDetails, sectionType);
                
                if (!profileMatch) {
                    // Don't return error here - continue with null profile
                }
            }

            // Create DSTV file
            const ncData = this.generateDSTVContent(row, profileMatch, sectionType);
            const fileName = `${row.position}.nc1`;

            return { success: true, fileName: fileName, ncData: ncData };

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async loadProfileLibrary(sectionType) {
        // Check if already loaded
        if (this.profileLibraries.has(sectionType)) {
            return this.profileLibraries.get(sectionType);
        }

        const csvPath = this.sectionTypePaths[sectionType];
        if (!csvPath) return null;

        try {
            const response = await fetch(csvPath);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${csvPath}: ${response.status}`);
            }
            
            const text = await response.text();
            const allData = this.parseProfileCSV(text);

            this.profileLibraries.set(sectionType, allData);
            return allData;
        } catch (error) {
            return null;
        }
    }

    parseProfileCSV(text) {
        const lines = text.trim().split('\n');
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.trim());
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index]?.trim() || '';
            });
            data.push(row);
        }

        return data;
    }

    normalizeSectionDetails(sectionDetails) {
        return sectionDetails
            .replace(/\s+/g, '') // Remove all spaces
            .replace(/\*/g, 'X') // Replace * with X
            .toUpperCase(); // Convert to uppercase
    }

    findMatchingProfile(profileData, normalizedSectionDetails, sectionType) {
        for (const profile of profileData) {
            // Create array of possible profile identifiers based on section type
            let profileIdentifiers = [];
            
            switch (sectionType) {
                case 'I':
                case 'U':
                case 'C':
                    if (profile.name) profileIdentifiers.push(profile.name);
                    if (profile.alt) profileIdentifiers.push(profile.alt);
                    break;
                    
                case 'RU': // Round
                    if (profile.od) profileIdentifiers.push(profile.od);
                    break;
                    
                case 'B': // Flat
                    if (profile.b && profile.thk) profileIdentifiers.push(`${profile.b}X${profile.thk}`);
                    break;
                    
                case 'RO': // CHS
                    if (profile.od && profile.thk) profileIdentifiers.push(`${profile.od}X${profile.thk}`);
                    if (profile.name) profileIdentifiers.push(profile.name);
                    if (profile.alt) profileIdentifiers.push(profile.alt);
                    break;
                    
                case 'M': // SHS/RHS
                    if (profile.h && profile.b && profile.thk) profileIdentifiers.push(`${profile.h}X${profile.b}X${profile.thk}`);
                    break;
                    
                case 'L': // Angles
                    if (profile.h && profile.b && profile.thk) profileIdentifiers.push(`${profile.h}X${profile.b}X${profile.thk}`);
                    if (profile.name) profileIdentifiers.push(profile.name);
                    if (profile.alt) profileIdentifiers.push(profile.alt);
                    break;
            }

            // Check each possible identifier against the normalized section details
            for (const identifier of profileIdentifiers) {
                if (identifier) { // Make sure identifier is not empty
                    const normalizedProfileId = this.normalizeSectionDetails(identifier);
                    if (normalizedProfileId === normalizedSectionDetails) {
                        return profile;
                    }
                }
            }
        }
        return null;
    }

    generateDSTVContent(row, profileMatch, sectionType) {
        const data = [
            'ST',
            `** Created by OpenSteel on ${new Date().toLocaleDateString()}`,
            row.order,
            row.drawing,
            row.phase,
            row.position,
            row.grade,
            row.quantity,
            (row.section_details.replace(/\s/g, '').split(':')[1] || row.section_details.replace(/\s/g, '')),
            sectionType,
            row.length,
            (sectionType === 'RO' || sectionType === 'RU') ? this.getProfileValue(profileMatch, 'od') : this.getProfileValue(profileMatch, 'h') || '0',
            (sectionType === 'RO' || sectionType === 'RU') ? this.getProfileValue(profileMatch, 'od') : this.getProfileValue(profileMatch, 'b') || '0',
            (sectionType === 'RO' || sectionType === 'RU' || sectionType === 'L') ? this.getProfileValue(profileMatch, 'thk') : this.getProfileValue(profileMatch, 'tf') || '0',
            (sectionType === 'RO' || sectionType === 'RU' || sectionType === 'L') ? this.getProfileValue(profileMatch, 'thk') : this.getProfileValue(profileMatch, 'tw') || '0',
            this.getProfileValue(profileMatch, 'r') || '0',
            this.getProfileValue(profileMatch, 'kgm') || '0',
            '0.00', // Paint surface area
            row.web_start_cut || '0.00',
            row.web_end_cut || '0.00',
            row.flange_start_cut || '0.00',
            row.flange_end_cut || '0.00',
            '',
            '',
            '',
            'EN'
        ].join('\n');

        return data;
    }

    getProfileValue(profile, key) {
        if (!profile || !profile[key]) return '0';
        const value = parseFloat(profile[key]);
        return isNaN(value) ? '0' : value.toString();
    }
}

// Initialize the CSV Batch DSTV Creator
let csvBatchCreator = null;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        csvBatchCreator = new CSVBatchDSTVCreator();
    });
} else {
    csvBatchCreator = new CSVBatchDSTVCreator();
}