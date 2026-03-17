// Intercept link clicks to open in sidebar if setting is enabled
document.addEventListener('click', async (e) => {
  // Only intercept if we are inside an iframe (presumably the Sidebar)
  if (window.self === window.top) return;

  const link = e.target.closest('a');
  if (!link || !link.href) return;

  // We only intercept if it's a real URL and not a javascript: link or similar
  if (!link.href.startsWith('http')) return;

  const data = await browser.storage.local.get('auto_open_sidebar');
  if (data.auto_open_sidebar) {
    e.preventDefault();
    e.stopPropagation();

    browser.runtime.sendMessage({
      type: 'OPEN_URL_IN_SIDEBAR',
      url: link.href
    });
  }
}, true); // Capture phase to intercept before other handlers
