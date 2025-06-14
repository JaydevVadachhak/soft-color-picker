// Check if the script has already been injected
if (window.hasOwnProperty("softColorPickerInjected")) {
  // Script already running, don't initialize again
  console.log("Soft Color Picker already running");
} else {
  // Set flag to prevent duplicate injection
  (window as any).softColorPickerInjected = true;

  let colorHelper: HTMLElement;
  let colorBox: HTMLElement;
  let colorInfo: HTMLElement;
  let isActive: boolean = true;
  let lastColor: string | null = null;
  let overlayElement: HTMLElement | null = null;

  createUIColorHelper();
  createOverlay();

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "STOP") {
      isActive = false;
      document.removeEventListener("click", handleDOMClick);
      document.removeEventListener("mousemove", handleDOMHover);

      // Remove the overlay
      if (overlayElement && overlayElement.parentNode) {
        overlayElement.parentNode.removeChild(overlayElement);
        overlayElement = null;
      }

      // Remove the color helper from the DOM
      if (colorHelper && colorHelper.parentNode) {
        colorHelper.parentNode.removeChild(colorHelper);
      }

      sendResponse({ success: true });
      return true;
    }
    return true;
  });

  document.addEventListener("click", handleDOMClick);
  document.addEventListener("mousemove", handleDOMHover);

  function handleDOMClick(event: MouseEvent) {
    if (!isActive) return;

    // Always prevent default behavior when picking colors
    event.preventDefault();
    event.stopPropagation();

    const element = document.elementFromPoint(event.clientX, event.clientY);
    if (element) {
      const computedStyle = getComputedStyle(element);
      const backgroundColor = computedStyle.backgroundColor;
      const colorFormats = getColorFormats(backgroundColor);
      if (colorFormats) {
        // Temporarily enable pointer events to show feedback
        colorHelper.style.pointerEvents = "auto";
        colorHelper.classList.add("color-change");

        // Send color to background script
        chrome.runtime
          .sendMessage({
            type: "COLOR_SELECTED",
            selectedColors: colorFormats,
          })
          .then(() => {
            // Show success feedback
            const successMsg = document.createElement("div");
            successMsg.textContent = "Color saved!";
            successMsg.style.position = "absolute";
            successMsg.style.top = "0";
            successMsg.style.left = "0";
            successMsg.style.right = "0";
            successMsg.style.padding = "4px";
            successMsg.style.backgroundColor = "rgba(0, 128, 0, 0.7)";
            successMsg.style.color = "white";
            successMsg.style.textAlign = "center";
            successMsg.style.borderRadius = "8px 8px 0 0";
            colorHelper.prepend(successMsg);

            // Remove after 1.5 seconds
            setTimeout(() => {
              if (colorHelper.contains(successMsg)) {
                colorHelper.removeChild(successMsg);
              }
              colorHelper.style.pointerEvents = "none";
              colorHelper.classList.remove("color-change");
            }, 1500);
          })
          .catch((error) => {
            console.error("Error sending color to background:", error);
            colorHelper.style.pointerEvents = "none";
            colorHelper.classList.remove("color-change");
          });
      }
    }
  }

  function handleDOMHover(event: MouseEvent) {
    if (!isActive) return;

    const element = document.elementFromPoint(event.clientX, event.clientY);
    if (element) {
      const computedStyle = getComputedStyle(element);
      const backgroundColor = computedStyle.backgroundColor;

      // Only update if the color has changed
      if (backgroundColor !== lastColor) {
        lastColor = backgroundColor;
        const colorFormats = getColorFormats(backgroundColor);

        if (colorFormats) {
          colorBox.style.backgroundColor = backgroundColor || "transparent";
          colorInfo.innerHTML = `
            <div><strong>RGB:</strong> ${colorFormats.rgb}</div>
            <div><strong>HEX:</strong> ${colorFormats.hex}</div>
            <div><strong>HSL:</strong> ${colorFormats.hsl}</div>
          `;
        } else {
          colorBox.style.backgroundColor = "transparent";
          colorInfo.innerHTML = `
            <div><strong>RGB:</strong> N/A</div>
            <div><strong>HEX:</strong> N/A</div>
            <div><strong>HSL:</strong> N/A</div>
          `;
        }
      }

      // Position the color helper near the cursor but not directly under it
      const offset = 20; // pixels
      let posX = event.clientX + offset;
      let posY = event.clientY + offset;

      // Keep the helper within viewport bounds
      const helperWidth = colorHelper.offsetWidth;
      const helperHeight = colorHelper.offsetHeight;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (posX + helperWidth > viewportWidth) {
        posX = event.clientX - helperWidth - offset;
      }

      if (posY + helperHeight > viewportHeight) {
        posY = event.clientY - helperHeight - offset;
      }

      // Ensure the helper stays within the viewport
      posX = Math.max(10, Math.min(viewportWidth - helperWidth - 10, posX));
      posY = Math.max(10, Math.min(viewportHeight - helperHeight - 10, posY));

      colorHelper.style.left = `${posX}px`;
      colorHelper.style.top = `${posY}px`;
      colorHelper.style.right = "auto";
      colorHelper.style.bottom = "auto";
    }
  }

  function createUIColorHelper(): void {
    colorHelper = document.createElement("div");
    colorBox = document.createElement("div");
    colorInfo = document.createElement("div");

    colorHelper.id = "color-display";
    colorBox.id = "color-box";
    colorInfo.id = "color-info";

    // Set initial position
    colorHelper.style.left = "auto";
    colorHelper.style.top = "auto";
    colorHelper.style.right = "20px";
    colorHelper.style.bottom = "20px";

    colorHelper.appendChild(colorBox);
    colorHelper.appendChild(colorInfo);
    document.body.appendChild(colorHelper);
  }

  function createOverlay(): void {
    // Create a full-page overlay to prevent clicking on page elements
    overlayElement = document.createElement("div");
    overlayElement.id = "soft-color-picker-overlay";

    // Style the overlay
    overlayElement.style.position = "fixed";
    overlayElement.style.top = "0";
    overlayElement.style.left = "0";
    overlayElement.style.width = "100%";
    overlayElement.style.height = "100%";
    overlayElement.style.zIndex = "2147483646"; // Just below the color helper
    overlayElement.style.cursor = "crosshair";
    overlayElement.style.backgroundColor = "transparent";

    // Add to the page
    document.body.appendChild(overlayElement);

    // Add a notice about how to exit
    const notice = document.createElement("div");
    notice.textContent =
      "Color picker active. Click to select a color or press ESC to exit.";
    notice.style.position = "fixed";
    notice.style.top = "10px";
    notice.style.left = "50%";
    notice.style.transform = "translateX(-50%)";
    notice.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    notice.style.color = "white";
    notice.style.padding = "8px 12px";
    notice.style.borderRadius = "4px";
    notice.style.fontSize = "14px";
    notice.style.zIndex = "2147483646";
    notice.style.pointerEvents = "none";
    document.body.appendChild(notice);

    // Auto-hide the notice after 3 seconds
    setTimeout(() => {
      if (notice.parentNode) {
        notice.parentNode.removeChild(notice);
      }
    }, 3000);

    // Add ESC key listener to stop picking
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isActive) {
        chrome.runtime.sendMessage({ type: "STOP_PICKER" });
      }
    });
  }

  function getColorFormats(rgb: string): {
    rgb: string;
    hex: string;
    hsl: string;
  } | null {
    if (!rgb || rgb === "transparent" || rgb === "rgba(0, 0, 0, 0)") {
      return { rgb: "transparent", hex: "transparent", hsl: "transparent" };
    }

    // Parse both RGB and RGBA formats
    const rgbValues = rgb.match(/\d+(\.\d+)?/g);
    if (!rgbValues || rgbValues.length < 3) {
      return null;
    }

    const r = Math.min(255, Math.max(0, parseInt(rgbValues[0], 10)));
    const g = Math.min(255, Math.max(0, parseInt(rgbValues[1], 10)));
    const b = Math.min(255, Math.max(0, parseInt(rgbValues[2], 10)));
    const a = rgbValues.length > 3 ? parseFloat(rgbValues[3]) : 1;

    // Convert to hex including alpha if present
    let hex: string;
    if (a < 1) {
      const alphaHex = Math.round(a * 255)
        .toString(16)
        .padStart(2, "0");
      hex = `#${((1 << 24) | (r << 16) | (g << 8) | b)
        .toString(16)
        .slice(1)
        .toUpperCase()}${alphaHex.toUpperCase()}`;
    } else {
      hex = `#${((1 << 24) | (r << 16) | (g << 8) | b)
        .toString(16)
        .slice(1)
        .toUpperCase()}`;
    }

    const hsl = rgbToHsl(r, g, b, a);

    return {
      rgb:
        a < 1
          ? `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`
          : `rgb(${r}, ${g}, ${b})`,
      hex,
      hsl,
    };
  }

  function rgbToHsl(r: number, g: number, b: number, a: number = 1): string {
    // Normalize RGB values
    r /= 255;
    g /= 255;
    b /= 255;

    // Find max and min values for determining lightness
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    // Initialize HSL values
    let h = 0;
    let s = 0;
    let l = (max + min) / 2;

    // If max and min are the same, it's a shade of gray (no saturation)
    if (max !== min) {
      // Calculate saturation
      s = l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);

      // Calculate hue
      switch (max) {
        case r:
          h = (g - b) / (max - min) + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / (max - min) + 2;
          break;
        case b:
          h = (r - g) / (max - min) + 4;
          break;
      }
      h /= 6;
    }

    // Convert to degrees and percentages
    const hDeg = Math.round(h * 360);
    const sPct = Math.round(s * 100);
    const lPct = Math.round(l * 100);

    // Return HSL or HSLA string
    return a < 1
      ? `hsla(${hDeg}, ${sPct}%, ${lPct}%, ${a.toFixed(2)})`
      : `hsl(${hDeg}, ${sPct}%, ${lPct}%)`;
  }

  // Clean up when the page unloads
  window.addEventListener("unload", () => {
    if (colorHelper && colorHelper.parentNode) {
      colorHelper.parentNode.removeChild(colorHelper);
    }
    if (overlayElement && overlayElement.parentNode) {
      overlayElement.parentNode.removeChild(overlayElement);
    }
    document.removeEventListener("click", handleDOMClick);
    document.removeEventListener("mousemove", handleDOMHover);
  });
}
