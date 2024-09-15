chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "takeFrameShot") {
    console.log("Received request to capture frames.");

    // Request screenshot from the background script
    chrome.runtime.sendMessage({ action: "captureVisibleTab", pixelRatio: window.devicePixelRatio }, (response) => {
      if (response && response.screenshotUrl) {
        console.log("Screenshot URL received:", response.screenshotUrl);

        // Process the screenshot (you'll need to implement processScreenshot)
        processScreenshot(response.screenshotUrl).then((frameImages) => {
          console.log("Frames processed:", frameImages);

          // Send the first frame image back to the popup as an example
          if (frameImages.length > 0) {
            sendResponse({ frameImage: frameImages[0], index: 0 });
          } else {
            sendResponse({ error: "No frames detected." });
          }
        }).catch((error) => {
          console.error('Error processing screenshot:', error);
          sendResponse({ error: error.message });
        });
      } else {
        console.error("No screenshot URL returned.");
        sendResponse({ error: "Screenshot capture failed." });
      }
    });

    // Return true to indicate asynchronous response
    return true;
  }
});

// Function that processes the screenshot
function processScreenshot(screenshotUrl) {
  return new Promise((resolve, reject) => {
    const framesInfo = getAllFramesInfo(window, window); // Start gathering frames info from the main window

    const screenshotImage = new Image();
    screenshotImage.src = screenshotUrl;

    screenshotImage.onload = function () {
      const frameImages = [];

      framesInfo.forEach((frameInfo) => {
        const canvas = document.createElement('canvas');
        canvas.width = frameInfo.width;
        canvas.height = frameInfo.height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(
          screenshotImage,
          frameInfo.x, frameInfo.y,     // Source position in screenshot
          frameInfo.width, frameInfo.height, // Source dimensions (size of frame)
          0, 0,                         // Destination position in canvas
          frameInfo.width, frameInfo.height // Destination dimensions
        );

        // Convert canvas to a base64 image
        frameImages.push(canvas.toDataURL('image/png'));
      });

      resolve(frameImages);
    };

    screenshotImage.onerror = function () {
      reject(new Error("Failed to load screenshot image."));
    };
  });
}

// Helper to get positions of all frames, including nested ones
function getAllFramesInfo(win, rootWindow) {
  const framesInfo = [];
  const iframes = win.document.querySelectorAll('iframe, frame');

  iframes.forEach((frame) => {
    try {
      const rect = frame.getBoundingClientRect();
      const absolutePosition = calculateAbsolutePosition(rect, win, rootWindow);

      framesInfo.push({
        x: absolutePosition.x,
        y: absolutePosition.y,
        width: rect.width,
        height: rect.height,
        level: frame.contentWindow // To indicate it's a child frame
      });

      // Recursively get child frame positions
      const childFrames = getAllFramesInfo(frame.contentWindow, rootWindow);
      framesInfo.push(...childFrames);
    } catch (e) {
      console.error("Error accessing frame:", e); // Handle cross-origin frames
    }
  });

  return framesInfo;
}

// Calculate the absolute position of the frame relative to the root window
function calculateAbsolutePosition(rect, win, rootWindow) {
  let x = rect.left;
  let y = rect.top;

  // Climb up the frame hierarchy and adjust the position
  while (win !== rootWindow) {
    const parentRect = win.frameElement.getBoundingClientRect();
    x += parentRect.left;
    y += parentRect.top;
    win = win.parent;
  }

  return { x, y };
}
