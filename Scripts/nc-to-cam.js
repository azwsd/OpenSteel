/**
 * OpenSteel - Steel Projects CAM v2.00 Nesting Exporter
 * Generates valid .cam files containing _BAR_ patterns and _PIECE_ definitions.
 */

// Global settings
let CAMJobNumber = (typeof localStorage !== 'undefined' ? localStorage.getItem('CAMJobNumber') : null);
if (CAMJobNumber === '102') CAMJobNumber = null;
CAMJobNumber = CAMJobNumber || 'JOB-01';

let CAMCncMachine = (typeof localStorage !== 'undefined' ? localStorage.getItem('CAMCncMachine') : null);
if (CAMCncMachine === 'HP20T6') CAMCncMachine = null;
CAMCncMachine = CAMCncMachine || 'CNC';

let CAMLicense = (typeof localStorage !== 'undefined' ? localStorage.getItem('CAMLicense') : null);
if (CAMLicense === 'ELSEWEDY') CAMLicense = null;
CAMLicense = CAMLicense || 'OpenSteel';

let CAMConstraintMaterial = (typeof localStorage !== 'undefined' ? localStorage.getItem('CAMConstraintMaterial') : null) || '';
let removeCAMHoles = (typeof localStorage !== 'undefined' ? localStorage.getItem('removeCAMHoles') : null) || 'false';

function loadCAMSettings() {
    if (typeof localStorage !== 'undefined') {
        let storedJob = localStorage.getItem('CAMJobNumber');
        if (storedJob === '102') storedJob = null;
        CAMJobNumber = storedJob || 'JOB-01';

        let storedCnc = localStorage.getItem('CAMCncMachine');
        if (storedCnc === 'HP20T6') storedCnc = null;
        CAMCncMachine = storedCnc || 'CNC';

        let storedLic = localStorage.getItem('CAMLicense');
        if (storedLic === 'ELSEWEDY') storedLic = null;
        CAMLicense = storedLic || 'OpenSteel';

        CAMConstraintMaterial = localStorage.getItem('CAMConstraintMaterial') || '';
        removeCAMHoles = localStorage.getItem('removeCAMHoles') || 'false';
    }

    if (typeof document !== 'undefined') {
        const jobInput = document.getElementById('CAMJobNumberInput');
        if (jobInput) jobInput.value = CAMJobNumber;

        const cncInput = document.getElementById('CAMCncMachineInput');
        if (cncInput) cncInput.value = CAMCncMachine;

        const licInput = document.getElementById('CAMLicenseInput');
        if (licInput) licInput.value = CAMLicense;

        const matInput = document.getElementById('CAMConstraintMaterialInput');
        if (matInput) matInput.value = CAMConstraintMaterial;

        const removeHolesCheckbox = document.getElementById('removeCAMHoles');
        if (removeHolesCheckbox) removeHolesCheckbox.checked = removeCAMHoles === 'true';

        if (typeof window !== 'undefined' && window.M && M.updateTextFields) {
            M.updateTextFields();
        }
    }
}

function saveCAMSettings() {
    if (typeof document !== 'undefined') {
        const jobInput = document.getElementById('CAMJobNumberInput');
        if (jobInput) CAMJobNumber = jobInput.value.trim() || 'JOB-01';

        const cncInput = document.getElementById('CAMCncMachineInput');
        if (cncInput) CAMCncMachine = cncInput.value.trim() || 'CNC';

        const licInput = document.getElementById('CAMLicenseInput');
        if (licInput) CAMLicense = licInput.value.trim() || 'OpenSteel';

        const matInput = document.getElementById('CAMConstraintMaterialInput');
        if (matInput) CAMConstraintMaterial = matInput.value.trim().replace(/\s+/g, '-');

        const removeHolesCheckbox = document.getElementById('removeCAMHoles');
        if (removeHolesCheckbox) removeCAMHoles = removeHolesCheckbox.checked ? 'true' : 'false';
    }

    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('CAMJobNumber', CAMJobNumber);
        localStorage.setItem('CAMCncMachine', CAMCncMachine);
        localStorage.setItem('CAMLicense', CAMLicense);
        localStorage.setItem('CAMConstraintMaterial', CAMConstraintMaterial);
        localStorage.setItem('removeCAMHoles', removeCAMHoles);
    }
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
        loadCAMSettings();
    });
}

// Format profile designation for Steel Projects CAM
function formatCamProfile(rawProfile, profileCode) {
    if (!rawProfile) return 'L50*5';
    let p = String(rawProfile).trim().toUpperCase();

    // If profile already contains asterisk format (e.g. L50*5), retain it
    if (p.includes('*')) {
        return p.replace(/\s+/g, '');
    }

    const code = (profileCode || '').toString().trim().toUpperCase();

    // Angle profile handling (e.g. L50X50X5 or L50X5 or EA50X5)
    if (code === 'L' || p.startsWith('L') || p.startsWith('EA') || p.startsWith('RSA')) {
        let clean = p.replace(/^(L|EA|RSA)/, '').trim();
        clean = clean.replace(/^[-\s]+/, '');
        const parts = clean.split(/[X*x]/).map(s => parseFloat(s)).filter(n => !isNaN(n));
        if (parts.length === 3) {
            if (parts[0] === parts[1]) {
                // Equal angle: L50*5
                return `L${parts[0]}*${parts[2]}`;
            } else {
                // Unequal angle: L100*75*8
                return `L${parts[0]}*${parts[1]}*${parts[2]}`;
            }
        } else if (parts.length === 2) {
            // Already short form: L50*5
            return `L${parts[0]}*${parts[1]}`;
        }
    }

    // Default: convert X to * for dimension separators if applicable, or keep standard name
    return p.replace(/(\d+)\s*[Xx*]\s*(\d+)/g, '$1*$2').replace(/\s+/g, '');
}

// Detect category code for Steel Projects CAM
function detectCamCategory(profileCode, rawProfile) {
    const code = (profileCode || '').toString().trim().toUpperCase();
    const p = (rawProfile || '').toString().trim().toUpperCase();

    if (code === 'L' || p.startsWith('L') || p.startsWith('EA') || p.startsWith('RSA')) return 'D'; // Angle
    if (code === 'I' || p.startsWith('IPE') || p.startsWith('HE') || p.startsWith('UB') || p.startsWith('UC') || p.startsWith('W') || p.startsWith('INP')) return 'I'; // I-Beam
    if (code === 'U' || p.startsWith('UPN') || p.startsWith('UPE') || p.startsWith('PFC') || p.startsWith('UNP')) return 'U'; // Channel
    if (code === 'M' || code === 'C' || p.startsWith('RHS') || p.startsWith('SHS') || p.startsWith('MSH')) return 'Q'; // Hollow rectangular/square
    if (code === 'RO' || code === 'RU' || p.startsWith('CHS') || p.startsWith('PIPE') || p.startsWith('RO') || p.startsWith('TUB')) return 'R'; // Round hollow
    if (code === 'B' || code === 'P' || p.startsWith('PL') || p.startsWith('FLAT') || p.startsWith('FB')) return 'P'; // Plate/flat
    return 'D';
}

function getCategoryPlural(catCode) {
    switch (catCode) {
        case 'D': return 'ANGLES';
        case 'I': return 'BEAMS';
        case 'U': return 'CHANNELS';
        case 'Q': return 'HOLLOW SECTIONS';
        case 'R': return 'TUBES';
        case 'P': return 'PLATES';
        default: return 'PROFILES';
    }
}

// Parse DSTV header without side-effects
function parseCamHeaderFromNc(fileData) {
    if (!fileData || typeof fileData !== 'string') return null;
    const lines = fileData.split('\n');
    let lineCounter = 0;
    const header = [];
    for (let rawLine of lines) {
        let line = rawLine.trimStart();
        if (line.slice(0, 2).toUpperCase() === 'ST') continue;
        if (lineCounter === 24) break;
        if (line.slice(0, 2) === '**') continue;
        line = line.split('**')[0].trim().replace(/\r$/, '');
        header.push(line);
        lineCounter++;
    }
    return {
        project: header[0] || '',
        drawing: header[1] || '',
        phase: header[2] || '',
        piece: header[3] || '',
        grade: header[4] || '',
        quantity: parseFloat(header[5]) || 1,
        profileName: header[6] || '',
        profileCode: header[7] || '',
        length: parseFloat(header[8]) || 0,
        height: parseFloat(header[9]) || 0,
        flangeWidth: parseFloat(header[10]) || 0,
        flangeThickness: parseFloat(header[11]) || 0,
        webThickness: parseFloat(header[12]) || 0,
        rootRadius: parseFloat(header[13]) || 0,
        weightPerMeter: parseFloat(header[14]) || 0,
        surfacePerMeter: parseFloat(header[15]) || 0
    };
}

// Calculate or look up section geometry
function getSectionGeometry(profileName, profileCode, parsedData) {
    let height = 50.0;
    let flangeWidth = 50.0;
    let webThickness = 5.0;
    let flangeThickness = 5.0;
    let rootRadius = 7.0;
    let toeRadius = 3.5;
    let weightPerMeter = 0;
    let surfacePerMeter = 0;

    if (parsedData) {
        if (parsedData.height > 0) height = parseFloat(parsedData.height);
        if (parsedData.flangeWidth > 0) flangeWidth = parseFloat(parsedData.flangeWidth);
        if (parsedData.webThickness > 0) webThickness = parseFloat(parsedData.webThickness);
        if (parsedData.flangeThickness > 0) flangeThickness = parseFloat(parsedData.flangeThickness);
        if (parsedData.rootRadius > 0) rootRadius = parseFloat(parsedData.rootRadius);
        if (parsedData.weightPerMeter > 0) weightPerMeter = parseFloat(parsedData.weightPerMeter);
        if (parsedData.surfacePerMeter > 0) surfacePerMeter = parseFloat(parsedData.surfacePerMeter);
    } else {
        // Parse from profileName string
        const p = String(profileName || '').toUpperCase().replace(/^(L|EA|RSA)/, '').trim();
        const parts = p.split(/[X*x]/).map(s => parseFloat(s)).filter(n => !isNaN(n));
        if (parts.length === 3) {
            height = parts[0];
            flangeWidth = parts[1];
            webThickness = parts[2];
            flangeThickness = parts[2];
        } else if (parts.length === 2) {
            height = parts[0];
            flangeWidth = parts[0];
            webThickness = parts[1];
            flangeThickness = parts[1];
        }
        // Standard root radius for equal angles (EN 10056)
        if (flangeThickness <= 5) rootRadius = 7.0;
        else if (flangeThickness <= 6) rootRadius = 8.0;
        else if (flangeThickness <= 7) rootRadius = 9.0;
        else if (flangeThickness <= 8) rootRadius = 10.0;
        else if (flangeThickness <= 9) rootRadius = 11.0;
        else if (flangeThickness <= 10) rootRadius = 12.0;
        else if (flangeThickness <= 12) rootRadius = 13.0;
        else rootRadius = Math.round(flangeThickness + 2.0);
    }

    toeRadius = Math.round(rootRadius * 0.5 * 10) / 10;

    // Cross-sectional area calculation in mm^2 matching standard angle tables
    const baseArea = (height + flangeWidth - flangeThickness) * flangeThickness;
    const rootArea = (rootRadius * rootRadius) * (1 - Math.PI / 4);
    const toeArea = 2 * (toeRadius * toeRadius) * (1 - Math.PI / 4);
    const area = baseArea + rootArea - toeArea;

    if (!weightPerMeter || weightPerMeter <= 0) {
        weightPerMeter = area * 0.00785; // kg/m for steel density 7850 kg/m^3
    }

    if (!surfacePerMeter || surfacePerMeter <= 0) {
        // Total surface perimeter in meters
        surfacePerMeter = (2 * (height + flangeWidth) - 2 * flangeThickness + 0.8584 * rootRadius + 0.8584 * toeRadius) / 1000;
    }

    return {
        height,
        flangeWidth,
        webThickness,
        flangeThickness,
        rootRadius,
        toeRadius,
        area,
        weightPerMeter,
        surfacePerMeter
    };
}

function padLeft(str, len) {
    str = String(str);
    while (str.length < len) str = ' ' + str;
    return str;
}

function padRight(str, len) {
    str = String(str);
    while (str.length < len) str = str + ' ';
    return str;
}

function formatCamDate(d) {
    const day = String(d.getDate()).padStart(2, '0');
    const mon = String(d.getMonth() + 1).padStart(2, '0');
    const yr = d.getFullYear();
    return `${day}/${mon}/${yr}`;
}

function formatCamTime(d) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
}

// Generate generic stock mark sequence (STK-01, STK-02, ...)
function generateBarStkn(idx) {
    return `STK-${String(idx + 1).padStart(2, '0')}`;
}

// Parse holes from DSTV file data and map to LIV1/LIV2
function parseHolesForCam(fileData, profileCode) {
    if (!fileData || typeof fileData !== 'string') return { holesByLiv: {}, totalHoles: 0 };

    const lines = fileData.split('\n');
    let inBoBlock = false;
    let currentFace = '';
    const holesByLiv = { 'LIV1': [], 'LIV2': [] };
    let totalHoles = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === 'BO') {
            inBoBlock = true;
            continue;
        }
        if (inBoBlock && (line === '' || line === 'EN' || line.match(/^[A-Z]{2}$/))) {
            inBoBlock = false;
            continue;
        }
        if (inBoBlock && line.length > 0) {
            const parts = line.split(/\s+/);
            if (parts.length >= 4) {
                let face = parts[0].toLowerCase();
                if (face === '') face = currentFace;
                else currentFace = face;

                let xCoord = parseFloat(parts[1].replace(/[a-zA-Z]+$/, ''));
                const yCoord = parseFloat(parts[2]);
                const diameter = parseFloat(parts[3]);

                if (isNaN(xCoord) || isNaN(yCoord) || isNaN(diameter)) continue;
                if (parts[5] !== undefined && parseFloat(parts[5]) !== 0) continue; // Skip slots

                // Face mapping: for angles, 'u' -> LIV1, 'v' -> LIV2
                let liv = 'LIV1';
                let x = xCoord;
                let y = 0.0;
                let z = 0.0;

                if (face === 'v') {
                    liv = 'LIV2';
                    y = 0.0;
                    z = -Math.abs(yCoord);
                } else {
                    liv = 'LIV1';
                    y = -Math.abs(yCoord);
                    z = 0.0;
                }

                if (!holesByLiv[liv]) holesByLiv[liv] = [];
                holesByLiv[liv].push({ diameter, x, y, z });
                totalHoles++;
            }
        }
    }

    return { holesByLiv, totalHoles };
}

// Generate CAM _BAR_ record for a single unique nest pattern
function generateCamBarRecord(uniqueNest, patternIdx, totalPatterns, options) {
    const nest = uniqueNest.nest;
    const barQty = uniqueNest.count || 1;
    const stockLength = Number(nest.stockLength) || 12000;
    const gripStart = Number(nest.gripStart) || 0;
    const gripEnd = Number(nest.gripEnd) || 0;
    const sawWidth = Number(nest.sawWidth) || 0;

    const camProfile = formatCamProfile(nest.profile, 'L');
    const catCode = detectCamCategory('L', nest.profile);
    const material = options.constraintMaterial || nest.grade || 'S235JR';

    // Unique sequential identifiers
    const barIdt = patternIdx + 1;
    const barNum = Number(options.firstNestNumber || 1) + patternIdx;
    const barStkn = generateBarStkn(patternIdx);

    // Item groupings for this bar
    const itemsMap = new Map();
    const itemPositions = [];
    let cursor = gripStart;

    nest.pieceAssignments.forEach((assign, assignIdx) => {
        const pLabel = assign.piece ? (assign.piece.label || assign.label) : assign.label;
        const pLen = Number(assign.piece ? (assign.piece.length || assign.length) : assign.length);
        const pProject = (options.projectNames && options.projectNames[pLabel]) ? options.projectNames[pLabel] : (options.defaultProject || 'PROJECT');

        const key = `${pLabel}__${pLen.toFixed(2)}`;
        if (!itemsMap.has(key)) {
            itemsMap.set(key, {
                itemIdx: itemsMap.size,
                label: pLabel,
                length: pLen,
                project: pProject,
                count: 0
            });
        }
        const itemInfo = itemsMap.get(key);
        const occurrenceIdx = itemInfo.count;
        itemInfo.count++;

        // Add saw cut if applicable before piece
        if (assignIdx === 0 && sawWidth > 0 && gripStart !== 0) {
            cursor += sawWidth;
        }

        const startOffset = cursor;
        itemPositions.push({
            itemIdx: itemInfo.itemIdx,
            occurrenceIdx: occurrenceIdx,
            startOffset: startOffset
        });

        cursor += pLen;

        if (assignIdx < nest.pieceAssignments.length && sawWidth > 0) {
            cursor += sawWidth;
        }
    });

    // Calculate remaining chute / offcut
    let offcut = stockLength - cursor;
    if (offcut < 0) offcut = 0;

    // Build [HEAD]
    let out = '; OpenSteel\r\n\r\n';
    out += '_BAR_\r\n';
    out += '[HEAD]\r\n';
    out += `BAR_BON:${options.jobNumber}\r\n`;
    out += `NUM_BON:${options.jobNumber}\r\n`;
    out += `BAR_LEN:${stockLength.toFixed(2)}\r\n`;
    out += `LUN_PRO:${stockLength.toFixed(2)}\r\n`;
    out += 'BAR_WDT:0.00\r\n';
    out += `BAR_MAT:${material}\r\n`;
    out += `MAT_PRO:${material}\r\n`;
    out += `BAR_PRO:${camProfile}\r\n`;
    out += `NOM_PRO:${camProfile}\r\n`;
    out += `BAR_CAT:${catCode}\r\n`;
    out += `TIP_PRO:${catCode}\r\n`;
    out += `BAR_QTY:${barQty}\r\n`;
    out += `QTA_PEZ:${barQty}\r\n`;
    out += 'BAR_TYP:0\r\n';
    out += 'TYP_BAR:0\r\n';
    out += `BAR_CHU:${offcut.toFixed(2)}\r\n`;
    out += `LUN_CHU:${offcut.toFixed(2)}\r\n`;
    out += `BAR_SC:${(gripEnd > 0 ? gripEnd : 1.0).toFixed(2)}\r\n`;
    out += `SC:${(gripEnd > 0 ? gripEnd : 1.0).toFixed(2)}\r\n`;
    out += `BAR_SP:${gripStart.toFixed(2)}\r\n`;
    out += `SP:${gripStart.toFixed(2)}\r\n`;
    out += `BAR_SL:${sawWidth.toFixed(2)}\r\n`;
    out += `SL:${sawWidth.toFixed(2)}\r\n`;
    out += 'BAR_SRS:0.00\r\n';
    out += 'SRS:0.00\r\n';
    out += 'BAR_ASL:1\r\n';
    out += 'BAR_AMP:0\r\n';
    out += 'BAR_TEC:1\r\n';
    out += 'BAR_R90:0\r\n';
    out += `BAR_IDT:${barIdt}\r\n`;
    out += `BAR_NUM:${barNum}\r\n`;
    out += 'BAR_LOT:\r\n';
    out += 'BAR_LOTORD:\r\n';
    out += 'BAR_LOTTOT:0\r\n';
    out += 'BAR_STA:\r\n';
    out += 'BAR_STR:\r\n';
    out += 'BAR_COD:\r\n';
    out += 'COD_BAR:\r\n';
    out += 'BAR_STK:250.00\r\n';
    out += `BAR_STKN:${barStkn}\r\n`;
    out += `BAR_CNC:${options.cncMachine}\r\n`;
    out += 'BAR_PRI:99\r\n';
    out += 'BAR_PRC:0\r\n';
    out += 'BAR_CTL:0\r\n';
    out += `BAR_LIC:${options.license}\r\n\r\n`;

    // Build [ITEM]
    out += '[ITEM]\r\n';
    itemsMap.forEach(item => {
        const projPadded = padLeft(item.project, 20);
        const lenPadded = padLeft(item.length.toFixed(2), 9);
        const qtyPadded = padLeft(item.count, 5);
        out += ` ${projPadded},${item.label},${lenPadded}${qtyPadded} 0, , , , , ${item.itemIdx}\r\n`;
    });
    out += '\r\n';

    // Build [POS_ITEM]
    out += '[POS_ITEM]\r\n';
    itemPositions.forEach(pos => {
        out += `${pos.itemIdx},${pos.occurrenceIdx},${pos.startOffset.toFixed(2)}\r\n`;
    });
    out += '\r\n';

    return out;
}

// Generate CAM _PIECE_ record for a single unique piece mark
function generateCamPieceRecord(pieceData, pieceIdx, options) {
    const now = new Date();
    const dateStr = formatCamDate(now);
    const timeStr = formatCamTime(now);

    const label = pieceData.label;
    const length = Number(pieceData.length) || 0;
    const totalQty = pieceData.totalQty || 1;
    const profile = pieceData.profile || 'L50*5';
    const profileCode = pieceData.profileCode || 'L';
    const material = options.constraintMaterial || pieceData.material || 'ST-37';

    const camProfile = formatCamProfile(profile, profileCode);
    const catCode = detectCamCategory(profileCode, profile);
    const catPlural = getCategoryPlural(catCode);
    const geom = getSectionGeometry(profile, profileCode, pieceData.parsedData);

    const unitWeight = (pieceData.parsedData && pieceData.parsedData.weightPerMeter > 0)
        ? (length / 1000) * pieceData.parsedData.weightPerMeter
        : (geom.area * 0.00785) * (length / 1000);

    const unitSurface = (pieceData.parsedData && pieceData.parsedData.surfacePerMeter > 0)
        ? (length / 1000) * pieceData.parsedData.surfacePerMeter
        : geom.surfacePerMeter * (length / 1000);

    const pieceId = pieceIdx + 1;
    const projectName = pieceData.project || options.defaultProject || 'PROJECT';
    const drawingName = pieceData.drawing || label;
    const phaseName = pieceData.phase || drawingName;

    // Parse holes
    let holesByLiv = {};
    let totalHoles = 0;
    if (options.removeHoles !== true && pieceData.fileData) {
        const holeResult = parseHolesForCam(pieceData.fileData, profileCode);
        holesByLiv = holeResult.holesByLiv;
        totalHoles = holeResult.totalHoles;
    }

    // Build _PIECE_ [HEAD]
    let out = '; OpenSteel\r\n\r\n';
    out += '_PIECE_\r\n';
    out += '[HEAD]\r\n';
    out += `COM_NAM:${projectName}\r\n`;
    out += `NUM_COM:${projectName}\r\n`;
    out += 'COM_DES:\r\nDES_COM:\r\nCOM_CMT1:\r\nCOM_CMT2:\r\nCOM_CMT3:\r\nCOM_OBJ:\r\nOGG_COM:\r\nCOM_CLI:\r\nCLI_COM:\r\n';
    out += `COM_CRE:${dateStr}\r\nCOM_FIN://\r\nDAT_COM://\r\nCOM_TRT:\r\nCOM_MAT:\r\nCOM_PNT:\r\nCOM_RES:\r\nCOM_UNI:0\r\nCOM_TYP:\r\nCOM_CAT:\r\n`;
    out += `DWG_NAM:${drawingName}\r\n`;
    out += `NUM_DIS:${drawingName}\r\n`;
    out += 'DWG_QTY:1\r\nDWG_DES:\r\nDES_DIS:\r\nDWG_RES:\r\nNOM_DIS:\r\n';
    out += `DWG_CRE:${dateStr}\r\nDWG_TRT:\r\nDWG_MAT:\r\nDWG_PNT:\r\nDWG_CON:0\r\nDWG_LIV://\r\nDWG_CMT1:\r\nDWG_CMT2:\r\nDWG_CMT3:\r\nDWG_CAT:\r\n`;
    out += `ASS_NAM:${phaseName}\r\n`;
    out += `MAR_PEZ:${phaseName}\r\n`;
    out += 'ASS_QTY:1\r\nQTA_MAR:1\r\nASS_DES:\r\nDES_MAR:\r\nASS_PRI:\r\nPRI_MAR:\r\nASS_TRT:\r\nTRA_MAR:\r\nASS_MAT:\r\nASS_PNT:\r\nASS_TYP:\r\nTIP_PEZ:\r\nASS_CAT:\r\nASS_ENC:\r\nING_PEZ:\r\n';
    out += `ASS_DATC:${dateStr}\r\nASS_TIMC:${timeStr}\r\nASS_DATM:${dateStr}\r\nASS_TIMM:${timeStr}\r\nASS_MAN:0\r\nASS_LEN:\r\nASS_DPT:\r\nASS_WDT:\r\n`;
    out += `PCE_NAM:${label}\r\n`;
    out += `POS_PEZ:${label}\r\n`;
    out += `PCE_WGH:${unitWeight.toFixed(4)}\r\n`;
    out += `PUN_LIS:${unitWeight.toFixed(4)}\r\n`;
    out += `PCE_SUR:${unitSurface.toFixed(4)}\r\n`;
    out += `SUN_LIS:${unitSurface.toFixed(4)}\r\n`;
    out += `PCE_QTY:${totalQty}\r\n`;
    out += `QTA_PEZ:${totalQty}\r\n`;
    out += 'PCE_DES:\r\nDES_PEZ:\r\nPCE_CMT1:\r\nNOT_PEZ:\r\nPCE_CMT2:\r\nPCE_CMT3:\r\n';
    out += `PCE_GRP:${options.cncMachine} - ${catPlural}\r\n`;
    out += `GRP_PEZ:${options.cncMachine} - ${catPlural}\r\n`;
    out += `PCE_PRF:${camProfile}\r\n`;
    out += `NOM_PRO:${camProfile}\r\n`;
    out += 'PCE_ATR:2\r\n';
    out += `PCE_CAT:${catCode}\r\n`;
    out += `TIP_PRO:${catCode}\r\n`;
    out += `PCE_LEN:${length.toFixed(2)}\r\n`;
    out += `LUN_PRO:${length.toFixed(2)}\r\n`;
    out += 'PCE_WDT:\r\nLAR_PRO:\r\nPCE_THK:\r\nSPE_PRO:\r\nPCE_TRT:\r\nTRA_PEZ:\r\n';
    out += `PCE_MAT:${material}\r\n`;
    out += `MAT_PRO:${material}\r\n`;
    out += 'PCE_PNT:\r\nPCE_APP:\r\nCOD_PEZ:\r\n';
    out += `PCE_DATC:${dateStr}\r\nPCE_TIMC:${timeStr}\r\nPCE_DATM:${dateStr}\r\nPCE_TIMM:${timeStr}\r\nPCE_UNI:0\r\nPCE_MAN:1\r\nPCE_COD:\r\n`;
    out += `PCE_LENF:${length.toFixed(2)}\r\n`;
    out += `PCE_ID:${pieceId}\r\n`;
    out += `PCE_LIC:${options.license}\r\n`;
    out += 'MAT_DES:\r\nMAT_DENS:7.85\r\nTRT_DES:\r\nTRT_UNI:0\r\nTRT_PRX:0.00\r\nPNT_THK:0.00\r\nPRF_UNI:0\r\nPRF_DES:\r\n\r\n';

    // Build [SHAPE] matching exact column widths from 102.cam
    out += '[SHAPE]\r\n';
    out += `${catCode} 4 0\r\n`;
    out += `${padLeft(geom.height.toFixed(2), 9)} ${padLeft(geom.flangeWidth.toFixed(2), 9)}      0.00 ${padLeft(geom.webThickness.toFixed(2), 9)} ${padLeft(geom.flangeThickness.toFixed(2), 9)} ${padLeft(geom.rootRadius.toFixed(2), 9)}\r\n`;
    out += `     0.00      0.00      0.00      0.00      0.00 ${padLeft(geom.toeRadius.toFixed(2), 9)}      0.00\r\n`;
    out += `${padLeft(length.toFixed(2), 9)}      0.00 ${padLeft(geom.flangeThickness.toFixed(2), 9)}      0.00      0.00      0.00\r\n`;
    out += `     0.00      0.00      0.00      0.00      0.00      0.00 ${padLeft(geom.area.toFixed(2), 9)}\r\n\r\n`;

    // Build [OUTLINE] matching exact column widths from 102.cam
    out += '[OUTLINE]\r\n';
    out += 'LIV1\r\n';
    out += '     0.00      0.00      0.00\r\n';
    out += `${padLeft(length.toFixed(2), 9)}      0.00      0.00\r\n`;
    out += `${padLeft(length.toFixed(2), 9)} ${padLeft((-geom.height).toFixed(2), 9)}      0.00\r\n`;
    out += `     0.00 ${padLeft((-geom.height).toFixed(2), 9)}      0.00\r\n`;
    out += 'LIV2\r\n';
    out += `     0.00      0.00 ${padLeft((-geom.flangeWidth).toFixed(2), 9)}\r\n`;
    out += `${padLeft(length.toFixed(2), 9)}      0.00 ${padLeft((-geom.flangeWidth).toFixed(2), 9)}\r\n`;
    out += `${padLeft(length.toFixed(2), 9)}      0.00      0.00\r\n`;
    out += '     0.00      0.00      0.00\r\n\r\n';

    // Build [HOLE] matching exact 120-character line layout from 102.cam
    out += '[HOLE]\r\n';
    const livList = ['LIV1', 'LIV2'];
    livList.forEach(liv => {
        out += `${liv}\r\n`;
        const holes = holesByLiv[liv] || [];
        holes.forEach(h => {
            const diamPadded = padLeft(h.diameter.toFixed(2), 5);
            const xPadded = padLeft(h.x.toFixed(2), 9);
            const yPadded = padLeft(h.y.toFixed(2), 9);
            const zPadded = padLeft(h.z.toFixed(2), 9);
            out += `M ${diamPadded} ${xPadded} ${yPadded} ${zPadded}      0.00      0.00      0.00      0.00 0 0 0       0.00 0 0 0      0.00      0.00\r\n`;
        });
    });
    out += '\r\n';

    // Build [MACHINING]
    out += '[MACHINING]\r\n';
    out += 'CUTTING,1.00 0, , ,0.00 0.00 1 0.00 0.00 0.00 0.00 0\r\n';
    if (totalHoles > 0) {
        out += `DRILLING,${totalHoles}.00 0, , ,0.00 0.00 2 0.00 0.00 0.00 0.00 0\r\n`;
    }
    out += '\r\n';

    return out;
}

// Generate the entire Steel Projects CAM file content from cutting nests data
function createCAMNestContentFromNests(nests, piecesFromFiles, loadedFilePairs, itemsList, startingNestNum) {
    if (typeof saveCAMSettings === 'function') {
        saveCAMSettings();
    }

    if (!nests || nests.length === 0) {
        throw new Error('No nests available to export!');
    }

    const uniqueNests = (typeof getUniqueNests === 'function')
        ? getUniqueNests(nests)
        : nests.map(n => ({ nest: n, count: 1 }));

    if (!uniqueNests || uniqueNests.length === 0) {
        throw new Error('No unique nests found!');
    }

    // Build map of unique pieces and calculate their total quantities across all bars
    const pieceTotalsMap = new Map();
    const projectNamesMap = {};

    uniqueNests.forEach(un => {
        const barQty = un.count || 1;
        un.nest.pieceAssignments.forEach(assign => {
            const label = assign.piece ? (assign.piece.label || assign.label) : assign.label;
            const length = Number(assign.piece ? (assign.piece.length || assign.length) : assign.length);
            const profile = (assign.piece && assign.piece.profile) ? assign.piece.profile : un.nest.profile;

            let fileData = null;
            let parsedData = null;
            let project = '';
            let drawing = '';
            let phase = '';
            let material = CAMConstraintMaterial || un.nest.grade || 'ST-37';

            if (piecesFromFiles && piecesFromFiles[label]) {
                const info = piecesFromFiles[label];
                fileData = info[1];
                project = info[2] || '';
                drawing = info[3] || '';
                phase = info[4] || '';
                material = CAMConstraintMaterial || info[6] || material;
            } else if (loadedFilePairs && loadedFilePairs.has && loadedFilePairs.has(label)) {
                fileData = loadedFilePairs.get(label);
            } else if (typeof window !== 'undefined' && window.filePairs && window.filePairs.has && window.filePairs.has(label)) {
                fileData = window.filePairs.get(label);
            }

            if (fileData) {
                parsedData = parseCamHeaderFromNc(fileData);
                if (parsedData) {
                    if (parsedData.project) project = parsedData.project;
                    if (parsedData.drawing) drawing = parsedData.drawing;
                    if (parsedData.phase) phase = parsedData.phase;
                    if (!CAMConstraintMaterial && parsedData.grade) material = parsedData.grade;
                }
            }

            if (project) projectNamesMap[label] = project;

            if (!pieceTotalsMap.has(label)) {
                pieceTotalsMap.set(label, {
                    label: label,
                    length: length,
                    profile: profile,
                    profileCode: (parsedData && parsedData.profileCode) ? parsedData.profileCode : 'L',
                    material: material,
                    project: project,
                    drawing: drawing,
                    phase: phase,
                    fileData: fileData,
                    parsedData: parsedData,
                    totalQty: 0
                });
            }

            pieceTotalsMap.get(label).totalQty += barQty;
        });
    });

    const firstNestInput = (typeof document !== 'undefined') ? document.getElementById('first-nest-number') : null;
    const fallbackNestNum = firstNestInput ? Number(firstNestInput.value) : 1;

    const options = {
        jobNumber: CAMJobNumber || 'JOB-01',
        cncMachine: CAMCncMachine || 'CNC',
        license: CAMLicense || 'OpenSteel',
        constraintMaterial: CAMConstraintMaterial || '',
        removeHoles: removeCAMHoles === 'true',
        firstNestNumber: Number(startingNestNum) || fallbackNestNum || 1,
        projectNames: projectNamesMap,
        defaultProject: 'PROJECT'
    };

    let camContent = '';

    // 1. Generate all _BAR_ blocks
    uniqueNests.forEach((un, idx) => {
        camContent += generateCamBarRecord(un, idx, uniqueNests.length, options);
    });

    // 2. Generate all _PIECE_ blocks
    let pieceIdx = 0;
    pieceTotalsMap.forEach(pieceData => {
        camContent += generateCamPieceRecord(pieceData, pieceIdx++, options);
    });

    return camContent;
}

// Generate the entire Steel Projects CAM file content
function createCAMNestContent() {
    if (typeof saveCAMSettings === 'function') {
        saveCAMSettings();
    }

    const nests = (typeof window !== 'undefined' && typeof window.getCuttingNests === 'function')
        ? window.getCuttingNests()
        : ((typeof cuttingNests !== 'undefined' && Array.isArray(cuttingNests)) ? cuttingNests : ((typeof window !== 'undefined') ? window.cuttingNests : []));

    const pFiles = (typeof pieceItemsFromFiles !== 'undefined')
        ? pieceItemsFromFiles
        : ((typeof window !== 'undefined') ? window.pieceItemsFromFiles || {} : {});

    const fPairs = (typeof filePairs !== 'undefined')
        ? filePairs
        : ((typeof window !== 'undefined') ? window.filePairs || new Map() : new Map());

    const pItems = (typeof pieceItems !== 'undefined')
        ? pieceItems
        : ((typeof window !== 'undefined') ? window.pieceItems || [] : []);

    const firstNestInput = (typeof document !== 'undefined') ? document.getElementById('first-nest-number') : null;
    const nCounter = (typeof nestCounter !== 'undefined')
        ? nestCounter
        : (firstNestInput ? Number(firstNestInput.value) : 1);

    return createCAMNestContentFromNests(nests, pFiles, fPairs, pItems, nCounter);
}

// Export CAM Nest triggered from UI
function exportCamNest() {
    try {
        if (typeof saveCAMSettings === 'function') {
            saveCAMSettings();
        }

        const nests = (typeof window !== 'undefined' && typeof window.getCuttingNests === 'function')
            ? window.getCuttingNests()
            : ((typeof cuttingNests !== 'undefined' && Array.isArray(cuttingNests)) ? cuttingNests : ((typeof window !== 'undefined') ? window.cuttingNests : []));

        if (!nests || nests.length === 0) {
            if (typeof M !== 'undefined' && M.toast) {
                M.toast({ html: 'No Nesting to Export!', classes: 'rounded toast-error', displayLength: 2500 });
            }
            return;
        }

        const camContent = createCAMNestContent();

        const blob = new Blob([camContent], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const fileName = (CAMJobNumber ? `${CAMJobNumber}.cam` : 'JOB-01.cam');
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        if (typeof M !== 'undefined' && M.toast) {
            M.toast({
                html: `Exported ${fileName} successfully!`,
                classes: 'rounded toast-success',
                displayLength: 3000
            });
        }

        if (typeof document !== 'undefined') {
            const modalEl = document.getElementById('ExportCAMNestModal');
            if (modalEl && typeof M !== 'undefined' && M.Modal) {
                const modalInst = M.Modal.getInstance(modalEl);
                if (modalInst) modalInst.close();
            }
        }
    } catch (err) {
        if (typeof M !== 'undefined' && M.toast) {
            M.toast({
                html: `CAM Export error: ${err.message}`,
                classes: 'rounded toast-error',
                displayLength: 4000
            });
        }
        console.error('CAM export error:', err);
    }
}

if (typeof window !== 'undefined') {
    window.createCAMNestContentFromNests = createCAMNestContentFromNests;
    window.createCAM = createCAMNestContentFromNests;
    window.createCAMNestContent = createCAMNestContent;
    window.exportCamNest = exportCamNest;
    window.loadCAMSettings = loadCAMSettings;
    window.saveCAMSettings = saveCAMSettings;
}

// Export functions for node/module environment if present
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatCamProfile,
        detectCamCategory,
        getSectionGeometry,
        parseCamHeaderFromNc,
        parseHolesForCam,
        generateBarStkn,
        generateCamBarRecord,
        generateCamPieceRecord,
        createCAMNestContentFromNests,
        createCAMNestContent,
        createCAM: createCAMNestContentFromNests,
        exportCamNest
    };
}
