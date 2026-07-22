// main.js
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone;
}

const installAppGuide = document.getElementById("installAppGuide")
const installAppGuideIos = document.getElementById("installAppGuideIos");

if ('BeforeInstallPromptEvent' in window) {
  // Chrome/Android custom install button
  let installPrompt = null;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    installPrompt = e;

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
    installAppGuide.hidden = true;
  }
} else if (isIOS() && !isInStandaloneMode()) {
  // Show "Tap Share → Add to Home Screen"


  // Disabling it for now, so the app is usable in thye browser
  return;

  setTimeout(() => installAppGuideIos.hidden = false, 1000)
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