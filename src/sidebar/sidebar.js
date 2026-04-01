const iframe = document.getElementById('main-frame');
const quickBtnsContainer = document.getElementById('quick-btns-container');
const historyBtnsContainer = document.getElementById('history-btns-container');
const historyDivider = document.getElementById('history-divider');
const settingsBtn = document.getElementById('settings-btn');
const tooltipContainer = document.getElementById('custom-tooltip');
const tooltipTitle = tooltipContainer.querySelector('.tooltip-title');
const tooltipUrl = tooltipContainer.querySelector('.tooltip-url');

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
  
  if (toolbarPosition === 'left') {
    // Position to the right of the button
    top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
    left = rect.right + 8;
  } else if (toolbarPosition === 'right') {
    // Position to the left of the button
    top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
    left = rect.left - tooltipRect.width - 8;
  } else {
    // Position below the button (top position)
    top = rect.bottom + 8;
    left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
  }
  
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

const MOBILE_USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1";

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
function createToolbarButton(title, url, isHistory = false, zoom = null, mobile = null) {
  const btn = document.createElement('button');
  btn.className = 'nav-btn';
  if (isHistory) btn.style.opacity = '0.8';
  btn.title = title;
  
  const img = document.createElement('img');
  img.className = 'icon-img';
  img.src = getFaviconUrl(url);
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

const historyDropdownContainer = document.getElementById('history-dropdown-container');
const historyDropdownBtn = document.getElementById('history-dropdown-btn');
const historyDropdownMenu = document.getElementById('history-dropdown-menu');

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
      const btn = createToolbarButton(item.name || 'Quick Access', item.url, false, item.zoom, item.mobile);
      // Re-attach tooltip with URL for Quick Access
      attachTooltip(btn, item.name || 'Quick Access', item.url);
      quickBtnsContainer.appendChild(btn);
    }
  });

  // 2. Render History with Overflow Detection
  historyBtnsContainer.innerHTML = '';
  historyDropdownMenu.innerHTML = '';
  
  if (historyUrls.length > 0) {
    historyDivider.style.display = 'block';
    
    // We'll calculate how many buttons can fit
    const toolbar = document.getElementById('toolbar');
    const isVertical = (toolbarPosition === 'left' || toolbarPosition === 'right');
    const toolbarSize = isVertical ? toolbar.clientHeight : toolbar.clientWidth;
    const quickSize = isVertical ? (quickBtnsContainer.offsetHeight || 100) : (quickBtnsContainer.offsetWidth || 100);
    const actionsContainer = document.getElementById('actions-container');
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
    
    // Dropdown shows EVERYTHING
    const dropdownHistory = historyUrls;

    toolbarHistory.forEach((item) => {
      const hTitle = (typeof item === 'string') ? item : item.title;
      const hUrl = (typeof item === 'string') ? item : item.url;
      
      const btn = createToolbarButton(hTitle, hUrl, true);
      attachTooltip(btn, hTitle, hUrl);
      historyBtnsContainer.appendChild(btn);
    });

    if (dropdownHistory.length > 0) {
      historyDropdownContainer.style.display = 'flex';
      dropdownHistory.forEach((item) => {
        const hTitle = (typeof item === 'string') ? item : item.title;
        const hUrl = (typeof item === 'string') ? item : item.url;

        const divItem = document.createElement('div');
        divItem.className = 'dropdown-item';
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
        
        divItem.onclick = () => {
          updateIframe(hUrl);
          historyDropdownMenu.classList.remove('show');
        };
        
        historyDropdownMenu.appendChild(divItem);
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
  const data = await browser.storage.local.get(['last_requested_url', 'quick_urls', 'default_url', 'history', 'mobile_view', 'zoom_level', 'toolbar_position']);
  
  mobileViewEnabled = data.mobile_view !== false; // Default to true
  zoomLevel = data.zoom_level || 90;
  toolbarPosition = data.toolbar_position || 'top';
  
  // Apply toolbar position
  const container = document.querySelector('.sidebar-container');
  container.classList.remove('pos-top', 'pos-left', 'pos-right');
  container.classList.add(`pos-${toolbarPosition}`);

  if (data.quick_urls) {
    quickUrls = data.quick_urls;
  } else {
    // Fallback if not set yet
    quickUrls = [
      { name: 'Google', url: 'https://www.google.com', zoom: 90, mobile: true },
      { name: 'Translate', url: 'https://translate.google.com', zoom: 100, mobile: true },
      { name: 'YouTube', url: 'https://www.youtube.com', zoom: 90, mobile: true }
    ];
  }

  historyUrls = data.history || [];
  await updateButtonUI();
  
  const targetUrl = data.last_requested_url || data.default_url || (quickUrls[0]?.url);
  if (targetUrl) updateIframe(targetUrl);

  // Clear the transient URL so next time it opens manually, it goes to homepage
  if (data.last_requested_url) {
    await browser.storage.local.remove('last_requested_url');
  }
}

// 1. Listen for clicks on toolbar buttons
settingsBtn.onclick = () => {
  browser.runtime.openOptionsPage();
};
attachTooltip(settingsBtn, 'Settings', 'Extension Options');

const reloadBtn = document.getElementById('reload-btn');
reloadBtn.onclick = () => {
  // Simplest and most reliable way to reload a cross-origin iframe
  if (iframe.src) {
    iframe.src = iframe.src;
  }
};
attachTooltip(reloadBtn, 'Reload', 'Refresh current page');

const copyLinkBtn = document.getElementById('copy-link-btn');
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

const openTabBtn = document.getElementById('open-tab-btn');
openTabBtn.onclick = () => {
  const url = iframe.src;
  if (url && url !== 'about:blank') {
    browser.tabs.create({ url });
  }
};
attachTooltip(openTabBtn, 'Open in New Tab', 'Open current page in a full browser tab');

// Dropdown Toggle
historyDropdownBtn.onclick = (e) => {
  e.stopPropagation();
  historyDropdownMenu.classList.toggle('show');
};
attachTooltip(historyDropdownBtn, 'More History', 'Show all browsing history');

// Close dropdown when clicking outside
window.onclick = () => {
  if (historyDropdownMenu.classList.contains('show')) {
    historyDropdownMenu.classList.remove('show');
  }
};

// Handle window resize to recalculate overflow
window.onresize = () => {
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
      historyUrls = changes.history.newValue;
      updateButtonUI();
    }
    if (changes.history_toolbar_limit) {
      updateButtonUI();
    }
    if (changes.mobile_view) {
      mobileViewEnabled = changes.mobile_view.newValue !== false;
    }
    if (changes.zoom_level) {
      zoomLevel = changes.zoom_level.newValue || 90;
      applyZoom(zoomLevel);
    }
    if (changes.toolbar_position) {
      toolbarPosition = changes.toolbar_position.newValue || 'top';
      const container = document.querySelector('.sidebar-container');
      container.classList.remove('pos-top', 'pos-left', 'pos-right');
      container.classList.add(`pos-${toolbarPosition}`);
      updateButtonUI();
    }
  }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', initSidebar);
