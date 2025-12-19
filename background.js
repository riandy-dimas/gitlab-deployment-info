chrome.action.onClicked.addListener(async () => {
  try {
    // Get the current active tab from the browser window
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.url) {
      console.error("No active tab found");
      return;
    }

    // Store the tab URL so popup.js can access it
    await chrome.storage.local.set({ currentTabUrl: tab.url });

    // Open the extension in a new window
    chrome.windows.create({
      url: chrome.runtime.getURL("popup.html"),
      type: "popup",
      width: 400,
      height: 700,
      focused: true,
    });
  } catch (error) {
    console.error("Error opening extension window:", error);
  }
});
