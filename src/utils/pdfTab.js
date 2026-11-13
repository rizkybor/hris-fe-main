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
