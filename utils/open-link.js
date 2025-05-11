export function makeLinksOpenInTab(selector = "a[data-new-tab]") {
  document.querySelectorAll(selector).forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      const url = el.getAttribute("href");
      if (url) chrome.tabs.create({ url, active: false });
    });
  });
}
