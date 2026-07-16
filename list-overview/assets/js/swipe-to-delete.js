// scripts/swipe.js
// =====================================================
// Swipe to Delete (Touch devices)
// - Swipe left to delete
// - Tap does NOT delete
// - onDeleteAttempt() must return true (delete) or false (cancel)
// =====================================================

window.enableSwipeToDelete = function enableSwipeToDelete(rowEl, onDeleteAttempt) {
  const isTouch = window.matchMedia("(hover: none)").matches;
  if (!isTouch) return;

  let startX = 0;
  let currentX = 0;
  let isSwiping = false;
  let hasMoved = false;

  const SWIPE_THRESHOLD = 120;
  const TAP_THRESHOLD = 10;

  function reset() {
    rowEl.style.transform = "";
    rowEl.style.opacity = "";
    rowEl.classList.remove("delete-ready");
  }

  rowEl.addEventListener("touchstart", (e) => {
    if (!window.swipeEnabled) return;
    startX = e.touches[0].clientX;
    currentX = startX;
    isSwiping = true;
    hasMoved = false;
    rowEl.classList.add("swiping");
  }, { passive: true });

  rowEl.addEventListener("touchmove", (e) => {
    if (!isSwiping) return;

    currentX = e.touches[0].clientX;
    const deltaX = currentX - startX;

    if (Math.abs(deltaX) > TAP_THRESHOLD) hasMoved = true;

    if (deltaX < 0) {
      rowEl.style.transform = `translateX(${deltaX}px)`;
      if (deltaX < -SWIPE_THRESHOLD) rowEl.classList.add("delete-ready");
      else rowEl.classList.remove("delete-ready");
    }
  }, { passive: true });

  rowEl.addEventListener("touchend", () => {
    isSwiping = false;
    rowEl.classList.remove("swiping");

    const deltaX = currentX - startX;

    // Tap -> nix
    if (!hasMoved || Math.abs(deltaX) < TAP_THRESHOLD) {
      reset();
      return;
    }

    // Nicht weit genug -> zurück
    if (!(deltaX < -SWIPE_THRESHOLD)) {
      reset();
      return;
    }

    // Weit genug -> Löschversuch (mit Confirm möglich)
    const ok = (typeof onDeleteAttempt === "function") ? onDeleteAttempt() : true;

    if (!ok) {
      // Nutzer hat abgebrochen
      reset();
      return;
    }

    // Löschen
    rowEl.style.transform = "translateX(-110%)";
    rowEl.style.opacity = "0";
    if (navigator.vibrate) navigator.vibrate(10);

    setTimeout(() => {
      rowEl.remove();
    }, 250);
  });

  // Click nach Swipe blockieren
  rowEl.addEventListener("click", (e) => {
    if (hasMoved) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
};



// =====================================================
// Pull to refresh
// - 
// =====================================================

function enablePullToRefresh({
  container,
  indicator,
  threshold = 80,
  maxPull = 140,
  onRefresh
}) {
  const el = document.querySelector(container);
  const indicatorEl = document.querySelector(indicator);
  const icon = indicatorEl?.querySelector(".pull-icon");

  if (!el) return;

  let startY = 0;
  let currentY = 0;

  let pulling = false;
  let refreshing = false;

  function setY(y) {
    el.style.transform = `translateY(${y}px)`;
    setProgressRotation(y);
  }

  function reset() {
    el.style.transition = "transform .25s ease";

    setY(0);

    if (indicatorEl) {
      indicatorEl.style.opacity = "0";
    }

    if (icon) {
      icon.style.transform = "rotate(0deg)";
      icon.classList.remove("spinning");
    }

    currentY = 0;
    pulling = false;
  }

  function setProgressRotation(y) {
    if (!icon) return;

    const progress = Math.min(y / threshold, 1);

    const rotation = progress * 180;

    icon.style.transform = `rotate(${rotation}deg)`;
  }

  el.addEventListener(
    "touchstart",
    e => {
      if (refreshing) return;

      // ONLY when already at top
      if (el.scrollTop > 0) return;

      startY = e.touches[0].clientY;
      pulling = true;

      el.style.transition = "none";
    },
    { passive: true }
  );

  el.addEventListener(
    "touchmove",
    e => {
      if (e.target.classList[0] === "drag-handle") return;
      
      if (!pulling) return;

      const touchY = e.touches[0].clientY;
      const delta = touchY - startY;

      // only downward
      if (delta <= 0) {
        reset();
        pulling = false;
        return;
      }

      // IMPORTANT:
      // stop native bounce scroll
      e.preventDefault();

      // resistance
      currentY = Math.min(delta * 0.4, maxPull);

      setY(currentY);

      if (indicatorEl) {
        indicatorEl.style.opacity = "1";
      }
    },
    { passive: false }
  );

  el.addEventListener("touchend", async () => {
    if (!pulling) return;

    pulling = false;

    // accidental pull protection
    if (currentY < threshold || refreshing) {
      reset();
      return;
    }

    refreshing = true;

    el.style.transition = "transform .2s ease";
    setY(60);

    if (indicatorEl) {
      // indicatorEl.textContent = "Refreshing...";
    }

    if (icon) {
      icon.classList.add("spinning");
    }

    try {
      await onRefresh?.();
    } catch (err) {
      console.error(err);
    }

    refreshing = false;

    reset();
  });

  el.addEventListener("touchcancel", () => {
    reset();
  });
}