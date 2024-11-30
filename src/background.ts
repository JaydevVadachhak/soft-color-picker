let activeTabId: number | undefined;
let currentURL: string | undefined;
let colors: {
  rgb: string;
  hex: string;
  hsl: string;
}[] = [];
const ACTIVE_TAB_QUERY: {
  [key: string]: boolean;
} = { active: true, currentWindow: true };

chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.create({
    url: "src/onboarding.html",
  });
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "soft-color-picker") {
    port.onDisconnect.addListener(() => {});
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "START_PICKER":
      onInitCheckTabInfo(ACTIVE_TAB_QUERY, (tabs: chrome.tabs.Tab[]) => {
        if (tabs.length > 0) {
          const tab = tabs[0];
          activeTabId = tab.id;
          currentURL = tab.url;
          chrome.scripting
            .executeScript({
              target: {
                tabId: activeTabId || 0,
              },
              files: ["dist/content.js"],
            })
            .then((res) => {
              setStorageInfo(true);
              sendResponse({
                message: "Success Injection!!",
                error: null,
              });
            })
            .then((res) => {
              chrome.scripting
                .insertCSS({
                  files: ["css/content.css"],
                  target: {
                    tabId: activeTabId || 0,
                  },
                })
                .then((res) => {})
                .catch((error) => {
                  console.error("Error injecting styles:", error);
                });
            })
            .catch((error) => {
              console.error(error);
              sendResponse({
                message: "Success Failed Injection!!",
                error,
              });
            });
        } else {
        }
      });
      break;
    case "STOP_PICKER":
      setStorageInfo(false);
      onInitCheckTabInfo(ACTIVE_TAB_QUERY, (tabs: chrome.tabs.Tab[]) => {
        if (tabs.length > 0) {
          activeTabId = tabs[0].id;
          currentURL = tabs[0].url;
          chrome.scripting
            .removeCSS({
              target: {
                tabId: activeTabId || 0,
              },
              files: ["css/content.css"],
            })
            .then((res) => {})
            .catch((error) => {
              console.error(error);
            });
        } else {
          activeTabId = undefined;
          currentURL = undefined;
        }
      });
      sendResponse({
        message: "Success Stop!!",
        error: null,
      });
      break;
    case "COLOR_SELECTED":
      colors.push(message.selectedColors);
      onInitCheckTabInfo(ACTIVE_TAB_QUERY, (tabs: chrome.tabs.Tab[]) => {
        if (tabs.length > 0) {
          activeTabId = tabs[0].id;
          currentURL = tabs[0].url;
          chrome.storage.local.set({ softSelectedColors: colors }, () => {});
        }
      });
      break;
    default:
      sendResponse({ status: "Unknown message type." });
      break;
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading") {
    setStorageInfo(false);
  }
});

onInitCheckTabInfo(ACTIVE_TAB_QUERY, (tabs: chrome.tabs.Tab[]) => {
  if (tabs.length > 0) {
    activeTabId = tabs[0].id;
    currentURL = tabs[0].url;
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
  if (value) {
    chrome.storage.local.set({ contentScriptInjected: true }, () => {});
  } else {
    chrome.storage.local.set({ contentScriptInjected: false }, () => {});
  }
}
