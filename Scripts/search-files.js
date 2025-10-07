function initFileSearch() {
    const searchInputs = document.querySelectorAll('#fileSearch');
    if (searchInputs.length === 0) return;
    
    searchInputs.forEach(function(searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const files = document.querySelectorAll('.viewFiles');
            
            files.forEach(function(file) {
                const fileName = file.querySelector('p').textContent.toLowerCase();
                if (fileName.includes(searchTerm)) {
                    file.classList.remove('hide');
                } else {
                    file.classList.add('hide');
                }
            });
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    initFileSearch();
});

// Parse DSTV Header into an object
function ncParseHeaderObject(fileData) {
  const splitFileData = fileData.split('\n');

  const propertyIds = [
    'Project', 'Drawing', 'Phase', 'Piece', 'Grade', 'Quantity',
    'Profile', 'Code', 'Length', 'Height',
    'flangeWidth', 'flangeThickness', 'webThickness', 'Radius', 'weight', 'Surface',
    'webCutStart', 'webCutEnd', 'flangeCutStart', 'flangeCutEnd',
    'textInfo1', 'textInfo2', 'textInfo3', 'textInfo4'
  ];

  const headerObj = {};
  let lineCounter = 0;

  for (let line of splitFileData) {
    line = line.trimStart();

    // skip ST lines
    if (line.slice(0, 2).toUpperCase() === 'ST') continue;

    if (lineCounter === 24) break; // only first 24 lines

    // skip comments
    if (line.slice(0, 2) === '**') continue;

    // remove inline comments
    line = line.split('**')[0];

    // bloc indicator check
    if (typeof blocs !== 'undefined' && blocs.includes(line.slice(0, 2)) && line.slice(2, 1) === ' ') {
      if (typeof M !== 'undefined' && M.toast) {
        M.toast({ html: 'File header contains an error!', classes: 'rounded toast-warning', displayLength: 2000 });
      }
      break;
    }

    // handle empty text info fields
    if (lineCounter > 19 && line.length === 0) line = 'N/A';

    const propId = propertyIds[lineCounter] || `unknown${lineCounter}`;
    headerObj[propId] = line;

    lineCounter++;
  }

  // fill missing properties
  for (let i = 0; i < propertyIds.length; i++) {
    const id = propertyIds[i];
    if (typeof headerObj[id] === 'undefined') headerObj[id] = 'N/A';
  }

  return headerObj;
}

// Create file view element
function createFileViewDiv(fileName) {
  const div = document.createElement('div');
  div.classList.add('viewFiles', 'hoverable');
  div.setAttribute('onclick', 'selectFile(this, event)');

  const p = document.createElement('p');
  p.textContent = fileName;

  const btn = document.createElement('a');
  btn.setAttribute('data-filename', fileName);
  btn.setAttribute('onclick', 'deleteFile(this, event)');
  btn.classList.add('fileDelete', 'btn-small', 'waves-effect', 'waves-light', 'red');

  const icon = document.createElement('i');
  icon.classList.add('material-icons', 'right');
  icon.textContent = 'delete';

  btn.appendChild(icon);
  div.appendChild(p);
  div.appendChild(btn);

  if (typeof selectedFile !== 'undefined' && selectedFile === fileName) {
    div.classList.add('selected-file');
  }

  return div;
}

// Group files by selected property
function groupFiles(by) {
  const mainViewFiles = document.getElementById('files');
  const sideNavFiles = document.getElementById('mobile');
  const sideNavClearAll = document.getElementById('sideNavClearAll');

  if (!mainViewFiles || !sideNavFiles || !sideNavClearAll) return;

  const groupBy = (typeof by !== 'undefined') ? by : '';

  // sync both dropdowns from view and sidenav
  const groupSelects = document.querySelectorAll('.groupBySelect');
  groupSelects.forEach(sel => {
    sel.value = groupBy;
    const instance = M.FormSelect.getInstance(sel);
    if (instance) instance.destroy();
    M.FormSelect.init(sel);
  });

  // clear existing UI items
  mainViewFiles.querySelectorAll('.viewFiles, .groupHeader').forEach(el => el.remove());
  sideNavFiles.querySelectorAll('.viewFiles, .groupHeader').forEach(el => el.remove());

  // no grouping
  if (!groupBy || groupBy === '') {
    for (const [fileName, fileData] of filePairs) {
      const div = createFileViewDiv(fileName);
      mainViewFiles.appendChild(div);

      const clone = div.cloneNode(true);
      sideNavFiles.insertBefore(clone, sideNavClearAll);
    }
    filesPlaceHolder();
    updateFileTracker();
    initGroupBySelects(); // ensure dropdowns work after render
    return;
  }

  // build group map
  const groups = new Map();
  for (const [fileName, fileData] of filePairs) {
    const headerObj = (typeof ncParseHeaderObject === 'function') ? ncParseHeaderObject(fileData) : null;
    let key = 'Unknown';

    switch (groupBy.toLowerCase()) {
      case 'profile':
        key = (headerObj?.Profile && headerObj.Profile !== 'N/A') ? headerObj.Profile :
              (headerObj?.Code ? headerObj.Code : 'Unknown');
        break;
      case 'mark':
      case 'position':
        key = (headerObj?.Piece && headerObj.Piece !== 'N/A') ? headerObj.Piece : 'Unknown';
        break;
      case 'contract':
      case 'project':
      case 'order':
        key = (headerObj?.Project && headerObj.Project !== 'N/A') ? headerObj.Project : 'Unknown';
        break;
      default:
        key = 'Unknown';
    }

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(fileName);
  }

  // render groups
  for (const [groupKey, names] of groups) {
    const gHead = document.createElement('div');
    gHead.classList.add('groupHeader');
    gHead.style.padding = '6px 8px';
    gHead.style.fontWeight = '600';
    gHead.style.color = '#fff';
    gHead.style.background = '#5e35b1';
    gHead.textContent = `${groupKey}`;
    mainViewFiles.appendChild(gHead);

    const sideHead = gHead.cloneNode(true);
    sideHead.classList.add('groupHeader');
    sideNavFiles.insertBefore(sideHead, sideNavClearAll);

    for (const fname of names) {
      const div = createFileViewDiv(fname);
      mainViewFiles.appendChild(div);

      const clone = div.cloneNode(true);
      sideNavFiles.insertBefore(clone, sideNavClearAll);
    }
  }

  filesPlaceHolder();
  updateFileTracker();
  initGroupBySelects(); // reinit dropdowns after grouping
}

// Initialize Materialize selects and attach event handlers
function initGroupBySelects() {
  const selects = document.querySelectorAll('.groupBySelect');

  selects.forEach(select => {
    // Destroy old Materialize instance if any
    const existingInstance = M.FormSelect.getInstance(select);
    if (existingInstance) existingInstance.destroy();

    // Reinitialize Materialize select
    M.FormSelect.init(select);

    // Bind onchange event
    select.onchange = (e) => {
      groupFiles(e.target.value);
    };
  });
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
  initGroupBySelects();
});

// Refresh grouping
function refreshGrouping() {
  const currentSelect = document.querySelector('.groupBySelect');
  if (!currentSelect) return;
  
  const currentValue = currentSelect.value || '';
  groupFiles(currentValue);
}