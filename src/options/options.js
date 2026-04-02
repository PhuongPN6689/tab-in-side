// Tab in Side Options Logic

const DEFAULT_SETTINGS = {
  default_url: 'https://www.google.com',
  quick_urls: [
    { name: 'Google', url: 'https://www.google.com', zoom: 90, mobile: true, icon: '' },
    { name: 'Translate', url: 'https://translate.google.com', zoom: 100, mobile: true, icon: '' },
    { name: 'YouTube', url: 'https://www.youtube.com', zoom: 90, mobile: true, icon: '' }
  ],
  mobile_view: true,
  history_toolbar_limit: 3,
  history_storage_limit: 30,
  zoom_level: 90,
  toolbar_position: 'top'
};

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

const MAX_BUTTONS = 10;

/**
 * Initialize options UI
 */
async function loadOptions() {
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
  const quickUrls = data.quick_urls || DEFAULT_SETTINGS.quick_urls;

  quickUrls.forEach((item) => {
    createRow(item.name, item.url, item.zoom, (item.mobile !== undefined ? item.mobile : true), item.icon);
  });

  updateAddButtonState();
}

function createRow(nameValue = '', urlValue = '', zoomValue = 90, mobileValue = true, iconValue = '') {
  const row = document.createElement('div');
  row.className = 'quick-access-row';

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

  row.appendChild(nameInput);
  row.appendChild(urlInput);
  row.appendChild(iconInput);
  row.appendChild(zoomInput);
  row.appendChild(mobileInput);
  row.appendChild(deleteBtn);

  container.appendChild(row);
  updateAddButtonState();
}

function updateAddButtonState() {
  const count = container.querySelectorAll('.quick-access-row:not(.header-row)').length;
  addBtn.disabled = count >= MAX_BUTTONS;
}

addBtn.addEventListener('click', () => {
  const count = container.querySelectorAll('.quick-access-row:not(.header-row)').length;
  if (count < MAX_BUTTONS) {
    createRow();
  }
});

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
  setTimeout(() => {
    statusMsg.style.display = 'none';
  }, 2000);
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
    }, 2000);
  }
}

document.addEventListener('DOMContentLoaded', loadOptions);
saveBtn.addEventListener('click', saveOptions);
resetBtn.addEventListener('click', resetOptions);
