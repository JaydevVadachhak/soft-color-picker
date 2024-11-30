let colorHelper: HTMLElement;
let colorBox: HTMLElement;
let colorInfo: HTMLElement;

createUIColorHelper();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "STOP") {
    document.removeEventListener("click", handleDOMClick);
    document.removeEventListener("mousemove", handleDOMHover);
  }
});

document.addEventListener("click", handleDOMClick);

document.addEventListener("mousemove", handleDOMHover);

function handleDOMClick(event: any) {
  const element = document.elementFromPoint(event.clientX, event.clientY);
  let colorFormats: {
    rgb: string;
    hex: string;
    hsl: string;
  };
  if (element) {
    const computedStyle = getComputedStyle(element);
    const backgroundColor = computedStyle.backgroundColor;
    colorFormats = getColorFormats(backgroundColor);
    if (colorFormats) {
      chrome.runtime
        .sendMessage({
          type: "COLOR_SELECTED",
          selectedColors: colorFormats,
        })
        .then((res) => {})
        .catch((error) => {
          console.error("error", error);
        });
    }
  }
}

function handleDOMHover(event: any) {
  const element = document.elementFromPoint(event.clientX, event.clientY);
  if (element) {
    const computedStyle = getComputedStyle(element);
    const backgroundColor = computedStyle.backgroundColor;
    const colorFormats = getColorFormats(backgroundColor);
    colorBox.style.backgroundColor = backgroundColor || "transparent";
    colorInfo.innerHTML = `
      <div><strong>RGB:</strong> ${colorFormats.rgb}</div>
      <div><strong>HEX:</strong> ${colorFormats.hex}</div>
      <div><strong>HSL:</strong> ${colorFormats.hsl}</div>
    `;
  }
}

function createUIColorHelper(): void {
  colorHelper = document.createElement("div");
  colorBox = document.createElement("div");
  colorInfo = document.createElement("div");

  colorHelper.id = "color-display";
  colorBox.id = "color-box";
  colorInfo.id = "color-info";

  colorHelper.appendChild(colorBox);
  colorHelper.appendChild(colorInfo);
  document.body.appendChild(colorHelper);
}

function getColorFormats(rgb: string): {
  rgb: string;
  hex: string;
  hsl: string;
} {
  if (!rgb) return { rgb: "N/A", hex: "N/A", hsl: "N/A" };
  const rgbValues = rgb.match(/\d+/g);
  if (!rgbValues || rgbValues.length < 3)
    return { rgb, hex: "N/A", hsl: "N/A" };
  const [r, g, b] = rgbValues.map(Number);
  const hex = `#${((1 << 24) | (r << 16) | (g << 8) | b)
    .toString(16)
    .slice(1)
    .toUpperCase()}`;
  const hsl = rgbToHsl(r, g, b);
  return { rgb: `rgb(${r}, ${g}, ${b})`, hex, hsl };
}

function rgbToHsl(r: number, g: number, b: number): string {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h: any,
    s: number,
    l: number = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(
    l * 100
  )}%)`;
}
