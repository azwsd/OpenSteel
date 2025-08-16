// Initialize all Materialize components when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all basic Materialize components (only if elements exist)
    const sidenavElems = document.querySelectorAll('.sidenav');
    if (sidenavElems.length > 0) M.Sidenav.init(sidenavElems, {});
    
    const fabElems = document.querySelectorAll('.fixed-action-btn');
    if (fabElems.length > 0) M.FloatingActionButton.init(fabElems, {
        hoverEnabled: false,
    });
    
    const tooltipElems = document.querySelectorAll('.tooltipped');
    if (tooltipElems.length > 0) M.Tooltip.init(tooltipElems, {});
    
    const modalElems = document.querySelectorAll('.modal');
    if (modalElems.length > 0) M.Modal.init(modalElems, {});
    
    const materialboxElems = document.querySelectorAll('.materialboxed');
    if (materialboxElems.length > 0) M.Materialbox.init(materialboxElems, {});
    
    const tabElems = document.querySelectorAll('.tabs');
    if (tabElems.length > 0) M.Tabs.init(tabElems, {});
    
    const selectElems = document.querySelectorAll('select');
    if (selectElems.length > 0) M.FormSelect.init(selectElems, {});
    
    const tapTargetElems = document.querySelectorAll('.tap-target');
    if (tapTargetElems.length > 0) M.TapTarget.init(tapTargetElems, {});
    
    // Initialize dropdown with special configuration (only if elements exist)
    const dropdownElems = document.querySelectorAll('.dropdown-trigger');
    if (dropdownElems.length > 0) {
        M.Dropdown.init(dropdownElems, { 
            coverTrigger: false,
            closeOnClick: false, 
        });
    }

    // Fix event delegation for dropdown buttons
    let viewsDropdown = document.getElementById('viewsDropdown');
    if (!viewsDropdown) return;
    viewsDropdown.addEventListener('click', function (event) {
        if (event.target.classList.contains('viewSwitch')) {
            let view = event.target.dataset.view; //Get the view name
            switchView(view, event.target);
        }
    });

    // Set all buttons to active initially
    document.querySelectorAll('.viewSwitch').forEach(btn => {
        btn.classList.remove('text-lighten-3'); // Make them fully visible at start
        btn.dataset.tooltip = 'Turn OFF'; // Set tooltip to indicate turning it off
    });
    // Refresh tooltips if they exist
    const refreshTooltipElems = document.querySelectorAll('.tooltipped');
    if (refreshTooltipElems.length > 0) M.Tooltip.init(refreshTooltipElems); // Refresh tooltips
});