let rowsSelectable = true;

// scripts/list.js
// =====================================================
// LIST VIEW
// - renders rows for current listId only
// - rows have count + content (content unused for now)
// =====================================================

const rowsContainer = document.getElementById("listRows"); // <-- wichtig
const currentListTitle = document.getElementById("currentListTitle");

function getRowByIdFromCurrentList(rowId) {
  const listId = AppRoute.currentListId;
  if (!listId) return null;
  return StorageAPI.getRowsByListId(listId).find(r => r.id === rowId) ?? null;
}

// =====================================================
// Pull to refresh
// =====================================================
enablePullToRefresh({
  container: "#listRows",
  indicator: ".pull-indicator.listRows",

  async onRefresh() {
    await new Promise(r => setTimeout(r, 400));
    
    renderCurrentView();
  }
});

// --------------------
// Searchbar
// --------------------

clearSearchbarBtn.addEventListener("click", () => {
  searchbar.focus();
  searchbar.value = "";
  refreshSearch();
});

searchbar.addEventListener("keyup", () => {
  refreshSearch();
});

function refreshSearch() {
  const [root, param, sub] = parseRoute();

  if (searchbar.value) {
    clearSearchbarBtn.style.display = "block"
    searchIcon.style.display = "none";
  } else {
    clearSearchbarBtn.style.display = "none"
    searchIcon.style.display = "block";
  };

  renderCurrentView();
}


function highlightMatch(text, query, maxLength = 50) {
  if (!query) return text;

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");

  let truncated = text;
  let isCut = false;

  if (text.length > maxLength) {
    truncated = text.slice(0, maxLength);
    isCut = true;
  }

  let result = truncated.replace(regex, '<mark class="search-highlight">$1</mark>');

  // 👉 Highlight ellipsis if cut AND match might continue
  if (isCut) {
    result += '<mark class="search-highlight">...</mark>';
  }

  return result;
}

function highlightSmart(text, query, contextLength = window.innerWidth < 400 ? window.innerWidth < 360 ? 10 : 15 : 20) {
  if (!query) return text;

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regexGlobal = new RegExp(escaped, "gi");
  const regexSingle = new RegExp(escaped, "i");

  const match = text.match(regexSingle);
  if (!match) return text;

  const matchIndex = match.index;
  const matchText = match[0];

  const start = Math.max(0, matchIndex - contextLength);
  const end = Math.min(text.length, matchIndex + matchText.length + contextLength);

  let preview = text.slice(start, end);

  // Highlight match داخل preview
  const highlightRegex = new RegExp(`(${escaped})`, "gi");
  preview = preview.replace(highlightRegex, '<mark class="search-highlight">$1</mark>');

  // LEFT dots (never highlighted)
  if (start > 0) {
    preview = '... ' + preview;
  }

  // RIGHT dots (conditionally highlighted)
  if (end < text.length) {
    const remainingText = text.slice(end);

    // check if there's another match later
    const hasMoreMatches = regexGlobal.test(remainingText);

    if (hasMoreMatches) {
      preview = preview + ' <mark class="search-highlight">...</mark>';
    } else {
      preview = preview + ' ...';
    }
  }

  return preview.trim();
}

function highlightSmartMultiple(text, query, contextLength = window.innerWidth < 400 ? 10 : 20, maxSnippets = 3) {
  if (!query) return text;

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "gi");

  const matches = [...text.matchAll(regex)];
  if (matches.length === 0) return text;

  const snippets = [];
  let lastEnd = -1;

  for (let i = 0; i < matches.length && snippets.length < maxSnippets; i++) {
    const match = matches[i];
    const matchIndex = match.index;
    const matchText = match[0];

    let start = Math.max(0, matchIndex - contextLength);
    let end = Math.min(text.length, matchIndex + matchText.length + contextLength);

    // جلوگیری از overlap (optional but nice)
    if (start <= lastEnd) continue;

    let snippet = text.slice(start, end);

    // Highlight matches داخل snippet
    const highlightRegex = new RegExp(`(${escaped})`, "gi");
    snippet = snippet.replace(highlightRegex, '<mark class="search-highlight">$1</mark>');

    if (start > 0) {
      snippet = '<mark class="search-highlight">...</mark> ' + snippet;
    }

    if (end < text.length) {
      snippet = snippet + ' <mark class="search-highlight">...</mark>';
    }

    snippets.push(snippet);
    lastEnd = end;
  }

  return snippets.join("<br>");
}

// --------------------
// renderList
// --------------------

window.renderList = function renderList(listId) {
  const list = StorageAPI.getListById(listId);
  if (!list && listId !== null) {
    AppRoute.toOverview();
    return;
  }

  currentListTitle.textContent = list?.name || "Deleted Entries";

  updateSortUI();
  syncListRowSortRadios(listId);
  updateFilterUI();

  const [root, param, sub] = parseRoute();

  let rows = StorageAPI.getRowsByListIdSorted(listId);

  if (root === "deleted" && param === "deleted-rows") {
    StorageAPI.tryToEmptyTrash();
    swipeEnabled = null;

    rows = StorageAPI.getRows();
    rows = rows
      .filter(row => row.location?.startsWith("deletedAt"))
      .sort((a, b) => a.location.localeCompare(b.location));

    selectedMenuItems = [
      {
        icon: icons.trashcan.deleteForever,
        text: "Delete forever",
        onClick: () => {
          StorageAPI.deleteSelectedItems("row", selectedRows);
        }
      },
      {
        icon: icons.trashcan.restore,
        text: "Restore",
        onClick: () => {
          StorageAPI.restoreSelectedItems("row", selectedRows);
        }
      },
    ];
  } else if (root === "deleted") {
    rows = [];
  } else {
    rowsSelectable = true;
    swipeEnabled = true;

    rows = rows.filter(row => row.location === "active" || !row.location);
    selectedMenuItems = [
      
    ];
  }

  selectedMenuItems.push(
    {
      icon: icons.general.close,
      text: "Close",
      onClick: () => {
        deselectAllRows();
      }
    }
  );

  // UI adjustments depending on mode
  openListSettingsBtn.hidden = root === "deleted" && param === "deleted-rows";
  createNewEntryMenu.hidden = root === "deleted" && param === "deleted-rows";

  rowsContainer.innerHTML = "";

  if (rows.length === 0) {
    let message = "This list does not have any entries.<br><br>Add an entry using the plus button below.";
    if (param === "deleted-rows") message = "No deleted entries.";
    if (selectedFilters.length > 0) message = "No entries matching the selected filters.";

    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `<div>${message}</div>`;;
    rowsContainer.appendChild(empty);
  }

  const query = searchbar.value.toLowerCase().trim();

  if (query) {
    rows = rows
      .map(row => {
        const titleMatch = row.name.toLowerCase().includes(query);
        const contentMatch = row.content.toLowerCase().includes(query);

        let priority = 0;

        if (titleMatch) priority += 10;
        if (contentMatch) priority += 5;

        const titleIndex = row.name.toLowerCase().indexOf(query);
        if (titleIndex !== -1) priority += (100 - titleIndex);

        return { row, priority };
      })
      .filter(item => item.priority > 0) // remove non-matches
      .sort((a, b) => b.priority - a.priority) // title matches first
  }

  // Favorites first
  if (mode !== "manual" && !query) {
    rows.sort((a, b) => {
      const aFav = a.status.favored ? 1 : 0;
      const bFav = b.status.favored ? 1 : 0;

      return bFav - aFav; 
    });
  }

  rows.forEach(row => {
    // render all rows
    if (query) rowsContainer.querySelectorAll(".drag-handle")[rows.indexOf(row)].style.display = "none";
  });

  if (!rowsContainer.innerHTML) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = `No entries matching "${searchbar.value}" were found.`;
    rowsContainer.appendChild(empty);
    return;
  }

  if (mode !== "manual") {
    if (rowsSortable) {
      rowsSortable.destroy();
      rowsSortable = null;
    }

    return;
  }

  if (window.Sortable && mode === "manual") {
    if (rowsSortable) rowsSortable.destroy();

    rowsSortable = Sortable.create(rowsContainer, {
      animation: 150,
      ghostClass: "drag-ghost",
      handle: isTouchDevice() ? ".drag-handle" : ".row",
      draggable: ".row",

      onEnd: saveRowOrder
    });
  }
};

let selectingRows = false;
let selectedRows = {};

let longPressForRowsTriggered = false;

const backToOverviewBtn = document.getElementById("backToOverviewBtn");

backToOverviewBtn.addEventListener("click", () => {
  const [root, param, sub] = parseRoute();
  if (!root || root === "lists") {
    AppRoute.toOverview();
  } else if (root === "archive") {
    AppRoute.toArchive();
  } else if (root === "deleted" || root === "deleted--lists") {
    AppRoute.toDeleted();
  }
});

function resetViewList() {
  currentListTitle.textContent = "";
  rowsContainer.innerHTML = "";

  selectingRows = false;
  selectedRows = {};

  longPressForRowsTriggered = false;

  window.swipeEnabled = true;

  deselectAllRows();
}

// ----------------------------
// Create New Entry
// ----------------------------
const createNewEntryMenuContainer = document.getElementById("createNewEntryMenuContainer");
const createNewEntryMenu = document.getElementById("createNewEntryMenu");
const createNewEntryBtn = document.getElementById("openNewEntryMenuBtn");
const newEntryNameInput = document.getElementById("newEntryNameInput");
const clearNewEntryInputBtn = document.getElementById("clearNewEntryInputBtn");

isCreateEntryMenuOpen = false;

createNewEntryBtn.addEventListener("click", handleCreateEntryButtonClick);

function handleCreateEntryButtonClick() {
  if (!isCreateEntryMenuOpen) {
    openCreateNewEntryMenu();
  } else {
    submitCreateNewEntry();
  }
}

// ---- Open ----
function openCreateNewEntryMenu() {
  isCreateEntryMenuOpen = true;

  createNewEntryMenuContainer.classList.add("active");
  createNewEntryMenu.classList.add("active");
  createNewEntryBtn.classList.add("close");
  newEntryNameInput.style.display = "block";
  newEntryNameInput.focus();
}

// ---- Submit ----
function submitCreateNewEntry() {
  const listId = AppRoute.currentListId;
  if (!listId) return;

  const name = newEntryNameInput.value.trim();

  if (!name) {
    closeCreateNewEntryMenu();
    return;
  }

  const newRow = StorageAPI.addRow(listId, name);
  const list = StorageAPI.getListById(listId);

  rowsContainer.appendChild(createRowElement(newRow, list, StorageAPI.getRowSortMode(listId)));
  newEntryNameInput.value = "";
  renderList(list.id);

  closeCreateNewEntryMenu();
  createAlert("info", "Entry added", `${name} was added to ${list.name}`)
}

// ---- Key handling ----
newEntryNameInput.addEventListener("keyup", (e) => {
  if (!isCreateEntryMenuOpen) return;

  if (!newEntryNameInput.value) {
    createNewEntryBtn.classList.add("close");
    createNewEntryBtn.classList.remove("add");

    clearNewEntryInputBtn.style.display = "none";
  } else {
    createNewEntryBtn.classList.remove("close");
    createNewEntryBtn.classList.add("add");

    clearNewEntryInputBtn.style.display = "block";
  }

  if (e.key === "Enter") {
    submitCreateNewEntry();
    return;
  }

  if (e.key === "Escape") {
    closeCreateNewEntryMenu();
    return;
  }
});

clearNewEntryInputBtn.addEventListener("click", () => {
  newEntryNameInput.focus();
  newEntryNameInput.value = "";

  createNewEntryBtn.classList.add("close");
  createNewEntryBtn.classList.remove("add");

  clearNewEntryInputBtn.style.display = "none";
});

// ---- Close ----
function closeCreateNewEntryMenu() {
  isCreateEntryMenuOpen = false;

  createNewEntryMenuContainer.classList.remove("active");
  createNewEntryMenu.classList.remove("active");
  createNewEntryBtn.classList.remove("close", "add");
  newEntryNameInput.style.display = "none";
  newEntryNameInput.value = "";
  clearNewEntryInputBtn.style.display = "none";
}

function deselectAllRows() {
  document.querySelectorAll(".row.selected").forEach(row => {
    row.classList.remove("selected");
  });

  selectedRows = {};
  selectingRows = false;
  window.swipeEnabled = true;

  removeSelectedMenu();
}

function moveSelectedRowsToDifferentList(selectedRows) {
  const listId = AppRoute.currentListId;
  const list = StorageAPI.getListById(listId);
  if (!list.id) return;

  const modalContent =`
    <select class="form-select">
      ${`<option value="" hidden selected>Choose a list</option>`}

      ${StorageAPI.getLists().sort((a, b) => a.name.localeCompare(b.name)).filter(l => l.id !== listId).map(l => `<option value="${l.id}">${l.name}</option>`).join("") || `<option disabled>No other lists available</option>`}
    </select>

    <label>
      <input type="checkbox" id="createACopy" style="margin-top: 15px;">
      <span style="margin-left: 8px; color: var(--color-text-muted); font-size: 14px;">Create a copy in the new list instead of moving</span>
    </label>
  `;

  createModal("Select a list", modalContent, getModalConfirmBtn("modalConfirmBtn", "move entries"));
  
  document.querySelector(".modal-card #closeModalBtn").addEventListener("click", () => deleteModal());

  document.getElementById("modalConfirmBtn").addEventListener("click", () => {
    const select = document.querySelector(".modal-card .form-select");
    const targetListId = select.value;
    if (!targetListId) return;

    const createCopy = document.getElementById("createACopy").checked;

    const confirmMovingRows = confirm(`Confirm ${createCopy ? "duplicating" : "moving"} entries.`);
    if (!confirmMovingRows) return;
      
    for (const [key, row] of Object.entries(selectedRows)) {
      if (createCopy) {
        StorageAPI.duplicateRow(row.id, null, targetListId);
      } else {
        StorageAPI.updateRow(row.id, { listId: targetListId });
      }
    };

    renderCurrentView();
    deleteModal();
    deselectAllRows();
    createAlert("info", "Entries Moved", `${Object.keys(selectedRows).length} entries were ${createCopy ? "duplicated" : "moved"} to ${StorageAPI.getListById(targetListId).name}`);
  });
}

function duplicateSelectedRows(selectedRows) {
  const listId = AppRoute.currentListId;
  const list = StorageAPI.getListById(listId);
  if (!list.id) return;

  const confirmDuplicate = confirm("Confirm duplicating entries.");
  if (!confirmDuplicate) return;

  for (const [key, row] of Object.entries(selectedRows)) {
    StorageAPI.duplicateRow(row.id, row.title + " (copy)");
  };

  renderList(list.id);
  createAlert("info", "Duplicated Entries", `${Object.keys(selectedRows).length} entries were duplicated to ${list.name}`);
  deselectAllRows();
}

function moveSelectedRowsToDeleted(selectedRows) {
  const listId = AppRoute.currentListId;
  const list = StorageAPI.getListById(listId);
  if (!list.id) return;

  const confirmDelete = confirm("Are you sure you want to delete the selected entries?");
  if (!confirmDelete) return;

  for (const [key, row] of Object.entries(selectedRows)) {
    StorageAPI.moveToDeleted("row", row.id);
  };
  
  deselectAllRows();
  renderList(list.id);

  createAlert("danger", "Deleted Entries", `${Object.keys(selectedRows).length} entries were deleted from ${list.name}`);
}

async function shareSelectedRows(selectedRows) {
  const text = Object.values(selectedRows).map(row => {

    let contentText = "";

    if (row.content) {
      const formattedContent = row.content
        .split("\n")
        .map(line => {
          const trimmed = line.trim();
          return trimmed ? `> _${escapeWhatsApp(trimmed)}_` : "\n";
        })
        .filter(Boolean)
        .join("\n");

      contentText = `${formattedContent}`;
    }

    const title = escapeWhatsApp(row.title);

    return `• *${title}${row.count ? ` (${row.count})` : ""}${row.content ? ":" : ""}*\n${contentText}`;
  }).join("\n");

  if (navigator.share) {
    try {
      await navigator.share({ text });
    } catch (e) {
      console.log("Abgebrochen");
    }
  } else {
    const waText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${waText}`, "_blank");
  }


  function escapeWhatsApp(text) {
    return text
      .replace(/\*/g, "\\*")
      .replace(/_/g, "\\_")
      .replace(/~/g, "\\~");
  }
}

function exportSelectedRows(selectedRows) {
  const data = {
    rows: []
  };

  for (const [key, row] of Object.entries(selectedRows)) {
    row.listId = null;
    data.rows.push(row);
  }

  const btns = getModalConfirmBtn("confirmExportBtn", "Download JSON");

  createModal(
    "Export Selected Entries",
    "<p style='color: var(--color-text-muted);'>Name the file:</p><br>" +

    "<div id='modalDivContainer' style='display: flex;'>" +
      getEditNameInput("editExportFileName", "Name the file") +
      "<div style='color: var(--color-text-muted);'>.json</div>" +
    "</div>"+ 

    "<br>" +
    "<p style='color: var(--color-text-muted); font-size: 14px'>This file can be imported through the settings on any device.</p>",
    btns
  );

  const fileNameInput = document.getElementById("editExportFileName");

  fileNameInput.value = "stacked-entries";
  fileNameInput.focus;
  fileNameInput.select();

  document.getElementById("confirmExportBtn").onclick = () => {
    if (!fileNameInput.value) return;

    deleteModal();
    deselectAllRows();
    const fileName = `${fileNameInput.value}.json`;
    StorageAPI.exportData(data, fileName);
  };
}

function updateListOptions() {
  const listId = AppRoute.currentListId;
  if (!listId) return;

  const list = StorageAPI.getListById(listId);
  if (!list) return;
  
  // Counter
  const enableCounterCheckbox =
    document.getElementById("listSettingsEnableCounterCheckbox");

  list.options = list.options || {};
  list.options.enableCounter = enableCounterCheckbox.checked;

  StorageAPI.updateList(listId, list);

  // Numbering
  const enableNumberingCheckbox =
    document.getElementById("listSettingsEnableNumberingCheckbox");

  list.options = list.options || {};
  list.options.enableNumbering = enableNumberingCheckbox.checked;

  StorageAPI.updateList(listId, list);
}



window.renderListSettings = function(listId) {
  const list = StorageAPI.getListById(listId);

  listTitleEl.textContent = list.name;

  renderListSettingsContent(list);
  renderListStats(list);
};

function renderListSettingsContent(list) {
  // Counter
  const listSettingsEnableCounterCheckbox = document.getElementById("listSettingsEnableCounterCheckbox");
  listSettingsEnableCounterCheckbox.checked = list.options?.enableCounter ?? false;

  // Numbering
  const listSettingsEnableNumberingCheckbox = document.getElementById("listSettingsEnableNumberingCheckbox");
  listSettingsEnableNumberingCheckbox.checked = list.options?.enableNumbering ?? false;
};

function renderListStats(list) {
  if (!list) return;

  const listStatsName = document.getElementById("listStatsName");
  const listStatsEntryCount = document.getElementById("listStatsEntryCount");
  const listStatsCounterSum = document.getElementById("listStatsCounterSum");

  const stats = calculateListStats(list);

  if (listStatsName) {
    listStatsName.textContent = stats.name;
  }

  if (listStatsEntryCount) {
    listStatsEntryCount.textContent = stats.entryCount;
  }

  if (listStatsCounterSum) {
    listStatsCounterSum.textContent = stats.counterSum;
  }
}

function calculateListStats(list) {
  if (!list) {
    return { name: "—", entryCount: 0, counterSum: 0 };
  }

  // 🔥 ALLE rows holen (global!)
  const allRows = JSON.parse(localStorage.getItem("stacked_rows") || "[]");

  // 🔥 nur rows dieser Liste
  const rows = allRows.filter(r => r.listId === list.id);

  let sum = 0;
  for (const r of rows) {
    sum += Number(r?.count) || 0;
  }

  return {
    name: list.name ?? "—",
    entryCount: rows.length,
    counterSum: sum
  };
};

const openListSettingsStatsBtn = document.querySelector('.open-list-settings-stats-btn');
const listStatsTooltip = document.querySelector('.list-stats');

openListSettingsStatsBtn.addEventListener('click', (e) => {
  e.stopPropagation(); // verhindert sofortiges Schließen
  openListSettingsStatsBtn.classList.toggle('active');
});

document.addEventListener('click', () => {
  openListSettingsStatsBtn.classList.remove('active');
});

// optional: Klick im Tooltip soll ihn NICHT schließen
listStatsTooltip.addEventListener('click', (e) => {
  e.stopPropagation();
});