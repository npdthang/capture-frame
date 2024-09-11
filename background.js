chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received in background.js:", message);
  if (message.action === "captureVisibleTab") {
    const { pixelRatio } = message;
    chrome.tabs.captureVisibleTab({ format: "jpeg", quality: 100 }, (imageData) => {
      console.log("Captured visible tab dataUrl:", imageData);
      sendResponse({ screenshot: imageData });
    });
    return true; // Keep the message channel open for sendResponse
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'capture_full_screenshot') {
    // Trigger captureVisibleTab from the background page
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (imageData) => {
      sendResponse({ screenshot: imageData });
    });
    // Indicate that we will send a response asynchronously
    return true;
  }
});
