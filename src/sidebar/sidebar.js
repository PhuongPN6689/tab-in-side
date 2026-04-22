const iframe = document.getElementById('main-frame');
const quickBtnsContainer = document.getElementById('quick-btns-container');
const historyBtnsContainer = document.getElementById('history-btns-container');
const historyDivider = document.getElementById('history-divider');
const settingsBtn = document.getElementById('settings-btn');
const tooltipContainer = document.getElementById('custom-tooltip');
const tooltipTitle = tooltipContainer.querySelector('.tooltip-title');
const tooltipUrl = tooltipContainer.querySelector('.tooltip-url');
const historyContextMenu = document.getElementById('history-context-menu');
const addUrlBtn = document.getElementById('add-url-btn');
const searchOverlay = document.getElementById('search-overlay');
const searchOverlayContent = searchOverlay.querySelector('.overlay-content');
const searchInput = document.getElementById('search-input');
const openCurrentTabBtn = document.getElementById('open-current-tab-btn');
const historyOverlay = document.getElementById('history-overlay');
const historyOverlayContent = historyOverlay.querySelector('.overlay-content');
const historyList = document.getElementById('history-list');
const closeHistoryBtn = document.getElementById('close-history-btn');
const historyDropdownContainer = document.getElementById('history-dropdown-container');
const historyDropdownBtn = document.getElementById('history-dropdown-btn');
const actionsContainer = document.getElementById('actions-container');
const reloadBtn = document.getElementById('reload-btn');
const copyLinkBtn = document.getElementById('copy-link-btn');
const openTabBtn = document.getElementById('open-tab-btn');
const sidebarContainer = document.querySelector('.sidebar-container');

// Tooltip Management
function showTooltip(e, title, url) {
  if (!title && !url) return;
  
  tooltipTitle.textContent = title || '';
  tooltipTitle.style.display = title ? 'block' : 'none';
  
  tooltipUrl.textContent = url || '';
  tooltipUrl.style.display = url ? 'block' : 'none';
  
  tooltipContainer.style.display = 'block';
  
  const rect = e.currentTarget.getBoundingClientRect();
  const tooltipRect = tooltipContainer.getBoundingClientRect();
  
  let top, left;
  
  // Always position below the button
  top = rect.bottom + 8;
  left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
  
  // Keep within viewport (horizontal)
  if (left < 4) left = 4;
  if (left + tooltipRect.width > window.innerWidth - 4) {
    left = window.innerWidth - tooltipRect.width - 4;
  }
  
  // Keep within viewport (vertical)
  if (top < 4) top = 4;
  if (top + tooltipRect.height > window.innerHeight - 4) {
    top = window.innerHeight - tooltipRect.height - 4;
  }
  
  tooltipContainer.style.top = `${top}px`;
  tooltipContainer.style.left = `${left}px`;
}

function hideTooltip() {
  tooltipContainer.style.display = 'none';
}

function hideHistoryContextMenu() {
  historyContextMenu.style.display = 'none';
  historyContextMenu.innerHTML = '';
}

function attachTooltip(element, title, url) {
  // Remove native title to prevent double tooltip
  element.removeAttribute('title');
  
  element.onmouseenter = (e) => showTooltip(e, title, url);
  element.onmouseleave = hideTooltip;
}

// State
let quickUrls = [];
let historyUrls = [];
let mobileViewEnabled = true;
let zoomLevel = 90;
let toolbarPosition = 'top';

/**
 * Update the iframe source
 * @param {string} url 
 * @param {number} [specificZoom] 
 */
function updateIframe(url, specificZoom) {
  if (url && url !== iframe.src) {
    iframe.src = url;
    
    // Use specific zoom or fallback to global zoomLevel
    const activeZoom = specificZoom || zoomLevel;
    
    // Delay applying zoom to ensure iframe content starts loading
    setTimeout(() => applyZoom(activeZoom), 100);
  }
}

/**
 * Apply zoom level to the iframe
 * @param {number} level 
 */
function applyZoom(level) {
  if (!iframe) return;
  const scale = level / 100;
  iframe.style.transform = `scale(${scale})`;
  iframe.style.transformOrigin = '0 0';
  iframe.style.width = `${100 / scale}%`;
  iframe.style.height = `${100 / scale}%`;
}

/**
 * Fetch favicon for a URL
 * @param {string} url 
 */
function getFaviconUrl(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch (e) {
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="20" height="20"%3E%3C/svg%3E';
  }
}

/**
 * Helper to create a toolbar button
 */
function createToolbarButton(title, url, isHistory = false, zoom = null, mobile = null, customIcon = null) {
  const btn = document.createElement('button');
  btn.className = 'nav-btn';
  if (isHistory) btn.style.opacity = '0.8';
  btn.title = title;
  
  const img = document.createElement('img');
  img.className = 'icon-img';
  img.src = customIcon || getFaviconUrl(url);
  img.alt = '';
  
  btn.appendChild(img);
  attachTooltip(btn, title, url);
  
  btn.onclick = async () => {
    // If specific view mode is set, update global mobile_view toggle
    // This will trigger background.js updateNetRules via storage listener
    if (mobile !== null) {
      await browser.storage.local.set({ mobile_view: mobile });
    }
    updateIframe(url, zoom);
  };
  return btn;
}

function showHistoryContextMenu(event, title, url) {
  event.preventDefault();
  event.stopPropagation();
  hideTooltip();

  const isPinned = quickUrls.some((q) => q.url === url);
  historyContextMenu.innerHTML = '';

  const pinAction = document.createElement('button');
  pinAction.type = 'button';
  pinAction.className = 'context-menu-item';
  pinAction.textContent = isPinned ? 'Unpin' : 'Pin';
  pinAction.onclick = async (e) => {
    e.stopPropagation();
    await togglePin(title, url);
    hideHistoryContextMenu();
  };

  const deleteAction = document.createElement('button');
  deleteAction.type = 'button';
  deleteAction.className = 'context-menu-item danger';
  deleteAction.textContent = 'Delete';
  deleteAction.onclick = async (e) => {
    e.stopPropagation();
    await removeHistoryItem(url);
    hideHistoryContextMenu();
  };

  historyContextMenu.appendChild(pinAction);
  historyContextMenu.appendChild(deleteAction);
  historyContextMenu.style.display = 'block';

  const menuRect = historyContextMenu.getBoundingClientRect();
  let left = event.clientX;
  let top = event.clientY;

  if (left + menuRect.width > window.innerWidth - 4) {
    left = window.innerWidth - menuRect.width - 4;
  }
  if (top + menuRect.height > window.innerHeight - 4) {
    top = window.innerHeight - menuRect.height - 4;
  }
  if (left < 4) left = 4;
  if (top < 4) top = 4;

  historyContextMenu.style.left = `${left}px`;
  historyContextMenu.style.top = `${top}px`;
}


/**
 * Update button tooltips/titles and favicons from settings
 */
async function updateButtonUI() {
  const data = await browser.storage.local.get('history_toolbar_limit');
  const toolbarLimit = data.history_toolbar_limit || 3;

  // 1. Render Quick Access
  quickBtnsContainer.innerHTML = '';
  quickUrls.forEach((item) => {
    if (item.url) {
      const btn = createToolbarButton(item.name || 'Quick Access', item.url, false, item.zoom, item.mobile, item.icon);
      // Re-attach tooltip with URL for Quick Access
      attachTooltip(btn, item.name || 'Quick Access', item.url);
      quickBtnsContainer.appendChild(btn);
    }
  });

  // 2. Render History with Overflow Detection
  historyBtnsContainer.innerHTML = '';
  historyList.innerHTML = '';
  
  if (historyUrls.length > 0) {
    historyDivider.style.display = 'block';
    
    // We'll calculate how many buttons can fit
    const toolbar = document.getElementById('toolbar');
    const isVertical = (toolbarPosition === 'left' || toolbarPosition === 'right');
    const toolbarSize = isVertical ? toolbar.clientHeight : toolbar.clientWidth;
    const quickSize = isVertical ? (quickBtnsContainer.offsetHeight || 100) : (quickBtnsContainer.offsetWidth || 100);
    const navBtnsSize = isVertical ? (actionsContainer?.offsetHeight || 144) : (actionsContainer?.offsetWidth || 144);
    const dividerSize = 10; 
    
    // Available size for history buttons (always reserving space for the dropdown button)
    let availableSize = toolbarSize - quickSize - navBtnsSize - dividerSize - 34; // -34 for dropdown btn
    
    let buttonsThatFit;
    if (toolbarSize === 0) {
      buttonsThatFit = toolbarLimit;
    } else {
      // Buttons that fit based on size, but also capped by toolbarLimit
      const sizeFit = Math.max(0, Math.floor(availableSize / 34));
      buttonsThatFit = Math.min(sizeFit, toolbarLimit);
    }

    // Toolbar shows only the most recent N items that fit
    const toolbarHistory = historyUrls.slice(0, buttonsThatFit);
    
    // Overlay shows EVERYTHING
    const dropdownHistory = historyUrls;

    toolbarHistory.forEach((item) => {
      const hTitle = (typeof item === 'string') ? item : item.title;
      const hUrl = (typeof item === 'string') ? item : item.url;
      
      const btn = createToolbarButton(hTitle, hUrl, true);
      attachTooltip(btn, hTitle, hUrl);
      btn.oncontextmenu = (e) => showHistoryContextMenu(e, hTitle, hUrl);
      historyBtnsContainer.appendChild(btn);
    });

    if (dropdownHistory.length > 0) {
      historyDropdownContainer.style.display = 'flex';
      dropdownHistory.forEach((item) => {
        const hTitle = (typeof item === 'string') ? item : item.title;
        const hUrl = (typeof item === 'string') ? item : item.url;

        const divItem = document.createElement('div');
        divItem.className = 'overlay-item';
        attachTooltip(divItem, hTitle, hUrl);
        
        const img = document.createElement('img');
        img.className = 'icon-img';
        img.src = getFaviconUrl(hUrl);
        img.alt = '';
        
        const titleSpan = document.createElement('span');
        titleSpan.className = 'title';
        titleSpan.textContent = hTitle;
        
        divItem.appendChild(img);
        divItem.appendChild(titleSpan);
        
        // Add Pin Button
        const pinBtn = document.createElement('button');
        pinBtn.className = 'pin-btn';
        const isPinned = quickUrls.some(q => q.url === hUrl);
        if (isPinned) pinBtn.classList.add('pinned');
        pinBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z"/>
            </svg>`;
        pinBtn.title = isPinned ? 'Pinned to Quick Access' : 'Pin to Quick Access';
        
        pinBtn.onclick = async (e) => {
          e.stopPropagation();
          await togglePin(hTitle, hUrl);
        };
        
        divItem.appendChild(pinBtn);
        
        divItem.onclick = () => {
          updateIframe(hUrl);
          historyOverlay.style.display = 'none';
        };
        divItem.oncontextmenu = (e) => showHistoryContextMenu(e, hTitle, hUrl);
        
        historyList.appendChild(divItem);
      });
    } else {
      historyDropdownContainer.style.display = 'none';
    }
  } else {
    historyDivider.style.display = 'none';
    historyDropdownContainer.style.display = 'none';
  }
}

/**
 * Load initial state from storage
 */
async function initSidebar() {
  const [data, defaults, defaultQuickUrls] = await Promise.all([
    browser.storage.local.get(['last_requested_url', 'quick_urls', 'default_url', 'history', 'mobile_view', 'zoom_level', 'toolbar_position', 'search_engine']),
    fetch('../config/defaults.json').then(r => r.json()),
    fetch('../config/quick_urls.json').then(r => r.json())
  ]);
  
  mobileViewEnabled = (data.mobile_view !== undefined) ? data.mobile_view : defaults.mobile_view;
  zoomLevel = data.zoom_level || defaults.zoom_level;
  toolbarPosition = data.toolbar_position || defaults.toolbar_position;
  const searchEngine = data.search_engine || defaults.search_engine;
  const searchBaseUrl = defaults.search_engines[searchEngine];
  
  // Apply toolbar position
  document.body.classList.remove('pos-top', 'pos-left', 'pos-right');
  document.body.classList.add(`pos-${toolbarPosition}`);
  sidebarContainer.classList.remove('pos-top', 'pos-left', 'pos-right');
  sidebarContainer.classList.add(`pos-${toolbarPosition}`);

  if (data.quick_urls) {
    quickUrls = data.quick_urls;
  } else {
    quickUrls = defaultQuickUrls;
  }

  historyUrls = data.history || [];
  await updateButtonUI();
  
  const targetUrl = data.last_requested_url || data.default_url || defaults.default_url || (quickUrls[0]?.url);
  if (targetUrl) updateIframe(targetUrl);

  // Init Search Overlay
  initSearchOverlay(searchBaseUrl);

  // Clear the transient URL so next time it opens manually, it goes to homepage
  if (data.last_requested_url) {
    await browser.storage.local.remove('last_requested_url');
  }
}

// 1. Listen for clicks on toolbar buttons
settingsBtn.onclick = () => {
  browser.runtime.openOptionsPage();
};
attachTooltip(addUrlBtn, 'Add / Search URL', 'Open URL entry and search overlay');
attachTooltip(settingsBtn, 'Settings', 'Extension Options');

reloadBtn.onclick = () => {
  // Simplest and most reliable way to reload a cross-origin iframe
  if (iframe.src) {
    iframe.src = iframe.src;
  }
};
attachTooltip(reloadBtn, 'Reload', 'Refresh current page');

copyLinkBtn.onclick = async () => {
  const url = iframe.src;
  if (url && url !== 'about:blank') {
    try {
      await navigator.clipboard.writeText(url);
      
      // Visual feedback
      const originalTitle = copyLinkBtn.title;
      // Temporarily change tooltip via data/manager instead of attribute
      showTooltip({ currentTarget: copyLinkBtn }, 'Link Copied!', url);
      copyLinkBtn.style.color = '#1e8e3e'; // Success green
      
      setTimeout(() => {
        hideTooltip();
        copyLinkBtn.style.color = '';
      }, 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  }
};
attachTooltip(copyLinkBtn, 'Copy Link', 'Copy current page URL');

openTabBtn.onclick = () => {
  const url = iframe.src;
  if (url && url !== 'about:blank') {
    browser.tabs.create({ url });
  }
};
attachTooltip(openTabBtn, 'Open in New Tab', 'Open current page in a full browser tab');

// History Overlay Toggle
historyDropdownBtn.onclick = (e) => {
  e.stopPropagation();
  hideHistoryContextMenu();
  const isVisible = historyOverlay.style.display === 'flex';
  historyOverlay.style.display = isVisible ? 'none' : 'flex';
};
attachTooltip(historyDropdownBtn, 'Recent History', 'Show all browsing history');

closeHistoryBtn.onclick = () => {
  historyOverlay.style.display = 'none';
};

// Close overlays when clicking outside
window.onclick = (e) => {
  if (historyContextMenu.style.display === 'block' && !historyContextMenu.contains(e.target)) {
    hideHistoryContextMenu();
  }
  if (searchOverlay.style.display === 'flex' && !searchOverlayContent.contains(e.target) && !addUrlBtn.contains(e.target)) {
    searchOverlay.style.display = 'none';
  }
  if (historyOverlay.style.display === 'flex' && !historyOverlayContent.contains(e.target) && !historyDropdownBtn.contains(e.target)) {
    historyOverlay.style.display = 'none';
  }
};

function initSearchOverlay(searchBaseUrl) {
  addUrlBtn.onclick = () => {
    const isVisible = searchOverlay.style.display === 'flex';
    searchOverlay.style.display = isVisible ? 'none' : 'flex';
    if (!isVisible) {
      searchInput.value = '';
      searchInput.focus();
    }
  };

  openCurrentTabBtn.onclick = async () => {
    try {
      const activeTab = await browser.runtime.sendMessage({ type: 'GET_ACTIVE_TAB' });
      if (!activeTab?.url) return;

      updateIframe(activeTab.url);
      browser.runtime.sendMessage({
        type: 'ADD_HISTORY',
        url: activeTab.url,
        title: activeTab.title || activeTab.url
      }).catch(() => {});

      searchOverlay.style.display = 'none';
    } catch (err) {
      console.error('Failed to open current tab in sidebar:', err);
    }
  };
  
  searchInput.onkeydown = (e) => {
    if (e.key === 'Enter') {
      let val = searchInput.value.trim();
      if (!val) return;
      
      let targetUrl = val;
      let titleToSave = val;

      // Simple URL detection
      const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/;
      if (!urlPattern.test(val) && !val.startsWith('localhost')) {
        targetUrl = searchBaseUrl + encodeURIComponent(val);
        titleToSave = `Search: ${val}`;
      } else if (!val.startsWith('http')) {
        targetUrl = 'https://' + val;
      }
      
      updateIframe(targetUrl);

      // Save to history via background script
      browser.runtime.sendMessage({
        type: 'ADD_HISTORY',
        url: targetUrl,
        title: titleToSave
      }).catch(() => {});

      searchOverlay.style.display = 'none';
    }
    if (e.key === 'Escape') {
      searchOverlay.style.display = 'none';
    }
  };
}

// Handle window resize to recalculate overflow
window.onresize = () => {
  hideHistoryContextMenu();
  updateButtonUI();
};

// 2. Listen for messages from background script
browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'LOAD_URL') {
    updateIframe(message.url);
  }
});

// 3. Listen for changes in storage
browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.last_requested_url && changes.last_requested_url.newValue) {
      updateIframe(changes.last_requested_url.newValue);
    }
    if (changes.quick_urls) {
      quickUrls = changes.quick_urls.newValue;
      updateButtonUI();
    }
    if (changes.history) {
      historyUrls = changes.history.newValue || [];
      updateButtonUI();
    }
    if (changes.history_toolbar_limit) {
      updateButtonUI();
    }
    if (changes.mobile_view) {
      mobile_view_enabled = changes.mobile_view.newValue !== false;
    }
    if (changes.zoom_level) {
      zoomLevel = changes.zoom_level.newValue || 90;
      applyZoom(zoomLevel);
    }
    if (changes.toolbar_position) {
      toolbarPosition = changes.toolbar_position.newValue || 'top';
      sidebarContainer.classList.remove('pos-top', 'pos-left', 'pos-right');
      sidebarContainer.classList.add(`pos-${toolbarPosition}`);
      document.body.classList.remove('pos-top', 'pos-left', 'pos-right');
      document.body.classList.add(`pos-${toolbarPosition}`);
      updateButtonUI();
    }
  }
});

/**
 * Toggle Pin for a URL
 */
async function togglePin(title, url) {
  let currentQuick = Array.isArray(quickUrls) ? [...quickUrls] : [];
  
  const index = currentQuick.findIndex(q => q.url === url);
  if (index > -1) {
    // Unpin
    currentQuick.splice(index, 1);
  } else {
    // Pin
    if (currentQuick.length >= 10) {
      alert('Quick Access limit reached (10). Please remove one first.');
      return;
    }
    currentQuick.push({ name: title, url: url, zoom: zoomLevel, mobile: mobileViewEnabled });
  }
  
  await browser.storage.local.set({ quick_urls: currentQuick });
  // storage.onChanged will handle UI update
}

async function removeHistoryItem(url) {
  const nextHistory = historyUrls.filter((item) => {
    const itemUrl = (typeof item === 'string') ? item : item.url;
    return itemUrl !== url;
  });

  await browser.storage.local.set({ history: nextHistory });
}

window.oncontextmenu = (e) => {
  if (historyContextMenu.contains(e.target)) {
    return;
  }

  if (e.target.closest('#history-btns-container') || e.target.closest('#history-list')) {
    e.preventDefault();
    return;
  }

  hideHistoryContextMenu();
};

// Initialize on load
document.addEventListener('DOMContentLoaded', initSidebar);
