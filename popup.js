const downloadCapturedImage = (capturedImageData, fileName = "captured_image.png") => {
  // Create a Blob from the captured image data (assuming it's a base64 data URL)
  const base64Data = capturedImageData.split(',')[1]; // Remove the 'data:image/png;base64,' part
  const byteCharacters = atob(base64Data); // Decode the base64 data
  const byteNumbers = new Array(byteCharacters.length);

  // Convert to byte array
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);

  // Create a Blob with the byte array and set the MIME type to 'image/png'
  const blob = new Blob([byteArray], { type: 'image/png' });

  // Create a temporary download link and trigger it
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob); // Convert blob to object URL
  link.download = fileName; // Set the file name for download

  // Programmatically trigger the download
  link.click();

  // Clean up the object URL
  URL.revokeObjectURL(link.href);
};

document.getElementById("takeFrameBtn").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      files: ['content.js']
    }, () => {
      chrome.tabs.sendMessage(activeTab.id, { action: "takeFrameShot" }, (response) => {
        console.log("Response received in popup.js:", response);
        if (!response || !response.dataUrl) {
          console.error("No images captured.");
          return;
        }

        downloadCapturedImage(response.dataUrl);
      });
    });
  });
});

document.getElementById("takeScreenshotBtn").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      files: ['content.js']
    }, () => {
      chrome.tabs.sendMessage(activeTab.id, { action: "takeScreenshot" }, (response) => {
        console.log("Response received in popup.js:", response);
        if (!response || !response.dataUrl) {
          console.error("No images captured.");
          return;
        }

        const images = response.dataUrl;

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        const firstImage = new Image();
        firstImage.onload = () => {
          canvas.width = firstImage.width;
          canvas.height = images.length * firstImage.height;

          let imagesLoaded = 0;

          const drawImageOnCanvas = (image, index) => {
            context.drawImage(image, 0, index * firstImage.height);
            imagesLoaded++;

            if (imagesLoaded === images.length) {
              // Download capture image
              const link = document.createElement("a");
              link.href = canvas.toDataURL("image/jpeg");
              link.download = "fullpage_screenshot.jpeg";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
          };

          images.forEach((dataUrl, index) => {
            const image = new Image();
            image.onload = () => drawImageOnCanvas(image, index);
            image.src = dataUrl;
          });
        };

        firstImage.src = images[0];
      });
    });
  });
});
