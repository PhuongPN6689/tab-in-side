// Tab in Side background script

const EXTENSION_ORIGIN = browser.runtime.getURL('').slice(0, -1);

// Create context menu items on installation
/**
 * Update declarativeNetRequest rules based on settings
 */
async function updateNetRules() {
  const data = await browser.storage.local.get('mobile_view');
  const mobileViewEnabled = data.mobile_view !== false; // Default to true

  const rules = [];

  // Rule 1: Strip X-Frame-Options and Content-Security-Policy
  rules.push({
    id: 1,
    priority: 1,
    action: {
      type: "modifyHeaders",
      responseHeaders: [
        { header: "X-Frame-Options", operation: "remove" },
        { header: "Frame-Options", operation: "remove" },
        { header: "Content-Security-Policy", operation: "remove" }
      ]
    },
    condition: {
      resourceTypes: ["sub_frame"]
    }
  });

  // Rule 2: User-Agent spoofing for mobile view
  if (mobileViewEnabled) {
    rules.push({
      id: 2,
      priority: 2,
      action: {
        type: "modifyHeaders",
        requestHeaders: [
          {
            header: "User-Agent",
            operation: "set",
            value: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
          }
        ]
      },
      condition: {
        initiatorDomains: [new URL(EXTENSION_ORIGIN).hostname],
        resourceTypes: ["sub_frame", "main_frame"]
      }
    });
  }

  // Apply rules (Dynamic rules persist across restarts)
  await browser.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1, 2],
    addRules: rules
  });
}

// Intercept headers using webRequest API to bypass frame restrictions robustly
// No longer need manual webRequest onHeadersReceived in background.js 
// as declarativeNetRequest handles it more efficiently.
/*
browser.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.type === 'sub_frame') {
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
*/


// Create context menu items on installation
browser.runtime.onInstalled.addListener(async () => {
  // Clear and recreate to ensure title updates if it was installed with another language previously
  browser.menus.removeAll();
  browser.menus.create({
    id: "open-in-sidebar",
    title: "Open in Tab in Side",
    contexts: ["page", "link", "bookmark"]
  });

  await updateNetRules();
});

// Listen for storage changes to update DNR rules
browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes.mobile_view)) {
    updateNetRules();
  }
});

// Listener for context menu clicks
browser.menus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "open-in-sidebar") {
    let urlToLoad = info.linkUrl || info.pageUrl;
    
    // If it's a bookmark, we need to fetch the URL using the ID
    if (info.bookmarkId) {
      try {
        const bookmarks = await browser.bookmarks.get(info.bookmarkId);
        if (bookmarks[0] && bookmarks[0].url) {
          urlToLoad = bookmarks[0].url;
        }
      } catch (e) {
        console.error("Error fetching bookmark info:", e);
      }
    }
    
    if (urlToLoad) {
      // Update History
      const data = await browser.storage.local.get(['history', 'history_limit']);
      let history = data.history || [];
      const limit = data.history_limit || 3;

      // Remove if exists to re-insert at front
      history = history.filter(item => item !== urlToLoad);
      history.unshift(urlToLoad);
      history = history.slice(0, limit);

      await browser.storage.local.set({ 
        last_requested_url: urlToLoad,
        history: history
      });
      
      try {
        await browser.sidebarAction.open();
      } catch (e) {
        console.error("Error opening sidebar:", e);
      }
      
      browser.runtime.sendMessage({
        type: "LOAD_URL",
        url: urlToLoad
      }).catch(() => {});
    }
  }
});
