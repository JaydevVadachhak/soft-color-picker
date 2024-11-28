const port = chrome.runtime.connect({
  name: "soft-color-picker",
});

let isPicking: boolean = false;
const actionButton: HTMLCollectionOf<Element> =
  document.getElementsByClassName("action-button");

if (actionButton) {
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
