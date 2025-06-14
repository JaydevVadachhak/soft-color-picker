let activeTabId: number | undefined;
let currentURL: string | undefined;
let colors: {
  rgb: string;
  hex: string;
  hsl: string;
}[] = [];
let isPickerActive: boolean = false;
const ACTIVE_TAB_QUERY: {
  [key: string]: boolean;
} = { active: true, currentWindow: true };

// Load previously saved colors from storage
chrome.storage.local.get("softSelectedColors", (data) => {
  colors = data.softSelectedColors || [];
});

// Check if picker was active before
chrome.storage.local.get("contentScriptInjected", (data) => {
  isPickerActive = data.contentScriptInjected || false;
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.create({
    url: "src/onboarding.html",
  });
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "soft-color-picker") {
    port.onDisconnect.addListener(() => {
      // Don't stop picker when popup closes - let it persist
      // This allows the picker to work across tabs
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    switch (message.type) {
      case "START_PICKER":
        isPickerActive = true;
        setStorageInfo(true);

        onInitCheckTabInfo(ACTIVE_TAB_QUERY, (tabs: chrome.tabs.Tab[]) => {
          if (tabs.length > 0) {
            const tab = tabs[0];
            if (!tab.id) {
              sendResponse({
                message: "Failed: Invalid tab ID",
                error: "Invalid tab ID",
              });
              return;
            }

            // Check if URL is supported
            if (!tab.url || isRestrictedUrl(tab.url)) {
              sendResponse({
                message: "Failed: Cannot inject script in this page",
                error: "Restricted page",
              });
              return;
            }

            activeTabId = tab.id;
            currentURL = tab.url;

            // Inject content script
            injectScriptsToTab(tab.id)
              .then(() => {
                sendResponse({
                  message: "Success Injection!!",
                  error: null,
                });
              })
              .catch((error) => {
                console.error("Error injecting script or styles:", error);
                sendResponse({
                  message: "Failed Injection!!",
                  error: error.message,
                });
              });
          } else {
            sendResponse({
              message: "Failed: No active tab found",
              error: "No active tab",
            });
          }
        });
        return true; // Keep the message channel open for the async response

      case "STOP_PICKER":
        // Set picker to inactive
        isPickerActive = false;
        setStorageInfo(false);

        // Stop picker in all tabs
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach((tab) => {
            if (tab.id && tab.url && !isRestrictedUrl(tab.url)) {
              try {
                chrome.tabs.sendMessage(tab.id, { type: "STOP" }).catch(() => {
                  // Ignore errors if content script is not loaded
                });

                // Remove CSS
                try {
                  chrome.scripting
                    .removeCSS({
                      target: { tabId: tab.id },
                      files: ["css/content.css"],
                    })
                    .catch(() => {
                      // Ignore errors
                    });
                } catch (error) {
                  // Ignore errors
                }
              } catch (error) {
                // Ignore errors
              }
            }
          });

          sendResponse({
            message: "Success Stop!!",
            error: null,
          });
        });

        return true; // Keep the message channel open for the async response

      case "COLOR_SELECTED":
        // Validate color data
        if (
          message.selectedColors &&
          typeof message.selectedColors === "object" &&
          "rgb" in message.selectedColors &&
          "hex" in message.selectedColors &&
          "hsl" in message.selectedColors
        ) {
          // Add color to the array, avoiding duplicates
          const isDuplicate = colors.some(
            (color) => color.hex === message.selectedColors.hex
          );
          if (!isDuplicate) {
            colors.push(message.selectedColors);

            // Save to storage
            chrome.storage.local.set({ softSelectedColors: colors }, () => {
              if (chrome.runtime.lastError) {
                console.error("Error saving colors:", chrome.runtime.lastError);
              }
            });
          }
        }
        break;

      case "CLEAR_COLORS":
        colors = [];
        chrome.storage.local.set({ softSelectedColors: [] }, () => {
          if (chrome.runtime.lastError) {
            console.error("Error clearing colors:", chrome.runtime.lastError);
          }
          sendResponse({ success: true });
        });
        return true; // Keep the message channel open for the async response

      default:
        sendResponse({ status: "Unknown message type." });
        break;
    }
  } catch (error) {
    console.error("Error in message handler:", error);
    sendResponse({ error: "Internal extension error" });
  }
  return false;
});

// Handle tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // If a tab is updated and picker is active, inject the picker
  if (
    isPickerActive &&
    changeInfo.status === "complete" &&
    tab.url &&
    !isRestrictedUrl(tab.url)
  ) {
    injectScriptsToTab(tabId).catch((error) => {
      console.error("Error injecting scripts on tab update:", error);
    });
  }
});

// Handle tab activation (switching tabs)
chrome.tabs.onActivated.addListener((activeInfo) => {
  // If picker is active and user switches tabs, inject the picker into the new tab
  if (isPickerActive) {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
      if (tab.url && !isRestrictedUrl(tab.url)) {
        injectScriptsToTab(activeInfo.tabId).catch((error) => {
          console.error("Error injecting scripts on tab activation:", error);
        });
      }
    });
  }
});

// Initialize on startup
onInitCheckTabInfo(ACTIVE_TAB_QUERY, (tabs: chrome.tabs.Tab[]) => {
  if (tabs.length > 0) {
    activeTabId = tabs[0].id;
    currentURL = tabs[0].url;

    // If picker was active before, reactivate it
    if (
      isPickerActive &&
      activeTabId &&
      currentURL &&
      !isRestrictedUrl(currentURL)
    ) {
      injectScriptsToTab(activeTabId).catch((error) => {
        console.error("Error injecting scripts on startup:", error);
      });
    }
  } else {
    activeTabId = undefined;
    currentURL = undefined;
  }
});

function onInitCheckTabInfo(
  queryInfo: chrome.tabs.QueryInfo,
  cb: Function
): void {
  chrome.tabs.query(queryInfo, (tabs: chrome.tabs.Tab[]) => {
    cb(tabs);
  });
}

function setStorageInfo(value: boolean): void {
  isPickerActive = value;
  chrome.storage.local.set({ contentScriptInjected: value }, () => {
    if (chrome.runtime.lastError) {
      console.error("Error setting storage info:", chrome.runtime.lastError);
    }
  });
}

// Function to inject scripts and CSS to a tab
async function injectScriptsToTab(tabId: number): Promise<void> {
  try {
    // First inject the content script
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["dist/content.js"],
    });

    // Then inject the CSS
    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ["css/content.css"],
    });

    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  }
}

// Helper function to check if a URL is restricted
function isRestrictedUrl(url: string): boolean {
  return (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("data:") ||
    url.startsWith("file://")
  );
}
