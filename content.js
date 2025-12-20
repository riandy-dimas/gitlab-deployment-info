// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fillReleaseNotes") {
    const textarea = document.querySelector('textarea[name="release[description]"]') || 
                     document.querySelector('#release_description') ||
                     document.querySelector('textarea[placeholder*="release"]') ||
                     document.querySelector('textarea');
    
    if (textarea) {
      textarea.value = request.content;
      // Trigger input event so GitLab knows the field was updated
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: "Release notes textarea not found" });
    }
  }
  return true; // Keep the message channel open for async response
});