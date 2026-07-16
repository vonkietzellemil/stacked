const CACHE_NAME = "Stacked";
const ASSETS = [
  "./",
  "./index.html",
  "./styles/general.css",
  "./styles/section1.css",
  "./styles/section2.css",
  "./styles/header.css",
  "./styles/root.css",
  "./styles/small-devices.css",
  "./styles/theme.css",
  "./styles/updateNews.css",

  "./scripts/main.js",
  "./scripts/list.js",
  "./scripts/lang.js",
  "./scripts/overview.js",
  "./scripts/modal.js",
  "./scripts/settings.js",
  "./scripts/pwa.js",
  "./scripts/router.js",
  "./scripts/storage.js",
  "./scripts/swipe-to-delete.js",

  "./images/plus.svg",
  "./images/minus.svg",
  "./videos/Trashcan.mp4",
  "./manifest.json",
  "./assets/img/stacked-logo.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
});





self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (
    event.request.method === "POST" &&
    url.pathname === "/share"
  ) {
    event.respondWith(handleShare(event.request));
  }
});

async function handleShare(request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (file) {
    const text = await file.text();
    const json = JSON.parse(text);

    // Store JSON somewhere accessible to the app
    console.log(json);
  }

  return Response.redirect("/", 303);
}