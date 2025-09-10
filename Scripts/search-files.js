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