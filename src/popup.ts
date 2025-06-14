// Create a connection to the background script
let port: chrome.runtime.Port | null = null;
try {
  port = chrome.runtime.connect({
    name: "soft-color-picker",
  });
} catch (error) {
  console.error("Failed to connect to background script:", error);
}

let selectedColors: {
  rgb: string;
  hex: string;
  hsl: string;
}[] = [];
let isPicking: boolean = false;
const actionButton: HTMLCollectionOf<Element> =
  document.getElementsByClassName("action-button");
const warningBlock: HTMLElement[] = Array.from(
  document.getElementsByClassName(
    "warning-banner"
  ) as HTMLCollectionOf<HTMLElement>
);
const helpText: HTMLElement[] = Array.from(
  document.getElementsByClassName("help-text") as HTMLCollectionOf<HTMLElement>
);
const colorsContainer: HTMLElement[] = Array.from(
  document.getElementsByClassName(
    "colors-container"
  ) as HTMLCollectionOf<HTMLElement>
);
const colorsDetails: HTMLElement[] = Array.from(
  document.getElementsByClassName(
    "colors-info"
  ) as HTMLCollectionOf<HTMLElement>
);

// Initialize UI
initializeUI();

function initializeUI() {
  // Clear any existing colors
  if (colorsContainer.length > 0) {
    colorsContainer[0].innerHTML = "";
  }

  // Check if there are stored colors
  chrome.storage.local.get("softSelectedColors", (data) => {
    const storedColors = data.softSelectedColors || [];
    selectedColors = storedColors;

    if (storedColors.length > 0) {
      if (helpText.length > 0) {
        helpText[0].style.display = "none";
      }
      renderSelectedColorsBlock(storedColors);
    } else if (helpText.length > 0) {
      helpText[0].style.display = "block";
      helpText[0].textContent = "No Colors Selected yet!!!";
    }
  });

  // Check if color picking is active
  chrome.storage.local.get("contentScriptInjected", (data) => {
    const isInjected = data.contentScriptInjected || false;
    isPicking = isInjected;

    if (actionButton.length > 0) {
      actionButton[0].textContent = isInjected ? "Stop Picking" : "Pick Color";
    }
  });

  // Check if current tab is compatible
  getCurrentTab(
    {
      active: true,
      currentWindow: true,
    },
    (tab: chrome.tabs.Tab) => {
      if (!tab.url || isRestrictedPageUrl(tab.url)) {
        isPicking = false;
        if (actionButton.length > 0) {
          actionButton[0].classList.add("disabled");
        }
        if (warningBlock.length > 0) {
          warningBlock[0].textContent = `Oops, color picker doesn't work on this page: ${
            tab.url || "unknown"
          }`;
          warningBlock[0].style.display = "block";
        }
      } else {
        if (actionButton.length > 0) {
          actionButton[0].classList.remove("disabled");
        }
        if (warningBlock.length > 0) {
          warningBlock[0].style.display = "none";
        }
      }
    }
  );
}

if (actionButton.length > 0) {
  actionButton[0].addEventListener("click", (event) => {
    if (actionButton[0].classList.contains("disabled")) {
      return;
    }

    if (!isPicking) {
      startPickingColor();
    } else {
      stopPickingColor();
    }
  });
}

function startPickingColor() {
  try {
    chrome.runtime.sendMessage(
      {
        type: "START_PICKER",
      },
      (response) => {
        // Check for runtime.lastError to prevent unchecked errors
        if (chrome.runtime.lastError) {
          console.error("Error starting picker:", chrome.runtime.lastError);
          showWarning("Failed to start color picker due to an error.");
          return;
        }

        if (response && !response.error) {
          isPicking = true;
          if (actionButton.length > 0) {
            actionButton[0].textContent = "Stop Picking";
          }
        } else {
          console.error("Failed to start color picker:", response?.error);
          showWarning("Failed to start color picker. Please try again.");
        }
      }
    );
  } catch (error) {
    console.error("Error sending message:", error);
    showWarning("Failed to communicate with the extension.");
  }
}

function stopPickingColor() {
  // First, reset the UI immediately to provide immediate feedback
  resetPickerUI();

  // Then tell the background script to stop the picker
  try {
    chrome.runtime.sendMessage(
      {
        type: "STOP_PICKER",
      },
      (response) => {
        // Check for runtime.lastError to prevent unchecked errors
        if (chrome.runtime.lastError) {
          console.error(
            "Error in STOP_PICKER response:",
            chrome.runtime.lastError
          );
          // UI is already reset, so we don't need to do it again
          return;
        }

        if (response && response.error) {
          console.error("Failed to stop color picker:", response.error);
        }
      }
    );
  } catch (error) {
    console.error("Error sending stop message to background:", error);
  }
}

function resetPickerUI() {
  isPicking = false;
  if (actionButton.length > 0) {
    actionButton[0].textContent = "Pick Color";
  }
}

function showWarning(message: string) {
  if (warningBlock.length > 0) {
    warningBlock[0].textContent = message;
    warningBlock[0].style.display = "block";

    // Hide warning after 3 seconds
    setTimeout(() => {
      if (warningBlock.length > 0) {
        warningBlock[0].style.display = "none";
      }
    }, 3000);
  }
}

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

function showCopyFeedback(element: HTMLElement, message: string) {
  const feedback = document.createElement("div");
  feedback.textContent = message;
  feedback.style.position = "absolute";
  feedback.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
  feedback.style.color = "white";
  feedback.style.padding = "4px 8px";
  feedback.style.borderRadius = "4px";
  feedback.style.fontSize = "12px";
  feedback.style.top = "0";
  feedback.style.left = "0";
  feedback.style.right = "0";
  feedback.style.bottom = "0";
  feedback.style.display = "flex";
  feedback.style.alignItems = "center";
  feedback.style.justifyContent = "center";
  feedback.style.zIndex = "1000";

  element.style.position = "relative";
  element.appendChild(feedback);

  setTimeout(() => {
    if (element.contains(feedback)) {
      element.removeChild(feedback);
    }
  }, 1000);
}

function renderSelectedColorsBlock(
  selectedColors: {
    rgb: string;
    hex: string;
    hsl: string;
  }[]
): void {
  if (!colorsContainer.length || !colorsDetails.length) return;

  // Clear existing colors
  colorsContainer[0].innerHTML = "";

  if (selectedColors.length > 0) {
    selectedColors.forEach(
      (color: { rgb: string; hex: string; hsl: string }, index: number) => {
        const colorBlock = document.createElement("div");
        colorBlock.style.width = "25px";
        colorBlock.style.height = "25px";
        colorBlock.classList.add("color-box");
        colorBlock.style.background = color.hex;
        colorBlock.style.cursor = "pointer";
        colorBlock.title = `Click to copy: ${color.hex}`;

        // Show color details on hover
        colorBlock.addEventListener("mouseover", () => {
          colorsDetails[0].innerHTML = `
          <div><strong>RGB:</strong> ${color.rgb}</div>
          <div><strong>HEX:</strong> ${color.hex}</div>
          <div><strong>HSL:</strong> ${color.hsl}</div>
        `;
        });

        // Copy color to clipboard on click
        colorBlock.addEventListener("click", () => {
          if (!navigator.clipboard) {
            console.error("Clipboard API is not supported");
            showCopyFeedback(colorBlock, "Copy failed!");
          } else {
            navigator.clipboard
              .writeText(color.hex)
              .then(() => {
                showCopyFeedback(colorBlock, "Copied!");
              })
              .catch((err) => {
                console.error("Failed to copy:", err);
                showCopyFeedback(colorBlock, "Copy failed!");
              });
          }
        });

        colorsContainer[0].appendChild(colorBlock);
      }
    );
  } else if (helpText.length > 0) {
    helpText[0].style.display = "block";
    helpText[0].textContent = "No Colors Selected yet!!!";
  }
}

// Helper function to check if a URL is restricted
function isRestrictedPageUrl(url: string): boolean {
  return (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("data:") ||
    url.startsWith("file://")
  );
}
