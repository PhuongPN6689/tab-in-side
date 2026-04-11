// Tab in Side background script

const EXTENSION_ORIGIN = browser.runtime.getURL('').slice(0, -1);

// Create context menu items on installation
/**
 * Update declarativeNetRequest rules based on settings
 */
async function updateNetRules() {
  const [data, defaults] = await Promise.all([
    browser.storage.local.get('mobile_view'),
    fetch('config/defaults.json').then(r => r.json())
  ]);
  
  const mobileViewEnabled = (data.mobile_view !== undefined) ? data.mobile_view : defaults.mobile_view;

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
            value: defaults.user_agent
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


// Create context menu items on installation
browser.runtime.onInstalled.addListener(async () => {
  // Clear and recreate to ensure title updates if it was installed with another language previously
  browser.menus.removeAll();
  browser.menus.create({
    id: "open-in-sidebar",
    title: "Open in 'Tab in Side'",
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

// Dynamically update menu title based on context
browser.menus.onShown.addListener((info, tab) => {
  let title = "Open page in 'Tab in Side'";
  if (info.bookmarkId) {
    title = "Open bookmark in 'Tab in Side'";
  } else if (info.linkUrl) {
    title = "Open link in 'Tab in Side'";
  }
  
  browser.menus.update("open-in-sidebar", { title });
  browser.menus.refresh();
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
      // Determine title
      let titleToSave = info.linkText || tab.title || urlToLoad;
      if (info.bookmarkId) {
        try {
          const bookmarks = await browser.bookmarks.get(info.bookmarkId);
          if (bookmarks[0] && bookmarks[0].title) {
            titleToSave = bookmarks[0].title;
          }
        } catch (e) {}
      }

      // Update History
      const [data, defaults] = await Promise.all([
        browser.storage.local.get(['history', 'history_storage_limit']),
        fetch('config/defaults.json').then(r => r.json())
      ]);
      
      let history = data.history || [];
      const limit = data.history_storage_limit || defaults.history_storage_limit;

      // Remove if exists to re-insert at front (checking by URL)
      history = history.filter(item => {
        const itemUrl = (typeof item === 'string') ? item : item.url;
        return itemUrl !== urlToLoad;
      });
      
      history.unshift({ title: titleToSave, url: urlToLoad });
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
