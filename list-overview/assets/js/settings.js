const settingsData = {
  CURRENT_VERSION: "1.6.1",
  CURRENT_DATA_VERSION: 4,
};

// Root Page
const container = document.querySelector(".container");

const settingsModalContainer = document.getElementById("settingsModalContainer");
const settingsModal = document.querySelector(".settings-modal");


// =====================================================
// THEME CORE
// =====================================================

function getTheme() {
  return StorageAPI.getSettings().theme || ["system", "default"];
}

function setTheme(theme) {
  StorageAPI.updateSettings({
    theme
  });

  applyTheme(theme);
  syncHeaderToggle(theme);
}

function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(theme) {
  let convertedTheme = "";

  if (theme[0] === "system") {theme[0] = systemPrefersDark ? "dark" : "light";}
  convertedTheme = `${theme[0]}-${theme[1]}`;
  
  document.documentElement.setAttribute("data-theme", convertedTheme);

  // theme color options apply theme
  document.querySelectorAll('input[name="themeColorSelect"]').forEach(radio => {
    const label = radio.parentNode;
    const themeMode = convertedTheme.split("-")[0];
    label.setAttribute("data-theme", `${themeMode}-${radio.value}`);
  });
}

// 🔥 FIX: Header Toggle korrekt bei system
function syncHeaderToggle(theme) {
  const headerToggle = document.getElementById("themeToggle");

  if (theme[0] === "dark") headerToggle.checked = true;
  else if (theme[0] === "light") headerToggle.checked = false;
  else headerToggle.checked = systemPrefersDark();
}

// =====================================================
// OPEN / CLOSE
// =====================================================
document.querySelectorAll(".settings-done-btn").forEach((btn) => {
  btn.addEventListener("click", closeSettings);
});

function openSettings() {
  settingsModalContainer.classList.remove("hidden");
  settingsModal.classList.remove("hidden");

  requestAnimationFrame(() => {
    settingsModal.classList.add("open");
  });

  container.style.transform = "scale(0.94)";
  showPage("settingsPageRoot");
  syncThemeRadios();
  renderStats();
  renderInfo();
}

function closeSettings() {
  settingsModal.classList.remove("open");
  container.style.transform = "scale(1)";

  setTimeout(() => {
    settingsModalContainer.classList.add("hidden");
    settingsModal.classList.add("hidden");
    settingsModal.style.transform = "";
  }, 280);
}

// backdrop click
settingsModalContainer?.addEventListener("click", (e) => {
  if (e.target === settingsModalContainer) closeSettings();
});

// =====================================================
// PAGE NAV
// =====================================================

function showPage(pageId) {
  document.querySelectorAll(".settings-page").forEach(p => {
    p.classList.add("hidden");
  });

  const el = document.getElementById(pageId);

  if (!el) {
    console.error("Page not found:", pageId);
    return;
  }

  el.classList.remove("hidden");
}

document.querySelectorAll(".settings-nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    showPage(btn.dataset.page);
  });
});

document.querySelectorAll(".settings-back-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    showPage(btn.dataset.page);
  });
});


document.getElementById("openSettingsBtn").addEventListener("click", openSettings);

// Info Page

const openUpdateNews = settingsPageInfo.querySelector("#openUpdateNewsBtn");
openUpdateNews.addEventListener("click", () => {
  AppRoute.toUpdateNews(settingsData.CURRENT_VERSION);
  closeSettings();
});

const receiveUpdateNewsCheckbox = document.getElementById("receiveUpdateNewsCheckbox");
receiveUpdateNewsCheckbox.addEventListener("change", (e) => {
  StorageAPI.updateSettings({
    receiveUpdateNews: e.target.checked
  });
});


// Stats Page

// Manage Data Page

// =====================================================
// THEME RADIO SYNC
// =====================================================

function syncThemeRadios() {
  const theme = getTheme();
  document.querySelectorAll('input[name="themeSelect"]').forEach(r => {
    r.checked = r.value === theme[0];
  });
  document.querySelectorAll('input[name="themeColorSelect"]').forEach(r => {
    r.checked = r.value === theme[1];
  });
}

function updateTheme() {
  const theme = [
    document.querySelector('input[name="themeSelect"]:checked').value,
    document.querySelector('input[name="themeColorSelect"]:checked').value
  ];

  setTheme(theme);
}

document.querySelectorAll('input[name="themeSelect"]').forEach(radio => {
  radio.addEventListener("change", updateTheme);
});

document.querySelectorAll('input[name="themeColorSelect"]').forEach(radio => {
  radio.addEventListener("change", updateTheme);
});


// =====================================================
// HEADER TOGGLE → SETTINGS SYNC
// =====================================================

document.getElementById("themeToggle")?.addEventListener("change", (e) => {
  setTheme(`${e.target.checked ? "dark" : "light"}-${getTheme()[1]}`);
});

// =====================================================
// 🔥 NEXT LEVEL DRAG PHYSICS
// =====================================================

let startY = 0;
let currentY = 0;
let velocity = 0;
let lastY = 0;
let lastTime = 0;
let dragging = false;

const dragHandles = [
  document.getElementById("settingsDragHandle"),
  ...document.querySelectorAll(".settings-header-container h1")
].filter(Boolean);

dragHandles.forEach(handle => {
  handle.addEventListener("pointerdown", (e) => {
    dragging = true;
    startY = e.clientY;
    lastY = e.clientY;
    lastTime = performance.now();

    settingsModal.style.transition = "none";
    handle.setPointerCapture(e.pointerId);
  });

  handle.addEventListener("pointermove", (e) => {
    if (!dragging) return;

    const now = performance.now();
    const dy = e.clientY - lastY;
    const dt = now - lastTime;

    velocity = dy / dt;

    lastY = e.clientY;
    lastTime = now;

    currentY = Math.max(0, e.clientY - startY);
    settingsModal.style.transform = `translateY(${currentY}px)`;
  });

  handle.addEventListener("pointerup", () => {
    if (!dragging) return;
    dragging = false;

    settingsModal.style.transition = "transform 0.28s cubic-bezier(.2,.8,.2,1)";

    const shouldClose = currentY > 140 || velocity > 0.9;

    if (shouldClose) {
      settingsModal.style.transform = "translateY(100%)";
      setTimeout(closeSettings, 220);
    } else {
      settingsModal.style.transform = "translateY(0)";
    }
  });
});

// =====================================================
// 📊 SETTINGS Renderer
// =====================================================

function renderInfo() {
  const settings = StorageAPI.getSettings();
  const currentVersion = settingsPageInfo.querySelector(".current-version span");

  currentVersion.innerHTML = settingsData.CURRENT_VERSION;

  const receiveUpdateNewsCheckbox = document.getElementById("receiveUpdateNewsCheckbox");
  receiveUpdateNewsCheckbox.checked = settings.receiveUpdateNews;
}

function renderStats() {
  const data = StorageAPI.getData();

  const lists = data.lists || [];
  const deletedListIds = new Set(
    lists.filter(l => l.location?.startsWith("deletedAt")).map(l => l.id)
  );
  const rows = data.rows || [];

  // ----------------------------
  // BASIC
  // ----------------------------
  const totalLists = lists.filter(l => !l.location?.startsWith("deletedAt"));
  const totalRows = rows.filter(r =>
    !r.location?.startsWith("deletedAt") &&
    !deletedListIds.has(r.listId)
  );

  // ----------------------------
  // Ø rows per list
  // ----------------------------
  const avgRows =
    totalLists > 0 ? (totalRows / totalLists).toFixed(1) : 0;

  // ----------------------------
  // größte Liste
  // ----------------------------
  let largestListSize = 0;
  let largestListName = "-";

  const rowsByList = {};

  totalRows.forEach(r => {
    rowsByList[r.listId] = (rowsByList[r.listId] || 0) + 1;
  });

  totalLists.forEach(list => {
    const count = rowsByList[list.id] || 0;
    if (count > largestListSize) {
      largestListSize = count;
      largestListName = list.name || "Unbenannt";
    }
  });

  // ----------------------------
  // leere Listen
  // ----------------------------
  const emptyLists = totalLists.filter(
    l => !(rowsByList[l.id] > 0)
  ).length;

  // ----------------------------
  // counter sum
  // ----------------------------
  const counterSum = totalRows.reduce(
    (sum, r) => sum + (r.count || 0),
    0
  );

  // ----------------------------
  // highest counter
  // ----------------------------
  let mostClicked = "-";
  let maxCount = -1;

  totalRows.forEach(r => {
    const c = r.count || 0;
    if (c > maxCount) {
      maxCount = c;
      mostClicked = r.title || r.name || "-";
    }
  });

  // =================================================
  // 🔥 DOM UPDATE
  // =================================================

  setText("totalListsStat", totalLists.length);
  setText("totalRowsStat", totalRows.length);
  setText("avgRowsStat", avgRows);
  setText(
    "largestListStat",
    largestListSize > 0
      ? `${largestListName} (${largestListSize})`
      : "-"
  );
  setText("emptyListsStat", emptyLists);
  setText("counterSumStat", counterSum);
  setText("mostClickedStat", maxCount > 0 ? mostClicked + ` (${maxCount})` : "-");
}

// kleine helper
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
// =====================================================
// INIT
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
  checkForUpdates();

  const theme = getTheme();
  applyTheme(theme);
  syncHeaderToggle(theme);

  // 🔥 live system change todo dosn't work because it has not the right params
  window.matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      const theme = getTheme();
      applyTheme(theme);
      syncHeaderToggle(theme);
    });
});

// =====================================================
// EXPORT
// =====================================================

document.getElementById("exportDataBtn")?.addEventListener("click", () => {
  const data = StorageAPI.getData();
  StorageAPI.exportData(data);
});

// =====================================================
// IMPORT BUTTON → FILE PICKER
// =====================================================

document.getElementById("importDataBtn")?.addEventListener("click", () => {
  document.getElementById("importFileInput")?.click();
});

// =====================================================
// IMPORT
// =====================================================

document.getElementById("importFileInput")?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // Backup der aktuellen Daten
  const currentData = StorageAPI.getData();
  localStorage.setItem("stacked-auto-backup", JSON.stringify(currentData));

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const importedData = JSON.parse(reader.result);

      const mergedData = mergeData(currentData, importedData);

      StorageAPI.importData(mergedData);
    } catch (err) {
      console.error(err);
      alert("Import failed");
    }
  };
  reader.readAsText(file);
});

// =====================================================
// MERGE FUNCTION
// =====================================================

function mergeData(current, incoming) {
  // =========================
  // ITEMS MERGE
  // =========================
  const mergedLists = mergeItems([...(current.lists || [])], [...(incoming.lists || [])]);
  const mergedRows = mergeItems([...(current.rows || [])], [...(incoming.rows || [])]);
  const mergedCategories = mergeItems([...(current.categories || [])], [...(incoming.categories || [])]);

  const mergedOrder = {
    ...current.order,
    ...incoming.order
  };

  return {
    ...current,
    lists: mergedLists,
    rows: mergedRows,
    categories: mergedCategories,
    order: mergedOrder,
    settings: incoming.settings || current.settings,
  };
}

// Hilfsfunktion für Zeilen/Items in einer Liste
function mergeItems(currentItems = [], incomingItems = []) {
  const merged = [...currentItems];

  incomingItems.forEach(inItem => {
    const exists = merged.find(r => r.id === inItem.id);
    if (exists) {
      Object.assign(exists, inItem);
    } else {
      merged.push(inItem);
    }
  });

  return merged;
}


// =====================================================
// CREATE BACKUP
// =====================================================

document.getElementById("createBackupBtn")?.addEventListener("click", () => {
  const data = StorageAPI.exportData();
  localStorage.setItem("stacked-backup", JSON.stringify(data));
  alert("Backup erstellt");
});

// =====================================================
// RESTORE BACKUP
// =====================================================

document.getElementById("restoreBackupBtn")?.addEventListener("click", () => {
  const raw = localStorage.getItem("stacked-backup");
  if (!raw) {
    alert("Kein Backup vorhanden");
    return;
  }

  // ⚠️ WARNUNG
  const confirmed = confirm(
    "⚠️ Restore Backup?\n\n" +
    "All current data will be overwritten and restored to the state of the last backup.\n\n" +
    "This action cannot be undone."
  );

  if (!confirmed) return;

  try {
    const data = JSON.parse(raw);
    StorageAPI.importData(data);
    location.reload();
  } catch {
    alert("Backup beschädigt");
  }
});

// ----------------------------------
// Delete All Data BTN
// ----------------------------------
const deleteMyDataBtn = document.getElementById("deleteAllDataBtn");

deleteMyDataBtn.addEventListener("click", () => {
  const confirmed = confirm(
    "⚠️ Delete Data?\n\n" +
    "Be sure to export your data before\n\n" +
    "This action cannot be undone"
  );
  if (!confirmed) return;
  clearLocalStorage();

  // const settings = StorageAPI.getSettings();
  // settings.version = settingsData.CURRENT_VERSION;
  // StorageAPI.updateSettings(settings);

  closeSettings();
  renderCurrentView();
});

function clearLocalStorage() {
  window.localStorage.clear()
  AppRoute.toOverview();
  applyTheme(getTheme());
}


// ----------------------------------
// Update News
// ----------------------------------
const settingsrn = StorageAPI.getSettings();
console.log(
  "Current data version:",
  settingsrn.dataVersion
);

console.log(
  "Target data version:",
  settingsData.CURRENT_DATA_VERSION
);

// ===============================================================================
// Use this function to plant old date into the storage for debugging migration
// ===============================================================================
function seedOldData() {
  localStorage.clear();

  localStorage.setItem("", "");

  const settings = {};
  const lists = [];

  const rows = [];

  localStorage.setItem(
    KEYS.SETTINGS,
    JSON.stringify(settings)
  );

  localStorage.setItem(
    KEYS.ROWS,
    JSON.stringify(rows)
  );

  localStorage.setItem(
    KEYS.LISTS,
    JSON.stringify(lists)
  );
  
  location.reload();
}

function checkForUpdates() {
  StorageAPI.tryToEmptyTrash();
  const settings = StorageAPI.getSettings();

  if (settings.version === undefined) {
    // Disabling the onboaring guide for now
    // startGuide();

    settings.version = settingsData.CURRENT_VERSION;
    settings.dataVersion = settingsData.CURRENT_DATA_VERSION;

    StorageAPI.updateSettings(settings);
    return;
  }

  runDataMigrations();

  if (settings.version !== settingsData.CURRENT_VERSION) {
    console.log("runningnngnn")
    settings.version = settingsData.CURRENT_VERSION;
    if (!settings.receiveUpdateNews) return;

    // const modalTitle = `🚀 New Version: ${settings.version} 🔥`;
    // const modalContent = `<u onclick="
    //   AppRoute.toUpdateNews('${settings.version}');
    //   deleteModal();
    // ">Click here to see the changes.</u>`;
    
    // createModal(modalTitle, modalContent, null);
    // document.getElementById("closeModalBtn").style.display = "none";
  }

  StorageAPI.updateSettings(settings);
}

function runDataMigrations() {
  const settings = StorageAPI.getSettings();

  let dataVersion = settings.dataVersion ?? 0;

  while (dataVersion < settingsData.CURRENT_DATA_VERSION) {
    const nextVersion = dataVersion + 1;

    const migration = migrations[nextVersion];

    if (!migration) {
      throw new Error(
        `Missing migration for data version ${nextVersion}`
      );
    }

    migration();

    dataVersion = nextVersion;
    settings.dataVersion = dataVersion;
    StorageAPI.updateSettings(settings);
  }
}

const migrations = {
  1: () => {
    console.log("Running data migration v1");

    // Theme conversion
    const settings = StorageAPI.getSettings();

    const oldTheme = localStorage.getItem("theme");
    if (oldTheme) {
      localStorage.removeItem("theme");
    }

    if (!Array.isArray(settings.theme)) {
      settings.theme = ["system", "default"];
      applyTheme(settings.theme);
    }

    StorageAPI.updateSettings(settings);
  },



  2: () => {
    console.log("Running data migration v2");

    const settings = StorageAPI.getSettings();

    if (settings.receiveUpdateNews === undefined) {
      settings.receiveUpdateNews = true;
    }

    StorageAPI.updateSettings(settings);
  },



  3: () => {
    console.log("Running data migration v3");

    // Rows
    read(KEYS.ROWS, []).forEach(row => {
      if (
        row.options !== undefined ||
        !row.status ||
        !row.name
      ) {
        const convertedRow = {
          ...row,
          name: row.title || row.name,
          status: {
            ...(row.status || {}),
            favored: row.options?.favored || false,
          },
        };

        delete convertedRow.options;
        delete convertedRow.title;

        StorageAPI.updateRow(row.id, convertedRow, true);
      }
    });

    // Lists
    read(KEYS.LISTS, []).forEach(list => {
      let changed = false;

      if (
        !list.status ||
        list.status?.favored === undefined ||
        !list.name
      ) {
        list = {
          ...list,
          name: list.title || list.name,
          status: {
            favored: list.options?.favored || false,
            ...(list.status || {}),
          }
        };

        changed = true;
      }

      if (list.options?.favored !== undefined) {
        delete list.options?.favored;
        changed = true;
      }

      if (list.status?.archived === true) {
        delete list.status.archived;
        list.location = "archived";
        changed = true;
      }

      if (changed) {
        StorageAPI.updateList(list.id, list, true);
      }
    });
  },

  // Update 1.6.0 (Adding Categories and remaking the render function to be more dynamic)
  4: () => {
    console.log("Running data migration v4");

    // ==================
    // Rows
    // ==================
    read(KEYS.ROWS, []).forEach(row => {
      if (
        row.parentId === undefined ||
        row.type === undefined
      ) {
        const convertedRow = {
          ...row,
          parentId: row.location?.startsWith("deleted") ? "deleted" : row.listId,
          type: row.type || "row",
        };

        if (row.location?.startsWith("deletedAt")) {
          row.purgeAt = row.location?.split("-")[1] + (15 * 24 * 60 * 60 * 1000);
        }

        delete row.location;
        if (!row.purgeAt) delete row.purgeAt;

        StorageAPI.updateRow(row.id, convertedRow, true);
      }
    });

    // ==================
    // Lists
    // ==================
    read(KEYS.LISTS, []).forEach(list => {
      let changed = false;

      if (
        list.type === undefined ||
        list.parentId === undefined
      ) {
        list = {
          ...list,
          type: list.type || "list",
          parentId: 
            list.location?.startsWith("deleted") ?
              "deleted" :
              list.location === "active" || list.location === undefined ?
                "root" :
                list.location === "archived" && "archive",
        };

        if (list.location?.startsWith("deletedAt")) {
          list.purgeAt = list.location?.split("-")[1] + (15 * 24 * 60 * 60 * 1000);
        }

        delete list.location;
        if (!list.purgeAt) delete list.purgeAt;

        changed = true;
      }

      if (changed) {
        StorageAPI.updateList(list.id, list, true);
      }
    });


    // ==================
    // Row orders keys
    // ==================
    const localStorageItems = { ...localStorage };

    for (const [key, value] of Object.entries(localStorageItems)) {

      if (key.startsWith("stacked_rowOrder_")) {
        const id = key.split("_")[2];

        StorageAPI.setViewOrder(id, value);
        localStorage.removeItem(`stacked_rowOrder_${id}`);
      }
    }


    // ==================
    // List order
    // ==================
    const listOrder = localStorage.getItem("stacked_listOrder");

    StorageAPI.setViewOrder("root", listOrder);
  },
};





// function convertOldSettings() {
//   const settings = StorageAPI.getSettings();

//   // Theme
//   const oldTheme1 = localStorage.getItem("theme");
//   if (oldTheme1) {
//     localStorage.removeItem("theme");
//   };
//   if (!Array.isArray(settings.theme)) {
//     settings.theme = ["system", "default"];
//     applyTheme(settings.theme);
//   };

//   // Update News
//   if (settings.receiveUpdateNews === undefined) {
//     settings.receiveUpdateNews = true;
//   };

//   StorageAPI.updateSettings(settings);

//   // Rows
//   // Some rows before 1.3.1 have row.options.favored instead of row.status.favored and options needs to be deleted
//   read(KEYS.ROWS, []).map(row => normalizeRow(row));
//   function normalizeRow(row) {
//     if (
//       row.options !== undefined ||
//       !row.status ||
//       !row.name ||
//       row.type === undefined ||
//       row.parentId === undefined
//     ) {
//       const convertedRow = {
//         ...row,
//         parentId: row.parentId || row.listId,
//         name: row.title || row.name,
//         status: {
//           ...(row.status || {}),
//           favored: row.options?.favored || false,
//         },
//         type: row.type || "row"
//       };
//       delete convertedRow.options;
//       delete convertedRow.title;
//       StorageAPI.updateRow(row.id, convertedRow, true);
//     }
//   }

//   // Lists before 1.3.1 may have list.options.favored instead of list.status.favored
//   read(KEYS.LISTS, []).map(list => normalizelist(list));
//   function normalizelist(list) {
//     if (list.status === undefined ||
//       list.status.favored === undefined ||
//       list.type === undefined ||
//       list.parentId === undefined
//     ) {
//       const convertedList = {
//         ...list,
//         status: {
//           favored: list.options?.favored || false,
//           ...(list.status || {})
//         },
//         type: list.type || "list",
//         parentId: "lists"
//       };
//       StorageAPI.updateList(list.id, convertedList, true);
//     }

//     if (list.options.favored !== undefined) {
//       delete list.options.favored;
//       StorageAPI.updateList(list.id, list);
//     }

//     if (list.status.archived === true) {
//       delete list.status.archived;
//       list.location = "archived";
//       StorageAPI.updateList(list.id, list);
//     }
//   }


// }

function renderUpdateNews(version) {
  let tries = 0;

  const el = document.getElementById(`version-${version}`);

  function tryScroll() {
    const y = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top: y, behavior: "smooth" });

    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      el.classList.add("highlight-version");
    } else if (tries < 10) {
      tries++;
      requestAnimationFrame(tryScroll);
    }
  }

  tryScroll();
}

// ---------- Onboarding
function startGuide(stepsParam = null) {
  const guideState = {
    createdListIds: [],
    lastProgress: 0,
  };

  let typingTimeouts = [];

  const steps = stepsParam || [
    {
      element: null,
      text: `
        <div>
          <h2>Welcome 👋</h2>
        </div>
        <p>This short guide will show you how to use the app.</p>
        <p><strong>Navigation:</strong></p>
        <p>➡️ <b>Tap</b>, <b>Click</b> or press right arrow key<br><b>to go forward</b></p>
        <p hidden>⬅️ Click on the <b>left side</b> to go back</p>
      `, // Previous is hidden, because it dosn't work yet. Next step btn takes up the entire screen for that reason. Make sure to change it in css if you enable the previous btn.
      onEnter: (after) => {
        AppRoute.toOverview();
      },
    },
    {
      element: ".create-menu",
      text: "Use this button to create new lists.",
    },
    {
      element: "#listsContainer",
      text: "You will find your lists here.",
      onEnter: (after) => {
        if (!after) {
          cleanupGuideData();
          AppRoute.toOverview();

          const l1 = StorageAPI.createList({ name: "List 1" });
          const l2 = StorageAPI.createList({ name: "List 2" });
          const l3 = StorageAPI.createList({ name: "List 3" });

          StorageAPI.addRow({ id: l2.id, name: "Entry 1" });
          StorageAPI.addRow({ id: l2.id, name: "Entry 2" });
          StorageAPI.addRow({ id: l2.id, name: "Entry 3" });
          StorageAPI.addRow({ id: l2.id, name: "Entry 4" });
          StorageAPI.addRow({ id: l2.id, name: "Entry 5" });

          guideState.createdListIds.push(l1.id, l2.id, l3.id);

          renderCurrentView();
        };
      }
    },
    {
      element: [".row", 1],
      text: "Click on one to open or edit it.",
      onEnter: (after) => {
        if (after) return;
        setTimeout(() => {
          const r = document.querySelector("#listsContainer")
            .querySelectorAll(".row")[1];

            r.classList.add("active");
        }, 0);
      }
    },
    {
      element: [".row .open-btn-container", 1],
      text: null,
      onEnter: (after) => {
        if (after) return;
        setTimeout(() => {
          const r = document.querySelector("#listsContainer")
            .querySelectorAll("#listsContainer .row")[1];

            r.classList.add("active");
        }, 0);
      }
    },
    {
      element: "#createNewEntryMenu",
      text: "Once a list is opened you can add new entries to your list with this button.",
      onEnter: (after) => {
        if (after) return;
        AppRoute.toList(StorageAPI.getListById(guideState.createdListIds[1]));
      }
    },
    {
      element: "#listRows .row",
      text: "Click a list or an entry to find the edit option.",
      onEnter: (after) => {
        if (after) return;
        setTimeout(() => {
          const r = document.querySelector("#listRows .row")

            r.classList.add("active");
        }, 0);
      }
    },
    {
      element: ".modal-card",
      text: "Edit entries and lists.",
      onEnter: (after) => {
        if (after) return;
        document.getElementById("listRows").querySelector(".edit-icon-container").click();
      },
      onExit: () => {
        deleteModal();
      }
    },
    {
      element: ".edit-content-input",
      text: "Add a note to your entries.",
      onEnter: (after) => {
        if (after) return;
        document.getElementById("listRows").querySelector(".edit-icon-container").click();
      },
      onExit: () => {
        document.getElementById("editRowContentInput").value = "This is a note.";
        document.getElementById("saveChangesBtn").click();
      }
    },
    {
      element: "#searchbar",
      text: "Use the search bar to quickly find lists or entries.",
    },
    {
      element: "#listRows",
      text: "Search results.",
      onEnter: (after) => {
        if (after) return;

        const letters = ["E", "n", "t", "r", "y"];
        const searchbar = document.getElementById("searchbar");
        const delay = 400;

        typingTimeouts = []; // reset

        letters.forEach((letter, index) => {
          const timeoutId = setTimeout(() => {
            searchbar.value += letter;
            renderCurrentView();
          }, typingTimeouts.length === 0 ? 0 : delay * (index));

          typingTimeouts.push(timeoutId);
        });
      },

      onExit: () => {
        const searchbar = document.getElementById("searchbar");

        // cancel all scheduled typing
        typingTimeouts.forEach(id => clearTimeout(id));
        typingTimeouts = [];

        // clear input
        searchbar.value = "";
      }
    },
    {
      element: [".row", 1],
      text: "Long press a list or entry to select it.",
      onEnter: (after) => {
        AppRoute.toOverview();
        if (!after) return;

        const row = document.querySelectorAll(".row")[1];

        row.simulateLongPress();
      }
    },
    {
      element: "#listsSelectedMenu",
      text: "Perform various actions on selected items. You can also archive lists here.",
      onExit: () => {
        deselectAllLists();
      }
    },
    {
      element: ".view-actions-bar .item.archive",
      text: "Archived lists can be found here.",
    },
    {
      element: "#sortListsBtn",
      text: "Sort your lists or entries by different criteria such as name or date.",
    },
    {
      element: "#openSettingsBtn",
      text: "Adjust preferences, manage your data and personalize your experience in the settings.",
    },
    {
      element: null,
      text: `
        <h2>You're all set 🎉</h2>
        <p>You now know the basics of the app.</p>
        <p>Start creating your own lists!</p>
      `,
      onExit: () => {
        const settings = StorageAPI.getSettings();
        settings.version = settingsData.CURRENT_VERSION;
        StorageAPI.updateSettings(settings);
        AppRoute.toOverview();
      }
    }
  ];

  let stepIndex = 0;

  function showStep() {
    window.guideActive = true;
    const step = steps[stepIndex];

    if (step.onEnter) step.onEnter(false);

    let el = null;

    function resolveElement() {
      el = step.element
        ? Array.isArray(step.element)
          ? document.querySelectorAll(step.element[0])[step.element[1]]
          : document.querySelector(step.element)
        : null;

      return el;
    }

    const overlay = document.createElement("div");
    overlay.className = "guide-overlay";

    const guideActionsContainer = document.createElement("div");
    guideActionsContainer.innerHTML = `
      <div class="guide-progress">
        <div class="guide-progress-bar"></div>
      </div>

      <div id="prevStep"></div>
      <div id="nextStep"></div>

      <u hidden id="goToSettings">Install App</u>
    `;

    document.body.appendChild(overlay);

    document.body.appendChild(guideActionsContainer);

    const progress = ((stepIndex) / (steps.length - 1)) * 100;

    const bar = guideActionsContainer.querySelector(".guide-progress-bar");

    if (bar) {
      bar.style.width = guideState.lastProgress + "%"; // start bei altem Wert

      requestAnimationFrame(() => {
        bar.style.width = progress + "%"; // dann animieren
      });
    }

    guideState.lastProgress = progress;

    setTimeout(() => {
      el = resolveElement();

      if (el) {
        el.classList.add("highlight");

        el.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });

        safeSpotlightUpdate(overlay, el);
      }
    }, 0)

    if (step.text) {
      let box = null;
      setTimeout(() => {
        box = document.createElement("div");
        overlay.appendChild(box);
        box.className = "guide-box";
        box.innerHTML = `
          <p>${step.text}</p>
        `;

        const arrow = document.createElement("div");
        arrow.className = "guide-arrow";
        box.appendChild(arrow);
        positionGuideBox(box, el, arrow);
      }, 50);
    }

    function positionGuideBox(box, el, arrow) {
      const spacing = 24; // kleinerer Abstand für Buttons

      // Reset
      box.classList.remove("fade-from-top", "fade-from-bottom", "fullscreen");
      box.style.top = "";
      box.style.bottom = "";
      box.style.left = "12px";
      box.style.right = "12px";
      box.style.transform = "";

      if (!el) {
        box.style.top = "0";
        box.style.bottom = "0";
        box.style.left = "0";
        box.style.right = "0";
        box.style.borderRadius = "0";
        box.style.display = "flex";
        box.style.flexDirection = "column";
        box.style.justifyContent = "center";
        box.classList.add("fullscreen", "fade-from-bottom");
        return;
      }

      const rect = el.getBoundingClientRect();
      const boxHeight = box.offsetHeight;
      const boxWidth = box.offsetWidth;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // Platz oben und unten
      const spaceAbove = rect.top;
      const spaceBelow = viewportHeight - rect.bottom;

      let top;

      if (spaceBelow >= boxHeight + spacing || spaceBelow >= spaceAbove) {
        // Platz unterhalb, Box nach unten
        top = rect.bottom + spacing;
        box.classList.add("fade-from-bottom");
        box.dataset.position = "bottom";
      } else {
        // Box nach oben
        top = rect.top - boxHeight - spacing;
        box.classList.add("fade-from-top");
        box.dataset.position = "top";
      }

      // Verhindere, dass Box über den Viewport hinausgeht
      top = Math.max(spacing, Math.min(top, viewportHeight - boxHeight - spacing));
      box.style.top = top + "px";

      // Horizontal: zentriere über Element, aber innerhalb Viewport
      let left = rect.left + rect.width / 2 - boxWidth / 2;
      left = Math.max(spacing, Math.min(left, viewportWidth - boxWidth - spacing));
      box.style.left = left + "px";

      // Arrow horizontal
      const arrowX = rect.left + rect.width / 2 - left;
      arrow.style.left = arrowX + "px";

      if (box.dataset.position === "top") {
        arrow.classList.add("arrow-down");
        arrow.classList.remove("arrow-up");
      } else {
        arrow.classList.add("arrow-up");
        arrow.classList.remove("arrow-down");
      }
    }
    

    const updatePosition = () => positionGuideBox(box, el, arrow);

    window.addEventListener("scroll", updatePosition);
    window.addEventListener("resize", updatePosition);



    if (el) {
      el.classList.add("highlight");

      el.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
    };

    if (step.onEnter) step.onEnter(true);

    // 🔥 initial
    if (el) {
      safeSpotlightUpdate(overlay, el);
    }

    // 🔥 LIVE UPDATES
    let cleanupObserver = () => {};
    let onScroll = () => {};

    if (el) {
      cleanupObserver = observeElement(el, () => {
        safeSpotlightUpdate(overlay, el);
      });

      onScroll = () => {
        safeSpotlightUpdate(overlay, el);
      };
      window.addEventListener("scroll", onScroll);
    };

    if (!stepIndex) {
      document.getElementById("goToSettings").onclick = () => {
        cleanupGuideData();

        guideActionsContainer.remove();
        overlay.remove();
        cleanupObserver();
        window.removeEventListener("scroll", onScroll);
        if (el) el.classList.remove("highlight");
      };
    };
    

    document.getElementById("prevStep").onclick = () => {
      if (stepIndex > 0) stepIndex--;
      
      guideActionsContainer.remove();
      overlay.remove();
      cleanupObserver();
      window.removeEventListener("scroll", onScroll);
      if (el) el.classList.remove("highlight");

      showStep();
    };

    document.getElementById("nextStep").onclick = () => {
      guideActionsContainer.remove();
      overlay.remove();
      cleanupObserver();
      window.removeEventListener("scroll", onScroll);
      if (el) el.classList.remove("highlight");
      if (step.onExit) step.onExit();

      stepIndex++;
      if (stepIndex < steps.length) {
        showStep();
      } else {
        cleanupGuideData();
        window.guideActive = false;
        return;
      }
    };
  }

  function observeElement(el, callback) {
    const resizeObserver = new ResizeObserver(callback);
    resizeObserver.observe(el);

    const mutationObserver = new MutationObserver(callback);
    mutationObserver.observe(el, { attributes: true, childList: true, subtree: true });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }

  function safeSpotlightUpdate(overlay, el) {
    requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      if (rect.width && rect.height) {
        updateSpotlight(overlay, el);
      }
    });
  }

  function updateSpotlight(overlay, el) {
    const rect = el.getBoundingClientRect();
    const padding = 8;

    let hole = overlay.querySelector(".spotlight-hole");

    if (!hole) {
      hole = document.createElement("div");
      hole.className = "spotlight-hole";
      overlay.appendChild(hole);
    }

    hole.style.top = rect.top - padding + "px";
    hole.style.left = rect.left - padding + "px";
    hole.style.width = rect.width + padding * 2 + "px";
    hole.style.height = rect.height + padding * 2 + "px";
  }

  function cleanupGuideData() {
    guideState.createdListIds.forEach(id => {
      StorageAPI.deleteList(id);
      document.querySelector(".alert-card").click();
    });

    guideState.createdListIds = [];

    renderCurrentView(); // UI updaten
  }

  showStep();
}

document.addEventListener("keydown", (e) => {
  // nur wenn kein Input-Feld aktiv
  if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;

  if (e.key === "ArrowLeft") {
    e.preventDefault();
    document.getElementById("prevStep").click();    
  } else if (e.key === "ArrowRight") {
    e.preventDefault();
    document.getElementById("nextStep").click();
  }
});