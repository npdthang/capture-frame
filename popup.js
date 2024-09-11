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
