document.getElementById("captureFramesBtn").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      files: ['content.js']
    }, () => {
      chrome.tabs.sendMessage(activeTab.id, { action: "takeFrameShot" }, (response) => {
        if (response.frameImage) {
          // Hard reload page every 1 minute after click frame capture btn to prevent error for the next time click capture btn          
          setTimeout(() => { 
            chrome.tabs.reload(activeTab.id, { bypassCache: true }, function() {
              // After reload is complete, call your function
              displayFrame(response.frameImage);
          });
          }, 60000);
        } else {
          console.error("Error in response:", response.error);
        }
      });
    });
  });
});

function displayFrame(frameImage) {
  const container = document.getElementById('framesContainer');
  container.innerHTML = ""; // Clear previous content
  const img = document.createElement('img');
  img.src = frameImage;
  img.alt = "Captured frame";
  container.appendChild(img);
}
