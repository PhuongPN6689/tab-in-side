// Tab in Side Options Logic

let DEFAULT_SETTINGS = {};
let QUICK_URLS = [];
let SUGGESTED_LINKS = [];

const container = document.getElementById('quick-urls-container');
const saveBtn = document.getElementById('save-btn');
const addBtn = document.getElementById('add-btn');
const statusMsg = document.getElementById('status');
const defaultUrlInput = document.getElementById('default-url');
const historyToolbarLimitInput = document.getElementById('history-toolbar-limit');
const historyStorageLimitInput = document.getElementById('history-storage-limit');
const zoomLevelInput = document.getElementById('zoom-level');
const toolbarPositionInput = document.getElementById('toolbar-position');
const resetBtn = document.getElementById('reset-btn');

// Modal Elements
const addModal = document.getElementById('add-modal');
const modalClose = document.getElementById('modal-close');
const modalCancel = document.getElementById('modal-cancel');
const modalAddBtn = document.getElementById('modal-add-btn');
const modalName = document.getElementById('modal-name');
const modalUrl = document.getElementById('modal-url');
const modalIcon = document.getElementById('modal-icon');
const modalZoom = document.getElementById('modal-zoom');
const modalMobile = document.getElementById('modal-mobile');
const tagsContainer = document.getElementById('tags-container');
const suggestionsGrid = document.getElementById('suggestions-grid');

const MAX_BUTTONS = 10;
let activeTag = 'All';

/**
 * Fetch configuration from JSON files
 */
async function loadConfig() {
  try {
    const [defaults, quickUrls, suggestions] = await Promise.all([
      fetch('../config/defaults.json').then(r => r.json()),
      fetch('../config/quick_urls.json').then(r => r.json()),
      fetch('../config/suggested_links.json').then(r => r.json())
    ]);
    
    DEFAULT_SETTINGS = defaults;
    QUICK_URLS = quickUrls;
    SUGGESTED_LINKS = suggestions;
  } catch (error) {
    console.error('Error loading config:', error);
  }
}

/**
 * Initialize options UI
 */
async function loadOptions() {
  await loadConfig();
  const data = await browser.storage.local.get(['default_url', 'quick_urls', 'mobile_view', 'history_toolbar_limit', 'history_storage_limit', 'zoom_level', 'toolbar_position']);

  // Set default URL
  defaultUrlInput.value = data.default_url || DEFAULT_SETTINGS.default_url;

  // Set mobile view toggle
  document.getElementById('mobile-view-toggle').checked = (data.mobile_view !== undefined) ? data.mobile_view : DEFAULT_SETTINGS.mobile_view;

  // Set history limits
  historyToolbarLimitInput.value = data.history_toolbar_limit || DEFAULT_SETTINGS.history_toolbar_limit;
  historyStorageLimitInput.value = data.history_storage_limit || DEFAULT_SETTINGS.history_storage_limit;

  // Set zoom level
  zoomLevelInput.value = data.zoom_level || DEFAULT_SETTINGS.zoom_level;

  // Set toolbar position
  toolbarPositionInput.value = data.toolbar_position || DEFAULT_SETTINGS.toolbar_position;

  // Clear existing quick URLs
  const existingRows = container.querySelectorAll('.quick-access-row:not(.header-row)');
  existingRows.forEach(row => row.remove());

  // Set quick URLs
  const quickUrls = data.quick_urls || QUICK_URLS;

  quickUrls.forEach((item) => {
    createRow(item.name, item.url, item.zoom, (item.mobile !== undefined ? item.mobile : true), item.icon);
  });

  updateAddButtonState();
  initDragAndDrop();
  renderSuggestions();
}

function createRow(nameValue = '', urlValue = '', zoomValue = 90, mobileValue = true, iconValue = '') {
  const row = document.createElement('div');
  row.className = 'quick-access-row';
  row.draggable = true;

  const dragHandle = document.createElement('div');
  dragHandle.className = 'drag-handle';
  dragHandle.innerHTML = '⠿';
  dragHandle.title = 'Drag to reorder';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'quick-name';
  nameInput.value = nameValue;
  nameInput.placeholder = 'e.g. Google';

  const urlInput = document.createElement('input');
  urlInput.type = 'text';
  urlInput.className = 'quick-url';
  urlInput.value = urlValue;
  urlInput.placeholder = 'https://...';

  const iconInput = document.createElement('input');
  iconInput.type = 'text';
  iconInput.className = 'quick-icon';
  iconInput.value = iconValue || '';
  iconInput.placeholder = 'Icon URL (Optional)';

  const zoomInput = document.createElement('input');
  zoomInput.type = 'number';
  zoomInput.className = 'quick-zoom number-input';
  zoomInput.value = zoomValue || 90;
  zoomInput.min = 10;
  zoomInput.max = 200;
  zoomInput.step = 10;

  const mobileInput = document.createElement('input');
  mobileInput.type = 'checkbox';
  mobileInput.className = 'quick-mobile checkbox-input';
  mobileInput.checked = (mobileValue === true);
  mobileInput.style.margin = 'auto';

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.innerHTML = '&times;';
  deleteBtn.title = 'Remove item';
  deleteBtn.onclick = () => {
    row.remove();
    updateAddButtonState();
  };

  row.appendChild(dragHandle);
  row.appendChild(nameInput);
  row.appendChild(urlInput);
  row.appendChild(iconInput);
  row.appendChild(zoomInput);
  row.appendChild(mobileInput);
  row.appendChild(deleteBtn);

  container.appendChild(row);
  updateAddButtonState();
  
  // Re-init drag and drop for new rows
  initDragAndDrop();
}

function updateAddButtonState() {
  const count = container.querySelectorAll('.quick-access-row:not(.header-row)').length;
  addBtn.disabled = count >= MAX_BUTTONS;
  if (count >= MAX_BUTTONS) {
    addBtn.classList.add('disabled');
  } else {
    addBtn.classList.remove('disabled');
  }
}

// Drag and Drop Logic
function initDragAndDrop() {
  const rows = container.querySelectorAll('.quick-access-row:not(.header-row)');
  
  rows.forEach(row => {
    row.addEventListener('dragstart', handleDragStart);
    row.addEventListener('dragover', handleDragOver);
    row.addEventListener('dragenter', handleDragEnter);
    row.addEventListener('dragleave', handleDragLeave);
    row.addEventListener('drop', handleDrop);
    row.addEventListener('dragend', handleDragEnd);
  });
}

let dragSrcEl = null;

function handleDragStart(e) {
  this.classList.add('dragging');
  dragSrcEl = this;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDragEnter(e) {
  this.classList.add('drag-over');
}

function handleDragLeave(e) {
  this.classList.remove('drag-over');
}

function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }

  if (dragSrcEl !== this) {
    // Swap row content or move row in DOM
    const allRows = Array.from(container.querySelectorAll('.quick-access-row:not(.header-row)'));
    const srcIndex = allRows.indexOf(dragSrcEl);
    const targetIndex = allRows.indexOf(this);

    if (srcIndex < targetIndex) {
      this.after(dragSrcEl);
    } else {
      this.before(dragSrcEl);
    }
  }
  return false;
}

function handleDragEnd(e) {
  const rows = container.querySelectorAll('.quick-access-row');
  rows.forEach(row => {
    row.classList.remove('dragging');
    row.classList.remove('drag-over');
  });
}

// Modal Logic
addBtn.addEventListener('click', () => {
  const count = container.querySelectorAll('.quick-access-row:not(.header-row)').length;
  if (count < MAX_BUTTONS) {
    openModal();
  }
});

function openModal() {
  addModal.style.display = 'flex';
  modalName.value = '';
  modalUrl.value = '';
  modalIcon.value = '';
  modalZoom.value = 100;
  modalMobile.checked = true;
  modalName.focus();
}

function closeModal() {
  addModal.style.display = 'none';
}

modalClose.addEventListener('click', closeModal);
modalCancel.addEventListener('click', closeModal);
window.addEventListener('click', (e) => {
  if (e.target === addModal) closeModal();
});

modalAddBtn.addEventListener('click', () => {
  const name = modalName.value.trim();
  const url = modalUrl.value.trim();
  
  if (!name && !url) {
    alert('Please enter at least a Name or a URL.');
    return;
  }
  
  createRow(
    name, 
    url, 
    parseInt(modalZoom.value) || 100, 
    modalMobile.checked, 
    modalIcon.value.trim()
  );
  closeModal();
});

// Suggestions Logic
function renderSuggestions() {
  // Extract all unique tags
  const tags = new Set(['All']);
  SUGGESTED_LINKS.forEach(link => link.tags.forEach(tag => tags.add(tag)));
  
  tagsContainer.innerHTML = '';
  tags.forEach(tag => {
    const pill = document.createElement('div');
    pill.className = `tag-pill ${tag === activeTag ? 'active' : ''}`;
    pill.textContent = tag;
    pill.onclick = () => {
      activeTag = tag;
      renderSuggestions();
    };
    tagsContainer.appendChild(pill);
  });

  suggestionsGrid.innerHTML = '';
  const filteredLinks = activeTag === 'All' 
    ? SUGGESTED_LINKS 
    : SUGGESTED_LINKS.filter(link => link.tags.includes(activeTag));

  filteredLinks.forEach(link => {
    const card = document.createElement('div');
    card.className = 'suggestion-card';
    
    const icon = document.createElement('img');
    icon.className = 'suggestion-icon';
    icon.src = link.icon;
    icon.onerror = () => { 
      icon.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCI+PC9jaXJjbGU+PGxpbmUgeDE9IjIiIHkxPSIxMiIgeDI9IjIyIiB5Mj0iMTIiPjwvbGluZT48cGF0aCBkPSJNMTIgMmE1NS4zOSA1NS4zOSAwIDAgMSAwIDIwem0wIDBhNTUuMzkgNTUuMzkgMCAwIDAgMCAyMCI+PC9wYXRoPjwvc3ZnPg=='; 
    }; // Fallback SVG globe icon

    const name = document.createElement('div');
    name.className = 'suggestion-name';
    name.textContent = link.name;
    
    card.appendChild(icon);
    card.appendChild(name);
    
    card.onclick = () => {
      modalName.value = link.name;
      modalUrl.value = link.url;
      modalIcon.value = link.icon;
      modalAddBtn.focus();
    };
    
    suggestionsGrid.appendChild(card);
  });
}

/**
 * Save options to storage
 */
async function saveOptions() {
  const default_url = defaultUrlInput.value.trim();
  const mobile_view = document.getElementById('mobile-view-toggle').checked;
  const history_toolbar_limit = parseInt(historyToolbarLimitInput.value) || DEFAULT_SETTINGS.history_toolbar_limit;
  const history_storage_limit = parseInt(historyStorageLimitInput.value) || DEFAULT_SETTINGS.history_storage_limit;
  const zoom_level = parseInt(zoomLevelInput.value) || DEFAULT_SETTINGS.zoom_level;
  const toolbar_position = toolbarPositionInput.value || DEFAULT_SETTINGS.toolbar_position;
  const rows = container.querySelectorAll('.quick-access-row:not(.header-row)');

  const quick_urls = [];
  rows.forEach(row => {
    const nameInput = row.querySelector('.quick-name');
    const urlInput = row.querySelector('.quick-url');
    const iconInput = row.querySelector('.quick-icon');
    const zoomInput = row.querySelector('.quick-zoom');
    const mobileInput = row.querySelector('.quick-mobile');
    if (nameInput && urlInput) {
      const name = nameInput.value.trim();
      const url = urlInput.value.trim();
      const icon = iconInput.value.trim();
      const zoom = parseInt(zoomInput.value) || 90;
      const mobile = mobileInput.checked;
      if (name || url) {
        quick_urls.push({ name, url, zoom, mobile, icon });
      }
    }
  });

  await browser.storage.local.set({
    default_url,
    mobile_view,
    history_toolbar_limit,
    history_storage_limit,
    zoom_level,
    toolbar_position,
    quick_urls
  });

  // Show success message
  statusMsg.style.display = 'block';
  statusMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => {
    statusMsg.style.display = 'none';
  }, 3000);
}

/**
 * Reset options to defaults
 */
async function resetOptions() {
  if (confirm('Are you sure you want to reset all settings to their default values?')) {
    await browser.storage.local.clear();
    
    // Clear existing quick access rows
    const rows = container.querySelectorAll('.quick-access-row:not(.header-row)');
    rows.forEach(row => row.remove());

    // Reload options
    await loadOptions();

    // Show success message
    statusMsg.textContent = 'Settings reset to defaults!';
    statusMsg.style.display = 'block';
    setTimeout(() => {
      statusMsg.style.display = 'none';
      statusMsg.textContent = 'Settings saved successfully!';
    }, 3000);
  }
}

document.addEventListener('DOMContentLoaded', loadOptions);
saveBtn.addEventListener('click', saveOptions);
resetBtn.addEventListener('click', resetOptions);
