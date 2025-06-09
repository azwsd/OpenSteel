//Mobile navbar
document.addEventListener('DOMContentLoaded', function() {
    var elems = document.querySelectorAll('.sidenav');
    var instances = M.Sidenav.init(elems, {});
});

//Insert file floating action button
document.addEventListener('DOMContentLoaded', function() {
    var elems = document.querySelectorAll('.fixed-action-btn');
    var instances = M.FloatingActionButton.init(elems, {
        hoverEnabled: false,
    });
});

//tooltips
document.addEventListener('DOMContentLoaded', function() {
    var elems = document.querySelectorAll('.tooltipped');
    var instances = M.Tooltip.init(elems, {});
});

//Modal in about me section
document.addEventListener('DOMContentLoaded', function() {
    var elems = document.querySelectorAll('.modal');
    var instances = M.Modal.init(elems, {});
});

//Material box for view images
document.addEventListener('DOMContentLoaded', function() {
    var elems = document.querySelectorAll('.materialboxed');
    var instances = M.Materialbox.init(elems, {});
});

//taps for head and hole data
document.addEventListener('DOMContentLoaded', function() {
    var elems = document.querySelectorAll('.tabs');
    var instance = M.Tabs.init(elems, {});
});

//Dropdown menu for action buttons
document.addEventListener('DOMContentLoaded', function () {
    // Initialize dropdown
    var elems = document.querySelectorAll('.dropdown-trigger');
    var instances = M.Dropdown.init(elems, { 
        coverTrigger: false,
        closeOnClick: false, 
    });

    // Initialize tooltips
    var tooltips = document.querySelectorAll('.tooltipped');
    M.Tooltip.init(tooltips);

    // Fix event delegation for dropdown buttons
    let viewsDropdown = document.getElementById('viewsDropdown');
    if (!viewsDropdown) return;
    viewsDropdown.addEventListener('click', function (event) {
        if (event.target.classList.contains('viewSwitch')) {
            let view = event.target.dataset.view; //Get the view name
            switchView(view, event.target);
        }
    });

    // Set all buttons to active active initially
    document.querySelectorAll('.viewSwitch').forEach(btn => {
        btn.classList.remove('text-lighten-3'); // Make them fully visible at start
        btn.dataset.tooltip = 'Turn OFF'; // Set tooltip to indicate turning it off
    });
    M.Tooltip.init(document.querySelectorAll('.tooltipped')); // Refresh tooltips
});

//Initialize select elements for dropdowns
document.addEventListener('DOMContentLoaded', function() {
    var elems = document.querySelectorAll('select');
    var instances = M.FormSelect.init(elems, {});
  });