class ProfileInputManager {
    constructor() {
        this.profiles = {
            'I': {
                enabled: ['orderInput', 'drawingInput', 'PhaseInput', 'positionInput', 'gradeInput', 'quantityInput', 
                         'lengthInput', 'heighthInput', 'flangeWidthInput', 'flangeThicknessInput', 'webThicknessInput', 
                         'radiusInput', 'weightInput', 'paintSurfaceInput', 'webStartCutInput', 'webEndCutInput', 
                         'flangeStartCutInput', 'flangeEndCutInput'],
                disabled: []
            },
            'U': {
                enabled: ['orderInput', 'drawingInput', 'PhaseInput', 'positionInput', 'gradeInput', 'quantityInput', 
                         'lengthInput', 'heighthInput', 'flangeWidthInput', 'flangeThicknessInput', 'webThicknessInput', 
                         'radiusInput', 'weightInput', 'paintSurfaceInput', 'webStartCutInput', 'webEndCutInput', 
                         'flangeStartCutInput', 'flangeEndCutInput'],
                disabled: []
            },
            'L': {
                enabled: ['orderInput', 'drawingInput', 'PhaseInput', 'positionInput', 'gradeInput', 'quantityInput', 
                         'lengthInput', 'heighthInput', 'flangeWidthInput', 'flangeThicknessInput', 'webThicknessInput', 
                         'radiusInput', 'weightInput', 'paintSurfaceInput', 'webStartCutInput', 'webEndCutInput', 
                         'flangeStartCutInput', 'flangeEndCutInput'],
                disabled: []
            },
            'M': {
                enabled: ['orderInput', 'drawingInput', 'PhaseInput', 'positionInput', 'gradeInput', 'quantityInput', 
                         'lengthInput', 'heighthInput', 'flangeWidthInput', 'flangeThicknessInput', 'webThicknessInput', 
                         'radiusInput', 'weightInput', 'paintSurfaceInput', 'webStartCutInput', 'webEndCutInput', 
                         'flangeStartCutInput', 'flangeEndCutInput'],
                disabled: []
            },
            'RO': {
                enabled: ['orderInput', 'drawingInput', 'PhaseInput', 'positionInput', 'gradeInput', 'quantityInput', 
                         'lengthInput', 'heighthInput', 'flangeWidthInput', 'flangeThicknessInput', 'weightInput',
                          'paintSurfaceInput'],
                disabled: ['webThicknessInput', 'radiusInput', 'webStartCutInput', 'webEndCutInput', 'flangeStartCutInput',
                         'flangeEndCutInput']
            },
            'RU': {
                enabled: ['orderInput', 'drawingInput', 'PhaseInput', 'positionInput', 'gradeInput', 'quantityInput', 
                         'lengthInput', 'heighthInput', 'weightInput', 'paintSurfaceInput'],
                disabled: ['flangeWidthInput', 'flangeThicknessInput', 'webThicknessInput', 'radiusInput', 'webStartCutInput',
                         'webEndCutInput', 'flangeStartCutInput', 'flangeEndCutInput']
            },
            'B': {
                enabled: ['orderInput', 'drawingInput', 'PhaseInput', 'positionInput', 'gradeInput', 'quantityInput', 
                         'lengthInput', 'heighthInput', 'flangeThicknessInput', 'weightInput',
                          'paintSurfaceInput'],
                disabled: ['flangeWidthInput', 'webThicknessInput', 'radiusInput', 'webStartCutInput', 'webEndCutInput', 'flangeStartCutInput',
                         'flangeEndCutInput']
            },
            'C': {
                enabled: ['orderInput', 'drawingInput', 'PhaseInput', 'positionInput', 'gradeInput', 'quantityInput', 
                         'lengthInput', 'heighthInput', 'flangeWidthInput', 'flangeThicknessInput', 'webThicknessInput', 
                         'radiusInput', 'weightInput', 'paintSurfaceInput', 'webStartCutInput', 'webEndCutInput', 
                         'flangeStartCutInput', 'flangeEndCutInput'],
                disabled: []
            },
            'T': {
                enabled: ['orderInput', 'drawingInput', 'PhaseInput', 'positionInput', 'gradeInput', 'quantityInput', 
                         'lengthInput', 'heighthInput', 'flangeWidthInput', 'flangeThicknessInput', 'webThicknessInput', 
                         'radiusInput', 'weightInput', 'paintSurfaceInput', 'webStartCutInput', 'webEndCutInput', 
                         'flangeStartCutInput', 'flangeEndCutInput'],
                disabled: []
            }
        };
        
        this.allInputs = [
            'orderInput', 'drawingInput', 'PhaseInput', 'positionInput', 'gradeInput', 'quantityInput',
            'lengthInput', 'heighthInput', 'flangeWidthInput', 'flangeThicknessInput', 'webThicknessInput',
            'radiusInput', 'weightInput', 'paintSurfaceInput', 'webStartCutInput', 'webEndCutInput',
            'flangeStartCutInput', 'flangeEndCutInput'
        ];
        
        this.init();
    }
    
    init() {
        const sectionTypeSelect = document.getElementById('sectionTypeSelect');
        if (sectionTypeSelect) {
            sectionTypeSelect.addEventListener('change', (e) => {
                this.updateInputs(e.target.value);
            });
            
            // Set initial state
            this.updateInputs(sectionTypeSelect.value);
        }
    }
    
    updateInputs(profileType) {
        const profile = this.profiles[profileType];
        if (!profile) {
            M.toast({html: `Profile type '${profileType}' not found`, classes: 'rounded toast-warning', displayLength: 2000});
            return;
        }
        
        // Enable all inputs
        this.enableAllInputs();
        
        // Disable specific inputs per profile
        profile.disabled.forEach(inputId => {
            this.disableInput(inputId);
        });
        
        // Trigger custom event for handling profile changes
        this.triggerProfileChangeEvent(profileType, profile);
    }
    
    enableInput(inputId) {
        const input = document.getElementById(inputId);
        const container = input?.closest('.input-group');
        
        if (input && container) {
            input.disabled = false;
            input.style.opacity = '1';
            container.style.opacity = '1';
            container.classList.remove('disabled-input');
        }
    }
    
    disableInput(inputId) {
        const input = document.getElementById(inputId);
        const container = input?.closest('.input-group');
        
        if (input && container) {
            input.disabled = true;
            input.value = '0.00'; // Clear the value
            input.style.opacity = '0.5';
            container.style.opacity = '0.5';
            container.classList.add('disabled-input');
        }
    }
    
    enableAllInputs() {
        this.allInputs.forEach(inputId => {
            this.enableInput(inputId);
        });
    }
    
    disableAllInputs() {
        this.allInputs.forEach(inputId => {
            this.disableInput(inputId);
        });
    }
    
    triggerProfileChangeEvent(profileType, profile) {
        const event = new CustomEvent('profileChanged', {
            detail: {
                profileType,
                enabledInputs: profile.enabled,
                disabledInputs: profile.disabled
            }
        });
        document.dispatchEvent(event);
    }
}

// Initialize the manager
const profileManager = new ProfileInputManager();

// Get the value of an input field by its ID
function getInputValue(inputId) {
    const input = document.getElementById(inputId);
    return input.value.trim();
}

// Check if any required fields are empty
function validateInputs() {
    const requiredFields = [
        'orderInput',
        'drawingInput', 
        'PhaseInput',
        'positionInput',
        'gradeInput',
        'quantityInput',
        'sectionDetailsAutocomplete',
        'sectionTypeSelect',
        'lengthInput',
        'heighthInput',
        'flangeWidthInput',
        'flangeThicknessInput',
        'webThicknessInput',
        'radiusInput',
        'weightInput',
        'paintSurfaceInput',
        'webStartCutInput',
        'webEndCutInput',
        'flangeStartCutInput',
        'flangeEndCutInput'
    ];

    const emptyFields = [];
    
    for (const fieldId of requiredFields) {
        const value = getInputValue(fieldId);
        if (!value) {
            emptyFields.push(fieldId);
        }
    }
    
    return emptyFields;
}

// Generate NC1 file content based on input values
function getNC() {
    if (validateInputs().length > 0) {
        M.toast({html: 'Please fill in all required fields.', classes: 'rounded toast-warning', displayLength: 2000});
        return '';
    }
    const data = [
        'ST',
        `** Created by OpenSteel on ${new Date().toLocaleDateString()}`,
        getInputValue('orderInput'),
        getInputValue('drawingInput'),
        getInputValue('PhaseInput'),
        getInputValue('positionInput'),
        getInputValue('gradeInput'),
        getInputValue('quantityInput'),
        getInputValue('sectionDetailsAutocomplete'),
        getInputValue('sectionTypeSelect'),
        getInputValue('lengthInput'),
        getInputValue('heighthInput'),
        getInputValue('flangeWidthInput'),
        getInputValue('flangeThicknessInput'),
        getInputValue('webThicknessInput'),
        getInputValue('radiusInput'),
        getInputValue('weightInput'),
        getInputValue('paintSurfaceInput'),
        getInputValue('webStartCutInput'),
        getInputValue('webEndCutInput'),
        getInputValue('flangeStartCutInput'),
        getInputValue('flangeEndCutInput'),
        '',
        '',
        '',
        'EN'
    ].join('\n');

    return data;
}

function downloadNC() {
    const ncData = getNC();
    if(ncData === '') return;
    const fileName = `${getInputValue('positionInput')}.nc1`;
    const blob = new Blob([ncData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function createNC() {
    const fileName = `${getInputValue('positionInput')}.nc1`;
    const ncData = getNC();
    if(ncData === '') return;
    addFile(fileName, ncData, 1, false);
}