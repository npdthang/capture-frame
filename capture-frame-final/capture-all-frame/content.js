chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
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

  if(message.action === 'takeElements') {
    let parentElement = document.body;  // You can choose any element as the parent
    captureElements(parentElement).then((allElementsArray) => {
      console.log(allElementsArray);
    });

  }
});
// Example of a function that processes the screenshot (you can adapt this)
function processScreenshot(screenshotUrl) {
  return new Promise((resolve, reject) => {
    const framesInfo = getAllFramesInfo(); // Retrieve all iframe positions

    const screenshotImage = new Image();
    screenshotImage.src = screenshotUrl;

    screenshotImage.onload = function () {
      const frameImages = [];

      framesInfo.forEach((frameInfo) => {
        const canvas = document.createElement('canvas');
        canvas.width = frameInfo.width;
        canvas.height = frameInfo.height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(screenshotImage,
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

// Helper to get iframe positions
function getAllFramesInfo() {
  const framesInfo = [];
  const iframes = document.querySelectorAll('frame');
  iframes.forEach((frame) => {
    const rect = frame.getBoundingClientRect();
    framesInfo.push({
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height
    });
  });
  return framesInfo;
}

async function captureElements(parentElement) {
  let elementsArray = [];  // This will store all elements in the order we traverse.

  // Recursive function to traverse elements and their children
  async function traverse(element) {
    elementsArray.push(element);  // Add current element to the array

    // Check if the element is a frame or iframe
    if (element.tagName.toLowerCase() === 'iframe' || element.tagName.toLowerCase() === 'frame') {
      try {
        // Access the content of the frame
        const frameDoc = element.contentDocument || element.contentWindow.document;

        // Start from the <body> of the frame and traverse its children
        if (frameDoc && frameDoc.body) {
          await traverse(frameDoc.body);
        }
      } catch (err) {
        console.warn("Unable to access frame contents due to cross-origin restrictions.");
      }
    }

    // If the current element has children, traverse them as well
    for (let i = 0; i < element.children.length; i++) {
      await traverse(element.children[i]);
    }
  }

  // Start traversing from the parent element
  await traverse(parentElement);

  return elementsArray;  // Return the final array of elements
}
