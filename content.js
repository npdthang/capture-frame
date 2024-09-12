chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received in content.js:", message);
  const TOP_DOCUMENT_CONTEXT = "top-document";
  const FRAME_DOCUMENT_CONTEXT_FORMAT = "FrameContext_";

  // async function captureBodyScreenshot() {
  //   let zoomLevel = window.devicePixelRatio;
  //   let orgScrollTop = document.documentElement.scrollTop;
  //   let orgScrollLeft = document.documentElement.scrollLeft;
  //   let elementWidth = document.documentElement.scrollWidth;
  //   let elementHeight = document.documentElement.scrollHeight;
  //   let viewWidth = document.documentElement.clientWidth * zoomLevel;
  //   let viewHeight = document.documentElement.clientHeight * zoomLevel;
  //
  //   const finalBitmap = document.createElement('canvas');
  //   finalBitmap.width = elementWidth;
  //   finalBitmap.height = elementHeight;
  //   const finalCtx = finalBitmap.getContext('2d');
  //
  //   let scrollTop = 0;
  //   let calcScrollTop = 0;
  //
  //   do {
  //     let scrollLeft = 0;
  //     let calcScrollLeft = 0;
  //
  //     do {
  //       // Execute script to scroll the element
  //       document.body.scrollTop = Math.round(scrollTop / zoomLevel);
  //       document.body.scrollLeft = Math.round(scrollLeft / zoomLevel);
  //
  //       scrollTop = document.body.scrollTop;
  //       scrollLeft = document.body.scrollLeft;
  //
  //       scrollTop = Math.round(scrollTop * zoomLevel);
  //       scrollLeft = Math.round(scrollLeft * zoomLevel);
  //       await new Promise(resolve => setTimeout(resolve, 200));
  //       const captureTab = await new Promise((resolve) => {
  //         chrome.runtime.sendMessage({ action: 'captureVisibleTab' }, resolve);
  //       });
  //       const captureBitmap = new Image();
  //       // Capture a screenshot of the visible part
  //       await new Promise((resolve, reject) => {
  //         captureBitmap.onload = resolve;
  //         captureBitmap.onerror = reject;
  //         captureBitmap.src = captureTab.screenshot;
  //       });
  //
  //       captureBitmap.onload = () => {
  //         finalCtx.drawImage(captureBitmap, scrollLeft, scrollTop);
  //       };
  //       //captureBitmap.src = `data:image/png;base64,${btoa(captureData)}`; // Convert screenshot data to image
  //
  //       scrollLeft += viewWidth;
  //       calcScrollLeft += viewWidth;
  //     } while (scrollLeft <= elementWidth && calcScrollLeft <= elementWidth);
  //
  //     scrollTop += viewHeight;
  //     calcScrollTop += viewHeight;
  //   } while (scrollTop <= elementHeight && calcScrollTop <= elementHeight);
  //
  //   document.documentElement.scrollTop = orgScrollTop;
  //   document.documentElement.scrollLeft = orgScrollLeft;
  //
  //   return finalBitmap;
  // }
  async function captureBodyScreenshot(){
    let zoomLevel = window.devicePixelRatio;
    let orgScrollTop = document.documentElement.scrollTop;
    let orgScrollLeft = document.documentElement.scrollLeft;
    let elementWidth = document.documentElement.scrollWidth;
    let elementHeight = document.documentElement.scrollHeight;
    let viewWidth = document.documentElement.clientWidth * zoomLevel;
    let viewHeight = document.documentElement.clientHeight * zoomLevel;

    const finalBitmap = document.createElement('canvas');
    finalBitmap.width = elementWidth;
    finalBitmap.height = elementHeight;
    const finalCtx = finalBitmap.getContext('2d');
    const captureBitmap = new Image();
    let scrollTop = 0;
    let calcScrollTop = 0;

    do {
      let scrollLeft = 0;
      let calcScrollLeft = 0;

      do {
        // Scroll to the desired position
        window.scrollTo(Math.round(scrollLeft / zoomLevel), Math.round(scrollTop / zoomLevel));

        // Wait for the scroll to complete and for the page to be ready
        await new Promise(resolve => setTimeout(resolve, 300));

        // Capture a screenshot of the visible part
        const captureData = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ action: 'captureVisibleTab' }, resolve);
        });

        await new Promise((resolve, reject) => {
          captureBitmap.onload = resolve;
          captureBitmap.onerror = reject;
          captureBitmap.src = captureData.screenshot;
        });

        // Draw the captured image to the canvas
        finalCtx.drawImage(captureBitmap, scrollLeft, scrollTop, viewWidth, viewHeight);

        scrollLeft += viewWidth;
        calcScrollLeft += viewWidth;
      } while (scrollLeft < elementWidth && calcScrollLeft < elementWidth);

      scrollTop += viewHeight;
      calcScrollTop += viewHeight;
    } while (scrollTop < elementHeight && calcScrollTop < elementHeight);

    // Restore original scroll position
    window.scrollTo(orgScrollLeft, orgScrollTop);

    // Return the final bitmap as a data URL
    return finalBitmap
  }

  function isFrameElement(element) {
    if (!(element instanceof HTMLElement)) {
      throw new Error('Argument must be an instance of HTMLElement');
    }
    return element.tagName.toLowerCase() === 'iframe' || element.tagName.toLowerCase() === 'frame';
  }

  function IsFrameSetElement(element)
  {
    return element.tagName.toLowerCase() === 'frameset';
  }

  function hasVerticalScroll(element) {
    if (!(element instanceof HTMLElement)) {
      throw new Error('Argument must be an instance of HTMLElement');
    }
    // Check if the scrollHeight is greater than the clientHeight
    return element.scrollHeight > element.clientHeight;
  }

  function hasHorizontalScroll(element) {
    if (!(element instanceof HTMLElement)) {
      throw new Error('Argument must be an instance of HTMLElement');
    }
    // Check if the scrollWidth is greater than the clientWidth
    return element.scrollWidth > element.clientWidth;
  }

  async function getBodyElement(frameElement) {
    if (frameElement && frameElement.contentDocument) {
      return frameElement.contentDocument.body;
    }
    return null;
  }

  async function getDocumentElement(frameElement) {
    if (frameElement && frameElement.contentDocument) {
      return frameElement.contentDocument.documentElement; // <html> element
    }
    return null;
  }

  async function calculateParentOffset(htmlElement, element, parentOffsetTop, parentOffsetLeft) {
    if (await isFrameElement(htmlElement)) {
      if (element.ImageFlag) {
        const frame = await htmlElement.contentFrame();
        if (frame) {
          let frameDoc;
          if (this.isTopCompatMode) {
            frameDoc = await getBodyElement(frame);
          } else {
            frameDoc = await getDocumentElement(frame);
          }

          parentOffsetTop = await frameDoc.evaluate((el) => el.scrollTop);
          parentOffsetLeft = await frameDoc.evaluate((el) => el.scrollLeft);
        }
      } else {
        parentOffsetTop = element.position.top;
        parentOffsetLeft = element.position.left;
      }
    } else if (element.ImageFlag) {
      const scrollTop = await htmlElement.evaluate((el) => el.scrollTop);
      const scrollLeft = await htmlElement.evaluate((el) => el.scrollLeft);

      const boundingRect = await htmlElement.evaluate((el) => el.getBoundingClientRect());
      parentOffsetTop = scrollTop - boundingRect.top;
      parentOffsetLeft = scrollLeft - boundingRect.left;
    }

    return { parentOffsetTop, parentOffsetLeft };
  }

  function addElement(
    htmlElement, parentId, selector, context, elementList, returnIdList,
    parentOffsetTop, parentOffsetLeft, isParentFrame, parentFrameElement,
    isScrollable, additionalParams, thisElementId
  ) {
    const elementId = thisElementId; // Generate a unique ID for the element
    const boundingRect = htmlElement.getBoundingClientRect();

    // Create an element object with relevant properties
    const element = {
      id: elementId,
      tagName: htmlElement.tagName,
      parentId: parentId,
      selector: selector,
      context: context,
      position: {
        top: boundingRect.top + parentOffsetTop,
        left: boundingRect.left + parentOffsetLeft,
        width: boundingRect.width,
        height: boundingRect.height,
      },
      isFrameElement: isParentFrame,
      isScrollable: isScrollable,
      htmlElement: htmlElement,
      additionalParams: additionalParams,
      relation: {
        parent: null // Initialize the parent relation
      }
    };

    // If there's a valid parentId, find the parent in the elementList
    if (parentId !== null) {
      const parentElement = elementList.find(item => item.id === parentId);
      if (parentElement) {
        // Set the parent relation
        element.relation.parent = parentElement;
      }
    }

    // Add the element to the list
    elementList.push(element);
    returnIdList.push(elementId);

    return element;
  }
  /**
   * Generates a unique ID for an element.
   * @returns {string} A unique ID.
   */

  // function generateUniqueId() {                       // No use this function for now
  //   return `element-${Math.random().toString(36).substr(2, 9)}`;
  // }

  function getSelectorOfAllModalElements(context) {
    // Define a list of common classes or attributes used for modals
    const modalSelectors = [
      '.modal',           // Common class for modals
      '.dialog',          // Another common class
      '[role="dialog"]', // ARIA attribute for dialogs
      '[data-modal="true"]' // Custom data attribute
    ];

    // Build a combined selector string
    const combinedSelector = modalSelectors.join(', ');

    // Optionally, you can filter elements if needed
    // Example: Filter out elements that are not in the given context
    // const modalElements = context.querySelectorAll(combinedSelector);

    return combinedSelector;
  }

  const HtmlModel = {
    FRAME_SET_URL: 'defaultFrameSetURL',
    FRAME_SET_TITLE: 'defaultFrameSetTitle',
    // Add any other properties or constants here
  };

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  async function processElement(thisElement, elementList) {
    if (thisElement.isFrameElement) {
      try {
        const imagePath = Utilities.EditToolConfig.current.imageFolderPath + thisElement.baseImg;
        const image = await loadImage(imagePath);

        // Find the body element based on relation
        const bodyElement = elementList.find(e => e.id === thisElement.relation?.children?.child[0]?.id);

        // Check if the body element exists and has the correct tag
        if (bodyElement && bodyElement.htmlElement.tagName.toLowerCase() === 'body') {
          bodyElement.position = { width: image.width, height: image.height };
        }

        // Cleanup
        image.src = ''; // Release the image memory
      } catch (ex) {
        console.error('Error processing image or body element:', ex);
      }
    } else if (thisElement.id === "0000" && !this.editorBaseImage) {
      try {
        const imagePath = Utilities.EditToolConfig.current.imageFolderPath + this.editorBaseImage;
        const image = await loadImage(imagePath);

        // Update thisElement's position with image dimensions
        thisElement.position = { width: image.width, height: image.height };

        // Cleanup
        image.src = ''; // Release the image memory
      } catch (ex) {
        console.error('Error processing editor base image:', ex);
      }
    }
  }

  const Utilities = {
    EditToolConfig: {
      current: {
        imageFolderPath: './images/', // Define the path to your images or other resources
      }
    }
  };

  async function captureElement(htmlElement, elementList, parentId, selector,
                                context, parentOffsetTop, parentOffsetLeft,
                                frameLevel, frameIndex, isParentFrame, parentFrameElement) {
    let children = null;
    let scrollHTMLElement = null;
    const returnIdList = [];
    let isFrame = false;
    let zoomLevel = window.devicePixelRatio || 1;
    try {
      console.log('captureElement: Start');

      isFrame = isFrameElement(htmlElement);

      const selectorOfModalElements = getSelectorOfAllModalElements();
      scrollHTMLElement = htmlElement;

      let frameUrl = '';
      let frameTitle = '';

      if (isFrame) { // Get frame info
        frameUrl = htmlElement.ownerDocument?.URL || '';
        frameTitle = htmlElement.ownerDocument?.title || '';
        scrollHTMLElement = htmlElement || scrollHTMLElement;
      }

      const isScrollable = htmlElement.tagName.toLowerCase() !== 'body' &&
        (hasHorizontalScroll(scrollHTMLElement) || hasVerticalScroll(scrollHTMLElement));

      let orgScrollLeft = 0;
      let orgScrollTop = 0;
      if (isScrollable) {
        orgScrollLeft = scrollHTMLElement.scrollLeft;
        orgScrollTop = scrollHTMLElement.scrollTop;
        scrollHTMLElement.scrollTop = 0;
        scrollHTMLElement.scrollLeft = 0;
      }

      const thisElementId = elementList.length;

      const thisElement = addElement(
        htmlElement, parentId, selector, context, elementList, returnIdList,
        parentOffsetTop, parentOffsetLeft, isParentFrame, parentFrameElement,
        isScrollable, null, thisElementId
      );

      // Ensure relation and relation.parent are initialized
      thisElement.relation = thisElement.relation || {};
      thisElement.relation.parent = thisElement.relation.parent || {};

      if (thisElement.relation.parent) {
        console.log("Parent element found:", thisElement.relation.parent);
      } else {
        console.log("No parent element.");
      }

      thisElement.htmlElement = htmlElement;
      thisElement.orgScrollLeft = orgScrollLeft;
      thisElement.orgScrollTop = orgScrollTop;

      const parentOffset = calculateParentOffset(htmlElement, thisElement, parentOffsetTop, parentOffsetLeft);
      parentOffsetTop = parentOffset[0];
      parentOffsetLeft = parentOffset[1];

      thisElement.ScrollableElement = scrollHTMLElement;

      if (thisElement.id === "0000") {
        thisElement.ScrollableElement = htmlElement.ownerDocument || htmlElement;
      }

      const isFrameSet = IsFrameSetElement(htmlElement);
      if (isFrameSet) {
        thisElement.url = HtmlModel.FRAME_SET_URL;
        thisElement.title = HtmlModel.FRAME_SET_TITLE;
      }

      if (isFrame) {
        thisElement.url = frameUrl;
        thisElement.title = frameTitle;

        const frameDocument = htmlElement.ownerDocument;
        if (frameDocument) {
          const parentWindow = frameDocument.defaultView;
          if (parentWindow) {
            const parentFrameList = parentWindow.frames;

            for (let i = 0; i < parentFrameList.length; i++) {
              const frame = parentFrameList[i]; // Access frame using array index
              if (frame.document === frameDocument) {
                frameIndex = i;
                break;
              }
            }
          }

          thisElement.frameIndex = frameIndex;
          context = context.replace(
            TOP_DOCUMENT_CONTEXT,
            `${FRAME_DOCUMENT_CONTEXT_FORMAT}${frameIndex}`
          );
        }
      }

      if (thisElement.id !== "0000" && (isFrame || isFrameSet)) {
        if (frameLevel === 10) {
          return returnIdList;
        }
        frameLevel++;
      }

      if (isScrollable) {
        try {
          const treeScrollableElements = [];
          const rootElement = elementList.find(item => item.id === "0000");
          if (rootElement) {
            treeScrollableElements.push(rootElement);
          }
          console.log("check thisElement");
          console.log(thisElement);
          if (thisElement.relation && thisElement.relation.parent) {
            const parentElements = getTreeScrollable(elementList, thisElement.relation.parent.id);
            treeScrollableElements.push(...parentElements);
          }

          treeScrollableElements.push(thisElement);

          thisElement.baseImg = await captureScrollableElement(
            zoomLevel, treeScrollableElements, elementList
          );
          thisElement.imageFlag = thisElement.baseImg !== '';
        } catch (ex) {
          console.error('Error capturing scrollable element:', ex);
        }
      }

      if ((isFrame || isFrameSet) && !isScrollable && thisElement.id !== "0000") {
        const treeScrollableElements = [];
        const rootElement = elementList.find(item => item.id === "0000");
        if (rootElement) {
          treeScrollableElements.push(rootElement);
        } else {
          console.warn('Root element with id "0000" not found.');
        }

        if (thisElement.relation && thisElement.relation.parent) {
          const parentId = thisElement.relation.parent && thisElement.relation.parent.id || 0;
          const parentElements = getTreeScrollable(elementList, parentId);
          if (Array.isArray(parentElements)) {
            treeScrollableElements.push(...parentElements);
          } else {
            console.warn('getTreeScrollable did not return an array.');
          }
        } else {
          console.warn('thisElement.relation or thisElement.relation.parent is undefined');
        }

        treeScrollableElements.push(thisElement);

        if (!Array.isArray(treeScrollableElements)) {
          throw new TypeError('treeScrollableElements is not an array.');
        }

        const isCompatMode = document.compatMode === "BackCompat";
        thisElement.baseImg = await captureFrameScreen(
          htmlElement, scrollHTMLElement, zoomLevel, isCompatMode, treeScrollableElements, elementList
        );
      }

      if (!(isScrollable || isFrame || isFrameSet) || thisElement.baseImg !== '' || thisElement.id === "0000") {
        const childrenList = await captureChildren(
          htmlElement, elementList, thisElementId, selector, context, parentOffsetTop, parentOffsetLeft, frameLevel, frameIndex, thisElement.isCompatMode, isParentFrame, parentFrameElement, selectorOfModalElements
        );

        const currentElement = elementList.find(e => e.id === thisElementId);
        if (currentElement) {
          // Initialize `relation` if it's not defined
          currentElement.relation = currentElement.relation || {};

          // Initialize `children` inside `relation` if it's not defined
          currentElement.relation.children = currentElement.relation.children || {};

          // Set the `child` property in `children`
          currentElement.relation.children.child = childrenList.map(e => new ChildModel({ ID: e }));
        }
      }

      if (thisElement.imageFlag) {
        scrollHTMLElement.scrollTop = thisElement.orgScrollTop;
        scrollHTMLElement.scrollLeft = thisElement.orgScrollLeft;
      }

      if (thisElement.isFrameElement) {
        try {
          // let imagePath = Utilities.EditToolConfig.current.imageFolderPath + thisElement.baseImg;
          //
          // // Logic to process the image
          // let image = new Image();
          // image.src = imagePath;
          //
          // const bodyElement = elementList.find(e => e.id === thisElement.relation.children.child[0]?.id);
          //
          // if (bodyElement?.htmlElement.tagName.toLowerCase() === 'body') {
          //   bodyElement.position = { width: image.width, height: image.height };
          // }

          return thisElement.baseImg;
        } catch (ex) {
          console.error('Error processing image or body element:', ex);
        }
      } else if (thisElement.id === "0000" && !this.editorBaseImage) {
        try {
          let image = Image.FromFile(Path.combine(
            Utilities.EditToolConfig.current.imageFolderPath,
            this.editorBaseImage
          ));

          thisElement.position = { width: image.width, height: image.height };

          image.dispose();
          image = null;
        } catch (ex) {
          console.error('Error processing editor base image:', ex);
        }
      }
    } catch (ex) {
      console.error('Error in captureElement:', ex);
    }
  }

  function getTreeScrollable(lstInput, parentId) {
    const result = [];
    let parentElement = lstInput.find(item => item.id === parentId);

    // Traverse the hierarchy until the parent is not found or ID is "0000"
    while (parentElement && parentElement.id !== "0000") {
      // Check if HtmlElement is valid and an instance of HTMLElement
      if (parentElement.htmlElement && parentElement.htmlElement instanceof HTMLElement) {
        // Add to the result if it's a frame element or has a scrollable element
        if (isFrameElement(parentElement.htmlElement) || parentElement.ScrollableElement) {
          result.push(parentElement);
        }
      } else {
        console.log(`HtmlElement is not defined or not an HTMLElement for ID: ${parentElement.ID}`);
      }

      // Move to the parent, ensuring Relation and Parent exist
      const parentId = parentElement.Relation?.Parent?.id;
      if (!parentId) {
        console.log(`Parent ID not found for element ID: ${parentElement.id}`);
        break; // Exit the loop if no parent exists
      }

      parentElement = lstInput.find(item => item.ID === parentId);
    }

    return result;
  }

  async function captureFrameScreen(element, contentElement, zoomLevel, isCompatMode, treeScrollableElements, elementList) {
    // Get current scroll positions
    const orgFrameScrollTop = contentElement.scrollTop;
    const orgFrameScrollLeft = contentElement.scrollLeft;
    if (!Array.isArray(treeScrollableElements)) {
      console.warn('treeScrollableElements is not an array. Initializing as empty array.');
      treeScrollableElements = [];
    }
    // Sort parent elements (assuming `sort` method on List)
    treeScrollableElements.sort((item1, item2) => item1.id - item2.id);

    // Get original scroll positions for scrollable elements
    const orgPositionData = treeScrollableElements
      .filter(item => item.ScrollableElement)
      .map(item => ({
        id: item.id,
        scrollableElement: item.ScrollableElement,
        isCompatMode: item.IsCompatMode || isCompatMode,
        orgScrollTop: item.ScrollableElement.scrollTop,
        orgScrollLeft: item.ScrollableElement.scrollLeft,
      }));

    try {
      // Scroll element into view
      console.log(element)
      element.scrollIntoView();
      console.log('starting captureFrameScreen')
      // Get viewable screen for capture (assuming `getViewableScreen` function)
      const viewableScreen = getViewableScreen(zoomLevel, treeScrollableElements, element, contentElement, isCompatMode);
      console.log(viewableScreen)

      const activeElement = contentElement.activeElement;
      // Get element dimensions with compatibility mode handling
      const elementWidth = contentElement.clientWidth;
      const elementHeight = contentElement.clientHeight;
      const ROOT_ELEMENT_ID = "0000";
      const finalCanvas = await captureProcess(
        1,
        elementWidth * zoomLevel,
        elementHeight * zoomLevel,
        viewableScreen.top,
        viewableScreen.left,
        viewableScreen.width,
        viewableScreen.height,
        zoomLevel,
        treeScrollableElements.filter(
          item => item.ScrollableElement || item.id === ROOT_ELEMENT_ID
        ),
        elementList
      );

      // Resize canvas if zoom level is not 1 (assuming a resizeCanvas function)
      if (Math.abs(zoomLevel - 1) > 0.001) {
        const resizedCanvas = resizeImage(finalCanvas, new Size(elementWidth, elementHeight));
        return resizedCanvas.toDataURL('image/png'); // save image
      }

      return finalCanvas.toDataURL('image/png'); // save image
    } finally {
      // Restore scroll positions
      orgPositionData.forEach(data => {
        data.scrollableElement.scrollTop = data.orgScrollTop;
        data.scrollableElement.scrollLeft = data.orgScrollLeft;
      });

      contentElement.scrollTop = orgFrameScrollTop;
      contentElement.scrollLeft = orgFrameScrollLeft;
    }
  }

  async function captureScrollableElement(zoomLevel, treeScrollableElements, elementList) {
    // Sort parent element by ID
    treeScrollableElements.sort((a, b) => a.ID - b.ID);
    console.log(treeScrollableElements)
    // Get data for scrolling back
    const orgPositionData = treeScrollableElements
      .filter(item => item.ScrollableElement)
      .map(item => ({
        id: item.ID,
        scrollableElement: item.ScrollableElement,
        scrollTop: item.ScrollableElement.scrollTop,
        scrollLeft: item.ScrollableElement.scrollLeft,
      }));

    try {
      // Get capture element
      const captureElement = treeScrollableElements[treeScrollableElements.length-1];

      // Scroll element to view
      captureElement.htmlElement.scrollIntoView();

      // Get viewable screen for capture
      const viewableScreen = getViewableScreen(zoomLevel, treeScrollableElements);
      console.log(viewableScreen)
      // Get element width and height
      const elementWidth = captureElement?.ScrollableElement.scrollWidth;
      const elementHeight = captureElement?.ScrollableElement.scrollHeight;

      // Skip capture if dimensions are invalid
      if (viewableScreen.width <= 0 || viewableScreen.height <= 0 || elementWidth <= 0 || elementHeight <= 0) {
        return '';
      }

      // Capture process (replace with your actual capture logic)
      const finalBitmap = await captureProcess(
        1,
        Math.round(elementWidth * zoomLevel),
        Math.round(elementHeight * zoomLevel),
        viewableScreen.top,
        viewableScreen.left,
        viewableScreen.width,
        viewableScreen.height,
        zoomLevel,
        treeScrollableElements
          .filter(item => item.ScrollableElement || item.ID === "0000")
          .map(item => item),
        elementList
      );

      // Resize final image (if zoom is not 1)
      if (Math.abs(zoomLevel - 1) > 0.001) {
        const resizedBitmap = resizeImage(finalBitmap, new Size(elementWidth, elementHeight));
        return finalBitmap.toDataURL('image/png');//await saveCanvas(resizedBitmap, true); // save image
      }

      return finalBitmap.toDataURL('image/png'); // save image
    } finally {
      // Rollback to original scroll positions
      for (const orgData of orgPositionData) {
        orgData.scrollableElement.scrollLeft = orgData.scrollLeft;
        orgData.scrollableElement.scrollTop = orgData.scrollTop;
      }
    }
  }

  function rectangleIntersect(rect1, rect2) {
    // Calculate the intersecting top, left, width, and height
    const intersectTop = Math.max(rect1.top, rect2.top);
    const intersectLeft = Math.max(rect1.left, rect2.left);
    const intersectRight = Math.min(rect1.left + rect1.width, rect2.left + rect2.width);
    const intersectBottom = Math.min(rect1.top + rect1.height, rect2.top + rect2.height);

    // Calculate width and height of the intersecting rectangle
    const intersectWidth = intersectRight - intersectLeft;
    const intersectHeight = intersectBottom - intersectTop;

    // If the intersected area is valid (both width and height should be positive)
    if (intersectWidth > 0 && intersectHeight > 0) {
      return {
        top: intersectTop,
        left: intersectLeft,
        width: intersectWidth,
        height: intersectHeight
      };
    }

    // If there's no intersection, return an empty rectangle
    return {
      top: 0,
      left: 0,
      width: 0,
      height: 0
    };
  }

  function resizeImage(imgToResize, size) {
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high'; // Equivalent to InterpolationMode.HighQualityBicubic

    ctx.drawImage(imgToResize, 0, 0, size.width, size.height);

    return canvas.toDataURL(); // Returns a data URL representation of the resized image
  }

  function getViewableScreen(zoomLevel, treeScrollableElements, frameElement = null, frameContentElement = null) {
    // Get list of scrollable elements (excluding BODY)
    const scrollableElements = treeScrollableElements.filter(item => item.id !== "0000");
    let bodyElement = treeScrollableElements.find(item => item.id === "0000");
    if (!bodyElement) {
      console.warn('BODY element with ID "0000" not found. Creating default bodyElement.');
      bodyElement = {
        id: "0000",
        ScrollableElement: document.documentElement || document.body,
        // Other default properties if needed
      };
    } else {
      // Initialize ScrollableElement if bodyElement is found
      bodyElement.ScrollableElement = document.documentElement || document.body;
    }

    // Get viewable dimensions of BODY element
    // const screenWidth = bodyElement.ScrollableElement.clientWidth;
    // const screenHeight = bodyElement.ScrollableElement.clientHeight;

    const screenWidth = frameContentElement.clientWidth;
    const screenHeight = frameContentElement.clientHeight;

    let viewableScreen = {
      top: 0,
      left: 0,
      width: Math.round(screenWidth * zoomLevel),
      height: Math.round(screenHeight * zoomLevel),
    };

    let offsetTop = 0;
    let offsetLeft = 0;

    // Process each scrollable element
    for (const scrollableElement of scrollableElements.filter(item => item.id !== "0000")) {
      const scrollElement = scrollableElement.ScrollableElement;
      const isFrame = isFrameElement(scrollableElement.htmlElement);

      let paddingTop = 0;
      let paddingLeft = 0;
      if (isFrame) {
        paddingTop = parseInt(scrollableElement.htmlElement.style.paddingTop.replace('px', ''), 10) || 0;
        paddingLeft = parseInt(scrollableElement.htmlElement.style.paddingLeft.replace('px', ''), 10) || 0;
      }

      // Calculate bounding rectangle and adjust for zoom
      const boundingClientRect = scrollableElement.htmlElement.getBoundingClientRect();
      const top = Math.round(((boundingClientRect.top + scrollableElement.htmlElement.clientTop + paddingTop) * zoomLevel) + offsetTop);
      const left = Math.round(((boundingClientRect.left + scrollableElement.htmlElement.clientLeft + paddingLeft) * zoomLevel) + offsetLeft);
      const width = Math.round(scrollElement.clientWidth * zoomLevel);
      const height = Math.round(scrollElement.clientHeight * zoomLevel);

      // Update viewable screen area
      const scrollRect = { top, left, width, height };
      viewableScreen = rectangleIntersect(viewableScreen, scrollRect);

      if (isFrame) {
        offsetTop = top;
        offsetLeft = left;
      }
    }

    // Process frame element if provided
    if (frameElement && frameContentElement) {
      const frameBoundingClientRect = frameElement.getBoundingClientRect();
      const frameTop = Math.round(((frameBoundingClientRect.top + frameElement.clientTop) * zoomLevel) + offsetTop);
      const frameLeft = Math.round(((frameBoundingClientRect.left + frameElement.clientLeft) * zoomLevel) + offsetLeft);
      const frameWidth = Math.round(frameContentElement.clientWidth * zoomLevel);
      const frameHeight = Math.round(frameContentElement.clientHeight * zoomLevel);

      const frameRect = { top: frameTop, left: frameLeft, width: frameWidth, height: frameHeight };
      viewableScreen = rectangleIntersect(viewableScreen, frameRect);
    }

    return viewableScreen;
  }
  function saveCanvas(canvas, returnData) {
    if (returnData) {
      return canvas.toDataURL('image/png');
      // const dataCanvas = canvas.toDataURL('image/png')
      // const [header, base64Data] = dataCanvas.split(',');
      // const mime = header.match(/:(.*?);/)[1]; // Extract MIME type (e.g., image/png)
      //
      // // Convert base64 data to binary data
      // const byteCharacters = atob(base64Data);
      // const byteNumbers = new Array(byteCharacters.length);
      // for (let i = 0; i < byteCharacters.length; i++) {
      //   byteNumbers[i] = byteCharacters.charCodeAt(i);
      // }
      // const byteArray = new Uint8Array(byteNumbers);
      //
      // // Create a Blob from the binary data
      // const blob = new Blob([byteArray], { type: mime });
      //
      // // Create a download link
      // const link = document.createElement('a');
      // const url = URL.createObjectURL(blob);
      // link.href = url;
      // link.download = 'test file';
      //
      // // Append the link to the document and trigger a click to start the download
      // document.body.appendChild(link);
      // link.click();
      //
      // // Clean up
      // document.body.removeChild(link);
      // URL.revokeObjectURL(url);
    }
    // Logic to save the canvas image
  }

  function getElementByIdOrWindow(id) {
    return document.getElementById(id) || window;
  }

  class Rectangle {
    constructor(x, y, width, height) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
    }

    // You can add other methods to the class if needed
    intersects(otherRect) {
      return !(otherRect.x > this.x + this.width ||
        otherRect.x + otherRect.width < this.x ||
        otherRect.y > this.y + this.height ||
        otherRect.y + otherRect.height < this.y);
    }
  }

  async function captureProcess(
    page, // Use the page parameter if required for other purposes
    elementWidth,
    elementHeight,
    viewTop,
    viewLeft,
    viewWidth,
    viewHeight,
    zoomLevel,
    scrollTree,
    elementList
  ) {
    // Prepare data for capture
    const captureData = await Promise.all(
      scrollTree
        .sort((a, b) => b.ID - a.ID)
        .map(async (item) => {
          if (!item.ScrollableElement) {
            console.log(`ScrollableElement for ID ${item.id} is missing`);
          }
          const scrollableElement = item.ScrollableElement;
          try {
            const orgScrollTop = scrollableElement.scrollTop * zoomLevel;
            const orgScrollLeft = scrollableElement.scrollLeft * zoomLevel;
            const isCompatMode = document.compatMode === "BackCompat";
            return {
              id: item.id,
              ScrollableElement: scrollableElement,
              IsCompatMode: item.IsCompatMode || isCompatMode,
              OrgScrollTop: orgScrollTop,
              OrgScrollLeft: orgScrollLeft,
            };
          } catch (error) {
            console.log(`Error processing ScrollableElement for ID ${item.ID}:`, error);
          }
        })
    );

    // Filter out null values
    const validCaptureDataResult = captureData.filter((data) => data !== null);
    if (validCaptureDataResult.length === 0) {
      console.error("No valid capture data available.");
      return null;
    }

    const captureElement = validCaptureDataResult[0]; // First element to scroll and capture
    const canvas = document.createElement("canvas");
    const finalContext = canvas.getContext("2d");

    let scrollTop = 0;
    let calcScrollTop = 0;

    do {
      let scrollLeft = 0;
      let calcScrollLeft = 0;

      if (captureElement.ScrollableElement) {
        captureElement.ScrollableElement.scrollTop = Math.floor(
          (scrollTop + captureElement.OrgScrollTop) / zoomLevel
        );
      }

      let tempScrollTop = Math.floor(
        captureElement.ScrollableElement.scrollTop * zoomLevel
      ) - captureElement.OrgScrollTop;

      // Capture scrolling
      do {
        if (captureElement.ScrollableElement) {
          captureElement.ScrollableElement.scrollLeft = Math.floor(
            (scrollLeft + captureElement.OrgScrollLeft) / zoomLevel
          );
        }

        let tempScrollLeft = Math.floor(
          captureElement.ScrollableElement.scrollLeft * zoomLevel
        ) - captureElement.OrgScrollLeft;

        // **Capture image**
        const captureBitmap = await captureBodyScreenshot();

        canvas.width = viewWidth; //set dimension for cropping frame
        canvas.height = viewHeight; //
        const ctx = canvas.getContext("2d");

        const srcRect = new Rectangle(viewLeft, viewTop, viewWidth, viewHeight);
        const destRect = new Rectangle(scrollLeft, scrollTop, viewWidth, viewHeight);

        // Draw image on canvas
        ctx.drawImage(
          captureBitmap,
          srcRect.x, srcRect.y, srcRect.width, srcRect.height,
          destRect.x, destRect.y, destRect.width, destRect.height
        );

        scrollLeft += viewWidth;
        calcScrollLeft += viewWidth;

      } while (scrollLeft < elementWidth && calcScrollLeft < elementWidth);

      scrollTop += viewHeight;
      calcScrollTop += viewHeight;

    } while (scrollTop < elementHeight && calcScrollTop < elementHeight);

    // Restore original scroll position
    validCaptureDataResult.forEach((data) => {
      if (data.ScrollableElement) {
        data.ScrollableElement.scrollTop = Math.floor(data.OrgScrollTop / zoomLevel);
        data.ScrollableElement.scrollLeft = Math.floor(data.OrgScrollLeft / zoomLevel);
      }
    });
    return canvas; // Return final canvas containing the captured bitmap
  }

  function getBoundingRectToViewPort(htmlElements, targetElementId) {
    const cleanRects = [];
    let rect = { x: 0, y: 0, width: 0, height: 0 };

    try {
      const targetElement = htmlElements.find(element => element.ID === targetElementId);

      if (targetElement) {
        // Get target rect
        const targetRect = targetElement.htmlElement.getBoundingClientRect();
        cleanRects.push(targetRect);

        rect.x = targetRect.left;
        rect.y = targetRect.top;
        rect.width = targetRect.right - targetRect.left;
        rect.height = targetRect.bottom - targetRect.top;

        // Get all parent frames
        const parentFrameElements = [];
        let parentElement = htmlElements.find(element => element.ID === targetElement.relation.parent.ID);

        while (parentElement) {
          if (parentElement.isFrameElement) {
            parentFrameElements.push(parentElement);
          }

          if (parentElement.ID === "0000") {
            break;
          }

          parentElement = htmlElements.find(element => element.ID === parentElement.relation.parent.ID);
        }

        // Add rect of parent frames
        parentFrameElements.forEach(parentFrame => {
          const parentRect = parentFrame.htmlElement.getBoundingClientRect();
          cleanRects.push(parentRect);

          rect.x += parentRect.left;
          rect.y += parentRect.top;
        });
      }
    } finally {
    }

    return rect;
  }

  function getSelector(element, baseSelector = '', index = 0) {
    if (!element || element.nodeType !== 1) return baseSelector;

    const tagName = element.tagName.toLowerCase();
    let selector = `${baseSelector} > ${tagName}`;

    if (index > 0) {
      selector += `:nth-child(${index})`;
    }

    return selector;
  }

  async function captureChildren(
    element,
    elementList,
    parentId,
    parentSelector,
    context,
    parentOffsetTop,
    parentOffsetLeft,
    frameLevel,
    frameIndex,
    isCompatMode,
    isParentFrame,
    parentFrameElement,
    selectorOfModalElements
  ) {
    const childrenList = [];

    if (isFrameElement(element)) {
      const child = element.ownerDocument;
      if (child) {
        // get modal element
        const selectorOfModalElementsInFrame = getSelectorOfAllModalElements(child);

        const childFrameIndex = -1;
        const body = child.body;
        const childSelector = getSelector(body, '', 1);

        // Capture element
        let childList = captureElement(
          body,
          elementList,
          parentId,
          childSelector,
          context,
          parentOffsetTop,
          parentOffsetLeft,
          frameLevel,
          childFrameIndex,
          isCompatMode,
          isParentFrame || IsFrameSetElement(body),
          parentFrameElement,
          selectorOfModalElementsInFrame
        );

        // Ensure childList is always an array
        childList = Array.isArray(childList) ? childList : [];

        childrenList.push(...childList);
      }
    } else {
      const children = element.children;
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child.nodeType === Node.COMMENT_NODE) {
          continue;
        }

        const frameTagElement = child.tagName?.toLowerCase() === 'frame';
        const currentParentFrameElement = frameTagElement
          ? { element: child, frameIndex: null }
          : parentFrameElement;

        const childSelector = getSelector(child, parentSelector, i + 1);

        // Capture element
        let childList = captureElement(
          child,
          elementList,
          parentId,
          childSelector,
          context,
          parentOffsetTop,
          parentOffsetLeft,
          frameLevel,
          frameIndex,
          isCompatMode,
          isParentFrame || frameTagElement,
          currentParentFrameElement,
          selectorOfModalElements
        );

        // Ensure childList is always an array
        childList = Array.isArray(childList) ? childList : [];

        childrenList.push(...childList);
      }
    }
    return childrenList;
  }

  function gatherScrollableElements() {
    const scrollableElements = [];
    // Traverse the DOM to find scrollable elements
    document.querySelectorAll('*').forEach((element, index) => {
      const overflowY = window.getComputedStyle(element).overflowY;
      const overflowX = window.getComputedStyle(element).overflowX;

      const isScrollableVertically = (overflowY === 'scroll' || overflowY === 'auto') && element.scrollHeight > element.clientHeight;
      const isScrollableHorizontally = (overflowX === 'scroll' || overflowX === 'auto') && element.scrollWidth > element.clientWidth;

      // Check if the element is scrollable
      if (isScrollableVertically || isScrollableHorizontally) {
        scrollableElements.push({
          ID: index, // You can use any unique ID
          ScrollableElement: element,
          IsCompatMode: document.compatMode === 'BackCompat', // Check if document is in quirks mode
          orgScrollTop: element.scrollTop,
          orgScrollLeft: element.scrollLeft
        });
      }
    });
    return scrollableElements;
  }

  function gatherElementList() {
    const elementList = [];

    // Traverse the DOM to collect important elements
    document.querySelectorAll('*').forEach((element, index) => {
      // You can filter elements based on certain conditions. For example:

      // Check if the element is visible
      const isVisible = !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);

      // If the element is visible or meets other criteria, add it to the list
      if (isVisible) {
        elementList.push({
          id: index, // Assign a unique ID
          Element: element,
          BoundingBox: element.getBoundingClientRect(), // Get the element's bounding box
          IsScrollable: element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth // Check if it's scrollable
        });
      }
    });
    return elementList;
  }

  if (message.action === "takeFrameShot") {
    console.log("Starting frameshot process...");
    const captureFrame = async () => {
      try {
        // Check for the presence of frameset or iframe and adjust selectors accordingly
        const frameElement = document.body.querySelector('frameset')
          ? document.body.querySelector('frameset').parentNode.querySelectorAll('frame')[0]
          : document.body.querySelector('iframe');

        if (!frameElement) {
          throw new Error("Frame element not found");
        }

        // Get the content inside the frame
        const contentElement = frameElement.contentDocument;
        const zoomLevel = window.devicePixelRatio || 1;
        const isCompatMode = document.compatMode === "BackCompat";

        // Gather scrollable elements and initialize element list
        const scrollableElements = gatherScrollableElements();
        const elementList = gatherElementList();
        const frameLevel = 0;  // Set initial frame level
        const frameIndex = 0;  // Set the initial frame index

        console.log("Frame Element: ", frameElement);
        console.log("Content Element: ", contentElement);

        // Calculate offsets and initialize other necessary variables
        const parentId = '0000';
        const selector = 'frame'; // or 'iframe' depending on your context
        const parentOffsetTop = 0;
        const parentOffsetLeft = 0;
        const isParentFrame = true;
        const parentFrameElement = null;

        // Call captureElement function to capture the frame
        const capturedImages = await captureElement(
          frameElement,           // Frame HTML element
          elementList,            // List to store captured elements
          parentId,               // Parent ID
          selector,               // Selector for the frame
          TOP_DOCUMENT_CONTEXT,   // Context string (ensure this is defined)
          parentOffsetTop,        // Top offset of the parent
          parentOffsetLeft,       // Left offset of the parent
          frameLevel,             // Frame level (depth)
          frameIndex,             // Frame index within the frameset
          isParentFrame,          // Is this the parent frame?
          parentFrameElement      // Parent frame element (null in this case)
        );

        // Send captured images using chrome.runtime.sendMessage
        chrome.runtime.sendMessage({ action: "captureVisibleTab", pixelRatio: zoomLevel }, (response) => {
          console.log("Captured all images, sending response:", capturedImages);
          console.log(response)
          sendResponse({ dataUrl: capturedImages });
        });

      } catch (ex) {
        console.error("Error capturing the frame:", ex);
      }
    };

    // Delay capture to allow frame loading
    setTimeout(captureFrame, 1000);
    // Keep the message channel open for sendResponse
    return true;
  }

  if (message.action === "takeScreenshot") {
    console.log("Starting screenshot process...");

    const { scrollHeight, clientHeight } = document.documentElement;
    const devicePixelRatio = window.devicePixelRatio || 1;

    let capturedHeight = 0;
    let capturedImages = [];

    // Scroll to the top before starting the capture
    window.scrollTo(0, 0);

    const captureAndScroll = () => {
      const scrollAmount = clientHeight * devicePixelRatio;

      chrome.runtime.sendMessage({ action: "captureVisibleTab", pixelRatio: devicePixelRatio }, (dataUrl) => {
        console.log("Captured image dataUrl:", dataUrl);
        capturedHeight += scrollAmount;

        if (dataUrl) {
          capturedImages.push(dataUrl);
        }

        if (capturedHeight < scrollHeight * devicePixelRatio) {
          // Scroll to the next part of the page
          window.scrollTo(0, capturedHeight);
          setTimeout(captureAndScroll, 2000); // Adjust the delay as needed
        } else {
          console.log("Captured all images, sending response:", capturedImages);
          sendResponse({ dataUrl: capturedImages });
        }
      });
    };

    // Delay to allow scroll-to-top to take effect before starting the capture
    setTimeout(captureAndScroll, 500);

    return true; // Keep the message channel open for sendResponse
  }
});
