const port = chrome.runtime.connect({
  name: "soft-color-picker",
});

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

renderSelectedColorsBlock(selectedColors);

if (actionButton.length > 0) {
  actionButton[0].addEventListener("click", (event) => {
    if (!isPicking) {
      chrome.runtime.sendMessage(
        {
          type: "START_PICKER",
        },
        (response) => {
          isPicking = true;
          actionButton[0].textContent = "Stop Picking";
        }
      );
    } else {
      chrome.runtime.sendMessage(
        {
          type: "STOP_PICKER",
        },
        (response) => {
          fireStopPickerAction();
        }
      );
    }
  });
}

chrome.storage.local.get("contentScriptInjected", (data) => {
  const isInjected = data.contentScriptInjected || false;
  isPicking = isInjected;
  actionButton[0].textContent = isInjected ? "Stop Picking" : "Pick Color";
});

chrome.storage.local.get("softSelectedColors", (data) => {
  helpText[0].style.display = "none";
  renderSelectedColorsBlock(data.softSelectedColors || []);
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
      if (warningBlock.length > 0) {
        warningBlock[0].textContent = `Oops, does not work on this page:, ${tab.url}`;
        warningBlock[0].style.display = "block";
      }
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
          actionButton[0].textContent = "Pick Color";
        })
        .catch((error) => {
          console.error(error);
        });
    }
  );
}

function renderSelectedColorsBlock(
  selectedColors: {
    rgb: string;
    hex: string;
    hsl: string;
  }[]
): void {
  if (selectedColors.length > 0) {
    selectedColors.forEach((obj: { rgb: string; hex: string; hsl: string }) => {
      const colorBlock = document.createElement("div");
      colorBlock.style.width = "25px";
      colorBlock.style.height = "25px";
      colorBlock.classList.add("color-box");
      colorBlock.style.background = obj.hex;
      colorBlock.style.cursor = "pointer";
      colorBlock.addEventListener("click", (event) => {
        if (!navigator.clipboard) {
          console.error("Clipboard API is not supported");
        } else {
          navigator.clipboard.writeText(obj.hex).then(() => {
          });
        }
        colorsDetails[0].innerHTML = `
          <div><strong>RGB:</strong> ${obj.rgb}</div>
          <div><strong>HEX:</strong> ${obj.hex}</div>
          <div><strong>HSL:</strong> ${obj.hsl}</div>
        `;
      });
      colorsContainer[0].appendChild(colorBlock);
    });
  } else {
    helpText[0].style.display = "block";
    helpText[0].textContent = "No Colors Selected yet!!!";
  }
}
