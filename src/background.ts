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
      sendResponse({
        message: "Success Start!!",
        error: null,
      });
      break;
    case "STOP_PICKER":
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
