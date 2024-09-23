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
      allElementsArray.forEach((array) => {
        console.log(array)
      });
    });
  }
});
// Function to process the screenshot and handle scrollable frames
function processScreenshot(screenshotUrl) {
  return new Promise((resolve, reject) => {
    const framesInfo = getAllFramesInfo(window, window); // Gather frame info

    const screenshotImage = new Image();
    screenshotImage.src = screenshotUrl;

    screenshotImage.onload = async function () {
      try {
        // Use the processInBatches function to capture frames with throttling
        const frameImages = await processInBatches(framesInfo, screenshotImage);
        resolve(frameImages); // Resolve with captured frame images
      } catch (error) {
        reject(new Error("Error during frame batch processing: " + error.message));
      }
    };

    screenshotImage.onerror = function () {
      reject(new Error("Failed to load screenshot image."));
    };
  });
}

async function processInBatches(framesInfo, screenshotImage) {
  const frameImages = [];

  for (let i = 0; i < framesInfo.length; i++) {
    const frameInfo = framesInfo[i];

    try {
      console.log(`Capturing frame ${i}`);
      const frameImage = await captureFullFrameContent(frameInfo, screenshotImage);
      frameImages.push({image: frameImage, htmlDom: frameInfo.htmlDom});
    } catch (error) {
      console.error(`Error capturing frame ${i}:`, error);
    }

    // Throttle the capture process to avoid hitting the API limit
    await delay(1500); // Delay 1.5 seconds or longer between frames
  }

  return frameImages;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper to capture full content of scrollable frames
function captureFullFrameContent(frameInfo, screenshotImage) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const scrollableWindow = frameInfo.level;

    // Get scroll dimensions
    const totalWidth = scrollableWindow.document.documentElement.scrollWidth;
    const totalHeight = scrollableWindow.document.documentElement.scrollHeight;
    const visibleWidth = scrollableWindow.innerWidth;
    const visibleHeight = scrollableWindow.innerHeight;

    canvas.width = totalWidth;
    canvas.height = totalHeight;

    let x = 0, y = 0;

    function captureNextSection() {
      scrollableWindow.scrollTo(x, y);

      // Delay to avoid hitting the quota limit
      delay(1000).then(() => {
        chrome.runtime.sendMessage({ action: "captureVisibleTab", pixelRatio: window.devicePixelRatio }, (response) => {
          if (response && response.screenshotUrl) {
            const sectionImage = new Image();
            sectionImage.src = response.screenshotUrl;

            sectionImage.onload = () => {
              ctx.drawImage(
                sectionImage,
                frameInfo.x, frameInfo.y, // Source position in screenshot
                visibleWidth, visibleHeight, // Source dimensions (visible area)
                x, y,                       // Destination position in canvas
                visibleWidth, visibleHeight  // Destination dimensions
              );

              y += visibleHeight;
              if (y < totalHeight) {
                captureNextSection(); // Continue scrolling
              } else {
                resolve(canvas.toDataURL('image/png'));
              }
            };

            sectionImage.onerror = () => {
              reject("Error loading section image");
            };
          } else {
            reject("Failed to capture section");
          }
        });
      });
    }

    captureNextSection(); // Start capturing the first section
  });
}

// Helper to gather frame information (including nested frames)
function getAllFramesInfo(win, rootWindow) {
  const framesInfo = [];
  const iframes = win.document.querySelectorAll('iframe, frame');

  iframes.forEach(async (frame) => {
    try {
      const rect = frame.getBoundingClientRect();
      const absolutePosition = calculateAbsolutePosition(rect, win, rootWindow);
      const htmlDom = captureElements(frame)

      framesInfo.push({
        x: absolutePosition.x,
        y: absolutePosition.y,
        width: rect.width,
        height: rect.height,
        level: frame.contentWindow, // Child frame
        htmlDom: htmlDom
      });

      // Recursively gather info of child frames
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

  while (win !== rootWindow) {
    const parentRect = win.frameElement.getBoundingClientRect();
    x += parentRect.left;
    y += parentRect.top;
    win = win.parent;
  }

  return { x, y };
}

async function captureElements(parentElement) { //capture element lists
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
