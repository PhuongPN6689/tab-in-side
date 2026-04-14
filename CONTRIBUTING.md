# Contributing to Tab in Side 🚀

Welcome! We're thrilled that you're interested in contributing to **Tab in Side**. This document will help you understand the project's architecture and how to get started as a developer.

---

## 🏗 Project Architecture

Tab in Side is built as a standard WebExtension (Manifest V3). Here is how the core components interact:

- **Background Script (`src/background.js`)**: 
  - Handles the extension's lifecycle.
  - Manages the context menu (Right-click -> Open in Tab in Side).
  - **The Magic**: Uses `browser.declarativeNetRequest` to strip `X-Frame-Options` and `Content-Security-Policy` headers, allowing websites to be embedded in an iframe.
- **Sidebar UI (`src/sidebar/`)**: 
  - The main interface users see.
  - Contains an `<iframe>` for browsing.
  - Manages navigation, history tracking, and the customizable toolbar.
- **Options UI (`src/options/`)**: 
  - A dashboard for users to customize their experience (Pinned sites, history limits, appearance).
- **Configuration (`src/config/`)**:
  - Centralized JSON files for default settings and suggested links.
- **Messaging System**:
  - Uses `browser.runtime.sendMessage` to coordinate history logging between the Sidebar and Background script.

---

## 📁 Codebase Map

```text
.
├── src/
│   ├── manifest.json   # Entry point & permissions
│   ├── background.js   # Logic for menus & header bypassing
│   ├── sidebar/        # Sidebar UI (HTML/CSS/JS)
│   ├── options/        # Settings Page (HTML/CSS/JS)
│   ├── config/         # Default data & suggested links
│   ├── content/        # Content scripts (if needed)
│   └── icons/          # Extension icons
├── assets/             # Screenshots for README
└── web-ext-config.cjs  # Configuration for web-ext tool
```

---

## 🛠 Setup for Development

1.  **Clone the Repo**:
    ```bash
    git clone https://github.com/PhuongPN6689/tab-in-side.git
    cd tab-in-side
    ```
2.  **Install dependencies** (optional, used for building/linting):
    ```bash
    npm install
    ```
3.  **Run in Firefox**:
    - Open `about:debugging#/runtime/this-firefox`.
    - Click **Load Temporary Add-on...**.
    - Select `src/manifest.json`.

---

## 💡 Key Technical Concepts

### 1. Bypassing Frame Restrictions
Most modern websites use headers like `X-Frame-Options: DENY` or `Content-Security-Policy: frame-ancestors 'none'` to prevent being embedded in iframes (to stop clickjacking). 

We bypass this in `background.js` by dynamically injecting rules into the browser's network engine:

```javascript
rules.push({
  id: 1,
  action: {
    type: "modifyHeaders",
    responseHeaders: [
      { header: "X-Frame-Options", operation: "remove" },
      { header: "Content-Security-Policy", operation: "remove" }
    ]
  },
  condition: { resourceTypes: ["sub_frame"] }
});
```

### 2. Toolbar Overflow Management
The sidebar's toolbar automatically calculates how many history buttons can fit based on the window width/height. If there are too many, they are moved to a dropdown menu. See `updateButtonUI()` in `src/sidebar/sidebar.js`.

### 3. Mobile View Spoofing
To make websites look better in a narrow sidebar, we spoof the `User-Agent` to a mobile device when loading pages in the sidebar's iframe.

### 4. Smart Overlays & Compact UI
The Sidebar uses a centralized `overlay` system for Search and History. These overlays are designed for high information density, using ultra-compact spacing and top-aligned positioning to ensure usability even in narrow panels.

### 5. Unified History Logging
The extension uses a centralized `addToHistory` function in the background script. This ensures that context menu actions, direct URL entries, and sidebar searches all follow the same deduplication and storage limit rules.

---

## 🧪 Testing

We use the `web-ext` tool for linting and building:
- **Lint**: `npm run lint`
- **Build**: `npm run build`

---

## 📫 How to Contribute

1.  **Report Bugs**: Open an issue describing the bug and how to reproduce it.
2.  **Submit Features**: Fork the repo and submit a PR. Please ensure your code follows the existing style.
3.  **Translate**: Help us localize the extension for more languages!

---

Developed with ❤️ by Nguyen Phuong.
