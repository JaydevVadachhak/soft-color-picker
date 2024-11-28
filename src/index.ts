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
          isPicking = false;
          actionButton[0].textContent = "Start";
          console.log("Message From Worker", response);
        }
      );
    }
  });
}

chrome.storage.local.get("contentScriptInjected", (data) => {
  const isInjected = data.contentScriptInjected || false;
  isPicking = isInjected;
  actionButton[0].textContent = isInjected ? "Stop" : "Start";
});

chrome.tabs.query(
  { active: true, currentWindow: true },
  (tabs: chrome.tabs.Tab[]) => {
    if (tabs.length > 0) {
      if (tabs[0].url?.startsWith("chrome://")) {
        isPicking = false;
        actionButton[0].classList.add("disabled");
        console.log("Popup opened on chrome:// page:", tabs[0].url);
      } else {
        actionButton[0].classList.remove("disabled");
      }
    }
  }
);
