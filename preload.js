const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
  const searchForm = document.getElementById('searchForm');
  const searchInput = document.getElementById('searchInput');

  ipcRenderer.on('#searchInput:focus', () => searchInput.focus());

  searchForm.addEventListener('submit', e => {
    e.preventDefault();
    const query = searchInput.value;
    searchInput.value = '';
    ipcRenderer.send('#searchForm:submit', query);
  });
});
