// Shows a PDF that needs an authenticated request in a new browser tab.
//
// Pop-up blockers only allow window.open() as part of the click, so the
// caller opens the tab first -- synchronously, before any await -- and this
// points it at the PDF once it has downloaded:
//
//   viewPdf(id, tab = window.open("", "_blank")) {
//     return openBlobPdf(tab, () => axiosInstance.get(url, { responseType: "blob" }));
//   }
//
// If the request fails the empty tab is closed and the error rethrown.
export async function openBlobPdf(tab, request) {
  try {
    if (tab) {
      // A short note while the PDF downloads instead of a blank page.
      try {
        tab.document.title = "PDF";
        tab.document.body.style.cssText = "margin:0;display:grid;place-items:center;height:100vh;font:14px system-ui,sans-serif;color:#667085";
        tab.document.body.textContent = "…";
      } catch {
        /* cross-origin or closed tab: nothing to decorate */
      }
    }
    const response = await request();
    const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
    // No tab (the browser blocked it): try once more. A tab the user has
    // closed meanwhile stays closed.
    if (!tab) window.open(url, "_blank");
    else if (!tab.closed) tab.location.href = url;
  } catch (error) {
    tab?.close();
    throw error;
  }
}
