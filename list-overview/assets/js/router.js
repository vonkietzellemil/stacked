const searchbar = document.getElementById("searchbar");
const clearSearchbarBtn = document.getElementById("clearSearchbarBtn");
const searchIcon = document.getElementById("searchIcon");

// scripts/router.js
// =====================================================
// ROUTER (GitHub Pages safe)
// - #/lists
// - #/lists/<slug>--<id>
// =====================================================

function parseRoute() {
  const hash = location.hash || "#/root";
  return hash.slice(2).split("/"); // ["root"] or ["root", "slug--id"]
}

function parseListId(param) {
  return param?.split("--").pop();
}

function showView(name) {
  const overview = document.getElementById("view-overview");
  const listSettings = document.getElementById("view-list-settings");

  const container = document.querySelector(".container");
  const updateNews = document.getElementById("updateNews");

  overview.hidden = name !== "entities";
  listSettings.hidden = name !== "listSettings";

  container.hidden = name === "updateNews";
  updateNews.hidden = name !== "updateNews";
}

function resetSearchBar() {
  searchbar.value = "";
  clearSearchbarBtn.style.display = "none";
  searchIcon.style.display = "block";
}

window.AppRoute = {
  getCurrentView() {
    if (AppRoute.currentView.view === "singleList") {
      return AppRoute.currentView.id;
    } else {
      console.log(2, AppRoute.currentView.view)
      return AppRoute.currentView.view;
    }
  },
  currentView: {
    view: null,
    id: null
  },
  toOverview() {
    location.hash = "#/root";
  },
  toArchive() {
    location.hash = "#/archive"
  },

  toDeleted() {
    location.hash = "#/deleted"
    StorageAPI.tryToEmptyTrash();
  },


  toList(list) {
    location.hash = `#/${parseRoute()[0]}/${list.slug}--${list.id}`;
  },
  toListSettings(list) {
    location.hash = `#/${parseRoute()[0]}/${list.slug}--${list.id}/settings`;
  },
  toUpdateNews(param) {
    location.hash = `#/update-news/${param}`;
  },

  resetViews() {
    resetSearchBar();
    resetViewOverview();
  },
};

AppRoute.back = () => {
  if (history.length > 1) {
    history.back();
  } else {
    AppRoute.toOverview();
  }
};

function renderRoute() {
  const [root, param, sub] = parseRoute();

  AppRoute.resetViews();
  showView("entities");

  const listId = parseListId(param);
  console.log("rendering route")

  AppRoute.currentView.view = root;
  AppRoute.currentView.id = null;

  if (listId) {
    AppRoute.currentView.view = "singleList";
    AppRoute.currentView.id = listId;
  }
  console.log("Current View:", AppRoute.currentView);

  if (!param) {
    AppRoute.currentView.view = root;

    if (root === "archive") {
      renderArchivePage();
    } else {
      renderListsPage();
    }
    return;
  }


  // =============================
  // LIST SETTINGS
  // =============================
  if (sub === "settings") {
    showView("listSettings");
    window.renderListSettings?.(listId);
    return;
  }

  // =============================
  // UPDATE NEWS
  // =============================
  if (root === "update-news") {
    showView("updateNews");
    renderUpdateNews?.(param);
    return;
  }

  // =============================
  // LIST (default)
  // =============================
  renderListPage(listId);
}

window.addEventListener("hashchange", renderRoute);
document.addEventListener("DOMContentLoaded", renderRoute);

// Render Current View
function renderCurrentView() {
  const [root, param, sub] = parseRoute();

  if (AppRoute.currentView.view !== "singleList") {
    renderListsPage();
  } else {
    renderListPage(AppRoute.currentView.id);
  }
}