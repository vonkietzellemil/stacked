const userLang = navigator.language; // z.B. "en-US"
let currentLang = "eng";

// Sprache laden
async function loadLanguage(lang) {
  const response = await fetch(`../lang/${lang}.json`);
  const translations = await response.json();

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    if (translations[key]) {
      el.textContent = translations[key];
    }
  });

  // HTML lang-Attribut setzen (gut für SEO & Screenreader)
  document.documentElement.lang = lang;

  currentLang = lang;
}

// Sprache setzen (Button)
function setLanguage(lang) {
  localStorage.setItem("lang", lang);
  loadLanguage(lang);
}

// Beim Laden der Seite
function detectLanguage() {
  const savedLang = localStorage.getItem("lang");

  if (savedLang) return savedLang;

  const browserLang = navigator.language.toLowerCase();

  if (browserLang.startsWith("de")) return "de";
  return "en";
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  const lang = detectLanguage();
  loadLanguage(lang);
});