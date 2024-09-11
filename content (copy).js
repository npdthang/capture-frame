chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received in content.js:", message);
  const TOP_DOCUMENT_CONTEXT = "top-document";
  const FRAME_DOCUMENT_CONTEXT_FORMAT = "FrameContext_";

// Function to capture process
  async function capture() {
    const elementList = [];

    console.log('selectorOfModalElements ')
    //const selectorOfModalElements = await getSelectorOfAllModalElements();

    this.zoomLevel = window.devicePixelRatio || 1;

    const orgScrollTop = document.documentElement.scrollTop;
    const orgScrollLeft = document.documentElement.scrollLeft;

    document.documentElement.scrollTop = 0;
    document.documentElement.scrollLeft = 0;

    let parentOffsetTop = 0;
    let parentOffsetLeft = 0;
    let frameIndex = -1;
    console.log('start call capture')

    // Assuming captureElement is a defined function
    await captureElement(
      document.body,
      elementList,
      0,
      await this.getSelector('', '', 1, document.body),
      Constants.TOP_DOCUMENT_CONTEXT,
      parentOffsetTop,
      parentOffsetLeft,
      0,
      frameIndex,
      false, // isParentFrame
      null // parentFrameElement
    );

    // Scroll back to original position
    document.documentElement.scrollTop = orgScrollTop;
    document.documentElement.scrollLeft = orgScrollLeft;

    return elementList;
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
    isScrollable, additionalParams
  ) {
    const elementId = generateUniqueId(); // Generate a unique ID for the element
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
      additionalParams: additionalParams
    };

    // Add the element to the list
    elementList.push(element);
    returnIdList.push(elementId);

    return element;
  }

  /**
   * Generates a unique ID for an element.
   * @returns {string} A unique ID.
   */
  function generateUniqueId() {
    return `element-${Math.random().toString(36).substr(2, 9)}`;
  }

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

  async function captureElement(
    htmlElement, elementList, parentId, selector, context, parentOffsetTop, parentOffsetLeft, frameLevel, frameIndex, isParentFrame, parentFrameElement
  ) {
    let children = null;
    let scrollHTMLElement = null;
    const returnIdList = [];
    let isFrame = false;

    try {
      console.log('captureElement: Start');

      // Check if the element is a frame
      isFrame = isFrameElement(htmlElement);

      const selectorOfModalElements = getSelectorOfAllModalElements();

      // Element for scrolling
      scrollHTMLElement = htmlElement;

      let frameUrl = '';
      let frameTitle = '';

      if (isFrame) {
        frameUrl = htmlElement.ownerDocument?.URL || '';
        frameTitle = htmlElement.ownerDocument?.title || '';
        scrollHTMLElement = htmlElement.ownerDocument?.documentElement || scrollHTMLElement;
      }

      // Check if the element is scrollable
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

      // Add the element
      const thisElement = addElement(
        htmlElement, parentId, selector, context, elementList, returnIdList, parentOffsetTop, parentOffsetLeft, isParentFrame, parentFrameElement, isScrollable, null
      );

      thisElement.htmlElement = htmlElement;
      thisElement.orgScrollLeft = orgScrollLeft;
      thisElement.orgScrollTop = orgScrollTop;

      const parentOffset = calculateParentOffset(htmlElement, thisElement, parentOffsetTop, parentOffsetLeft);
      parentOffsetTop = parentOffset[0];
      parentOffsetLeft = parentOffset[1];

      if (isScrollable) {
        thisElement.scrollableElement = scrollHTMLElement;
      } else if (thisElement.id === "0000") {
        thisElement.scrollableElement = htmlElement.ownerDocument || htmlElement;
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
        }

        thisElement.frameIndex = frameIndex;
        context = context.replace(
          TOP_DOCUMENT_CONTEXT,
          `${FRAME_DOCUMENT_CONTEXT_FORMAT}${frameIndex}`
        );
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

          if (thisElement.relation && thisElement.relation.parent) {
            const parentElements = getTreeScrollable(elementList, thisElement.relation.parent.id);
            treeScrollableElements.push(...parentElements);
          }

          treeScrollableElements.push(thisElement);

          thisElement.baseImg = await captureScrollableElement(
            this.zoomLevel, treeScrollableElements, elementList
          );
          thisElement.imageFlag = thisElement.baseImg !== '';
        } catch (ex) {
          console.error('Error capturing scrollable element:', ex);
        }
      }

      if ((isFrame || isFrameSet) && !isScrollable && thisElement.id !== "0000") {
        try {
          const treeScrollableElements = [];

          // Ensure root element is found and push to the list
          const rootElement = elementList.find(item => item.id === "0000");
          if (rootElement) {
            treeScrollableElements.push(rootElement);
          } else {
            console.warn('Root element with id "0000" not found.');
          }

          // Check if relation and parent are defined
          if (thisElement.relation && thisElement.relation.parent) {
            const parentId = thisElement.relation.parent.id;
            const parentElements = getTreeScrollable(elementList, parentId);

            // Ensure parentElements is an array
            if (Array.isArray(parentElements)) {
              treeScrollableElements.push(...parentElements);
            } else {
              console.warn('getTreeScrollable did not return an array.');
            }
          } else {
            console.warn('thisElement.relation or thisElement.relation.parent is undefined');
          }

          // Push current element to the list
          treeScrollableElements.push(thisElement);

          // Verify that treeScrollableElements is an array before sorting or other operations
          if (!Array.isArray(treeScrollableElements)) {
            throw new TypeError('treeScrollableElements is not an array.');
          }

          // Optional: sort the array if needed (example: based on some property)
          // treeScrollableElements.sort((a, b) => a.someProperty - b.someProperty);

          // Capture frame screen
          const isCompatMode = document.compatMode === "BackCompat";
          thisElement.baseImg = await captureFrameScreen(
            htmlElement, scrollHTMLElement, 1, isCompatMode, treeScrollableElements, elementList
          );
        } catch (ex) {
          console.error('Error capturing frame screen:', ex);
          isFrame = false; // Set isFrame to false on error
        }
      }

      if (!(isScrollable || isFrame || isFrameSet) || thisElement.baseImg !== '' || thisElement.id === "0000") {
        const childrenList = await captureChildren(
          htmlElement, elementList, thisElementId, selector, context, parentOffsetTop, parentOffsetLeft, frameLevel, frameIndex, thisElement.isCompatMode, isParentFrame, parentFrameElement, selectorOfModalElements
        );

        const currentElement = elementList.find(e => e.id.toString(ID_FORMAT) === thisElementId);
        if (currentElement) {
          currentElement.relation.children.child = childrenList.map(e => new ChildModel({ ID: e }));
        }
      }

      if (thisElement.imageFlag) {
        scrollHTMLElement.scrollTop = thisElement.orgScrollTop;
        scrollHTMLElement.scrollLeft = thisElement.orgScrollLeft;
      }

      if (thisElement.isFrameElement && thisElement.relation?.children?.child?.length) {
        try {
          let image = Image.FromFile(Path.combine(
            Utilities.EditToolConfig.current.imageFolderPath,
            thisElement.baseImg
          ));

          // Find the body element among children
          const bodyElement = elementList.find(e => e.id === thisElement.relation.children.child[0]?.id);

          if (bodyElement?.html.tagName.toLowerCase() === 'body') {
            bodyElement.position = { width: image.width, height: image.height };
          }

          // Clean up
          image = null;
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

          // Clean up
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

    let parentElement = lstInput.find(item => item.ID === parentId);

    while (parentElement && parentElement.ID !== "0000") {
      if (isFrame(parentElement.HtmlElement) || parentElement.ScrollableElement) {
        result.push(parentElement);
      }

      parentElement = lstInput.find(item => item.ID === parentElement.Relation.Parent.ID);
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
    treeScrollableElements.sort((item1, item2) => item1.ID - item2.ID);

    // Get original scroll positions for scrollable elements
    const orgPositionData = treeScrollableElements
      .filter(item => item.ScrollableElement)
      .map(item => ({
        id: item.ID,
        scrollableElement: item.ScrollableElement,
        isCompatMode: item.IsCompatMode,
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


      // Get element dimensions with compatibility mode handling
      const elementWidth = contentElement.clientWidth;
      const elementHeight = contentElement.clientHeight;
      console.log(elementWidth, elementHeight)
      const ROOT_ELEMENT_ID = "0000";
      const finalCanvas = await captureProcess(
        elementWidth * zoomLevel,
        elementHeight * zoomLevel,
        viewableScreen.top,
        viewableScreen.left,
        viewableScreen.width,
        viewableScreen.height,
        zoomLevel,
        treeScrollableElements.filter(
          item => item.ScrollableElement || item.ID === ROOT_ELEMENT_ID
        ),
        elementList
      );

      // Resize canvas if zoom level is not 1 (assuming a resizeCanvas function)
      if (Math.abs(zoomLevel - 1) > 0.001) {
        const resizedCanvas = resizeImage(finalCanvas, new Size(elementWidth, elementHeight));
        return saveCanvas(resizedCanvas, true); // save image
      }

      return saveCanvas(finalCanvas, true); // save image
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

      // Get element width and height
      const elementWidth = captureElement?.ScrollableElement.scrollWidth;
      const elementHeight = captureElement?.ScrollableElement.scrollHeight;

      // Skip capture if dimensions are invalid
      if (viewableScreen.width <= 0 || viewableScreen.height <= 0 || elementWidth <= 0 || elementHeight <= 0) {
        return '';
      }

      // Capture process (replace with your actual capture logic)
      const finalBitmap = await captureProcess(
        siteHwnd,
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
        return await save(resizedBitmap, true); // save image
      }

      return await save(finalBitmap, true); // save image
    } finally {
      // Rollback to original scroll positions
      for (const orgData of orgPositionData) {
        orgData.scrollableElement.scrollLeft = orgData.scrollLeft;
        orgData.scrollableElement.scrollTop = orgData.scrollTop;
      }
    }
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
    const scrollableElements = treeScrollableElements.filter(item => item.ID !== "0000");
    const bodyElement = treeScrollableElements.find(item => item.ID === "0000");
    if (!bodyElement) {
      console.warn('BODY element with ID "0000" not found.');
      return { top: 0, left: 0, width: 0, height: 0 };
    }

    // Get viewable dimensions of BODY element
    const screenWidth = bodyElement.ScrollableElement.clientWidth;
    const screenHeight = bodyElement.ScrollableElement.clientHeight;

    let viewableScreen = {
      top: 0,
      left: 0,
      width: Math.round(screenWidth * zoomLevel),
      height: Math.round(screenHeight * zoomLevel),
    };

    let offsetTop = 0;
    let offsetLeft = 0;

    // Process each scrollable element
    for (const scrollableElement of treeScrollableElements.filter(item => item.ID !== "0000")) {
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
    }
    // Logic to save the canvas image
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
        .map(async item => {
          // Ensure the element exists
          if (!item.ScrollableElement) {
            console.warn(`ScrollableElement for ID ${item.ID} is missing`);
            return null; // Return null to skip this item
          }

          const scrollableElement = item.ScrollableElement;

          // Use a try-catch to handle potential errors during evaluation
          try {
            const orgScrollTop = (await page.evaluate(el => el.scrollTop, scrollableElement)) * zoomLevel;
            const orgScrollLeft = (await page.evaluate(el => el.scrollLeft, scrollableElement)) * zoomLevel;

            return {
              Id: item.ID,
              ScrollableElement: scrollableElement,
              IsCompatMode: item.IsCompatMode,
              OrgScrollTop: orgScrollTop,
              OrgScrollLeft: orgScrollLeft
            };
          } catch (error) {
            console.error(`Error processing ScrollableElement for ID ${item.ID}:`, error);
            return null; // Return null in case of an error
          }
        })
    );

    // Filter out any null values
    const validCaptureData = captureData.filter(data => data !== null);

    if (validCaptureData.length === 0) {
      console.error('No valid capture data available.');
      return null;
    }

    const captureElement = validCaptureData[0];
    const canvas = document.createElement('canvas');
    const finalContext = canvas.getContext('2d');

    let scrollTop = 0;
    let calcScrollTop = 0;

    do {
      let scrollLeft = 0;
      let calcScrollLeft = 0;

      if (captureElement.ScrollableElement) {
        captureElement.ScrollableElement.scrollTop = Math.floor((scrollTop + captureElement.OrgScrollTop) / zoomLevel);
      }

      let tempScrollTop = Math.floor(captureElement.ScrollableElement.scrollTop * zoomLevel) - captureElement.OrgScrollTop;
      let countTop = 1;

      while (countTop < validCaptureData.length && tempScrollTop < scrollTop) {
        const beforeRect = getBoundingRectToViewPort(elementList, captureElement.Id);
        const parentData = validCaptureData[countTop];

        if (parentData.ScrollableElement) {
          parentData.ScrollableElement.scrollTop = Math.floor((parentData.OrgScrollTop + (scrollTop - tempScrollTop)) / zoomLevel);

          const newScrollTop = Math.floor(parentData.ScrollableElement.scrollTop * zoomLevel);
          tempScrollTop += newScrollTop - parentData.OrgScrollTop;

          const afterRect = getBoundingRectToViewPort(elementList, captureElement.Id);
          if (beforeRect.top === afterRect.top) {
            tempScrollTop -= newScrollTop - parentData.OrgScrollTop;
          }
        }

        countTop++;
      }
      scrollTop = tempScrollTop;

      do {
        if (captureElement.ScrollableElement) {
          captureElement.ScrollableElement.scrollLeft = Math.floor((scrollLeft + captureElement.OrgScrollLeft) / zoomLevel);
        }

        let tempScrollLeft = Math.floor(captureElement.ScrollableElement.scrollLeft * zoomLevel) - captureElement.OrgScrollLeft;
        let countLeft = 1;

        while (countLeft < validCaptureData.length && tempScrollLeft < scrollLeft) {
          const beforeRect = getBoundingRectToViewPort(elementList, captureElement.Id);
          const parentData = validCaptureData[countLeft];

          if (parentData.ScrollableElement) {
            parentData.ScrollableElement.scrollLeft = Math.floor((parentData.OrgScrollLeft + (scrollLeft - tempScrollLeft)) / zoomLevel);

            const newScrollLeft = Math.floor(parentData.ScrollableElement.scrollLeft * zoomLevel);
            tempScrollLeft += newScrollLeft - parentData.OrgScrollLeft;

            const afterRect = getBoundingRectToViewPort(elementList, captureElement.Id);
            if (beforeRect.left === afterRect.left) {
              tempScrollLeft -= newScrollLeft - parentData.OrgScrollLeft;
            }
          }

          countLeft++;
        }

        scrollLeft = tempScrollLeft;

        // Capture image
        const captureBitmap = captureBodyScreenshot(); // capture screen image

        const canvas = document.createElement('canvas');
        canvas.width = finalBitmap.width;
        canvas.height = finalBitmap.height;

        const ctx = canvas.getContext('2d');

        const srcRect = new Rectangle(viewLeft, viewTop, viewWidth, viewHeight);
        const destRect = new Rectangle(scrollLeft, scrollTop, viewWidth, viewHeight);

        ctx.drawImage(captureBitmap, srcRect.x, srcRect.y, srcRect.width, srcRect.height, destRect.x, destRect.y, destRect.width, destRect.height);

        scrollLeft += viewWidth;
        calcScrollLeft += viewWidth;
      } while (scrollLeft < elementWidth && calcScrollLeft < elementWidth);

      scrollTop += viewHeight;
      calcScrollTop += viewHeight;

      // Scrolling back
      validCaptureData
        .sort((item1, item2) => item1.Id - item2.Id)
        .forEach(data => {
          if (data.ScrollableElement) {
            data.ScrollableElement.scrollLeft = Math.floor(data.OrgScrollLeft / zoomLevel);
          }
        });
    } while (scrollTop < elementHeight && calcScrollTop < elementHeight);

    // Scrolling back
    validCaptureData
      .sort((item1, item2) => item1.Id - item2.Id)
      .forEach(data => {
        if (data.ScrollableElement) {
          data.ScrollableElement.scrollTop = Math.floor(data.OrgScrollTop / zoomLevel);
        }
      });

    return finalBitmap;
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

  async function captureChildren(element, elementList, parentId, parentSelector, context, parentOffsetTop, parentOffsetLeft, frameLevel, frameIndex, isCompatMode, isParentFrame, parentFrameElement, selectorOfModalElements) {
    const childrenList = [];

    if (isFrame(element)) {
      const child = element.ownerDocument;
      if (child) {
        // get modal element
        const selectorOfModalElementsInFrame = getSelectorOfAllModalElements(child);

        childFrameIndex = -1;
        const body = child.body;
        const childSelector = getSelector(body, '', 1);
        const childList = captureElement(
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
          isParentFrame || isFrameSet(body),
          parentFrameElement,
          selectorOfModalElementsInFrame
        );
        childrenList.push(...childList);
        child.release();
        if (body) {
          body.release();
        }
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
        const childList = captureElement(
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
        childrenList.push(...childList);
      }
      children.release();
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
          ID: index, // Assign a unique ID
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
        // Get the frame element inside the frameset
        const frameElement = document.body.querySelector('frameset').parentNode.querySelectorAll('frame')[0];

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
        const parentId = 0;
        const selector = 'frame';
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
          TOP_DOCUMENT_CONTEXT,                // Context string
          parentOffsetTop,        // Top offset of the parent
          parentOffsetLeft,       // Left offset of the parent
          frameLevel,             // Frame level (depth)
          frameIndex,             // Frame index within the frameset
          isParentFrame,          // Is this the parent frame?
          parentFrameElement      // Parent frame element (null in this case)
        );

        console.log(capturedImages)

        console.log("Frame captured successfully!");
        sendResponse({ dataUrl: capturedImages});

      } catch (ex) {
        console.error("Error capturing the frame:", ex);
      }
    };

    // Delay capture to allow frame loading
    setTimeout(captureFrame, 1000);
    return true; // Keep the message channel open for sendResponse
  }


  if (message.action === "takeScreenshot") {
    console.log("Starting screenshot process...");

    const { scrollHeight, clientHeight } = document.documentElement; // Create var get height of monitor height and page height
    const devicePixelRatio = window.devicePixelRatio || 1;

    let capturedHeight = 0;
    let capturedImages = []; // Array store each captured image

    window.scrollTo(0, 0); // Scroll to the top before starting the capture

    // function capture image
    const captureAndScroll = () => {
      const scrollAmount = clientHeight * devicePixelRatio; // Amount of scroll each time

      chrome.runtime.sendMessage({ action: "captureVisibleTab", pixelRatio: devicePixelRatio }, (dataUrl) => {
        console.log("Captured image dataUrl:", dataUrl);
        capturedHeight += scrollAmount;

        if (dataUrl) {
          capturedImages.push(dataUrl); // Push each capture image into the array
        }

        if (capturedHeight < scrollHeight * devicePixelRatio) {
          window.scrollTo(0, capturedHeight); // Scroll to the next part of the page
          setTimeout(captureAndScroll, 3000); // Adjust the delay as needed
        }
        else {
          const htmlElement = document.documentElement.outerHTML;
          const htmlBody = document.getElementsByTagName('body')[0];
          // const htmlList = htmlBody.childNodes;
          console.log("Captured all images, sending response:", capturedImages);
          sendResponse({ dataUrl: capturedImages,
                         htmlDomElement: htmlElement,
                         htmlDomBody: htmlBody,
                         htmlDomList: [] });
        }
      });
    };



    setTimeout(captureAndScroll, 1000); // Delay to allow scroll-to-top to take effect before starting the capture

    return true; // Keep the message channel open for sendResponse
  }
});
