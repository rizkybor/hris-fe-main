// Loaded by the service worker. When a new version replaces an older one,
// sign-in pages that are open reload into it at once (nothing to lose there);
// other pages switch on their next navigation (see PwaStatus.vue).
// On the very first install no page is controlled yet, so nothing reloads.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) =>
      Promise.all(
        clients
          .filter((client) => new URL(client.url).pathname.startsWith("/auth/"))
          .map((client) => client.navigate(client.url).catch(() => {}))
      )
    )
  );
});
