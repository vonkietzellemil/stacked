if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js");
  });
}

function isIOSStandalone() {
  const ua = navigator.userAgent || "";
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
  return isIOS && !!standalone;
}