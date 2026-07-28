const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  && typeof navigator.standalone !== "undefined";

function isTouchDevice() {
  return ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
}

window.swipeEnabled = true;
let listsSelectable = true;
let itemsSortable = null;

// scripts/overview.js
// =====================================================
// OVERVIEW VIEW
// - configureNewListBtn opens modal
// - create list saves + routes to list
// - delete list removes list + its rows
// =====================================================


// =====================================================
// sort UI change, updates etc...
// =====================================================
const sortListsBtn = document.getElementById("sortListsBtn");
const listSortSelect = sortListsBtn.querySelector(".list-sort-select");
const rowSortSelect = document.querySelector(".row-sort-select");

function updateSortUIAndGetSortMode() {
  const listId = AppRoute.currentView.id;
  syncSortRadios(listId);
  
  if (listId) {
    listSortSelect.hidden = true;
    rowSortSelect.hidden = false;
    return StorageAPI.getRowSortMode(listId);
  } else {
    listSortSelect.hidden = false;
    rowSortSelect.hidden = true;
    return StorageAPI.getListSortMode();
  }
}

function syncSortRadios(listId = null) {
  const mode = StorageAPI.getListSortMode();
  listSortSelect.value = mode || "manual";

  if (listId) {
    const mode = StorageAPI.getRowSortMode(listId);
    rowSortSelect.value = mode || "manual";
  }
}

rowSortSelect.addEventListener("change", (event) => {
  console.log("change detected:", event.target.value)
  StorageAPI.setRowSortMode(AppRoute.currentView.id, event.target.value);
  renderCurrentView();
});

listSortSelect.addEventListener("change", (event) => {
  StorageAPI.setListSortMode(event.target.value);
  renderCurrentView();
});




enablePullToRefresh({
  container: "#entityContainer",
  indicator: ".pull-indicator.listOverview",

  async onRefresh() {
    await new Promise(r => setTimeout(r, 400));
    
    renderCurrentView();
  }
});


// Elements / global variables
const entityContainer = document.getElementById("entityContainer");

let editingListId = null;

function openEditModal(item) {
  modalTitle = "Edit Item";
  
  if (item.type === "list" || item.type === "category") {
    modalContent = getEditNameInput("editListTitleInput", "Rename this item");
  } else if (item.type === "row") {
    modalContent = getEditNameInput("editListTitleInput", "Rename this item") + getEditRowContentInput("editNoteInput", "Add a note...");
  }
  modalBtns = getModalConfirmBtn("saveChangesToListBtn", "Save Changes");

  createModal(modalTitle, modalContent, modalBtns);

  const editListTitleInput = document.getElementById("editListTitleInput");
  const editNoteInput = document.getElementById("editNoteInput");
  if (editNoteInput) editNoteInput.innerHTML = item.content;

  const closeModalBtn = document.getElementById("closeModalBtn");
  const saveChangesToListBtn = document.getElementById("saveChangesToListBtn");

  editListTitleInput.value = item.name;

  editListTitleInput.focus();
  editListTitleInput.select();

  closeModalBtn?.addEventListener("click", deleteModal);

  saveChangesToListBtn?.addEventListener("click", () => {
    const newName = editListTitleInput.value.trim();
    if (!newName) return;
    const newNote = editNoteInput?.value;

    const patch = { name: newName };
    if (patch && newNote) patch.content = newNote;

    StorageAPI.updateItem(item.id, patch);

    deleteModal();
    renderCurrentView();
  });

  editListTitleInput?.addEventListener("keydown", (e) => {
    if (e.key === "Escape") deleteModal();
    if (e.key === "Enter") saveChangesToListBtn.click();
  });
}

// =====================================================
// Actions bar
// =====================================================
const actionBar = document.querySelector(".view-actions-bar");

actionBar.querySelectorAll(".item").forEach((btn) => {
  btn.addEventListener("click", () => {
    btn.classList.add("animate");
    setTimeout(() => {
      btn.classList.remove("animate");
    }, 700);
  })
});

actionBar.querySelector(".item.archive").onclick = () => {
  AppRoute.toArchive();
};

actionBar.querySelector(".item.deleted").onclick = () => {
  AppRoute.toDeleted();
};

actionBar.querySelector(".item.swap").onclick = () => {
  entityContainer.querySelectorAll(".draggable").forEach(el => el.classList.toggle("drag-mode"));
};

const filterItem = actionBar.querySelector(".item.filter");

filterItem.querySelectorAll("select").forEach(el => {
  el.addEventListener("change", () => {
    updateFilterUI();
    renderCurrentView();
  });
});

filterItem.querySelectorAll("select").forEach(el => el.addEventListener("change", () => {
  updateFilterUI();
  renderCurrentView();
}));

function updateFilterUI() {
  const listSelect = filter.querySelector(".list-filter-select");
  const rowSelect = filter.querySelector(".row-filter-select");

  const isListView = !AppRoute.currentListId;

  // toggle visibility
  listSelect.hidden = !isListView;
  rowSelect.hidden = isListView;

  // check active state (depending on view)
  const activeSelect = isListView ? listSelect : rowSelect;

  if (activeSelect.selectedOptions.length > 0) {
    filter.classList.add("active");
  } else {
    filter.classList.remove("active");
  }
}

if (!isSafari) {
  actionBar.querySelector(".item.filter").hidden = true;
}

// =====================================================
// View Header
// =====================================================
function enableViewHeader({ backBtnFunc = null, title, titleIcon, headerBtn }) {
  const overviewTop = document.getElementById("overview-top");
  const backBtn = overviewTop.querySelector(".back-btn");
  const titleEl = overviewTop.querySelector(".overview-title h2");
  const headerBtnEl = overviewTop.querySelector(".header-btn");

  overviewTop.style.display = "block";

  titleEl.innerHTML = "";
  headerBtnEl.innerHTML = "";

  backBtn.onclick = () => {
    if (backBtnFunc) {
      backBtnFunc();
    } else {
      AppRoute.toOverview();
    }
  };

  if (typeof title === "function") {
    titleEl.innerHTML = title() || "";  
  } else {
    titleEl.innerHTML = title || "";
  }

  titleEl.innerHTML += titleIcon || "";

  if (headerBtn?.icon && headerBtn?.func) {
    headerBtnEl.innerHTML = headerBtn.icon;
    
    headerBtnEl.onclick = () => {
      headerBtn.func();
    };
  }
}
function disableViewHeader() {
  const overviewTop = document.getElementById("overview-top");
  overviewTop.style.display = "none";
}

// Create menu for adding new items (lists, rows, categories)
function enableViewCreateMenu({ entityTypes }) {
  if (!entityTypes || entityTypes.length === 0) return;
  createNewListMenuContainer.hidden = false;

  // Clear existing options
  createMenuOptionsSelect.innerHTML = "";

  createMenuOptionsIcon.innerHTML = entityTypes[0]?.addIcon;
  newListNameInput.placeholder = entityTypes[0]?.addPlaceholder || "Add Item";
  // Add options based on entity types
  entityTypes.forEach(type => {
    const option = document.createElement("option");
    option.value = type.tag;
    option.innerHTML = `${type.addText}`;
    createMenuOptionsSelect.appendChild(option);
  });
}

function disableViewCreateMenu() {
  createNewListMenuContainer.hidden = true;
}

const createNewListMenuContainer = document.getElementById("createNewListMenuContainer");
const createNewListMenu = document.getElementById("createNewListMenu");

const createMenuOptionsContainer = document.querySelector(".create-menu-options-container");
const createMenuOptionsIcon = document.querySelector(".create-menu-options-icon");
const createMenuOptionsSelect = document.getElementById("createMenuOptionsSelect");

const createNewListBtn = document.getElementById("openNewListMenuBtn");
const newListNameInput = document.getElementById("newListNameInput");
const clearNewListInputBtn = document.getElementById("clearNewListInputBtn");

let isCreateMenuOpen = false;

createMenuOptionsSelect.addEventListener("change", (event) => {
  createMenuOptionsIcon.innerHTML = ENTITY_TYPES[event.target.value]?.addIcon || "";
  newListNameInput.placeholder = ENTITY_TYPES[event.target.value]?.addPlaceholder || "Add Item";
});

// createMenuOptionsSelect.addEventListener('change', () => {
//   const handler = () => {
//     createMenuOptionsSelect.removeEventListener('blur', handler);
//     newListNameInput.focus();
//   };

//   createMenuOptionsSelect.addEventListener('blur', handler);
// });

// Button nur EINMAL registrieren
createNewListBtn?.addEventListener("click", handleCreateButtonClick);

function handleCreateButtonClick() {
  if (!isCreateMenuOpen) {
    openCreateNewListMenu();
  } else {
    submitCreateNewList();
  }
}

// openCreateNewListMenu();

// ---- Open ----
function openCreateNewListMenu() {
  isCreateMenuOpen = true;

  createNewListMenuContainer.classList.add("active");
  createNewListMenu.classList.add("active");
  createNewListBtn.classList.add("close");
  newListNameInput.style.display = "block";
  newListNameInput.focus();

  createMenuOptionsContainer.style.pointerEvents = "all";
  createMenuOptionsContainer.style.opacity = "1";
  createMenuOptionsContainer.style.visibility = "visible";
}

// ---- Submit ----
function submitCreateNewList() {
  const name = newListNameInput.value.trim();

  if (!name) {
    closeCreateNewListMenu();
    return;
  }

  const itemProperties = { name };
  if (createMenuOptionsSelect.value === "category")
    itemProperties.categoryKind = AppRoute.currentView.view === "singleList" ? "entries" : "lists";
  
  const newItem = ENTITY_TYPES[createMenuOptionsSelect.value]?.createItem(itemProperties);
  closeCreateNewListMenu();
  createAlert("success", "Created " + ENTITY_TYPES[createMenuOptionsSelect.value]?.name, name)

  renderCurrentView();
}

// ---- Key handling ----
newListNameInput?.addEventListener("keyup", (e) => {
  if (!isCreateMenuOpen) return;

  if (!newListNameInput.value) {
    createNewListBtn.classList.add("close");
    createNewListBtn.classList.remove("add");

    clearNewListInputBtn.style.display = "none";
  } else {
    createNewListBtn.classList.remove("close");
    createNewListBtn.classList.add("add");

    clearNewListInputBtn.style.display = "block";
  }

  if (e.key === "Enter") {
    submitCreateNewList();
    return;
  }

  if (e.key === "Escape") {
    closeCreateNewListMenu();
    return;
  }
});

clearNewListInputBtn.addEventListener("click", () => {
  newListNameInput.focus();
  newListNameInput.value = "";

  createNewListBtn.classList.add("close");
  createNewListBtn.classList.remove("add");

  clearNewListInputBtn.style.display = "none";
});

// ---- Close ----
function closeCreateNewListMenu() {
  isCreateMenuOpen = false;

  createNewListMenuContainer.classList.remove("active");
  createNewListMenu.classList.remove("active");
  createNewListBtn.classList.remove("close", "add");
  newListNameInput.style.display = "none";
  newListNameInput.value = "";
  clearNewListInputBtn.style.display = "none";

  createMenuOptionsContainer.style.pointerEvents = "none";
  createMenuOptionsContainer.style.opacity = "0";
  createMenuOptionsContainer.style.visibility = "hidden";
}






// =====================================================
// Render lists
// =====================================================

const SELECTED_ACTIONS = {
  share: {
    icon: icons.general.share,
    text: "Share",
    onClick: () => shareSelectedIds(SelectionManager.ids),
  },

  export: {
    icon: icons.general.export,
    text: "Export",
    onClick: () => exportSelectedIds(SelectionManager.ids),
  },

  delete: {
    icon: icons.trashcan.delete,
    text: "Delete",
    onClick: () => {

      SelectionManager.ids.forEach(id => {
        StorageAPI.moveItemtoTrash(id);
      });

      SelectionManager.clear();
      renderCurrentView();

    }
  },

  archive: {
    icon: icons.archive.archive,
    text: "Archive",
    onClick: () => {

      SelectionManager.ids.forEach(id => {
        const item = StorageAPI.getItemById(id);
        item.parentId = "archive";
        StorageAPI.updateItem(item.id, item);
      })

      SelectionManager.clear();
      renderCurrentView();

    }
    // archiveSelectedLists(selectedItems),
  },

  unarchive: {
    icon: icons.archive.unarchive,
    text: "Unarchive",
    onClick: () => {

      SelectionManager.ids.forEach(id => {
        const item = StorageAPI.getItemById(id);
        item.parentId = "root";
        StorageAPI.updateItem(item.id, item);
      })

      SelectionManager.clear();
      renderCurrentView();

    }
    // archiveSelectedLists(selectedItems),
  },

  moveToOtherList: {
    icon: icons.general.fileMove,
    text: "Move to other list",
    onClick: () => {
      moveSelectedItemsToDifferentList(SelectionManager.ids);
    }
  },

  duplicate: {
    icon: icons.general.duplicate,
    text: "Duplicate",
    onClick: () => {
      const confirmDelete = confirm("Confirm duplicating Items.");
      if (!confirmDelete) return;

      SelectionManager.ids.forEach(id => {
        StorageAPI.duplicateItem(id);
      });

      renderCurrentView();
      createAlert("info", "Duplicated Items", `${SelectionManager.ids.size} Items were duplicated and all their entries`)
      SelectionManager.clear();
    },
  },

  restore: {
    icon: icons.trashcan.restore,
    text: "Restore",
    onClick: () => {

      SelectionManager.ids.forEach(id => {
        const item = StorageAPI.getItemById(id);
        item.parentId = "root";
        StorageAPI.updateItem(item.id, item);
      })

      SelectionManager.clear();
      renderCurrentView();

    }
  },

  deleteForever: {
    icon: icons.trashcan.deleteForever,
    text: "Delete forever",
    onClick: () => {
      const confirmed = confirm("Please Confirm deleting the selected items permantly.");
      if (!confirmed) return false;

      SelectionManager.ids.forEach(id => {
        StorageAPI.deleteItem(id);
      })

      SelectionManager.clear();
      renderCurrentView();

    }
  },

  close: {
    icon: icons.general.close,
    text: "Close",
    onClick: () => {

      SelectionManager.clear();
      renderCurrentView();

    }
  }
};

function moveSelectedItemsToDifferentList(ids) {
  const listId = AppRoute.currentView.id;
  const list = StorageAPI.getListById(listId);
  if (!listId) return;

  const modalContent =`
    <select class="form-select">
      ${`<option value="" hidden selected>Choose a list</option>`}

      ${StorageAPI.getLists().sort((a, b) => a.name.localeCompare(b.name)).filter(l => l.id !== "parentId").map(l => `<option value="${l.id}">${l.name}</option>`).join("") || `<option disabled>No other lists available</option>`}
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
      
    ids.forEach(id => {
      if (createCopy) {
        StorageAPI.duplicateItem(id, { parentId: targetListId });
      } else {
        StorageAPI.updateItem(id, { parentId: targetListId });
      }
    });

    renderCurrentView();
    deleteModal();
    SelectionManager.clear();
    createAlert("info", "Entries Moved", `${ids.length} entries were ${createCopy ? "duplicated" : "moved"} to ${StorageAPI.getListById(targetListId).name}`);
  });
}

const ENTITY_TYPES = {
  list: {
    tag: "list",
    name: "List",
    createItem: (props) => StorageAPI.createList(props),
    createElement: createListRowElem,
    updateItem: StorageAPI.updateList,
    getItemById: StorageAPI.getListById,

    addIcon: icons.general.addList,
    addText: "Add List",
    addPlaceholder: "ToDo, Shopping, etc.",
  },

  row: {
    tag: "row",
    name: "Entry",
    createItem: (props) => StorageAPI.addRow(props),
    createElement: createRowElem,
    updateItem: StorageAPI.updateRow,
    getItemById: StorageAPI.getRowById,

    addIcon: icons.general.addCircle,
    addText: "Add Entry",
    addPlaceholder: "Add Entry",
  },

  category: {
    tag: "category",
    name: "Category",
    createItem: (props) => StorageAPI.createCategory(props),
    createElement: createCategoryElem,
    updateItem: StorageAPI.updateCategory,
    getItemById: StorageAPI.getCategoryById,
    canHaveDirectChildren: true,

    addIcon: icons.general.addLabel,
    addText: "Add Category",
    addPlaceholder: "Add Category",
  },
};

const CATEGORY_KINDS = {
  lists: {
    allowedParentTypes: ["root"],
    allowedChildTypes: ["list"],
  },

  entries: {
    allowedParentTypes: ["list"],
    allowedChildTypes: ["row"],
  },
};

const VIEWS = {
  root: {
    parent: {
     view: "root",
     id: null,
    },
    
    getData: StorageAPI.getActiveLists,
    swipeEnabled: true,
    emptyMessage: "You currently don't have any lists here.<br><br>Create a list using the plus button below.",
    selectedActions: {
      more: [
        SELECTED_ACTIONS.share,
        SELECTED_ACTIONS.export,
      ],
      default: [
        SELECTED_ACTIONS.delete,
        SELECTED_ACTIONS.archive,
        SELECTED_ACTIONS.duplicate,
        SELECTED_ACTIONS.close,
      ]
    },

    // UI Elements
    enableViewCreateMenu() {
      enableViewCreateMenu({ entityTypes:[ENTITY_TYPES.list, ENTITY_TYPES.category] });
    },
  },

  archive: {
    parent: {
     view: "archive",
     id: null,
    },
    
    getData: StorageAPI.getArchivedLists,
    swipeEnabled: true,
    emptyMessage: "No archived items.<br><br>Archive items using the archive button in the actions bar.",
    selectedActions: {
      more: [
        SELECTED_ACTIONS.share,
        SELECTED_ACTIONS.export,
      ],
      default: [
        SELECTED_ACTIONS.delete,
        SELECTED_ACTIONS.unarchive,
        SELECTED_ACTIONS.duplicate,
        SELECTED_ACTIONS.close,
      ]
    },

    // UI Elements
    enableViewHeader() {
      enableViewHeader({ title: "Archive", titleIcon: icons.archive.archive });
    },
  },
  deleted: {
    parent: {
     view: "deleted",
     id: null,
    },
    
    getData: () => { return [] },
    swipeEnabled: false,
    emptyMessage: "Your trash is empty.",
    groups: [
      {
        name: "Deleted Lists",
        filter: (item) => item.type === "list",
        button: {
          icon: icons.trashcan.deleteForever,
          onClick(items) {
            console.log("running")
            const confirmed = confirm("Delete these Lists permanently?");
            if (!confirmed) return false;
            items.forEach(item => StorageAPI.deleteItem(item.id));
            renderCurrentView();
          }
        }
      },
      {
        name: "Deleted Entries",
        filter: (item) => item.type === "row",
        button: {
          icon: icons.trashcan.deleteForever,
          onClick(items) {
            const confirmed = confirm("Delete these Entries permanently?");
            if (!confirmed) return false;
            items.forEach(item => StorageAPI.deleteItem(item.id));
            renderCurrentView();
          }
        }
      },
      {
        name: "Deleted Categories",
        filter: (item) => item.type === "category",
        button: {
          icon: icons.trashcan.deleteForever,
          onClick(items) {
            const confirmed = confirm("Delete these Categories permanently?");
            if (!confirmed) return false;
            items.forEach(item => StorageAPI.deleteItem(item.id));
            renderCurrentView();
          }
        }
      },
    ],
    customSorts(items) {
      return items.sort((a, b) => a.purgeAt - b.purgeAt);
    },
    selectedActions: {
      default: [
        SELECTED_ACTIONS.deleteForever,
        // SELECTED_ACTIONS.restore,
        SELECTED_ACTIONS.close,
      ]
    },

    // UI Elements
    enableViewHeader() {
      enableViewHeader({ title: "Trashcan", titleIcon: icons.trashcan.delete });
    },
  },



  singleList: {
    parent: {
     view: "singleList",
     id: null,
    },

    getData: StorageAPI.getRowsByListIdSorted,
    swipeEnabled: true,
    emptyMessage: "This list is empty.<br><br>Add items using the plus button below.",
    selectedMenuContainer: document.getElementById("view-list"),
    selectedActions: {
      more: [
        SELECTED_ACTIONS.export,
      ],
      default: [
        SELECTED_ACTIONS.delete,
        SELECTED_ACTIONS.moveToOtherList,
        SELECTED_ACTIONS.duplicate,
        SELECTED_ACTIONS.close,
      ]
    },

    // UI Elements
    enableViewHeader() {
      enableViewHeader({
        backBtnFunc: () => { location.hash = `#/${parseRoute()[0]}`; },
        title: () => {
          return StorageAPI.getListById(AppRoute.currentView.id)?.name;
        },
        headerBtn: {
          icon: icons.general.tune,
          func: () => {
            AppRoute.toListSettings(StorageAPI.getListById(AppRoute.currentView.id));
          },
        }
      });
    },

    enableViewCreateMenu() {
      enableViewCreateMenu({ entityTypes:[ENTITY_TYPES.row, ENTITY_TYPES.category] });
    },
  },
};

StorageAPI.tryToEmptyTrash();

function renderListsPage() {
  const config = VIEWS[parseRoute()[0]];

  StorageAPI.tryToEmptyTrash();

  renderCollection({
    container: entityContainer,
    items: StorageAPI.getItemsByParentId(config.parent.id || config.parent.view),
    config,
  });
}

function renderArchivePage() {
  const config = VIEWS[parseRoute()[0]];

  renderCollection({
    container: entityContainer,
    items: StorageAPI.getItemsByParentId(config.parent.view),
    config,
  });
}

function renderListPage(listId) {
  const config = {
    ...VIEWS.singleList,
    parent: {
      ...VIEWS.singleList.parent,
      id: listId
    }
  };
  
  renderCollection({
    container: entityContainer,
    items: StorageAPI.getItemsByParentId(config.parent.id),
    config,
  });
}

function renderCollection({
  container,
  items,
  config,
  parentId,
  emptyMessage=true,
  createNewSortable
}) {
  if (itemsSortable) {
    itemsSortable.forEach(s => s.destroy());
    itemsSortable = null;
  }
  container.innerHTML = "";
  swipeEnabled = config.swipeEnabled;

  const currentView =
    parentId ??
    config.parent.id ??
    config.parent.view;


  const sortMode = updateSortUIAndGetSortMode(); // Have Sort Button work

  const sortedItems = sortItems(
    items,
    sortMode,
    StorageAPI.getViewOrderByView(currentView),
    config.customSorts || null
  );

  const searchResult = searchItems(sortedItems, document.querySelector("#searchbar").value);
  const searchData = searchResult[1]
  items = searchResult[0]

  if (items.length === 0 && emptyMessage) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `<div>${config.emptyMessage}</div>`;;
    container.appendChild(empty);
  }

  disableViewCreateMenu();
  config.enableViewCreateMenu ? config.enableViewCreateMenu() : null;
  disableViewHeader();
  config.enableViewHeader ? config.enableViewHeader() : null;

  if (config.groups) {
    
    config.groups.forEach(group => {
      const groupItems = items.filter(group.filter);

      if (groupItems.length === 0) return;

      const details = document.createElement("details");
      details.className = "group";
      details.open = false;

      const summary = document.createElement("summary");
      summary.className = "group-header";
      summary.innerHTML = `
        <span class="group-title">${group.name}</span>
        <span class="group-count">${groupItems.length}</span>
        ${ group.button && `<span class="group-btn">${group.button.icon}</span>` }
      `;

      if (group.button) {
        summary.querySelector(".group-btn").addEventListener("click", () => {
          group.button.onClick(groupItems);
        });
      }

      const content = document.createElement("div");
      content.className = "group-content";
      const contentInner = document.createElement("div");
      contentInner.className = "group-content-inner";
      content.appendChild(contentInner);

      groupItems.forEach(item => {
        contentInner.appendChild(renderItem(item, config, container));
      });

      details.append(summary, content);
      container.appendChild(details);
    });



  } else {
    items.forEach(item => {
      const el = renderItem(item, config, container, searchData[item.id]);
      container.appendChild(el);
    });
  }

  if (createNewSortable !== false) {
    const categoryContainers = container.querySelectorAll(".category-item-container");
    const nestedSortables = [
      container,
      ...categoryContainers
    ];

    // Loop hrough each nested sortable element
    itemsSortable = nestedSortables.map(el =>
      new Sortable(el, {
        fallbackOnBody: true,
        animation: 150,
        ghostClass: "drag-ghost",
        handle: isTouchDevice() ? ".drag-handle" : ".row",
        draggable: ".draggable",
        group: "nested",

        onMove(evt) {
          document
            .querySelectorAll(".drag-hover")
            .forEach(el => el.classList.remove("drag-hover"));

          if (evt.related.classList.contains("category-item-container")) {
            evt.related.classList.add("drag-hover");
          }
        },

        onEnd(evt) {
          document
            .querySelectorAll(".drag-hover")
            .forEach(el => el.classList.remove("drag-hover"));


          const movedItemData = StorageAPI.getItemById(evt.item.dataset.id);
          const targetContainer = evt.to;

          // Update the parentId of the moved item based on the target container
          movedItemData.parentId = targetContainer.dataset.id || config.parent.id || config.parent.view;
          StorageAPI.updateItem(movedItemData.id, movedItemData);


          // Update order of items

          function saveContainerOrder(container) {
            const parentId =
              container.dataset.id ||
              config.parent.id ||
              config.parent.view;

            const ids = [...container.children]
              .filter(el => el.dataset.id)
              .map(el => el.dataset.id);

            StorageAPI.setViewOrder(parentId, ids);
          };

          saveContainerOrder(evt.to);

          if (evt.from !== evt.to) {
            saveContainerOrder(evt.from);
          }
        }
      })
    );
  }

  if (
    // StorageAPI.getSortMode(currentView) !== "manual" ||
    false || document.querySelector("#searchbar").value
  ) {
    itemsSortable?.forEach(sortable => sortable.destroy());
    itemsSortable = null;
    container.querySelectorAll(".row .drag-handle").forEach(el => el.classList.add("disabled"));
  }
}
function renderItem(item, config, container, searchData={}) {
  const el = ENTITY_TYPES[item.type].createElement(
    item,
    searchData,
    config
  );

  el.dataset.type = item.type;

  return el;
}

// Create entity elements
function createListRowElem(item, { query, titleMatch, entrySnippet, rowCount }, config) {
  const list = item;
  const row = document.createElement("div");
  row.classList.add("row", "draggable");
  row.dataset.id = list.id;

  row.innerHTML = `
    <div class="deleted-label" style="">
      ${StorageAPI.getTimeLeft(item.purgeAt)}
    </div>

    <div class="title-container">
      <div class="drag-handle" ${query && "style='display: none;'"}>⋮⋮</div>
      <div class="delete-icon-container">
        <svg class="delete-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm80-160h80v-360h-80v360Zm160 0h80v-360h-80v360Z"/></svg>
      </div>
      <div class="edit-icon-container">
        <svg class="edit-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M120-120v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm584-528 56-56-56-56-56 56 56 56Z"/></svg>
      </div>
      <div class="title-wrapper">
        <p class="title">
          ${query && titleMatch 
            ? highlightSmart(list.name, query) 
            : list.name}
        </p>
        <p class="subtitle" ${rowCount ? "" : "style='display: none;'"}>
          ${
            query
              ? titleMatch
                ? rowCount
                : entrySnippet || rowCount
              : rowCount
          }
        </p>
      </div>
    </div>

    <svg class="favorite-icon${list.status?.favored ? " active" : ""}"
    xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Z"/></svg>

    <svg class="restore-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M440-320h80v-166l64 62 56-56-160-160-160 160 56 56 64-62v166ZM280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Z"/></svg>

    <div class="open-btn-container">
      <button class="open-btn" type="button">
        <svg class="open-icon" xmlns="http://www.w3.org/2000/svg" height="42px" viewBox="0 -960 960 960" width="42px" fill="#e3e3e3"><path d="M560-240 320-480l240-240 56 56-184 184 184 184-56 56Z"/></svg>
      </button>
    </div>
  `;

  if (list.parentId === "deleted" && list.purgeAt) {
    row.classList.add("deleted");
  }

  if (SelectionManager.isSelected(item.id)) {
    row.classList.add("selected");
  }

  attachListEvents(row, list, config);
  enableSelection(row, item, config, container);

  return row;
}

function createRowElem(item, { query, titleMatch, contentMatch, rowCount }, config) {
  const row = document.createElement("div");
  row.classList.add("row", "draggable");

  const [root, param, sub] = parseRoute();

  const rowData = item;
  const list = StorageAPI.getListById(rowData.listId);

  let count = rowData.count;

  row.innerHTML = `

    <div class="deleted-label" style="">
      ${StorageAPI.getTimeLeft(item.purgeAt)}
    </div>
    
    <div class="title-container">
      <div class="drag-handle" ${query && "style='display: none;'"}>⋮⋮</div>
      <div class="delete-icon-container">
        <svg class="delete-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm80-160h80v-360h-80v360Zm160 0h80v-360h-80v360Z"/></svg>
      </div>
      <div class="edit-icon-container">
        <svg class="edit-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M120-120v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm584-528 56-56-56-56-56 56 56 56Z"/></svg>
      </div>
      <p class="row-position" ${list?.options.enableNumbering ? "style='display: none;'" : "style='display: none;'"}>${"position"}.</p>
      <div class="title-wrapper">
        <p class="title">${highlightSmart(rowData.name, searchbar.value)}</p>
        <p class="subtitle" ${!rowData.content && "style='display: none;'"}>${contentMatch ? highlightSmart(rowData.content, searchbar.value).trim() : rowData.content}</p>
      </div>
    </div>

    <div class="counter-btn-container">
      <div class="counter">${count}</div>
      <button class="counter-plus-btn" type="button">
        <svg class="plus-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg>
      </button>
      <button class="counter-minus-btn">
        <svg class="minus-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M200-440v-80h560v80H200Z"/></svg>
      </button>
    </div>

    <svg class="checked-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3">${rowData.status?.checked ? `<path d="m424-312 282-282-56-56-226 226-114-114-56 56 170 170ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Z"/>` : `<path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Z"/>`}</svg>

    <svg class="favorite-icon${rowData.status?.favored ? " active" : ""}"
    xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Z"/></svg>

    <svg class="restore-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M440-320h80v-166l64 62 56-56-160-160-160 160 56 56 64-62v166ZM280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Z"/></svg>
  `;

  row.dataset.id = rowData.id;

  if (rowData.parentId === "deleted" && rowData.purgeAt) {
    row.classList.add("deleted");
  }

  if (rowData.status?.checked) row.classList.add("checked");
  
  if (SelectionManager.isSelected(rowData.id)) {
    row.classList.add("selected");
  }

  attachRowEvents(row, rowData, config);
  enableSelection(row, item, config, container);

  return row;
}

function createCategoryElem(item, { query, }, config) {
  const row = document.createElement("div");
  row.classList.add("category", "draggable");

  const [root, param, sub] = parseRoute();

  const category = item;
  const list = StorageAPI.getListById(category.listId);

  let count = category.count;

  row.innerHTML = `
    <div class="header">

      <div class="deleted-label" style="">
        ${StorageAPI.getTimeLeft(item.purgeAt)}
      </div>

      <div class="drag-handle" ${query && "style='display: none;'"}>⋮⋮</div>

      <button class="collapse-btn">
        <svg class="collapse-icon" viewBox="0 0 24 24">
          <path d="M8 5l8 7-8 7"/>
        </svg>
      </button>
      
      <div class="delete-icon-container">
        <svg class="delete-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm80-160h80v-360h-80v360Zm160 0h80v-360h-80v360Z"/></svg>
      </div>
      <div class="title-wrapper">
        <p class="title">${highlightSmart(category.name, searchbar.value)}</p>
        <p class="subtitle" ${!category.content && "style='display: none;'"}></p>
      </div>

      <span class="category-count">${StorageAPI.getItemsByParentId(item.id).length}</span>

      <div class="more">
        ${icons.general.moreVert}

      </div>

      <svg class="restore-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M440-320h80v-166l64 62 56-56-160-160-160 160 56 56 64-62v166ZM280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Z"/></svg>
    </div>

    <div class="category-item-container" data-id="${category.id}">
      
    </div>
  `;

  row.dataset.id = category.id;

  if (category.parentId === "deleted" && category.purgeAt) {
    row.classList.add("deleted");
  }

  if (item.collapsed) {
    row.classList.add("collapsed");
  }

  if (category.status?.checked) row.classList.add("checked");
  
  if (SelectionManager.isSelected(category.id)) {
    row.classList.add("selected");
  }

  renderCollection({
    container: row.querySelector(".category-item-container"),
    createNewSortable: false,
    items: StorageAPI.getItemsByParentId(category.id),
    config,
    parentId: item.id,
    emptyMessage: false
  });

  attachCategoryEvents(row, item, config);
  enableSelection(row.querySelector(".header"), item, config, container);

  return row;
}
function createCategoryMenu(item, el) {
  const menu = document.createElement("div");
  menu.classList.add("category-menu");

  menu.innerHTML = `
    <div class="menu-item edit">✏️ Edit</div>
    ${!AppRoute.currentView.id ? `<div class="menu-item archive">📁 ${item.parentId === "root" ? "Archive" : "Unarchive"}</div>` : ""}
    <div class="menu-item delete">🗑 Delete</div>
  `;

  document.body.appendChild(menu);

  const button = el.querySelector(".more");
  const rect = button.getBoundingClientRect();

  // Temporarily hide so we can measure
  menu.style.visibility = "hidden";
  menu.style.display = "block";

  const menuRect = menu.getBoundingClientRect();

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left = rect.right - menuRect.width;
  let top = rect.bottom + 8;

  // If it goes off the left side
  if (left < 8) {
    left = 8;
  }

  // If it goes off the right side
  if (left + menuRect.width > viewportWidth - 8) {
    left = viewportWidth - menuRect.width - 8;
  }

  // If it goes off the bottom, open upwards
  if (top + menuRect.height > viewportHeight) {
    top = rect.top - menuRect.height - 8;
  }

  // If it goes off the top too
  if (top < 8) {
    top = 8;
  }

  menu.style.left = `${left + window.scrollX}px`;
  menu.style.top = `${top + window.scrollY}px`;
  menu.style.visibility = "visible";

  // Edit
  menu.querySelector(".edit").onclick = () => {
    openEditModal(item);
    menu.remove();
  };

  // Archive
  if (menu.querySelector(".archive")) {
    menu.querySelector(".archive").onclick = () => {
      const confirmed = confirm("Archive Category?");
      if (!confirmed) return false;

      StorageAPI.updateItem(item.id, { parentId: item.parentId === "root" ? "archive" : "root" });
      el.remove();
      menu.remove()
    };
  }

  // Delete
  menu.querySelector(".delete").onclick = () => {
    const confirmed = confirm("Delete Category?");
    if (!confirmed) return false;

    StorageAPI.updateItem(item.id, { parentId: "deleted", purgeAt: Date.now() + (15 * 24 * 60 * 60 * 1000) });
    el.remove();
    menu.remove();
  };


  // Close when clicking elsewhere
  setTimeout(() => {
    document.addEventListener("click", function closeMenu(e) {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener("click", closeMenu);
      }
    });
  }, 0);

  return menu;
}


function attachListEvents(row, list, config) {
  row.addEventListener("click", (e) => {
    if (SelectionManager.longPressTriggered) {
      SelectionManager.longPressTriggered = false;
      return;
    }

    if (SelectionManager.active && (e.target === row.querySelector(".favorite-icon") || e.target === row.querySelector(".favorite-icon path"))) {
      toggleFavoredList();
      return;
    };

    if (SelectionManager.active) {

      SelectionManager.toggle(
        row,
        list,
        config
      );

      return;
    }

    row.classList.add("active");
  });

  document.addEventListener("click", (e) => {
    if (!row.contains(e.target) || SelectionManager.active) {
      row.classList.remove("active");
    };
  });

  // --- Edit ---
  row.querySelector(".edit-icon-container")?.addEventListener("click", (e) => {
    e.stopPropagation();
    openEditModal(list);
  });

  // --- Open List ---
  row.querySelector(".open-btn")?.addEventListener("click", () => {
    AppRoute.toList(list);
  });

  // --- Delete Icon ---
  row.querySelector(".delete-icon-container")?.addEventListener("click", (e) => {
    e.stopPropagation();
    StorageAPI.moveItemtoTrash(list.id);
    renderCurrentView();
  });

  // --- Swipe to Delete ---
  enableSwipeToDelete(row, () => {
    StorageAPI.moveItemtoTrash(list.id);
    renderCurrentView();
    return true;
  });

  // --- Restore Icon ---
  row.querySelector(".restore-icon")?.addEventListener("click", (e) => {
    e.stopPropagation();
    const confirmed = confirm(`Restore ${list.name} from trash?`);
    if (!confirmed) return;

    list.parentId = "root"
    StorageAPI.updateItem(list.id, { parentId: list.parentId });
    renderCurrentView();
    return true;
  });

  // --- Favorite icon ---
  function toggleFavoredList() {
    list.status.favored = !list.status.favored;

    if (list.status.favored) {
      row.querySelector(".favorite-icon").classList.add("heart-filled");
      row.querySelector(".favorite-icon").classList.add("active");
    } else {
      row.querySelector(".favorite-icon").classList.remove("heart-filled");
      row.querySelector(".favorite-icon").classList.remove("active");
    }

    StorageAPI.updateList(list.id, {
      status: {
        favored: list.status.favored,
        ...list.status
      },
    });
  }
}
function attachRowEvents(row, rowData, config) {
  const rootParent = StorageAPI.getRootParentById(rowData.id);
  const list = StorageAPI.getItemById(rowData.parentId);

  row.addEventListener("click", (e) => {
    if (SelectionManager.longPressTriggered) {
      SelectionManager.longPressTriggered = false;
      return;
    }

    if (SelectionManager.active && (e.target === row.querySelector(".favorite-icon") || e.target === row.querySelector(".favorite-icon path"))) {
      toggleFavoredRow();
      return;
    };

    if (SelectionManager.active && (e.target === row.querySelector(".checked-icon") || e.target === row.querySelector(".checked-icon path"))) {
      toggleCheckedRow();
      return;
    };

    if (SelectionManager.active) {

      SelectionManager.toggle(
        row,
        rowData,
        config
      );

      return;
    }

    row.classList.add("active");
  });

  document.addEventListener("click", (e) => {
    if (!row.contains(e.target) || SelectionManager.active) {
      row.classList.remove("active");
    };
  });

  const dragHandle = row.querySelector(".drag-handle");

  if (window.enableSwipeToDelete) {
    enableSwipeToDelete(row, () => {
      StorageAPI.moveItemtoTrash(rowData.id);
      renderCurrentView();
      return true;
    });
  }

  const titleEl = row.querySelector(".title");
  const editBtn = row.querySelector(".edit-icon-container");

  editBtn?.addEventListener("click", (e) => {
    e.stopPropagation(); // wichtig: verhindert Side-Effekte (Swipe/Click)
    
    openEditModal(rowData);
  })

  const deleteIcon = row.querySelector(".delete-icon");

  // Counter nur anzeigen wenn aktiviert
  if (!rootParent?.options?.enableCounter) {
    const counterContainer = row.querySelector(".counter-btn-container");
    if (counterContainer) counterContainer.style.display = "none";
  }

  const counterEl = row.querySelector('.counter');
  const plusBtn = row.querySelector('.counter-plus-btn');
  const minusBtn = row.querySelector('.counter-minus-btn');

  if (plusBtn && minusBtn && counterEl) {
    plusBtn.addEventListener('click', () => {
      StorageAPI.updateRow(rowData.id, { count: rowData.count + 1 });
      rowData.count++;
      counterEl.textContent = rowData.count;
    });

    minusBtn.addEventListener('click', () => {
      if (rowData.count === 0) return;
      StorageAPI.updateRow(rowData.id, { count: rowData.count - 1 });
      rowData.count--;
      counterEl.textContent = rowData.count;
    });
  }

  deleteIcon.addEventListener("click", () => {
    StorageAPI.moveItemtoTrash(item.id);
    renderCurrentView();
  });

  // --- Restore Icon ---
  row.querySelector(".restore-icon")?.addEventListener("click", (e) => {
    e.stopPropagation();

    const modalContent =`
      <select class="form-select">
        ${`<option value="" hidden selected>Choose a list</option>`}

        ${StorageAPI.getLists().sort((a, b) => a.name.localeCompare(b.name)).filter(l => l.id !== "deleted").map(l => `<option value="${l.id}">${l.name}</option>`).join("") || `<option disabled>No other lists available</option>`}
      </select>
    `;

    createModal("Select a list to restore this item to.", modalContent, getModalConfirmBtn("modalConfirmBtn", "move entries"));
    
    document.getElementById("modalConfirmBtn").addEventListener("click", () => {
      const select = document.querySelector(".modal-card .form-select");
      const targetListId = select.value;
      if (!targetListId) return;
      
      StorageAPI.updateItem(rowData.id, { parentId: targetListId });

      renderCurrentView();
      deleteModal();
      createAlert("info", "Restored Entry", `${rowData.name} was restored to ${StorageAPI.getListById(targetListId).name}`);
    });

    return true;
  });

  // --- Favorite icon ---
  function toggleFavoredRow() {
    rowData.status.favored = !rowData.status.favored;

    if (rowData.status.favored) {
      row.querySelector(".favorite-icon").classList.add("heart-filled");
      row.querySelector(".favorite-icon").classList.add("active");
    } else {
      row.querySelector(".favorite-icon").classList.remove("heart-filled");
      row.querySelector(".favorite-icon").classList.remove("active");
    }

    StorageAPI.updateRow(rowData.id, {
      status: {
        favored: rowData.status.favored,
        ...rowData.status
      },
    });
  }

  // --- Checked Row ---
  function toggleCheckedRow() {
    rowData.status.checked = !rowData.status.checked;

    if (rowData.status.checked) {
      row.classList.add("checked");
      row.querySelector(".checked-icon").innerHTML = `<path d="m424-312 282-282-56-56-226 226-114-114-56 56 170 170ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Z"/>`;
    } else {
      row.classList.remove("checked");
      row.querySelector(".checked-icon").innerHTML = `<path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Z"/>`;
    }

    StorageAPI.updateRow(rowData.id, {
      status: {
        checked: rowData.status.checked,
        ...rowData.status
      },
    });
  }  
}
function attachCategoryEvents(el, item, config) {
  const list = StorageAPI.getListById(item.listId);

  el.addEventListener("click", (e) => {
    if (SelectionManager.longPressTriggered) {
      SelectionManager.longPressTriggered = false;
      return;
    }

    if (SelectionManager.active) {
      return;
    }

    el.classList.add("active");
  });

  document.addEventListener("click", (e) => {
    if (!el.contains(e.target) || SelectionManager.active) {
      el.classList.remove("active");
    };
  });

  const dragHandle = el.querySelector(".drag-handle");

  // Collapsed Btn
  const collapseBtn = el.querySelector(".collapse-btn");

  collapseBtn?.addEventListener("click", e => {
    e.stopPropagation();

    const collapsed = StorageAPI.getItemById(item.id).collapsed;
    StorageAPI.updateItem(item.id, { collapsed: !collapsed })

    el.classList.toggle("collapsed");
  });

  const titleEl = el.querySelector(".title");
  const editBtn = el.querySelector(".edit-icon-container");

  editBtn?.addEventListener("click", (e) => {
    e.stopPropagation(); // wichtig: verhindert Side-Effekte (Swipe/Click)
    openEditelModal(item.id, titleEl);
  })

  const deleteIcon = el.querySelector(".delete-icon");

  deleteIcon?.addEventListener("click", () => {
    StorageAPI.moveItemtoTrash(item.id);
    renderCurrentView();
  });

  const moreButton = el.querySelector(".more");

  moreButton.addEventListener("click", (e) => {
    e.stopPropagation();

    // remove other open menus
    document.querySelectorAll(".category-menu")
      .forEach(menu => menu.remove());

    createCategoryMenu(item, el);
  });

  // --- Restore Icon ---
  el.querySelector(".restore-icon")?.addEventListener("click", (e) => {
    e.stopPropagation();

    const categoryKind = CATEGORY_KINDS[item.categoryKind];
    console.log(categoryKind.allowedChildTypes)

    if (categoryKind?.allowedChildTypes[0] === "list") {
      StorageAPI.updateItem(item.id, { parentId: "root" });  
      el.remove();
    } else if (categoryKind?.allowedChildTypes[0] === "row") {
      console.log("hiehrfi");
      const modalContent =`
        <select class="form-select">
          ${`<option value="" hidden selected>Choose a list</option>`}

          ${StorageAPI.getLists().sort((a, b) => a.name.localeCompare(b.name)).filter(l => l.id !== "deleted").map(l => `<option value="${l.id}">${l.name}</option>`).join("") || `<option disabled>No other lists available</option>`}
        </select>
      `;

      createModal("Select a list to restore this item to.", modalContent, getModalConfirmBtn("modalConfirmBtn", "restore"));
      
      document.getElementById("modalConfirmBtn").addEventListener("click", () => {
        const select = document.querySelector(".modal-card .form-select");
        const targetListId = select.value;
        if (!targetListId) return;
        
        StorageAPI.updateItem(item.id, { parentId: targetListId });

        el.remove();
        deleteModal();
        createAlert("info", "Restored Category", `${item.name} was restored to ${StorageAPI.getListById(targetListId).name}`);
      });
    }
    
    return true;
  });
}


const SelectionManager = {

  ids: new Set(),

  active: false,

  start(el, item, config) {

    this.active = true;
    window.swipeEnabled = false;

    this.ids.add(item.id);
    console.log("selectedItems", this.ids);

    el.classList.add("selected");
    el.classList.remove("active");

    this.render(config);
  },


  toggle(el, item, config) {

    if (this.ids.has(item.id)) {
      this.ids.delete(item.id);
      el.classList.remove("selected");
    } else {
      this.ids.add(item.id);
      el.classList.add("selected");
    }


    if (!this.ids.size) {
      this.clear();
    }
    else {
      this.render(config);
    }
  },


  clear() {

    this.ids.clear();
    this.active = false;

    document
      .querySelectorAll(".selected")
      .forEach(el => el.classList.remove("selected"));

    window.swipeEnabled = true;

    removeSelectedMenu();
  },


  isSelected(id) {
    return this.ids.has(id);
  },

  longPressTriggered: false,

  render(config) {
    createSelectedMenu(
      document.getElementById("view-overview"),
      config.selectedActions
    );
  }

};
function enableSelection(el, item, config) {

  if (!config.selectedActions) return;

  let timeout;

  el.addEventListener("pointerdown", startPress);
  el.addEventListener("pointerup", cancelPress);
  el.addEventListener("pointermove", cancelPress);
  el.addEventListener("pointercancel", cancelPress);

  function startPress() {

    SelectionManager.longPressTriggered = false;

    timeout = setTimeout(() => {

      if (item.type === "category") {
        StorageAPI.getItemsByParentId(item.id).forEach(item => {
          SelectionManager.start(document.querySelector(`[data-id="${item.id}"]`), item, config);
        });
      } else {
        SelectionManager.start(el, item, config);
      }

      navigator.vibrate?.(50);

      SelectionManager.longPressTriggered = true;
    }, 600);
  }

  function cancelPress() {
    clearTimeout(timeout);
  }
}
function createSelectedMenu(container, items) {
  document.querySelectorAll(".items-selected-menu")?.forEach(el => {
    el.remove();
  });

  const selectedMenu = document.createElement("div");
  selectedMenu.classList.add("items-selected-menu");

  container.appendChild(selectedMenu);

  if (items.more) {
    const moreItem = {
      icon: icons.general.moreVert,
      text: "More",
      class: "more",
      onClick: () => {

      }
    }

    const moreContainer = document.createElement("div");
    moreContainer.classList.add("more-options-container");

    createItem(moreItem).appendChild(moreContainer);
    items.more?.forEach(item => {
      createItem(item, moreContainer);
    });
  }

  items.default?.forEach(item => {
    createItem(item);
  });

  function createItem(item, container = selectedMenu) {
    const el = document.createElement("div");
    el.innerHTML = item.icon;
    if (item.class) el.classList.add(item.class);
    const text = el.appendChild(document.createElement("p"));
    text.innerHTML = item.text

    el.addEventListener("click", () => item.onClick());
  
    container.appendChild(el);

    return el;
  }
}
function removeSelectedMenu(container, items) {
  const selectedMenu = document.querySelector(".items-selected-menu");
  selectedMenu && selectedMenu.remove();
}

// Render helper
// function prepereItemsForRender(items, query, filter, mode, customSorts = {}) {
  
  
//   sortItems(items,);
//   filterItems(filter);
//   searchItems(items, query);
// }
function sortItems(items, mode, order=[], customSorts = {}) {
  if (typeof customSorts === "function") {
    return customSorts(items);
  }

  switch (mode) {
    case "alphabetic":
      return [...items].sort((a, b) =>
        a.name.localeCompare(b.name)
      );

    case "highestCount":
      console.log("running hightets")
      return [...items].sort((a, b) =>
        b.count || 0 - a.count || 0
      );

    case "newest":
      return [...items].sort((a, b) =>
        b.createdAt - a.createdAt
      );

    case "oldest":
      return [...items].sort((a, b) =>
        a.createdAt - b.createdAt
      );

    case "manual":
    default:
      return items.sort((a, b) => {
        return order.indexOf(a.id) - order.indexOf(b.id);
      });
  }
}


function filterItems(filter) {
  const f = document.querySelector(".row-filter-select");
  const selectedFilters = Array.from(filter.selectedOptions).map(option => option.value) || [];

  selectedFilters.forEach(filter => {
    if (filter === "favorite") rows = rows.filter(row => row.status.favored);
    if (filter === "notChecked") rows = rows.filter(row => !row.status.checked);
    if (filter === "checked") rows = rows.filter(row => row.status.checked);
  });
}

function searchItems(items, query) {
  query = query.toLowerCase().trim();

  const searchData = {};

  if (query) {
    items = items
      .map(item => {
        let priority = 0;
        let titleMatch = false;

        const title = item.name.toLowerCase();
        const titleIndex = title.indexOf(query);

        if (titleIndex !== -1) {
          titleMatch = true;
          priority += 1000;
          priority += (100 - titleIndex);
          priority += (query.length / title.length) * 100;
        }

        const rows = StorageAPI.getItemsByParentId(item.id);
        let entrySnippet = null;

        if (rows) {
          const matchingRow = rows.find(r =>
            r.name.toLowerCase().includes(query)
          );

          if (!titleMatch && matchingRow) {
            entrySnippet = highlightSmart(matchingRow.name, query);
            priority += 300;
          }
        }

        let contentMatch = false;

        if (item.content?.toLowerCase().includes(query)) {
          contentMatch = true;
          priority += 500;
        }

        const data = {
          item,
          priority,
          query,
          titleMatch,
          entrySnippet,
          contentMatch,
          rowCount: rows.length
        };

        searchData[item.id] = data;

        return {
          ...item,
          searchData: data
        };
      })
      .filter(item => item.searchData.priority > 0)
      .sort((a, b) => b.searchData.priority - a.searchData.priority);
  } else {
    items = items.map(item => {
      const rows = StorageAPI.getItemsByParentId(item.id);

      const data = {
        item,
        priority: null,
        query,
        titleMatch: null,
        entrySnippet: null,
        contentMatch: null,
        rowCount: rows.length
      };

      searchData[item.id] = data;

      return {
        ...item,
        searchData: data
      };
    });
  }

  return [items, searchData];
}


// window.renderCurrentView = function renderCurrentView() {
//   updateSortUI();
//   syncListSortRadios()
//   updateFilterUI();

//   const [root, param, sub] = parseRoute();
//   const view = LIST_VIEWS[root] || LIST_VIEWS.lists;

//   
//   const mode = StorageAPI.getListSortMode();

//   if (root === "deleted--lists") StorageAPI.tryToEmptyTrash();

//   let lists = view.getData();

//   if (mode === "alphabetic") {
//     lists = [...lists].sort((a, b) => a.name.localeCompare(b.name));
//   } else if (mode === "newest") {
//     lists = [...lists].sort((a, b) => b.createdAt - a.createdAt);
//   } else if (mode === "oldest") {
//     lists = [...lists].sort((a, b) => a.createdAt - b.createdAt);
//   } else if (mode === "mostEntries") {
//     const allRows = StorageAPI.getRows();

//     lists = [...lists].sort((a, b) => {
//       const aEntries = allRows.filter(r => r.listId === a.id).length;
//       const bEntries = allRows.filter(r => r.listId === b.id).length;
//       return bEntries - aEntries;
//     });
//   }

//   swipeEnabled = view.swipeEnabled;

//   const filter = document.querySelector(".list-filter-select");
//   const selectedFilters = Array.from(filter.selectedOptions).map(option => option.value) || [];

//   selectedFilters.forEach(filter => {
//     if (filter === "favorite") lists = lists.filter(list => list.status.favored);
//   });

//   entityContainer.innerHTML = "";

//   if (lists.length === 0) {
//     let message = view.emptyMessage;
//     if (selectedFilters.length > 0) message = "No lists matching the selected filters.";

//     const empty = document.createElement("div");
//     empty.className = "empty-state";
//     empty.innerHTML = `<div>${message}</div>`;
//     entityContainer.appendChild(empty);

//     if (root === "deleted") {
//       const deletedLists = StorageAPI.getDeletedLists();
//       const deletedRows = StorageAPI.getRows().filter(row => row.location?.startsWith("deletedAt"));

//       if (deletedLists.length === 0 && deletedRows.length === 0) {
//         empty.innerHTML = `
//           <div>${message}</div>
//         `;
//       } else {
//         empty.className = "settings-section deleted-items-overview";
//         empty.innerHTML = "";

//         if (deletedLists.length > 0) {
//           empty.innerHTML += `
//             <button class="settings-item settings-nav-btn" onclick="AppRoute.toDeletedLists()">
//               Lists (${deletedLists.length})
//               <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z"/></svg>
//             </button>
//           `;
//         }

//         if (deletedRows.length > 0) {
//           empty.innerHTML += `
//             <button class="settings-item settings-nav-btn" onclick="AppRoute.toDeletedRows()">
//               Entries (${deletedRows.length})
//               <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z"/></svg>
//             </button>
//           `;
//         }
//       }

//     }
//     return;
//   }

//   const query = searchbar.value;

//   // Favorites first
//   if (mode !== "manual" && !query) {
//     lists.sort((a, b) => {
//       const aFav = a.list.status?.favored ? 1 : 0;
//       const bFav = b.list.status?.favored ? 1 : 0;

//       return bFav - aFav; 
//     });
//   }

//   renderCollection(container, lists);

//   if (!entityContainer.innerHTML) {
//     const empty = document.createElement("div");
//     empty.className = "empty-state";
//     empty.textContent = `No lists matching "${searchbar.value}" were found.`;
//     entityContainer.appendChild(empty);
//     return;
//   }

//   requestAnimationFrame(() => {
//     Object.keys(selectedLists).forEach(id => {
//       const row = entityContainer.querySelector(`.row[kdata-id="${id}"]`);
//       if (row) row.classList.add("selected");
//     });
//   });
// };



// ----------------------------
// Row Selection (long press)
// ----------------------------
// let selectedItems = {};


// function deselectAllLists() {
//   document.querySelectorAll(".row.selected").forEach(row => {
//     row.classList.remove("selected");
//   });

//   selectedLists = {};
//   SelectionManager.activeLists = false;
//   window.swipeEnabled = true;
  
//   removeSelectedMenu();
// }

// function archiveSelectedLists(selectedLists) {
//   const root = parseRoute()[0];

//   if (root === "archive") {
//     const confirmDelete = confirm("Unarchive selected lists?");
//     if (!confirmDelete) return;

//     for (const [key, list] of Object.entries(selectedLists)) {
//       list.location = "active";

//       StorageAPI.updateList(list.id, list)
//     };

//     createAlert("info", `${Object.keys(selectedLists).length} lists were unarchived`);
//   } else {
//     const confirmDelete = confirm("Archive selected lists?");
//     if (!confirmDelete) return;

//     for (const [key, list] of Object.entries(selectedLists)) {
//       list.location = "archived";

//       StorageAPI.updateList(list.id, list)
//     };

//     createAlert("info", `${Object.keys(selectedLists).length} lists were archived`);
//   }

//   deselectAllLists();
//   renderCurrentView();
// }

// function duplicateSelectedLists(selectedLists) {
//   const confirmDelete = confirm("Confirm duplicating lists.");
//   if (!confirmDelete) return;

//   for (const [key, list] of Object.entries(selectedLists)) {
//     StorageAPI.duplicateList(list.id);
//   };

//   renderCurrentView();
//   createAlert("info", "Duplicated Lists", `${Object.keys(selectedLists).length} lists were duplicated and all their entries`)
//   deselectAllLists();
// }

// function moveSelectedListsToDeleted(selectedLists) {
//   const confirmDelete = confirm("Are you sure you want to delete the selected lists?");
//   if (!confirmDelete) return;

//   for (const [key, list] of Object.entries(selectedLists)) {
//     StorageAPI.updateItem(list.id, { parentId: "deleted" });
//     document.querySelector(".alert-card")?.remove();
//   };
//   createAlert("danger", "Deleted Lists", `${Object.keys(selectedLists).length} lists were deleted`);
//   deselectAllLists();
//   renderCurrentView();
// }

async function shareSelectedIds(ids) {
  let text = "";
  
  const lists = StorageAPI.getLists().filter(list => ids.has(list.id));

  lists.forEach(list => {
    // 🔹 Listen-Titel
    text += `\n📋 *${list.name}*\n────────────────\n`;

    const itemsInThisList = StorageAPI.getItemsByParentId(list.id)
      .filter(item => item.type === "row" || item.type === "category");

    itemsInThisList.forEach(item => {
      if (item.type === "row") {
        addRowToText(item);
      } else if (item.type === "category") {
        addCategoryToText(item);
      }
    });

    text += "\n\n";
  });

  function addRowToText(row) {
    text += `• ${row.name}${row.count ? ` (${row.count})` : ""}${row.content ? ":" : ""}\n`;

    if (row.content) {
        const formattedContent = row.content
        .split("\n")
        .map(line => line.trim() ? `> _${line.trim()}_` : "")
        .join("\n");

      text += `${formattedContent}\n\n`;
    } else {
      text += "\n";
    }
  }

  function addCategoryToText(cat) {
    const itemsInThisCat = StorageAPI.getItemsByParentId(cat.id);
    if (itemsInThisCat.length === 0) return;

    text += `\n*${cat.name}*\n`;

    itemsInThisCat.forEach(item => {
      if (item.type === "row") {
        addRowToText(item);
      } else if (item.type === "category") {
        addCategoryToText(item);
      }
    });

    text += "\n\n";
  }


  console.log(text);

  
  // 🔥 Share
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
}

function exportSelectedIds(selectedItems) {
  const lists = [];
  const rows = [];
  const categories = [];
  const order = {};

  SelectionManager.ids.forEach(id => addItem(id));

  function addItem(id, hasSharedParent=false) {
    const item = StorageAPI.getItemById(id);
    
    const parentIsCustomView = Object.values(VIEWS).some(
      config => item.parentId !== config.parent.view
    );
    
    if (parentIsCustomView && !hasSharedParent && item.type === "row") {
      item.parentId = null;
    } else if (parentIsCustomView && !hasSharedParent && item.type === "list") {
      item.parentId = "root";
    }

    switch(item.type) {
      case "list":
        lists.push(item);
        break;
      case "row":
        rows.push(item);
        break;
      case "category":
        categories.push(item);
        break;
    }

    if (parentIsCustomView) {
      order[item.ParentId] = StorageAPI.getViewOrderByView(item.parentId);
    }

    StorageAPI.getItemsByParentId(item.id).forEach(i => {
      addItem(i.id, true);
    });
  }


  const data = {
    lists,
    rows,
    categories,
    order
  }
  
  createModal(
    "Export Selected Items",
    "<p style='color: var(--color-text-muted);'>Name the file:</p><br>" +

    "<div id='modalDivContainer' style='display: flex;'>" +
      getEditNameInput("editExportFileName", "Name the file") +
      "<div style='color: var(--color-text-muted);'>.json</div>" +
    "</div>"+ 

    "<br>" +
    "<p style='color: var(--color-text-muted); font-size: 14px'>This file can be imported through the settings on any device.</p>",
    getModalConfirmBtn("confirmExportBtn", "Download JOSN")
  );

  const fileNameInput = document.getElementById("editExportFileName");

  fileNameInput.value = "stacked-exported-items";
  fileNameInput.focus;
  fileNameInput.select();

  document.getElementById("confirmExportBtn").onclick = () => {
    if (!fileNameInput.value) return;

    deleteModal();
    renderCurrentView();
    const fileName = `${fileNameInput.value}.json`;
    StorageAPI.exportData(data, fileName);
  };
}

function resetViewOverview() {
  if (searchbar.value) {
    searchbar.value = "";
    clearSearchbarBtn.style.display = "none";
    searchIcon.style.display = "block";
  };

  if (!window.guideActive) {
    SelectionManager.clear();
  }

  const selectedMenu = document.querySelector(".items-selected-menu");
  selectedMenu && (selectedMenu.remove());
}




























// ----------------------------
// List Settings
// ----------------------------
const openListSettingsBtn = document.getElementById("openListSettingsBtn");
const backToListBtn = document.getElementById("backToListBtn");
const listTitleEl = document.getElementById("currentListSettingsTitle");
const listSettings = document.getElementById("listSettings");

// List Settings event listeners

backToListBtn?.addEventListener("click", () => {
  const list = StorageAPI.getListById(AppRoute.currentView.id);
  AppRoute.toList(list);
  listTitleEl.textContent = "";
});

listSettings.addEventListener("change", (e) => {
  const listId = AppRoute.currentView.id;
  if (!listId) return;

  const list = StorageAPI.getListById(listId);
  if (!list) return;

  // =========================
  // OPTIONS
  // =========================
  if (e.target.id === "listSettingsEnableCounterCheckbox") {
    list.options = list.options || {};
    list.options.enableCounter = e.target.checked;
    StorageAPI.updateList(listId, list);
    return;
  } else if (e.target.id === "listSettingsEnableNumberingCheckbox") {
    list.options = list.options || {};
    list.options.enableNumbering = e.target.checked;
    StorageAPI.updateList(listId, list);
    return;
  } else if (e.target.id === "listSettingsEnableLockEntryOrderCheckbox") {
    list.options = list.options || {};
    list.options.enableLockEntryOrder = e.target.checked;
    StorageAPI.updateList(listId, list);
    return;
  }
});
