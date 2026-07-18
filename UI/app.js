const App = document.getElementById("App");
const pagesContainer = document.getElementById("pagesContainer");

const sidebar = document.getElementById("sidebar");
let sidebarIsOpen = false;
const allPages = document.querySelectorAll(".page");

const mainTestPage = document.getElementById("mainTestPage");
const componentsPage = document.getElementById("componentsPage");


allPages.forEach(page => {
  page.querySelector(".page-header svg").addEventListener("click", e => {
    toggleSidebar();
  });
});

function toggleSidebar() {
  if (sidebarIsOpen) {
    closeSidebar();
  } else {
    openSidebar();
  }
}
// setTimeout(() => openSideBar(), 500)
function openSidebar() {
  sidebarIsOpen = true;
  pagesContainer.style.transform = `scale(0.95) translateX(${sidebar.clientWidth}px)`;
}
function closeSidebar() {
  sidebarIsOpen = false;
  pagesContainer.style.transform = "";
}

showPage(componentsPage);

function showPage(page) {
  allPages.forEach(page => page.style.display = "none");

  page.style.display = "flex"
}