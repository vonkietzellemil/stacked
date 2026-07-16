// main.js
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone;
}

if ('BeforeInstallPromptEvent' in window) {
  // Chrome/Android custom install button
  let installPrompt = null;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    installPrompt = e;


    const installAppGuide = document.getElementById("installAppGuide");
    setTimeout(() => {
      installAppGuide.hidden = false;
    }, 1000)
    
  });

  const installButton = document.getElementById("installButton");

  installButton.addEventListener("click", async () => {
    if (!installPrompt) {
      return;
    }
    const result = await installPrompt.prompt();
    console.log(`Install prompt was: ${result.outcome}`);
    disableInAppInstallPrompt();
  });

  window.addEventListener("appinstalled", () => {
    disableInAppInstallPrompt();
  });

  function disableInAppInstallPrompt() {
    installPrompt = null;
  }

  window.addEventListener("beforeinstallprompt", async (e) => {
    if (!('getInstalledRelatedApps' in navigator)) {
      return;
    }

    // Search for a specific installed platform-specific app
    const relatedApps = await navigator.getInstalledRelatedApps();

    const psApp = relatedApps.find(
      app => app.id === "com.example.myapp"
    );

    if (psApp) {
      e.preventDefault();
      // Update UI as appropriate
    }
  });
} else if (isIOS() && !isInStandaloneMode()) {
  // Show "Tap Share → Add to Home Screen"

  const installAppGuide = document.getElementById("installAppGuideIos");
  setTimeout(() => installAppGuide.hidden = false, 1000)
}


window.addEventListener('focusin', () => {
  setTimeout(() => window.scrollTo(0, 0), 0);
});

function updateLayout() {
  const vv = window.visualViewport;

  document.documentElement.style.setProperty(
    '--viewport-height',
    `${vv.height}px`
  );
}

// window.visualViewport?.addEventListener('resize', updateLayout);
// window.visualViewport?.addEventListener('scroll', updateLayout);

updateLayout();