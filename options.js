// options.js

const ALL_CURRENCIES = [
  "USD", "CNY", "JPY", "GBP", "EUR", "HKD", "CAD", "AUD", "CHF", "SGD",
  "KRW", "TWD", "THB", "MYR", "NZD", "INR", "RUB", "BRL", "MXN", "SAR"
];

const CURRENCY_DETAILS = {
  USD: { name: "美元", en_name: "US Dollar" },
  CNY: { name: "人民币", en_name: "Chinese Yuan" },
  JPY: { name: "日元", en_name: "Japanese Yen" },
  GBP: { name: "英镑", en_name: "British Pound" },
  EUR: { name: "欧元", en_name: "Euro" },
  HKD: { name: "港币", en_name: "Hong Kong Dollar" },
  CAD: { name: "加元", en_name: "Canadian Dollar" },
  AUD: { name: "澳元", en_name: "Australian Dollar" },
  CHF: { name: "瑞士法郎", en_name: "Swiss Franc" },
  SGD: { name: "新加坡元", en_name: "Singapore Dollar" },
  KRW: { name: "韩元", en_name: "South Korean Won" },
  TWD: { name: "新台币", en_name: "New Taiwan Dollar" },
  THB: { name: "泰铢", en_name: "Thai Baht" },
  MYR: { name: "马来西亚令吉", en_name: "Malaysian Ringgit" },
  NZD: { name: "新西兰元", en_name: "New Zealand Dollar" },
  INR: { name: "印度卢比", en_name: "Indian Rupee" },
  RUB: { name: "俄罗斯卢布", en_name: "Russian Ruble" },
  BRL: { name: "巴西雷亚尔", en_name: "Brazilian Real" },
  MXN: { name: "墨西哥比索", en_name: "Mexican Peso" },
  SAR: { name: "沙特里亚尔", en_name: "Saudi Riyal" }
};

const USER_LIST_STORAGE_KEY = "userCurrencyList";
const LANGUAGE_STORAGE_KEY = "languagePreference";
const DEFAULT_DISPLAYED = ["USD", "CNY", "JPY", "GBP", "EUR"];
const DEFAULT_LANGUAGE = "en";
const FLAG_BASE_URL = "https://flagcdn.com/32x24/";

const TRANSLATIONS = {
  pageTitle: { en: "Manage Currency List", zh: "管理货币列表" },
  pageSubtitle: {
    en: "Choose which currencies appear in the popup or add new ones.",
    zh: "选择在弹窗中显示的货币，或添加新的货币。"
  },
  activeSection: { en: "Displayed Currencies", zh: "当前显示列表" },
  availableSection: { en: "Available Currencies", zh: "可选货币" },
  add: { en: "Add", zh: "添加" },
  remove: { en: "Remove", zh: "移除" },
  fixed: { en: "Pinned", zh: "固定" },
  fixedTooltip: { en: "USD cannot be removed", zh: "USD 无法移除" }
};

let displayedCurrencies = [...DEFAULT_DISPLAYED];
let currentLanguage = DEFAULT_LANGUAGE;

function getTranslation(key, lang = currentLanguage) {
  const entry = TRANSLATIONS[key];
  if (!entry) {
    return "";
  }
  return entry[lang] || entry[DEFAULT_LANGUAGE] || "";
}

function buildFlagUrl(code) {
  const countryCode = code.substring(0, 2).toLowerCase();
  return `${FLAG_BASE_URL}${countryCode}.png`;
}

function getCurrencyDetails(code) {
  const fallback = { name: code, en_name: code };
  return CURRENCY_DETAILS[code] || fallback;
}

function getCurrencyDisplayName(code) {
  const details = getCurrencyDetails(code);
  if (currentLanguage === "en") {
    return details.en_name || details.name;
  }
  return details.name || details.en_name || code;
}

function updateDocumentLangAttr() {
  document.documentElement.lang = currentLanguage === "zh" ? "zh-CN" : "en";
}

function updateStaticTexts() {
  document.title = getTranslation("pageTitle");
  const titleEl = document.querySelector(".options__title");
  if (titleEl) {
    titleEl.textContent = getTranslation("pageTitle");
  }

  const subtitleEl = document.querySelector(".options__subtitle");
  if (subtitleEl) {
    subtitleEl.textContent = getTranslation("pageSubtitle");
  }

  const activeTitle = document.querySelector("#active-currencies .section-title");
  if (activeTitle) {
    activeTitle.textContent = getTranslation("activeSection");
  }

  const availableTitle = document.querySelector("#available-currencies .section-title");
  if (availableTitle) {
    availableTitle.textContent = getTranslation("availableSection");
  }
}

function createListItem(code, isDisplayedList) {
  const li = document.createElement("li");
  li.className = "currency-item";

  const info = document.createElement("div");
  info.className = "currency-item__info";

  const flagImg = document.createElement("img");
  flagImg.className = "currency-item__flag-img";
  flagImg.src = buildFlagUrl(code);
  flagImg.alt = `Flag of ${code}`;
  flagImg.loading = "lazy";

  const text = document.createElement("div");
  text.className = "currency-item__text";

  const codeLabel = document.createElement("span");
  codeLabel.className = "currency-item__code";
  codeLabel.textContent = code;

  const nameLabel = document.createElement("span");
  nameLabel.className = "currency-item__name";
  nameLabel.textContent = getCurrencyDisplayName(code);

  text.appendChild(codeLabel);
  text.appendChild(nameLabel);
  info.appendChild(flagImg);
  info.appendChild(text);

  const button = document.createElement("button");
  button.dataset.code = code;
  button.className = "currency-item__action";

  if (isDisplayedList) {
    button.classList.add("remove-btn");
    if (code === "USD") {
      button.textContent = getTranslation("fixed");
      button.disabled = true;
      button.title = getTranslation("fixedTooltip");
      button.setAttribute("aria-label", getTranslation("fixedTooltip"));
    } else {
      const removeLabel = getTranslation("remove");
      button.textContent = removeLabel;
      button.setAttribute("aria-label", removeLabel);
    }
  } else {
    button.classList.add("add-btn");
    const addLabel = getTranslation("add");
    button.textContent = addLabel;
    button.setAttribute("aria-label", addLabel);
  }

  if (!button.disabled) {
    button.title = button.getAttribute("aria-label") || button.textContent;
  }

  li.appendChild(info);
  li.appendChild(button);
  return li;
}

function renderCurrencyLists() {
  const displayedListEl = document.getElementById("displayed-list");
  const availableListEl = document.getElementById("available-list");

  if (!displayedListEl || !availableListEl) {
    return;
  }

  displayedListEl.innerHTML = "";
  availableListEl.innerHTML = "";

  const displayedSet = new Set(displayedCurrencies);

  displayedCurrencies.forEach((code) => {
    const item = createListItem(code, true);
    displayedListEl.appendChild(item);
  });

  ALL_CURRENCIES.forEach((code) => {
    if (!displayedSet.has(code)) {
      const item = createListItem(code, false);
      availableListEl.appendChild(item);
    }
  });
}

async function persistDisplayedCurrencies() {
  try {
    await chrome.storage.local.set({ [USER_LIST_STORAGE_KEY]: displayedCurrencies });
  } catch (error) {
    console.error("Failed to save currency list", error);
  }
}

async function handleMoveCurrency(currencyCode, type) {
  if (!currencyCode || (currencyCode === "USD" && type === "remove")) {
    return;
  }

  const stored = await chrome.storage.local.get(USER_LIST_STORAGE_KEY);
  const userList = Array.isArray(stored[USER_LIST_STORAGE_KEY])
    ? stored[USER_LIST_STORAGE_KEY].filter((value) => ALL_CURRENCIES.includes(value))
    : [...DEFAULT_DISPLAYED];

  let newList = [...userList];

  if (type === "remove") {
    newList = newList.filter((value) => value !== currencyCode);
  } else if (type === "add") {
    if (!newList.includes(currencyCode)) {
      newList.push(currencyCode);
    }
  }

  newList = newList.filter((value) => value !== "USD");
  newList.unshift("USD");

  displayedCurrencies = newList;
  await persistDisplayedCurrencies();
  renderCurrencyLists();
}

async function loadOptions() {
  try {
    const stored = await chrome.storage.local.get(USER_LIST_STORAGE_KEY);
    const userList = stored[USER_LIST_STORAGE_KEY];

    if (Array.isArray(userList) && userList.length > 0) {
      let loadedList = userList.filter((value) => ALL_CURRENCIES.includes(value));
      loadedList = loadedList.filter((value) => value !== "USD");
      loadedList.unshift("USD");
      displayedCurrencies = loadedList;
    } else {
      displayedCurrencies = [...DEFAULT_DISPLAYED];
      await persistDisplayedCurrencies();
    }
  } catch (error) {
    console.error("Failed to load currency list", error);
    displayedCurrencies = [...DEFAULT_DISPLAYED];
  }

  renderCurrencyLists();
}

async function loadLanguagePreference() {
  try {
    const stored = await chrome.storage.local.get(LANGUAGE_STORAGE_KEY);
    const value = stored[LANGUAGE_STORAGE_KEY];
    if (value === "en" || value === "zh") {
      return value;
    }
  } catch (error) {
    console.warn("Failed to load language preference", error);
  }
  return DEFAULT_LANGUAGE;
}

function handleStorageLanguageChange(newLanguage) {
  if (newLanguage !== "en" && newLanguage !== "zh") {
    return;
  }
  currentLanguage = newLanguage;
  updateDocumentLangAttr();
  updateStaticTexts();
  renderCurrencyLists();
}

async function initializeOptions() {
  currentLanguage = await loadLanguagePreference();
  updateDocumentLangAttr();
  updateStaticTexts();
  await loadOptions();
}

async function handleDelegatedClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement) || target.disabled) {
    return;
  }

  if (target.classList.contains("add-btn")) {
    const code = target.dataset.code;
    await handleMoveCurrency(code, "add");
  } else if (target.classList.contains("remove-btn")) {
    const code = target.dataset.code;
    await handleMoveCurrency(code, "remove");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  document.body.addEventListener("click", (event) => {
    handleDelegatedClick(event).catch((error) => {
      console.error("Failed to update currency list", error);
    });
  });
  initializeOptions();
});

if (chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes[LANGUAGE_STORAGE_KEY]) {
      handleStorageLanguageChange(changes[LANGUAGE_STORAGE_KEY].newValue);
    }
  });
}


















