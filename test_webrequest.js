// A small script to test if webRequestBlocking is working
browser.webRequest.onHeadersReceived.addListener(
  function(details) {
    return {
      responseHeaders: details.responseHeaders.filter(header => {
        const name = header.name.toLowerCase();
        return name !== 'x-frame-options' && name !== 'frame-options' && name !== 'content-security-policy';
      })
    };
  },
  { urls: ["<all_urls>"], types: ["sub_frame"] },
  ["blocking", "responseHeaders"]
);
