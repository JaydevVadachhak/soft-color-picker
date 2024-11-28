let activeTabId: number | undefined;
let currentURL: string | undefined;

chrome.runtime.onInstalled.addListener(() => {
  chrome.tabs.create({
    url: "src/onboarding.html",
  });
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "soft-color-picker") {
    console.log("Soft Color Picker Opened");
    port.onDisconnect.addListener(() => {
      console.log("Soft Color Picker Closed");
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "START_PICKER":
      onInitCheckTabInfo(
        { active: true, currentWindow: true },
        (tabs: chrome.tabs.Tab[]) => {
          if (tabs.length > 0) {
            const tab = tabs[0];
            activeTabId = tab.id;
            currentURL = tab.url;
            console.log(activeTabId);
            console.log(currentURL);
          } else {
            console.log("No active tab found");
          }
        }
      );
      break;
    case "STOP_PICKER":
      chrome.storage.local.set({ contentScriptInjected: false }, () => {
        console.log("Content script injected state set to false");
      });
      sendResponse({
        message: "Success Stop!!",
        error: null,
      });
      break;
    case "COLOR_SELECTED":
      sendResponse({
        message: "Success Pick!!",
        error: null,
      });
      break;
    default:
      sendResponse({ status: "Unknown message type." });
      break;
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading") {
    chrome.storage.local.set({ contentScriptInjected: false }, () => {
      console.log("Content script injected state set to false");
    });
  }
});

onInitCheckTabInfo(
  { active: true, currentWindow: true },
  (tabs: chrome.tabs.Tab[]) => {
    if (tabs.length > 0) {
      activeTabId = tabs[0].id;
      currentURL = tabs[0].url;
    } else {
      activeTabId = undefined;
      currentURL = undefined;
      console.log("No active tab found");
    }
  }
);

function onInitCheckTabInfo(
  queryInfo: chrome.tabs.QueryInfo,
  cb: Function
): void {
  chrome.tabs.query(queryInfo, (tabs: chrome.tabs.Tab[]) => {
    cb(tabs);
  });
}
