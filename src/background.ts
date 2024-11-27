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
