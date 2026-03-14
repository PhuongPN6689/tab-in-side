const iframe = document.getElementById('main-frame');
const quickBtnsContainer = document.getElementById('quick-btns-container');
const historyBtnsContainer = document.getElementById('history-btns-container');
const historyDivider = document.getElementById('history-divider');
const settingsBtn = document.getElementById('settings-btn');

// State
let quickUrls = [];
let historyUrls = [];
let mobileViewEnabled = true;

const MOBILE_USER_AGENT = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1";

// 1. Override User-Agent for rendering mobile version in sidebar
browser.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    // Target only iframe requests inside our sidebar context (tabId: -1)
    if (details.tabId === -1 && details.type === 'sub_frame') {
      if (mobileViewEnabled) {
        for (let header of details.requestHeaders) {
          if (header.name.toLowerCase() === 'user-agent') {
            header.value = MOBILE_USER_AGENT;
            break;
          }
        }
      }
      return { requestHeaders: details.requestHeaders };
    }
  },
  { urls: ["<all_urls>"] },
  ["blocking", "requestHeaders"]
);

// 2. Bypass X-Frame-Options to allow embedding any site in the sidebar
browser.webRequest.onHeadersReceived.addListener(
  (details) => {
    // Target only iframe requests inside our sidebar context (tabId: -1)
    if (details.tabId === -1 && details.type === 'sub_frame') {
      const responseHeaders = details.responseHeaders.filter(header => {
        const name = header.name.toLowerCase();
        return name !== 'x-frame-options' && name !== 'frame-options' && name !== 'content-security-policy';
      });
      return { responseHeaders };
    }
  },
  { urls: ["<all_urls>"] },
  ["blocking", "responseHeaders"]
);

/**
 * Update the iframe source
 * @param {string} url 
 */
function updateIframe(url) {
  if (url && url !== iframe.src) {
    iframe.src = url;
  }
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
function createToolbarButton(title, url, isHistory = false) {
  const btn = document.createElement('button');
  btn.className = 'nav-btn';
  if (isHistory) btn.style.opacity = '0.8';
  btn.title = title;
  
  const img = document.createElement('img');
  img.className = 'icon-img';
  img.src = getFaviconUrl(url);
  img.alt = '';
  
  btn.appendChild(img);
  btn.onclick = () => updateIframe(url);
  return btn;
}

/**
 * Update button tooltips/titles and favicons from settings
 */
function updateButtonUI() {
  // 1. Render Quick Access
  quickBtnsContainer.innerHTML = '';
  quickUrls.forEach((item) => {
    if (item.url) {
      const btn = createToolbarButton(item.name || 'Quick Access', item.url);
      quickBtnsContainer.appendChild(btn);
    }
  });

  // 2. Render History
  historyBtnsContainer.innerHTML = '';
  if (historyUrls.length > 0) {
    historyDivider.style.display = 'block';
    historyUrls.forEach((url) => {
      const btn = createToolbarButton(url, url, true);
      historyBtnsContainer.appendChild(btn);
    });
  } else {
    historyDivider.style.display = 'none';
  }
}

/**
 * Load initial state from storage
 */
async function initSidebar() {
  const data = await browser.storage.local.get(['last_requested_url', 'quick_urls', 'default_url', 'history', 'mobile_view']);
  
  mobileViewEnabled = data.mobile_view !== false; // Default to true

  if (data.quick_urls) {
    quickUrls = data.quick_urls;
  } else {
    // Fallback if not set yet
    quickUrls = [
      { name: 'Google', url: 'https://www.google.com' },
      { name: 'Wikipedia', url: 'https://www.wikipedia.org' },
      { name: 'GitHub', url: 'https://github.com' },
      { name: 'StackOverflow', url: 'https://stackoverflow.com' },
      { name: 'YouTube', url: 'https://www.youtube.com' }
    ];
  }

  historyUrls = data.history || [];
  updateButtonUI();
  
  const targetUrl = data.last_requested_url || data.default_url || (quickUrls[0]?.url);
  if (targetUrl) updateIframe(targetUrl);

  // Clear the transient URL so next time it opens manually, it goes to homepage
  if (data.last_requested_url) {
    await browser.storage.local.remove('last_requested_url');
  }
}

// 1. Listen for clicks on settings button
settingsBtn.onclick = () => {
  browser.runtime.openOptionsPage();
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
    if (changes.mobile_view) {
      mobileViewEnabled = changes.mobile_view.newValue !== false;
    }
  }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', initSidebar);
