const port = chrome.runtime.connect({
  name: "soft-color-picker",
});

let isPicking: boolean = false;
const actionButton: HTMLCollectionOf<Element> =
  document.getElementsByClassName("action-button");

if (actionButton.length > 0) {
  actionButton[0].addEventListener("click", (event) => {
    if (!isPicking) {
      chrome.runtime.sendMessage(
        {
          type: "START_PICKER",
        },
        (response) => {
          isPicking = true;
          actionButton[0].textContent = "Stop";
          console.log("Message From Worker", response);
        }
      );
    } else {
      chrome.runtime.sendMessage(
        {
          type: "STOP_PICKER",
        },
        (response) => {
          console.log("Message From Worker", response);
          fireStopPickerAction();
        }
      );
    }
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "COLOR_SELECTED") {
    console.log(message.event);
  }
});

chrome.storage.local.get("contentScriptInjected", (data) => {
  const isInjected = data.contentScriptInjected || false;
  isPicking = isInjected;
  actionButton[0].textContent = isInjected ? "Stop" : "Start";
});

getCurrentTab(
  {
    active: true,
    currentWindow: true,
  },
  (tab: chrome.tabs.Tab) => {
    if (tab.url?.startsWith("chrome://")) {
      isPicking = false;
      actionButton[0].classList.add("disabled");
      console.log("Popup opened on chrome:// page:", tab.url);
    } else {
      actionButton[0].classList.remove("disabled");
    }
  }
);

function getCurrentTab(
  queryInfo: chrome.tabs.QueryInfo,
  callback: (tab: chrome.tabs.Tab) => void
): void {
  chrome.tabs.query(queryInfo, (tabs: chrome.tabs.Tab[]) => {
    if (tabs.length > 0) {
      callback(tabs[0]);
    }
  });
}

function fireStopPickerAction(): void {
  getCurrentTab(
    {
      active: true,
      currentWindow: true,
    },
    (tab: chrome.tabs.Tab) => {
      chrome.tabs
        .sendMessage(tab.id || 0, {
          type: "STOP",
        })
        .then((res) => {
          isPicking = false;
          actionButton[0].textContent = "Start";
          console.log(res);
        })
        .catch((error) => {
          console.error(error);
        });
    }
  );
}
