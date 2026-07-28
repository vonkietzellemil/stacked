// scripts/storage.js
// =====================================================
// STORAGE API
// - lists: { id, name, slug, createdAt, options }
// - rows:  { id, listId, title, count, content }
// =====================================================

const KEYS = {
  LISTS: "stacked_lists",
  ROWS:  "stacked_rows",
  CATEGORIES: "stacked_categories",
  ORDER: "stacked_order",
  SETTINGS: "stacked_settings",
};

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[ä]/g, "ae").replace(/[ö]/g, "oe").replace(/[ü]/g, "ue").replace(/[ß]/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

window.StorageAPI = {
  // ---------- LISTS ----------
  getLists() {
    return read(KEYS.LISTS, []);
  },

  getActiveLists() {
    return StorageAPI.getLists()
      .filter(list => !list.location || list.location === "active")
  },

  getArchivedLists() {
    return StorageAPI.getLists()
      .filter(list => list.location === "archived")
  },

  getDeletedLists() {
    return StorageAPI.getLists()
      .filter(list => list.location?.startsWith("deletedAt"))
  },

  getListById(id) {
    return StorageAPI.getLists().find(l => l.id === id) ?? null;
  },

  createList(props) {
    const lists = read(KEYS.LISTS, []);

    const list = {
      id: crypto.randomUUID(),
      name: props.name.trim(),
      type: "list",
      parentId: props.parentId || AppRoute.currentView.view,
      slug: slugify(name),
      createdAt: Date.now(),
      options: {
        enableCounter: props.options?.enableCounter || false,
        enableNumbering: props.options?.enableNumbering || false,
      },
      status: {
        favored: props.status?.favored || false,
      },
      rowsSortMode: props.rowsSortMode || "manual",
    };

    lists.push(list);
    write(KEYS.LISTS, lists);

    return list;
  },


  deleteList(listId) {
    const list = StorageAPI.getListById(listId);
    if (!list) return;

    // remove list
    write(KEYS.LISTS, read(KEYS.LISTS, []).filter(l => l.id !== listId));
    // remove rows of StorageAPI list
    write(KEYS.ROWS, read(KEYS.ROWS, []).filter(r => r.listId !== listId));

    
    write(ORDER_KEYS.LISTS, read(ORDER_KEYS.LISTS, []).filter(id => id !== listId));
    // und rows order key löschen:
    localStorage.removeItem(ORDER_KEYS.ROWS_PREFIX + listId);
  },

  updateList(listId, patch, deleteUnassingedProperties=false) {
    const lists = read(KEYS.LISTS, []);

    const index = lists.findIndex(x => x.id === listId);
    if (index === -1) return null;

    if (typeof patch.name === "string") {
      const cleanName = patch.name.trim();
      patch.name = cleanName;
      patch.slug = slugify(cleanName);
    }

    lists[index] = {
      ...lists[index],
      ...patch,
    };

    if (deleteUnassingedProperties) {
      const current = StorageAPI.getListById(listId);
      if (!current) return null;

      Object.keys(patch).forEach(key => {
        if (patch[key] === undefined) {
          delete lists[index][key];
        }
      });
    }

    write(KEYS.LISTS, lists);
    return lists[index];
  },

  duplicateItem(id, props) {
    const item = StorageAPI.getItemById(id);
    if (!item) return null;

    const entityType = ENTITY_TYPES[item.type];

    const newItem = entityType.createItem(
      { ...item, ...props }
    );

    StorageAPI.getItemsByParentId(id).forEach(child => {
      StorageAPI.duplicateItem(child.id, { parentId: newItem.id });
    });

    return newItem;
  },

  // ---------- ROWS ----------
  getRowsByParentId(parentId) {
    return read(KEYS.ROWS, []).filter(r => r.parentId === parentId);
  },

  getRows() {
    return read(KEYS.ROWS, []);
  },

  getRowById(rowId) {
    return read(KEYS.ROWS, []).find(r => r.id === rowId) ?? null;
  },

  addRow(props) {
    const rows = read(KEYS.ROWS, []);
    const row = {
      id: crypto.randomUUID(),
      parentId: props.parentId || AppRoute.currentView.id || AppRoute.currentView.view,
      createdAt: Date.now(),
      type: "row",

      name: props.name.trim(),
      count: props.count || 0,
      content: props.content || "",
      status: {
        favored: props.status?.favored || false,
        checked: props.status?.checked || false,
      },
    };
    rows.push(row);
    write(KEYS.ROWS, rows);

    return row;
  },

  updateRow(rowId, patch, deleteUnassingedProperties = false) {
    const rows = read(KEYS.ROWS, []);

    const index = rows.findIndex(x => x.id === rowId);
    if (index === -1) return null;

    rows[index] = {
      ...rows[index],
      ...patch,
    };

    if (deleteUnassingedProperties) {
      const current = StorageAPI.getRowById(rowId);
      if (!current) return null;

      Object.keys(rows[index]).forEach(key => {
        if (rows[index][key] === undefined) {
          delete rows[index][key];
        }
      });
    }

    write(KEYS.ROWS, rows);
    return rows[index];
  },

  duplicateRow(rowId, newName, targetListId = null) {
    const rows = read(KEYS.ROWS, []);
    const row = rows.find(r => r.id === rowId);
    if (!row) return null;

    const newRow = { ...row, title: newName || row.title, id: crypto.randomUUID(), listId: targetListId || row.listId, createdAt: Date.now() };
    rows.push(newRow);
    write(KEYS.ROWS, rows);

    return newRow;
  },

// ---------- CATEGORY ----------
  getAllItems() {
    const rows = StorageAPI.getRows();
    const lists = StorageAPI.getLists();
    const categories = StorageAPI.getCategories();

    return [
      ...rows,
      ...lists,
      ...categories
    ];
  },
  deleteItem(id) {
    const item = this.getItemById(id);
    const children = this.getItemsByParentId(id);

    children.forEach(child => {
      this.deleteItem(child.id)
    });

    const orders = this.getViewOrders();
    delete orders[id];
    write(KEYS.ORDER, orders);

    if (item.type === "list") {
      const lists = read(KEYS.LISTS, []).filter(list => list.id !== item.id);
      write(KEYS.LISTS, lists);
    } else if (item.type === "row") {
      const entries = read(KEYS.ROWS, []).filter(entry => entry.id !== item.id);
      write(KEYS.ROWS, entries);
    } else if (item.type === "category") {
      const categories = read(KEYS.CATEGORIES, []).filter(category => category.id !== item.id);
      write(KEYS.CATEGORIES, categories);
    }

    // aus Parent-Order entfernen
    // aus Storage entfernen
  },
  createItem() {

  },
  getItemsByParentId(parentId) {
    return [
      ...this.getLists().filter(l => l.parentId === parentId),
      ...this.getRows().filter(r => r.parentId === parentId),
      ...this.getCategories().filter(c => c.parentId === parentId),
    ];
  },
  getParentById(id) {
    const currentItem = this.getItemById(id);
    const allItems = this.getAllItems();
    
    return allItems.find(item => item.id === currentItem.parentId) || null; // null can also be a view
  },
  getRootParentById(id) {
    let parent = this.getParentById(id);

    while (ENTITY_TYPES[parent?.type]?.canHaveDirectChildren) {
      parent = this.getParentById(parent.id);
    }

    return parent;
  },
  getItemById(itemId) {
    return this.getLists().find(l => l.id === itemId) ||
      this.getRows().find(r => r.id === itemId) ||
      this.getCategories().find(c => c.id === itemId) || null;
  },
  updateItem(itemId, patch, deleteUnassingedProperties = false) {
    const item = this.getItemById(itemId);
    if (!item) return null;

    // Implementation for updating item
    switch (item.type) {
      case "list":
        return this.updateList(itemId, patch, deleteUnassingedProperties);
      case "row":
        return this.updateRow(itemId, patch, deleteUnassingedProperties);
      case "category":
        return this.updateCategory(itemId, patch, deleteUnassingedProperties);
      default:
        return null;
    }
  },

  getCategoriesByParent(parentType, parentId) {
    return StorageAPI.getCategories().filter(c =>
      c.parentType === parentType &&
      c.parentId === parentId
    );
  },

  getCategoryById(categoryId) {
    return read(KEYS.CATEGORIES, [])
      .find(c => c.id === categoryId) || null;
  },

  getCategories() {
    return read(KEYS.CATEGORIES, []);
  },

  createCategory(props) {
    const categories = read(KEYS.CATEGORIES, []);
    const category = {
      id: crypto.randomUUID(),
      name: props.name.trim(),
      type: "category",

      parentId: props.parentId || AppRoute.currentView.id || AppRoute.currentView.view,

      categoryKind: props.categoryKind,
      createdAt: Date.now(),
    };
    categories.push(category);
    write(KEYS.CATEGORIES, categories);

    return category;
  },

  updateCategory(categoryId, patch, deleteUnassingedProperties = false) {
    const categories = read(KEYS.CATEGORIES, []);

    const index = categories.findIndex(x => x.id === categoryId);
    if (index === -1) return null;

    categories[index] = {
      ...categories[index],
      ...patch,
    };

    if (deleteUnassingedProperties) {
      const current = StorageAPI.getCategoryById(categoryId);
      if (!current) return null;

      Object.keys(categories[index]).forEach(key => {
        if (categories[index][key] === undefined) {
          delete categories[index][key];
        }
      });
    }

    write(KEYS.CATEGORIES, categories);
    return categories[index];
  },

  deleteCategory(categoryId) {
    const categories = read(KEYS.CATEGORIES, []);
    const category = categories.find(r => r.id === categoryId);

    if (!category) return;

    write(KEYS.CATEGORIES, categories.filter(c => c.id !== categoryId));
  },

};


// --- DELETED API---

StorageAPI.moveItemtoTrash = function (id) {
  const item = this.getItemById(id);
  const now = Date.now();

  item.parentId = "deleted";
  // item.deletedAt = now;
  item.purgeAt = now + 15 * 24 * 60 * 60 * 1000;

  this.updateItem(item.id, item);
};

StorageAPI. getTimeLeft = function (purgeAt) {
  if (!purgeAt) return;

  const diff = purgeAt - Date.now();

  if (diff <= 0) return "Expired";

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);

  return `${days}d ${hours}h`;
}

StorageAPI.tryToEmptyTrash = function () {
  let items = this.getAllItems();
  const now = Date.now();

  // When app opening or syncing

  items = items.forEach(item => {
    if (item.parentId === "deleted" && item.purgeAt < now) {
      this.deleteItem(item.id)
    }
  });
}








StorageAPI.restoreSelectedItems = function (itemType, selectedItems) {
  if (itemType === "list") {
    const confirmed = confirm("Confirm restoring lists");
    if (!confirmed) return;

    for (const [key, value] of Object.entries(selectedItems)) {
      const list = StorageAPI.getListById(value.id);
      if (!list) return;

      value.location = "active";

      StorageAPI.updateList(value.id, value);
    }

    createAlert("success", "Restored Lists");
    deselectAllLists();
  } else if (itemType === "row") {
    const lists = StorageAPI.getLists().filter(list => !list.location?.startsWith("deletedAt")).sort((a, b) => a.name.localeCompare(b.name));

    createModal(
      "Assign entries",
      `
        <p style='color: var(--color-text-muted);'>
          Please choose a list to restore the entries to.
        </p>
        
        <br>

        <select id="importListSelect">
          ${
            lists.length > 0
              ? lists.map(list => `<option value="${list.id}">${list.name}</option>`).join("")
              : `<option disabled>No lists available. Create one first.</option>`
          }
        </select>

        <br>

        <p style='color: var(--color-text-muted);'>
          The entries will be moved to the selected list.
        </p>
      `,

      getModalConfirmBtn("confirmAssignRowsToSelectedList", "restore to list")
    );

    document.onclick = (e) => {
      if (e.target.id === "confirmAssignRowsToSelectedList") {
        const selectedListId = document.getElementById("importListSelect")?.value;
        if (!selectedListId) return;

        for (const [key, value] of Object.entries(selectedItems)) {
          const rows = StorageAPI.getRows();
          const row = rows.find(r => r.id === value.id);
          if (!row) return;

          value.listId = selectedListId;
          value.location = "active";

          StorageAPI.updateRow(value.id, value);
        }

        deleteModal();
        createAlert("success", "Restored Entries");
        deselectAllRows();
        renderCurrentView();
      }
    }, { once: true };
  }
};

// --- ORDER API ---
StorageAPI.getViewOrders = function () {
  return read(KEYS.ORDER) || {};
};

StorageAPI.getViewOrderByView = function (view) {
  const orders = StorageAPI.getViewOrders();
  
  for (const [key, value] of Object.entries(orders)) {
    if (key === view) return value || [];
  };
};

StorageAPI.setViewOrder = function (view, ids) {
  const viewOrders = StorageAPI.getViewOrders();

  const newViewOrder = {
    ...viewOrders
  };

  newViewOrder[view] = ids
  console.log(newViewOrder);

  write(KEYS.ORDER, newViewOrder);
};

StorageAPI.getAllRowOrders = function () {
  const prefix = ORDER_KEYS.ROWS_PREFIX;
  const orders = {};

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(prefix)) {
      orders[key] = read(key, []);
    }
  }

  return orders;
};


StorageAPI.getListsSorted = function () {
  const lists = StorageAPI.getLists();
  const order = StorageAPI.getListOrder();

  const map = new Map(lists.map(l => [l.id, l]));
  const ordered = order.map(id => map.get(id)).filter(Boolean);

  // neue Listen, die noch nicht in order sind, hinten anhängen
  const remaining = lists.filter(l => !order.includes(l.id));
  return [...ordered, ...remaining];
};

StorageAPI.getRowsByListIdSorted = function (listId) {
  const rows = StorageAPI.getItemsByParentId(listId);
  const order = StorageAPI.getRowOrder(listId);

  const map = new Map(rows.map(r => [r.id, r]));
  const ordered = order.map(id => map.get(id)).filter(Boolean);

  const remaining = rows.filter(r => !order.includes(r.id));
  return [...ordered, ...remaining];
};

// ---------- SETTINGS ----------
StorageAPI.getSettings = function () {
  return read(KEYS.SETTINGS, {
    theme: ["system", "default"],
    listSortMode: "manual",
    defaults: {
      enableCounter: true
    },
    receiveUpdateNews: true,
  });
};

StorageAPI.updateSettings = function (patch) {
  const current = StorageAPI.getSettings();
  const next = {
    ...current,
    ...patch,
    version: patch.version ?? current.version,
    defaults: {
      ...(current.defaults || {}),
      ...(patch.defaults || {})
    },
  };
  write(KEYS.SETTINGS, next);
  return next;
};

// =====================================================
// SORT MODES
// =====================================================

StorageAPI.getListSortMode = function () {
  return StorageAPI.getSettings().listSortMode || "manual";
};

StorageAPI.setListSortMode = function (mode) {
  StorageAPI.updateSettings({
    listSortMode: mode
  });
};

StorageAPI.getRowSortMode = function (listId) {
  const list = StorageAPI.getListById(listId);
  return list?.rowsSortMode || "manual";
};

StorageAPI.setRowSortMode = function (listId, mode) {
  const list = StorageAPI.getListById(listId);
  if (!list) return;

  list.rowsSortMode = mode;

  StorageAPI.updateList(listId, {
    rowsSortMode: mode
  });
};

// =====================================================
// EXPORT / IMPORT
// =====================================================

StorageAPI.getData = function () {
  return {
    lists: read(KEYS.LISTS, []),
    rows: read(KEYS.ROWS, []),
    categories: read(KEYS.CATEGORIES, []),
    order: read(KEYS.ORDER, []),
    settings: StorageAPI.getSettings()
  };
};

StorageAPI.exportData = function (data, downloadName = "stacked-backup") {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = downloadName;
  a.click();

  URL.revokeObjectURL(url);
};

let pendingImportData = null;

StorageAPI.importData = function (data) {
  if (!data) return false;

  const giveListsAParent = (data.lists || []).map(l => {
    if (!l.parentId) l.parentId === "root";

    return l;
  });

  data = {
    ...data,
    lists: giveListsAParent
  };

  const itemsWithoutParentId = [
    // ...(data.lists || []).filter(item => !item.parentId),
    ...(data.rows || []).filter(item => !item.parentId),
    ...(data.categories || []).filter(item => !item.parentId)
  ]

  if (itemsWithoutParentId.length > 0) {

    const lists = StorageAPI.getLists().filter(list => list.parentId !== "deleted").sort((a, b) => a.name.localeCompare(b.name));
    pendingImportData = data;

    createModal(
      "Assign imported categories and entries a list.",
      `
        <p style='color: var(--color-text-muted);'>
          Some imported items are not assigned to a list. Please choose a list to continue.
        </p>
        
        <br>

        <select id="importListSelect">
          ${
            lists.length > 0
              ? lists.map(list => `<option value="${list.id}">${list.name}</option>`).join("")
              : `<option disabled>No lists available. Create one first.</option>`
          }
        </select>

        <br>

        <p style='color: var(--color-text-muted);'>
          All unassigned items will be moved to the selected list.
        </p>
      `,

      getModalConfirmBtn("confirmImportToSelectedList", "move to list")
    );

    document.getElementById("confirmImportToSelectedList").onclick = (e) => {
      const selectedListId = document.getElementById("importListSelect")?.value;
      if (!selectedListId) return;

      pendingImportData.rows.forEach(r => {
        if (!r.parentId) {
          r.parentId = selectedListId;
        }
      });
      pendingImportData.categories.forEach(c => {
        if (!c.parentId) {
          c.parentId = selectedListId;
        }
      });

      finalizeImport(pendingImportData);
    }, { once: true };

  } else {
    finalizeImport(data);
  }
};

function finalizeImport(data) {
  if (data.lists) write(KEYS.LISTS, data.lists);
  if (data.rows) write(KEYS.ROWS, data.rows);
  if (data.categories) write(KEYS.CATEGORIES, data.categories);
  if (data.order) write(KEYS.ORDER, data.order);
  if (data.settings) write(KEYS.SETTINGS, data.settings);

  location.reload();
}