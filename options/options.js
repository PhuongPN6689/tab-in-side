// Tab-in-Side Options Logic

const DEFAULT_SETTINGS = {
  default_url: 'https://www.google.com',
  quick_urls: [
    { name: 'Google', url: 'https://www.google.com' },
    { name: 'Wikipedia', url: 'https://www.wikipedia.org' },
    { name: 'GitHub', url: 'https://github.com' },
    { name: 'StackOverflow', url: 'https://stackoverflow.com' },
    { name: 'YouTube', url: 'https://www.youtube.com' }
  ],
  mobile_view: false,
  history_limit: 3
};

const container = document.getElementById('quick-urls-container');
const saveBtn = document.getElementById('save-btn');
const addBtn = document.getElementById('add-btn');
const statusMsg = document.getElementById('status');
const defaultUrlInput = document.getElementById('default-url');
const historyLimitInput = document.getElementById('history-limit');

const MAX_BUTTONS = 5;

/**
 * Initialize options UI
 */
async function loadOptions() {
  const data = await browser.storage.local.get(['default_url', 'quick_urls', 'mobile_view', 'history_limit']);
  
  // Set default URL
  defaultUrlInput.value = data.default_url || DEFAULT_SETTINGS.default_url;
  
  // Set mobile view toggle
  document.getElementById('mobile-view-toggle').checked = (data.mobile_view !== undefined) ? data.mobile_view : DEFAULT_SETTINGS.mobile_view;

  // Set history limit
  historyLimitInput.value = data.history_limit || DEFAULT_SETTINGS.history_limit;
  
  // Set quick URLs
  const quickUrls = data.quick_urls || DEFAULT_SETTINGS.quick_urls;
  
  quickUrls.forEach((item) => {
    createRow(item.name, item.url);
  });
  
  updateAddButtonState();
}

function createRow(nameValue = '', urlValue = '') {
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
  const history_limit = parseInt(historyLimitInput.value) || DEFAULT_SETTINGS.history_limit;
  const rows = container.querySelectorAll('.quick-access-row:not(.header-row)');
  
  const quick_urls = [];
  rows.forEach(row => {
    const nameInput = row.querySelector('.quick-name');
    const urlInput = row.querySelector('.quick-url');
    if (nameInput && urlInput) {
      const name = nameInput.value.trim();
      const url = urlInput.value.trim();
      if (name || url) {
        quick_urls.push({ name, url });
      }
    }
  });
  
  await browser.storage.local.set({
    default_url,
    mobile_view,
    history_limit,
    quick_urls
  });
  
  // Show success message
  statusMsg.style.display = 'block';
  setTimeout(() => {
    statusMsg.style.display = 'none';
  }, 2000);
}

document.addEventListener('DOMContentLoaded', loadOptions);
saveBtn.addEventListener('click', saveOptions);
